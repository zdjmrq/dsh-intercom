/**
 * The intercom Host Remote: peer communication between TOP-LEVEL conversations
 * (parent agents), coordination groups (对话群), and the model-facing tools
 * over the same vocabulary. Subagent parent-child communication is deliberately
 * out of scope — it belongs to the built-in `send_message`/`list_agents` tools.
 *
 * Policy (roots-only):
 * - `list`/`send`/`broadcast`/groups operate on live top-level conversations only.
 * - Wake budget (3 consecutive wakes per target, reset by human input) and a
 *   per-target rate limit (10/minute) contain message loops.
 * - Delivery is same-workspace by default; cross-workspace needs an explicit
 *   `allowCrossWorkspace` opt-in.
 *
 * Durability: groups are persisted through the storage-domain facility; the
 * automatic group repopulates lazily from traffic after a restart.
 * @module @deepseek-ai/dsh-host-intercom
 */

import type { Context } from '@deepseek-ai/cordis'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { intercomDomain, type GroupValue, type IntercomGlobal } from './spec.ts'
import type {
  BroadcastMemberResult,
  BroadcastRequest,
  BroadcastResult,
  ConversationInfo,
  CreateGroupRequest,
  CreateGroupResult,
  DormantConversation,
  DormantListResult,
  GroupInfo,
  GroupMemberRequest,
  MessageEntry,
  OkResult,
  ReadConversationRequest,
  ReadConversationResult,
  ReadGroupRequest,
  ReadGroupResult,
  RelayEntry,
  RemoveGroupRequest,
  SendRequest,
  SendResult,
  WakeSendRequest,
  WakeSendResult,
} from './types.ts'

export type * from './types.ts'
export { intercomDomain } from './spec.ts'

const AUTO_GROUP_ID = '__auto'
const AUTO_GROUP_NAME = '协作中的对话(自动)'
const MAX_WAKES = 3
const RATE_LIMIT = 10
const MAX_TEXT = 8000

/** Structural face of a live Agent — only the leaves this plugin reads. */
interface AgentLike {
  id: string
  status: string
  options?: { provider?: string; model?: string }
  session: { header?: { cwd?: string } }
  followup(message: unknown): void
  steer(message: unknown): void
  inject(message: unknown): void
}

interface AgentsService {
  get(id: string): AgentLike | undefined
  list(): AgentLike[]
  roots(): AgentLike[]
  create(options: unknown): Promise<{ agent: AgentLike }>
  resume(options: { resumeSessionId: string; agentOptions?: { provider?: string; model?: string } }): Promise<{ agent: AgentLike }>
}

interface TitleService {
  get(session: unknown): { title?: string } | undefined
}

interface ContentBlockLike { type: string; text?: string }
interface SurfaceMessageLike { id?: string; content?: ContentBlockLike[]; source?: { kind?: string; plugin?: string; senderSessionId?: string; broadcast?: boolean } }
interface SurfaceEventLike { type: string; time?: number; data?: { message?: SurfaceMessageLike } }
interface QueryService {
  readSurface(sessionId: string): Promise<{ events: SurfaceEventLike[] }>
  readTitle(sessionId: string): Promise<{ title?: string } | undefined>
}

interface SessionHeaderLike {
  id: string
  parentSession?: string
  origin?: string
  cwd?: string
  createdAt?: number
}

interface PersistenceService {
  list(): Promise<SessionHeaderLike[]>
  inspect(sessionId: string): Promise<{ meta: SessionHeaderLike; events: RawLogEventLike[] }>
}

/** Minimal shape of one raw persisted session event — only the leaves the plugin reads. */
interface RawLogEventLike {
  type: string
  data?: { header?: { config?: { provider?: string; model?: string } } }
}

interface ProjectionCacheLike {
  cachedSnapshot(meta: unknown): { values?: Record<string, unknown> } | undefined
}

interface ContinuableStart { childId: string; messageId: string }
interface SubagentsService {
  list(): string[]
  getProvider(name: string): { prepareContinuable?: unknown } | undefined
  startContinuable(spec: {
    provider: string
    label: string
    request: { prompt: ContentBlockLike[]; parent: AgentLike }
    signal: AbortSignal
  }): Promise<ContinuableStart>
}

interface DomainLike {
  global: { get(): Promise<IntercomGlobal>; set(value: IntercomGlobal): Promise<void> }
}
interface StorageDomainFacility { open(spec: unknown): Promise<DomainLike> }

interface ToolExecutionLike {
  agent?: AgentLike
  signal?: AbortSignal
}

interface SentRecord { id: string; to: string; time: number }

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export class IntercomGateway extends TypertRemoteService {
  // Wait until the tool registry and the storage-domain facility are mounted:
  // without this declaration apply() can run before either provider activates,
  // silently skipping model-tool registration and durable-group loading.
  static inject = ['tools', 'storageDomain']

  private groupStore = new Map<string, GroupValue>()
  private outbox = new Map<string, SentRecord[]>()
  private spentWakes = new WeakMap<object, number>()
  private rateBuckets = new Map<string, number[]>()
  private counter = 0
  private domain: DomainLike | null = null
  private titleCache = new Map<string, { title: string; at: number }>()
  /** Directed relay feed per group (live view; session logs stay the truth). */
  private relayLog = new Map<string, RelayEntry[]>()

  private get agents(): AgentsService {
    return this.ctx.get('agents') as AgentsService
  }
  private get titleService(): TitleService | undefined {
    return this.ctx.get('sessionTitle') as TitleService | undefined
  }
  private get queryService(): QueryService | undefined {
    return this.ctx.get('sessionQuery') as QueryService | undefined
  }
  private get subagents(): SubagentsService | undefined {
    return this.ctx.get('subagents') as SubagentsService | undefined
  }
  private get persistence(): PersistenceService | undefined {
    return this.ctx.get('sessionPersistence') as PersistenceService | undefined
  }
  private get projectionCache(): ProjectionCacheLike | undefined {
    return this.ctx.get('sessionProjectionCache') as ProjectionCacheLike | undefined
  }

  constructor(ctx: Context) {
    super(ctx, 'intercom')
    this.ensureAutoGroup()
    this.loadDomain()
    this.registerTools(ctx)
    ctx.effect(() => {
      const claimed = ctx.on('agent/inbox/claimed', (payload: { agent?: object; message?: { source?: { kind?: string } } }) => {
        if (payload?.agent !== undefined && payload?.message?.source?.kind === 'user') {
          this.spentWakes.delete(payload.agent)
        }
      })
      const disposed = ctx.on('agent/disposed', (payload: { agent?: AgentLike }) => {
        if (payload?.agent !== undefined) {
          this.rateBuckets.delete(payload.agent.id)
          this.outbox.delete(payload.agent.id)
        }
      })
      return () => { claimed(); disposed() }
    }, 'intercom: lifecycle listeners')

    ctx.effect(() => {
      const section = ctx.get('systemPrompt') as { section(spec: { name: string; order: number; text: () => string }): () => void } | undefined
      if (section === undefined) return () => {}
      return section.section({
        name: 'intercom:cooperation',
        order: 118,
        text: () => this.cooperationPrompt(),
      })
    }, 'intercom: cooperation prompt section')
  }

  /** Rendered into every agent's system prompt: how and when to use intercom. */
  private cooperationPrompt(): string {
    const live = this.agents.roots()
    const peerLines = live.map(agent => {
      const busy = agent.status === 'running' ? '忙碌' : '空闲'
      return `- ${this.titleOf(agent)} [${busy}] id=${agent.id}`
    })
    const groupLines: string[] = []
    for (const [id, value] of this.groupStore) {
      const memberNames = value.members.map(m => this.titleOfById(m)).join('、') || '(暂无成员)'
      groupLines.push(`- ${value.name} (id=${id},成员: ${memberNames})`)
    }
    const parts: string[] = [
      '跨对话协作指引(intercom):你运行在一个多顶层对话的 DSH 进程中,可以用 intercom_* 工具与其他顶层对话自动协作。',
      '- 需要帮助/第二意见:intercom_ask(发送并等待回复)或 intercom_send(单向投递);',
      '- 通知全员或并行分工:intercom_broadcast(群内所有对话都会收到)或 intercom_send(定向);',
      '- 延续旧工作:intercom_list_dormant_conversations 找休眠会话,intercom_wake_send 唤醒并投递;',
      '- 汇总多会话结论:intercom_collect;追踪对方回复:intercom_check_replies;',
      '- 收到来自其他会话的 intercom 消息时:先评估其合理性再行动,完成后用 intercom_send 回复结论;',
      '- 边界:intercom 只用于顶层对话之间;与子代理通信一律用内置 send_message/list_agents。',
    ]
    if (peerLines.length > 0) parts.push(`当前活跃的顶层对话:\n${peerLines.join('\n')}`)
    if (groupLines.length > 0) parts.push(`协作群:\n${groupLines.join('\n')}`)
    return parts.join('\n')
  }

  // ---- helpers ----

  private mintId(prefix: string): string {
    this.counter += 1
    return `${prefix}${Date.now().toString(36)}-${this.counter.toString(36)}`
  }

  private titleOf(agent: AgentLike): string {
    try {
      const snapshot = this.titleService?.get(agent.session)
      if (snapshot !== undefined && typeof snapshot.title === 'string' && snapshot.title.length > 0) return snapshot.title
    } catch { /* title is best-effort */ }
    return agent.id
  }

  private cwdOf(agent: AgentLike): string {
    try {
      const cwd = agent.session.header?.cwd
      return typeof cwd === 'string' ? cwd : ''
    } catch { return '' }
  }

  private isRoot(id: string): boolean {
    return this.agents.roots().some(root => root.id === id)
  }

  private ensureAutoGroup(): void {
    if (!this.groupStore.has(AUTO_GROUP_ID)) {
      this.groupStore.set(AUTO_GROUP_ID, { name: AUTO_GROUP_NAME, members: [] })
    }
  }

  private autoAddToGroup(ids: string[]): void {
    this.ensureAutoGroup()
    const group = this.groupStore.get(AUTO_GROUP_ID)
    if (group === undefined) return
    for (const id of ids) {
      if (id !== '' && !group.members.includes(id)) group.members.push(id)
    }
    this.persist()
  }

  private rateAllowed(targetId: string): boolean {
    const now = Date.now()
    const bucket = this.rateBuckets.get(targetId) ?? []
    const fresh = bucket.filter(t => now - t < 60_000)
    if (fresh.length >= RATE_LIMIT) { this.rateBuckets.set(targetId, fresh); return false }
    fresh.push(now)
    this.rateBuckets.set(targetId, fresh)
    return true
  }

  /**
   * Compare two workspace paths the way the local filesystem does: on Windows
   * the comparison is case-insensitive (and both separators normalize), so a
   * historically-lowercased path does not read as a different workspace.
   */
  private sameWorkspace(a: string, b: string): boolean {
    if (a === b) return true
    const trim = (p: string) => p.replace(/[\\/]+$/, '')
    const x = trim(a)
    const y = trim(b)
    return process.platform === 'win32' ? x.toLowerCase() === y.toLowerCase() : x === y
  }

  /** Resolve a session title with a 5-minute cache; falls back to the id. */
  private async titleOfSession(sessionId: string): Promise<string> {
    const now = Date.now()
    const cached = this.titleCache.get(sessionId)
    if (cached !== undefined && now - cached.at < 300_000) return cached.title
    let title = sessionId
    if (this.queryService !== undefined) {
      try {
        const t = await this.queryService.readTitle(sessionId)
        if (t !== undefined && typeof t.title === 'string' && t.title.trim() !== '') title = t.title
      } catch { /* keep the id */ }
    }
    this.titleCache.set(sessionId, { title, at: now })
    return title
  }

  /** Zero-I/O title read from the in-memory projection cache; undefined on miss. */
  private cachedTitleOf(header: SessionHeaderLike): string | undefined {
    const cache = this.projectionCache
    if (cache === undefined) return undefined
    try {
      const snapshot = cache.cachedSnapshot(header)
      const title = snapshot?.values?.['title']
      if (typeof title === 'string' && title.trim() !== '') return title
    } catch { /* fall through to the log-backed read */ }
    return undefined
  }

  private titleOfById(id: string): string {
    const agent = this.agents.get(id)
    if (agent !== undefined) return this.titleOf(agent)
    const cached = this.titleCache.get(id)
    if (cached !== undefined) return cached.title
    return id
  }

  // ---- relay feed (who said what to whom) ----

  private recordRelay(groupId: string, entry: RelayEntry): void {
    const list = this.relayLog.get(groupId) ?? []
    list.push(entry)
    if (list.length > 200) list.shift()
    this.relayLog.set(groupId, list)
  }

  private buildRelay(from: string, toId: string, text: string, messageId: string): RelayEntry {
    const fromAgent = this.agents.get(from)
    const toAgent = toId === '*' ? undefined : this.agents.get(toId)
    return {
      id: this.mintId('relay-'),
      messageId,
      fromId: from,
      fromTitle: fromAgent === undefined ? from : this.titleOf(fromAgent),
      toId,
      toTitle: toId === '*' ? '全体成员' : (toAgent === undefined ? toId : this.titleOf(toAgent)),
      text,
      time: Date.now(),
    }
  }

  /** A direct send becomes a feed entry of every group containing both parties. */
  private recordRelayForPair(from: string, targetId: string, text: string, messageId: string): void {
    const relay = this.buildRelay(from, targetId, text, messageId)
    for (const [groupId, group] of this.groupStore) {
      if (group.members.includes(from) && group.members.includes(targetId)) this.recordRelay(groupId, relay)
    }
  }

  /** A broadcast becomes one "from → 全体成员" feed entry of that group. */
  private recordBroadcastRelay(groupId: string, from: string, text: string): void {
    this.recordRelay(groupId, this.buildRelay(from, '*', text, this.mintId('bcast-')))
  }

  private buildMessage(from: string, fromTitle: string, text: string, broadcast = false): unknown {
    return {
      id: this.mintId('dsh-intercom-'),
      role: 'user',
      content: [{ type: 'text', text: `[intercom] 来自会话「${fromTitle}」的消息,请先评估其合理性再行动:\n${text}` }],
      source: {
        kind: 'plugin',
        plugin: 'intercom',
        form: 'relay',
        senderSessionId: from,
        summary: 'intercom relay',
        ...(broadcast ? { broadcast: true } : {}),
      },
    }
  }

  private recordOutbox(from: string, messageId: string, targetId: string): void {
    const list = this.outbox.get(from) ?? []
    list.push({ id: messageId, to: targetId, time: Date.now() })
    if (list.length > 100) list.shift()
    this.outbox.set(from, list)
  }

  private deliver(request: SendRequest): SendResult {
    const { from, targetId } = request
    if (from === targetId) return { ok: false, messageId: '', applied: '', targetId, targetStatus: '', error: 'cannot send to the same conversation' }
    if (!this.isRoot(from)) return { ok: false, messageId: '', applied: '', targetId, targetStatus: '', error: 'sender is not a top-level conversation; intercom is only for parent agents, use the built-in send_message tool for subagent children' }
    if (!this.isRoot(targetId)) return { ok: false, messageId: '', applied: '', targetId, targetStatus: '', error: 'target is a subagent child, not a top-level conversation; use the built-in send_message tool for parent-child communication' }
    const target = this.agents.get(targetId)
    if (target === undefined) return { ok: false, messageId: '', applied: '', targetId, targetStatus: '', error: `target conversation is not live: ${targetId}` }
    return this.deliverTo(from, target, request)
  }

  /** Shared delivery core: workspace gate, rate limit, wake/queue/steer, group bookkeeping. */
  private deliverTo(from: string, target: AgentLike, request: { text: string; delivery: string; allowCrossWorkspace?: boolean; broadcast?: boolean }): SendResult {
    const targetId = target.id
    const text = String(request.text).slice(0, MAX_TEXT)
    const delivery = request.delivery === 'steer' ? 'steer' : 'wake'
    const fromAgent = this.agents.get(from)
    if (request.allowCrossWorkspace !== true) {
      const fromCwd = fromAgent === undefined ? '' : this.cwdOf(fromAgent)
      const targetCwd = this.cwdOf(target)
      if (fromCwd !== '' && targetCwd !== '' && !this.sameWorkspace(fromCwd, targetCwd)) {
        return { ok: false, messageId: '', applied: '', targetId, targetStatus: '', error: `cross-workspace delivery blocked: from ${fromCwd} to ${targetCwd}` }
      }
    }
    if (!this.rateAllowed(targetId)) return { ok: false, messageId: '', applied: '', targetId, targetStatus: '', error: 'rate limit exceeded for target conversation' }
    const fromTitle = fromAgent === undefined ? from : this.titleOf(fromAgent)
    const message = this.buildMessage(from, fromTitle, text, request.broadcast === true)
    let applied = 'wake'
    try {
      if (delivery === 'steer') {
        target.steer(message)
        applied = 'steer'
      } else {
        const spent = this.spentWakes.get(target) ?? 0
        if (target.status === 'idle' && spent < MAX_WAKES) {
          this.spentWakes.set(target, spent + 1)
          target.followup(message)
          applied = 'wake'
        } else {
          target.inject(message)
          applied = 'queue'
        }
      }
    } catch (error) {
      return { ok: false, messageId: '', applied: '', targetId, targetStatus: '', error: `delivery failed: ${String(error instanceof Error ? error.message : error)}` }
    }
    this.autoAddToGroup([from, targetId])
    this.recordRelayForPair(from, targetId, text, (message as { id: string }).id)
    this.recordOutbox(from, (message as { id: string }).id, targetId)
    return { ok: true, messageId: (message as { id: string }).id, applied, targetId, targetStatus: target.status, error: '' }
  }

  /** Concatenated plain-text of a surface message; empty when there is none. */
  private messageText(message: SurfaceMessageLike | undefined): string {
    if (message === undefined || !Array.isArray(message.content)) return ''
    return message.content
      .filter(block => block !== null && typeof block === 'object' && block.type === 'text' && typeof block.text === 'string')
      .map(block => block.text as string)
      .join('\n')
  }

  private surfaceEntries(events: SurfaceEventLike[], sinceTime: number): MessageEntry[] {
    const entries: MessageEntry[] = []
    for (const event of events) {
      if (typeof event.time === 'number' && event.time <= sinceTime) continue
      const message = event.data?.message
      if (message === undefined || !Array.isArray(message.content)) continue
      const role = event.type === 'assistant/message' ? 'assistant' : event.type === 'user/message' ? 'user' : null
      if (role === null) continue
      const text = message.content
        .filter(block => block !== null && typeof block === 'object' && block.type === 'text' && typeof block.text === 'string')
        .map(block => block.text as string)
        .join('\n')
      if (text === '') continue
      entries.push({ role, text, time: typeof event.time === 'number' ? event.time : 0 })
    }
    return entries
  }

  private surfaceText(events: SurfaceEventLike[], sinceTime: number): string {
    return this.surfaceEntries(events, sinceTime).map(entry => `[${entry.role}] ${entry.text}`).join('\n').slice(0, 16_000)
  }

  private lastAssistantText(entries: MessageEntry[]): string {
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i]
      if (entry !== undefined && entry.role === 'assistant') return entry.text.slice(0, 4000)
    }
    return ''
  }

  private continuableProviderName(): string {
    if (this.subagents === undefined) return ''
    try {
      for (const name of this.subagents.list()) {
        const provider = this.subagents.getProvider(name)
        if (provider !== undefined && typeof provider.prepareContinuable === 'function') return name
      }
    } catch { /* fall through */ }
    return ''
  }

  // ---- durability ----

  private loadDomain(): void {
    const facility = this.ctx.get('storageDomain') as StorageDomainFacility | undefined
    if (facility === undefined) {
      console.error('[intercom] storageDomain service unavailable; groups are in-memory only for this process')
      return
    }
    facility.open(intercomDomain).then(domain => {
      this.domain = domain
      return domain.global.get()
    }).then(global => {
      if (global === null || typeof global !== 'object' || global.groups === undefined || global.groups === null) return
      for (const [id, value] of Object.entries((global as IntercomGlobal).groups)) {
        if (this.groupStore.has(id)) continue
        this.groupStore.set(id, { name: String(value.name), members: Array.isArray(value.members) ? [...value.members] : [] })
      }
    }).catch(error => {
      console.error(`[intercom] domain load failed: ${String(error instanceof Error ? error.message : error)}`)
    })
  }

  private persist(): void {
    if (this.domain === null) return
    const snapshot: Record<string, GroupValue> = {}
    for (const [id, value] of this.groupStore) snapshot[id] = { name: value.name, members: [...value.members] }
    void this.domain.global.set({ groups: snapshot }).catch(error => {
      console.error(`[intercom] persist failed: ${String(error instanceof Error ? error.message : error)}`)
    })
  }

  // ---- Remote methods (Client face) ----

  @Remote('list')
  list(): ConversationInfo[] {
    return this.agents.roots().map(agent => ({
      id: agent.id,
      title: this.titleOf(agent),
      status: agent.status,
      cwd: this.cwdOf(agent),
      provider: agent.options?.provider ?? '',
      model: agent.options?.model ?? '',
    }))
  }

  @Remote('groups')
  groups(): GroupInfo[] {
    this.ensureAutoGroup()
    const view: GroupInfo[] = []
    for (const [id, value] of this.groupStore) {
      view.push({ id, name: value.name, memberCount: value.members.length, members: [...value.members] })
    }
    return view
  }

  @Remote('send')
  send(request: SendRequest): SendResult {
    if (request === null || typeof request !== 'object' || typeof request.from !== 'string' || typeof request.targetId !== 'string' || typeof request.text !== 'string') {
      return { ok: false, messageId: '', applied: '', targetId: '', targetStatus: '', error: 'from/targetId/text are required strings' }
    }
    return this.deliver(request)
  }

  @Remote('dormant')
  async dormant(): Promise<DormantListResult> {
    const persistence = this.persistence
    if (persistence === undefined) return { ok: false, conversations: [], error: 'sessionPersistence service unavailable' }
    try {
      const headers = await persistence.list()
      const liveIds = new Set(this.agents.list().map(agent => agent.id))
      const items: DormantConversation[] = []
      for (const header of headers) {
        if (typeof header.id !== 'string' || header.id === '') continue
        if (liveIds.has(header.id)) continue
        if (header.parentSession !== undefined) continue
        if (header.origin === 'subagent') continue
        const cachedTitle = this.cachedTitleOf(header)
        if (cachedTitle !== undefined) this.titleCache.set(header.id, { title: cachedTitle, at: Date.now() })
        items.push({
          id: header.id,
          title: cachedTitle !== undefined ? cachedTitle : await this.titleOfSession(header.id),
          cwd: typeof header.cwd === 'string' ? header.cwd : '',
          createdAt: typeof header.createdAt === 'number' ? header.createdAt : 0,
        })
      }
      items.sort((a, b) => b.createdAt - a.createdAt)
      return { ok: true, conversations: items, error: '' }
    } catch (error) {
      return { ok: false, conversations: [], error: String(error instanceof Error ? error.message : error) }
    }
  }

  @Remote('wakeSend')
  async wakeSend(request: WakeSendRequest): Promise<WakeSendResult> {
    if (request === null || typeof request !== 'object' || typeof request.from !== 'string' || typeof request.targetId !== 'string' || typeof request.text !== 'string') {
      return { ok: false, messageId: '', applied: '', targetId: '', targetStatus: '', resumed: false, error: 'from/targetId/text are required strings' }
    }
    return this.wakeSendInternal(request)
  }

  /** Wake (resume) a dormant top-level session when needed, then deliver like `send`. */
  private async wakeSendInternal(request: WakeSendRequest): Promise<WakeSendResult> {
    const from = request.from
    const targetId = request.targetId
    const fail = (error: string): WakeSendResult => ({ ok: false, messageId: '', applied: '', targetId, targetStatus: '', resumed: false, error })
    if (from === targetId) return fail('cannot send to the same conversation')
    if (!this.isRoot(from)) return fail('sender is not a top-level conversation; intercom is only for parent agents, use the built-in send_message tool for subagent children')
    const fromAgent = this.agents.get(from)
    let target = this.agents.get(targetId)
    let resumed = false
    if (target === undefined) {
      const persistence = this.persistence
      if (persistence === undefined) return fail('target conversation is not live and session persistence is unavailable')
      let header: SessionHeaderLike | undefined
      try {
        const headers = await persistence.list()
        header = headers.find(h => h.id === targetId)
      } catch (error) {
        return fail(`session listing failed: ${String(error instanceof Error ? error.message : error)}`)
      }
      if (header === undefined) return fail(`unknown session: ${targetId}`)
      if (header.parentSession !== undefined) return fail('target is a subagent child, not a top-level conversation; use the built-in send_message tool for parent-child communication')
      if (request.allowCrossWorkspace !== true) {
        const fromCwd = fromAgent === undefined ? '' : this.cwdOf(fromAgent)
        const targetCwd = typeof header.cwd === 'string' ? header.cwd : ''
        if (fromCwd !== '' && targetCwd !== '' && !this.sameWorkspace(fromCwd, targetCwd)) {
          return fail(`cross-workspace delivery blocked: from ${fromCwd} to ${targetCwd}`)
        }
      }
      if (!this.rateAllowed(targetId)) return fail('rate limit exceeded for target conversation')
      const agentOptions = await this.resolveTargetModel(targetId)
      if (agentOptions === undefined) return fail(`cannot resume ${targetId}: no model route (no logged request/header and no deployment default)`)
      try {
        const handle = await this.agents.resume({ resumeSessionId: targetId, agentOptions })
        target = handle.agent
      } catch (error) {
        return fail(`resume failed: ${String(error instanceof Error ? error.message : error)}`)
      }
      resumed = true
    }
    if (target === undefined) return fail(`target is still not live after resume: ${targetId}`)
    const result = this.deliverTo(from, target, request)
    return { ...result, resumed }
  }

  /**
   * Resolve the model route a dormant session should resume with: its own
   * latest logged request/header first, else the deployment default model.
   *
   * A resumed agent built WITHOUT agentOptions ends up with
   * options.model === undefined, which makes the {{model}} persona variable
   * throw at prompt assembly ("no value for this assembly") and the whole
   * woken turn fails. The official web resume path always supplies a route, so
   * wake MUST do the same — preferring the session's own recorded model and
   * never inventing one the deployment does not know.
   */
  private async resolveTargetModel(targetId: string): Promise<{ provider: string; model: string } | undefined> {
    const persistence = this.persistence
    if (persistence !== undefined) {
      try {
        const inspected = await persistence.inspect(targetId)
        if (Array.isArray(inspected?.events)) {
          for (let i = inspected.events.length - 1; i >= 0; i--) {
            const event = inspected.events[i]
            if (event?.type !== 'request/header') continue
            const config = event.data?.header?.config
            if (typeof config?.provider === 'string' && config.provider !== ''
              && typeof config?.model === 'string' && config.model !== '') {
              return { provider: config.provider, model: config.model }
            }
          }
        }
      } catch {
        // inspect unavailable; fall through to the deployment default
      }
    }
    const defaults = this.ctx.get('agentDefaultModel') as { currentSelection?: () => { provider?: string; model?: string } } | undefined
    const selection = defaults?.currentSelection?.()
    if (selection !== undefined && typeof selection.provider === 'string' && selection.provider !== ''
      && typeof selection.model === 'string' && selection.model !== '') {
      return { provider: selection.provider, model: selection.model }
    }
    return undefined
  }

  @Remote('broadcast')
  broadcast(request: BroadcastRequest): BroadcastResult {
    if (request === null || typeof request !== 'object' || typeof request.groupId !== 'string' || typeof request.from !== 'string' || typeof request.text !== 'string') {
      return { ok: false, groupId: '', results: [], error: 'groupId/from/text are required strings' }
    }
    const group = this.groupStore.get(request.groupId)
    if (group === undefined) return { ok: false, groupId: request.groupId, results: [], error: `unknown group: ${request.groupId}` }
    const results: BroadcastMemberResult[] = []
    for (const memberId of group.members) {
      if (memberId === request.from) continue
      const r = this.deliver({ from: request.from, targetId: memberId, text: request.text, delivery: request.delivery, broadcast: true })
      results.push({ targetId: memberId, ok: r.ok, applied: r.applied, error: r.error })
    }
    this.recordBroadcastRelay(request.groupId, request.from, String(request.text).slice(0, MAX_TEXT))
    return { ok: true, groupId: request.groupId, results, error: '' }
  }

  @Remote('readConversation')
  async readConversation(request: ReadConversationRequest): Promise<ReadConversationResult> {
    const sessionId = request === null || typeof request !== 'object' ? '' : String(request.sessionId ?? '')
    if (sessionId === '') return { ok: false, entries: [], error: 'sessionId required' }
    try {
      if (this.queryService === undefined) throw new Error('sessionQuery service unavailable')
      const surface = await this.queryService.readSurface(sessionId)
      const maxEvents = request !== null && typeof request === 'object' && typeof request.maxEvents === 'number' && Number.isFinite(request.maxEvents) ? request.maxEvents : 80
      return { ok: true, entries: this.surfaceEntries(surface.events, -Infinity).slice(-maxEvents), error: '' }
    } catch (error) {
      return { ok: false, entries: [], error: String(error instanceof Error ? error.message : error) }
    }
  }

  @Remote('readGroup')
  async readGroup(request: ReadGroupRequest): Promise<ReadGroupResult> {
    const groupId = request === null || typeof request !== 'object' ? '' : String(request.groupId ?? '')
    const group = this.groupStore.get(groupId)
    if (group === undefined) return { ok: false, entries: [], relays: [], error: `unknown group: ${groupId}` }
    if (this.queryService === undefined) return { ok: false, entries: [], relays: [], error: 'sessionQuery service unavailable' }
    const sinceTime = request !== null && typeof request === 'object' && typeof request.sinceTime === 'number' ? request.sinceTime : 0
    const merged: MessageEntry[] = []
    const backfill: RelayEntry[] = []
    const seenDirect = new Set<string>()
    const seenBroadcast = new Set<string>()
    // Read every member surface in parallel: the auto group can accumulate
    // many members (every conversation that ever exchanged a message), and a
    // serial read makes the panel feel like it never opens.
    const surfaceResults = await Promise.all(group.members.map(async (memberId) => {
      try {
        const surface = await this.queryService?.readSurface(memberId)
        if (surface === undefined) return null
        const agent = this.agents.get(memberId)
        const label = agent === undefined ? this.titleOfById(memberId) : this.titleOf(agent)
        return { memberId, label, surface }
      } catch {
        return null // skip unreadable member
      }
    }))
    for (const result of surfaceResults) {
      if (result === null) continue
      const { memberId, label, surface } = result
      for (const entry of this.surfaceEntries(surface.events, sinceTime)) {
        merged.push({ ...entry, memberId, memberTitle: label })
      }
      // Backfill the relay feed from the persisted relay messages, so the
      // directed view ("A → B" / "A → 全体") survives backend restarts.
      for (const event of surface.events) {
        if (typeof event.time !== 'number' || event.time <= sinceTime) continue
        const message = event.data?.message
        if (message === undefined || message.source === undefined) continue
        const source = message.source
        if (source.kind !== 'plugin' || source.plugin !== 'intercom') continue
        if (typeof source.senderSessionId !== 'string') continue
        const text = this.messageText(message)
        if (text === '') continue
        if (source.broadcast === true) {
          const key = `bc|${source.senderSessionId}|${text}`
          if (seenBroadcast.has(key)) continue
          seenBroadcast.add(key)
          backfill.push({
            id: this.mintId('relay-'),
            messageId: key,
            fromId: source.senderSessionId,
            fromTitle: this.titleOfById(source.senderSessionId),
            toId: '*',
            toTitle: '全体成员',
            text,
            time: event.time,
          })
        } else {
          const mid = typeof message.id === 'string' ? message.id : ''
          if (mid !== '' && seenDirect.has(mid)) continue
          if (mid !== '') seenDirect.add(mid)
          backfill.push({
            id: this.mintId('relay-'),
            messageId: mid,
            fromId: source.senderSessionId,
            fromTitle: this.titleOfById(source.senderSessionId),
            toId: memberId,
            toTitle: label,
            text,
            time: event.time,
          })
        }
      }
    }
    merged.sort((a, b) => a.time - b.time)
    const live = this.relayLog.get(groupId) ?? []
    const liveIds = new Set(live.map(r => r.messageId).filter(id => id !== ''))
    const filtered = backfill.filter(r => r.messageId === '' || !liveIds.has(r.messageId))
    const relays = [...filtered, ...live].sort((a, b) => b.time - a.time).slice(0, 200)
    return { ok: true, entries: merged.slice(-200), relays, error: '' }
  }

  @Remote('createGroup')
  createGroup(request: CreateGroupRequest): CreateGroupResult {
    if (request === null || typeof request !== 'object' || typeof request.name !== 'string' || typeof request.memberIds !== 'string') {
      return { ok: false, groupId: '', name: '', memberCount: 0, error: 'name/memberIds (comma-separated) are required strings' }
    }
    const id = this.mintId('grp-')
    const members: string[] = []
    for (const memberId of String(request.memberIds).split(',').map(s => s.trim())) {
      if (memberId !== '' && this.isRoot(memberId) && !members.includes(memberId)) members.push(memberId)
    }
    const name = String(request.name).slice(0, 60) || id
    this.groupStore.set(id, { name, members })
    this.persist()
    return { ok: true, groupId: id, name, memberCount: members.length, error: '' }
  }

  @Remote('addMember')
  addMember(request: GroupMemberRequest): OkResult {
    const groupId = request === null || typeof request !== 'object' ? '' : String(request.groupId ?? '')
    const memberId = request === null || typeof request !== 'object' ? '' : String(request.memberId ?? '')
    const group = this.groupStore.get(groupId)
    if (group === undefined) return { ok: false, error: 'unknown group' }
    if (memberId === '') return { ok: false, error: 'memberId required' }
    if (!this.isRoot(memberId)) return { ok: false, error: 'only top-level conversations can join a group' }
    if (!group.members.includes(memberId)) group.members.push(memberId)
    this.persist()
    return { ok: true, error: '' }
  }

  @Remote('removeMember')
  removeMember(request: GroupMemberRequest): OkResult {
    const groupId = request === null || typeof request !== 'object' ? '' : String(request.groupId ?? '')
    const memberId = request === null || typeof request !== 'object' ? '' : String(request.memberId ?? '')
    const group = this.groupStore.get(groupId)
    if (group === undefined) return { ok: false, error: 'unknown group' }
    const index = group.members.indexOf(memberId)
    if (index !== -1) group.members.splice(index, 1)
    this.persist()
    return { ok: true, error: '' }
  }

  @Remote('removeGroup')
  removeGroup(request: RemoveGroupRequest): OkResult {
    const groupId = request === null || typeof request !== 'object' ? '' : String(request.groupId ?? '')
    if (groupId === AUTO_GROUP_ID) return { ok: false, error: 'the automatic group cannot be removed' }
    if (!this.groupStore.has(groupId)) return { ok: false, error: `unknown group: ${groupId}` }
    this.groupStore.delete(groupId)
    this.relayLog.delete(groupId)
    this.persist()
    return { ok: true, error: '' }
  }

  // ---- model tools ----

  private registerTools(ctx: Context): void {
    const tools = ctx.get('tools') as { register(tool: unknown): () => void } | undefined
    if (tools === undefined) {
      console.error('[intercom] tools service unavailable; model tools are skipped')
      return
    }
    const disposers: Array<() => void> = []

    disposers.push(tools.register(defineTool({
      name: 'intercom_list_conversations',
      description: 'List all live TOP-LEVEL conversations (parent agents) in this DSH process: id, title, status and cwd (workspace). Subagent children are NOT listed: parent-child communication belongs to the built-in send_message/list_agents tools. Use this to discover peer conversations before addressing one with intercom_send. The id is the only valid address. Coordination is restricted to the same workspace by default.',
      parameters: {},
      output: {
        schema: { type: 'object', additionalProperties: false, properties: { conversations: { type: 'array', required: true } } },
        render: (_args: unknown, value: unknown) => [{ type: 'text', text: `live top-level conversations: ${JSON.stringify(value)}` }],
      },
      execute: async () => {
        return { conversations: this.agents.roots().map(agent => ({ id: agent.id, title: this.titleOf(agent), status: agent.status, cwd: this.cwdOf(agent) })) }
      },
    })))

    disposers.push(tools.register(defineTool({
      name: 'intercom_list_dormant_conversations',
      description: 'List dormant (persisted but not live) TOP-LEVEL conversations in this DSH process: id, title, cwd and createdAt, newest first. These sessions are stored but have no running agent; use intercom_wake_send to resume one and deliver work to it (延续工作). Subagent children are excluded.',
      parameters: {},
      output: {
        schema: { type: 'object', additionalProperties: false, properties: { conversations: { type: 'array', required: true } } },
        render: (_args: unknown, value: unknown) => [{ type: 'text', text: `dormant top-level conversations: ${JSON.stringify(value)}` }],
      },
      execute: async () => {
        const result = await this.dormant()
        return { conversations: result.conversations }
      },
    })))

    disposers.push(tools.register(defineTool({
      name: 'intercom_send',
      description: 'Send a message to another live TOP-LEVEL conversation (parent agent) in the SAME workspace. Both sender and target must be top-level conversations; for subagent children use the built-in send_message tool instead. target_id must be an exact id from intercom_list_conversations. delivery wake: an idle target immediately starts a new turn to work on it; a busy target queues it for its next step. delivery steer: inserts into the target\'s current turn (use sparingly). Rate-limited; wake budget prevents message loops. Use intercom_ask when you need a reply.',
      parameters: {
        target_id: { type: 'string', required: true, description: 'exact top-level conversation id from intercom_list_conversations' },
        message: { type: 'string', required: true, description: 'message text to deliver' },
        delivery: { type: 'string', required: true, description: 'delivery mode: wake (default behavior, also applied for any other value) or steer' },
      },
      output: {
        schema: { type: 'object', additionalProperties: false, properties: { ok: { type: 'boolean', required: true }, messageId: { type: 'string', required: true }, applied: { type: 'string', required: true }, targetId: { type: 'string', required: true }, targetStatus: { type: 'string', required: true } } },
        render: (_args: unknown, _value: unknown) => [{ type: 'text', text: 'delivered (see structured value)' }],
      },
      execute: async (args: { target_id?: unknown; message?: unknown; delivery?: unknown }, exec: ToolExecutionLike) => {
        const from = exec.agent
        if (from === undefined) throw new Error('intercom_send requires a calling agent (exec.agent was undefined)')
        const result = this.deliver({ from: from.id, targetId: String(args.target_id), text: String(args.message), delivery: String(args.delivery ?? 'wake') })
        if (result.ok) return { ok: result.ok, messageId: result.messageId, applied: result.applied, targetId: result.targetId, targetStatus: result.targetStatus }
        throw new Error(result.error)
      },
    })))

    disposers.push(tools.register(defineTool({
      name: 'intercom_wake_send',
      description: 'Wake a dormant (not live) TOP-LEVEL conversation and deliver a message so it starts working on it (唤醒休眠对话并延续工作). Use this to continue another conversation\'s work without opening it manually: the target session is resumed, then the message is delivered (idle target→wake, busy→queue). target_id may come from intercom_list_dormant_conversations, or be a live id from intercom_list_conversations. Same-workspace only, top-level conversations only; for subagent children use the built-in send_message tool.',
      parameters: {
        target_id: { type: 'string', required: true, description: 'exact top-level session id (dormant or live)' },
        message: { type: 'string', required: true, description: 'message text to deliver after waking' },
        delivery: { type: 'string', required: true, description: 'delivery mode: wake (default behavior, also applied for any other value) or steer' },
      },
      output: {
        schema: { type: 'object', additionalProperties: false, properties: { ok: { type: 'boolean', required: true }, messageId: { type: 'string', required: true }, applied: { type: 'string', required: true }, targetId: { type: 'string', required: true }, targetStatus: { type: 'string', required: true }, resumed: { type: 'boolean', required: true } } },
        render: (_args: unknown, value: unknown) => [{ type: 'text', text: `wake-send ${(value as { resumed: boolean }).resumed ? '(resumed dormant session) ' : ''}${(value as { applied: string }).applied}` }],
      },
      execute: async (args: { target_id?: unknown; message?: unknown; delivery?: unknown }, exec: ToolExecutionLike) => {
        const from = exec.agent
        if (from === undefined) throw new Error('intercom_wake_send requires a calling agent (exec.agent was undefined)')
        const result = await this.wakeSendInternal({ from: from.id, targetId: String(args.target_id), text: String(args.message), delivery: String(args.delivery ?? 'wake') })
        if (result.ok) return { ok: result.ok, messageId: result.messageId, applied: result.applied, targetId: result.targetId, targetStatus: result.targetStatus, resumed: result.resumed }
        throw new Error(result.error)
      },
    })))

    disposers.push(tools.register(defineTool({
      name: 'intercom_read_conversation',
      description: 'Read the recent conversation surface (user tasks and assistant conclusions) of another session, live or cold. Use this to continue another conversation\'s work (延续工作): extract its current state and hand off locally or to a new conversation. Read-only: never wakes the target.',
      parameters: {
        target_id: { type: 'string', required: true, description: 'exact session id to read' },
        max_events: { type: 'number', required: true, description: 'maximum number of recent surface events to read, e.g. 20' },
      },
      output: {
        schema: { type: 'object', additionalProperties: false, properties: { ok: { type: 'boolean', required: true }, targetId: { type: 'string', required: true }, text: { type: 'string', required: true }, error: { type: 'string', required: true } } },
        render: (_args: unknown, value: unknown) => [{ type: 'text', text: (value as { text: string }).text }],
      },
      execute: async (args: { target_id?: unknown; max_events?: unknown }) => {
        try {
          const result = await this.readConversation({ sessionId: String(args.target_id), maxEvents: Number(args.max_events) })
          if (result.ok) return { ok: true, targetId: String(args.target_id), text: result.entries.map(e => `[${e.role}] ${e.text}`).join('\n').slice(0, 16000), error: '' }
          return { ok: false, targetId: String(args.target_id), text: '', error: result.error }
        } catch (error) {
          return { ok: false, targetId: String(args.target_id), text: '', error: String(error instanceof Error ? error.message : error) }
        }
      },
    })))

    disposers.push(tools.register(defineTool({
      name: 'intercom_check_replies',
      description: 'Collect new conversation content from a target session after a given epoch-milliseconds timestamp. Pass since_time 0 to auto-use the timestamp of your last intercom message to that target. Use after intercom_send to gather the target\'s answer (请求帮助的回收端). Works for cold sessions too. Read-only.',
      parameters: {
        target_id: { type: 'string', required: true, description: 'exact session id' },
        since_time: { type: 'number', required: true, description: 'epoch ms; 0 = since your last intercom message to this target' },
      },
      output: {
        schema: { type: 'object', additionalProperties: false, properties: { ok: { type: 'boolean', required: true }, targetId: { type: 'string', required: true }, hasNew: { type: 'boolean', required: true }, text: { type: 'string', required: true }, error: { type: 'string', required: true } } },
        render: (_args: unknown, value: unknown) => [{ type: 'text', text: (value as { text: string }).text }],
      },
      execute: async (args: { target_id?: unknown; since_time?: unknown }, exec: ToolExecutionLike) => {
        const targetId = String(args.target_id)
        let since = Number(args.since_time)
        if (since === 0 && exec.agent !== undefined) {
          const sentList = this.outbox.get(exec.agent.id)
          if (sentList !== undefined) {
            for (let i = sentList.length - 1; i >= 0; i--) {
              const record = sentList[i]
              if (record !== undefined && record.to === targetId) { since = record.time; break }
            }
          }
        }
        try {
          if (this.queryService === undefined) throw new Error('sessionQuery service unavailable')
          const surface = await this.queryService.readSurface(targetId)
          const text = this.surfaceText(surface.events, since)
          return { ok: true, targetId, hasNew: text !== '', text, error: '' }
        } catch (error) {
          return { ok: false, targetId, hasNew: false, text: '', error: String(error instanceof Error ? error.message : error) }
        }
      },
    })))

    disposers.push(tools.register(defineTool({
      name: 'intercom_ask',
      description: 'Ask another live TOP-LEVEL conversation for help and optionally wait up to wait_ms (cap 30000) for its reply. Both parties must be top-level conversations (for subagent children use send_message). This is send + bounded reply collection in one call: the target is woken if idle, and any new reply text is returned in replyText.',
      parameters: {
        target_id: { type: 'string', required: true, description: 'exact top-level conversation id from intercom_list_conversations' },
        message: { type: 'string', required: true, description: 'the task or question for the target' },
        wait_ms: { type: 'number', required: true, description: 'milliseconds to wait for a reply, 0 = do not wait, capped at 30000' },
      },
      output: {
        schema: { type: 'object', additionalProperties: false, properties: { ok: { type: 'boolean', required: true }, messageId: { type: 'string', required: true }, applied: { type: 'string', required: true }, targetId: { type: 'string', required: true }, targetStatus: { type: 'string', required: true }, replyFound: { type: 'boolean', required: true }, replyText: { type: 'string', required: true }, error: { type: 'string', required: true } } },
        render: (_args: unknown, value: unknown) => [{ type: 'text', text: (value as { replyText: string }).replyText || 'no reply within wait window' }],
      },
      execute: async (args: { target_id?: unknown; message?: unknown; wait_ms?: unknown }, exec: ToolExecutionLike) => {
        const from = exec.agent
        if (from === undefined) throw new Error('intercom_ask requires a calling agent')
        const sentAt = Date.now()
        const result = this.deliver({ from: from.id, targetId: String(args.target_id), text: String(args.message), delivery: 'wake' })
        if (!result.ok) return { ok: false, messageId: '', applied: '', targetId: String(args.target_id), targetStatus: '', replyFound: false, replyText: '', error: result.error }
        let replyFound = false
        let replyText = ''
        const waitMs = Math.min(30_000, Math.max(0, Number(args.wait_ms) || 0))
        if (waitMs > 0 && this.queryService !== undefined) {
          const deadline = Date.now() + waitMs
          while (Date.now() < deadline) {
            await wait(1000)
            try {
              const surface = await this.queryService.readSurface(result.targetId)
              const text = this.surfaceEntries(surface.events, sentAt - 1)
                .filter(entry => !entry.text.includes(result.messageId))
                .map(entry => `[${entry.role}] ${entry.text}`)
                .join('\n')
              if (text !== '') { replyFound = true; replyText = text; break }
            } catch { /* keep polling */ }
          }
        }
        return { ok: true, messageId: result.messageId, applied: result.applied, targetId: result.targetId, targetStatus: result.targetStatus, replyFound, replyText, error: '' }
      },
    })))

    disposers.push(tools.register(defineTool({
      name: 'intercom_collect',
      description: 'Collect the current status and the last assistant conclusion from a list of conversations (parallel cooperation aggregation). Pass target_ids as a comma-separated list of exact ids from intercom_list_conversations. Read-only.',
      parameters: {
        target_ids: { type: 'string', required: true, description: 'comma-separated exact conversation ids' },
      },
      output: {
        schema: { type: 'object', additionalProperties: false, properties: { ok: { type: 'boolean', required: true }, results: { type: 'array', required: true }, error: { type: 'string', required: true } } },
        render: (_args: unknown, value: unknown) => [{ type: 'text', text: `collected: ${JSON.stringify(value)}` }],
      },
      execute: async (args: { target_ids?: unknown }) => {
        const ids = String(args.target_ids).split(',').map(s => s.trim()).filter(s => s !== '').slice(0, 20)
        const results: Array<{ id: string; status: string; lastAssistantText: string }> = []
        for (const id of ids) {
          const agent = this.agents.get(id)
          const status = agent === undefined ? 'not-live' : agent.status
          let lastAssistantText = ''
          try {
            if (this.queryService !== undefined) {
              const surface = await this.queryService.readSurface(id)
              lastAssistantText = this.lastAssistantText(this.surfaceEntries(surface.events, -Infinity))
            }
          } catch { /* keep empty */ }
          results.push({ id, status, lastAssistantText })
        }
        return { ok: true, results, error: '' }
      },
    })))

    disposers.push(tools.register(defineTool({
      name: 'intercom_spawn_conversation',
      description: 'Start a new subagent child (durable continuable child via the subagents service) that begins working on the given prompt immediately. NOTE: the new conversation is YOUR SUBAGENT CHILD — manage it with the built-in send_message/list_agents tools, NOT intercom (intercom is only for top-level conversations). The child inherits your workspace, provider and model.',
      parameters: {
        prompt: { type: 'string', required: true, description: 'first prompt the new child starts working on' },
      },
      output: {
        schema: { type: 'object', additionalProperties: false, properties: { ok: { type: 'boolean', required: true }, sessionId: { type: 'string', required: true }, transient: { type: 'boolean', required: true }, error: { type: 'string', required: true } } },
        render: (_args: unknown, value: unknown) => [{ type: 'text', text: (value as { sessionId: string }).sessionId }],
      },
      execute: async (args: { prompt?: unknown }, exec: ToolExecutionLike) => {
        const from = exec.agent
        if (from === undefined) throw new Error('intercom_spawn_conversation requires a calling agent')
        const promptText = String(args.prompt).slice(0, MAX_TEXT)
        const providerName = this.continuableProviderName()
        if (providerName !== '' && this.subagents !== undefined) {
          try {
            const start = await this.subagents.startContinuable({
              provider: providerName,
              label: 'intercom-spawn',
              request: { prompt: [{ type: 'text', text: promptText }], parent: from },
              signal: exec.signal ?? new AbortController().signal,
            })
            return { ok: true, sessionId: start.childId, transient: false, error: '' }
          } catch (error) {
            console.error(`[intercom] startContinuable failed, falling back to in-process spawn: ${String(error instanceof Error ? error.message : error)}`)
          }
        }
        try {
          const provider = from.options?.provider ?? ''
          const model = from.options?.model ?? ''
          if (provider === '' || model === '') throw new Error('calling agent has no provider/model to inherit')
          const cwd = this.cwdOf(from)
          const sessionId = this.mintId('session-intercom-')
          const handle = await this.agents.create({
            sessionId,
            meta: { parentSession: from.id, ...(cwd === '' ? {} : { cwd }) },
            agentOptions: { provider, model },
          })
          const first = { id: this.mintId('dsh-intercom-'), role: 'user', content: [{ type: 'text', text: promptText }], source: { kind: 'user' } }
          handle.agent.followup(first)
          return { ok: true, sessionId: handle.agent.id, transient: true, error: '' }
        } catch (error) {
          return { ok: false, sessionId: '', transient: true, error: String(error instanceof Error ? error.message : error) }
        }
      },
    })))

    disposers.push(tools.register(defineTool({
      name: 'intercom_create_group',
      description: 'Create an explicit coordination group (对话群) from a list of TOP-LEVEL conversation ids. Use for multi-conversation cooperation among parent agents: members can be addressed together via intercom_broadcast and read together via intercom_read_group. Groups survive backend restarts.',
      parameters: {
        name: { type: 'string', required: true, description: 'group display name' },
        member_ids: { type: 'string', required: true, description: 'comma-separated exact top-level conversation ids' },
      },
      output: {
        schema: { type: 'object', additionalProperties: false, properties: { ok: { type: 'boolean', required: true }, groupId: { type: 'string', required: true }, name: { type: 'string', required: true }, memberCount: { type: 'number', required: true }, error: { type: 'string', required: true } } },
        render: (_args: unknown, value: unknown) => [{ type: 'text', text: (value as { name: string; memberCount: number }).name }],
      },
      execute: async (args: { name?: unknown; member_ids?: unknown }) => {
        return this.createGroup({ name: String(args.name), memberIds: String(args.member_ids) })
      },
    })))

    disposers.push(tools.register(defineTool({
      name: 'intercom_broadcast',
      description: 'Broadcast one message to every member of a group (对话群) except yourself. Members are top-level conversations only; live members receive it with wake semantics (idle members start a new turn immediately, busy members queue it). Returns per-member delivery results.',
      parameters: {
        group_id: { type: 'string', required: true, description: 'exact group id from intercom_list_groups' },
        message: { type: 'string', required: true, description: 'message text to broadcast' },
        delivery: { type: 'string', required: true, description: 'wake or steer' },
      },
      output: {
        schema: { type: 'object', additionalProperties: false, properties: { ok: { type: 'boolean', required: true }, groupId: { type: 'string', required: true }, results: { type: 'array', required: true }, error: { type: 'string', required: true } } },
        render: (_args: unknown, value: unknown) => [{ type: 'text', text: `broadcast: ${JSON.stringify(value)}` }],
      },
      execute: async (args: { group_id?: unknown; message?: unknown; delivery?: unknown }, exec: ToolExecutionLike) => {
        const from = exec.agent
        if (from === undefined) throw new Error('intercom_broadcast requires a calling agent')
        return this.broadcast({ groupId: String(args.group_id), from: from.id, text: String(args.message), delivery: String(args.delivery ?? 'wake') })
      },
    })))

    disposers.push(tools.register(defineTool({
      name: 'intercom_list_groups',
      description: 'List all coordination groups (对话群), including the automatic group「协作中的对话」that collects top-level conversations involved in intercom traffic. Returns group id, name, memberCount and member ids.',
      parameters: {},
      output: {
        schema: { type: 'object', additionalProperties: false, properties: { groups: { type: 'array', required: true }, error: { type: 'string', required: true } } },
        render: (_args: unknown, value: unknown) => [{ type: 'text', text: `groups: ${JSON.stringify(value)}` }],
      },
      execute: async () => {
        return { groups: this.groups(), error: '' }
      },
    })))

    disposers.push(tools.register(defineTool({
      name: 'intercom_read_group',
      description: 'Read the merged recent conversation content of every member of a group (对话群聊天记录) since the given epoch-milliseconds timestamp. Pass since_time 0 for no filter. Each member\'s content is labeled with its title.',
      parameters: {
        group_id: { type: 'string', required: true, description: 'exact group id from intercom_list_groups' },
        since_time: { type: 'number', required: true, description: 'epoch ms; 0 = no filter' },
      },
      output: {
        schema: { type: 'object', additionalProperties: false, properties: { ok: { type: 'boolean', required: true }, groupId: { type: 'string', required: true }, text: { type: 'string', required: true }, error: { type: 'string', required: true } } },
        render: (_args: unknown, value: unknown) => [{ type: 'text', text: (value as { text: string }).text }],
      },
      execute: async (args: { group_id?: unknown; since_time?: unknown }) => {
        const result = await this.readGroup({ groupId: String(args.group_id), sinceTime: Number(args.since_time) || 0 })
        if (result.ok) {
          const relayLines = result.relays.map(r => r.toId === '*' ? `📢 ${r.fromTitle} → 全体成员: ${r.text}` : `📤 ${r.fromTitle} → ${r.toTitle}: ${r.text}`)
          const entryLines = result.entries.map(e => `${e.memberTitle ?? ''}: [${e.role}] ${e.text}`)
          const text = [...relayLines, ...entryLines].join('\n').slice(0, 16000)
          return { ok: true, groupId: String(args.group_id), text, error: '' }
        }
        return { ok: false, groupId: String(args.group_id), text: '', error: result.error }
      },
    })))

    disposers.push(tools.register(defineTool({
      name: 'intercom_remove_group',
      description: 'Delete an explicit coordination group (对话群). The automatic group 「协作中的对话(自动)」cannot be removed. Removing a group only deletes the group record; the member conversations and their histories are untouched.',
      parameters: {
        group_id: { type: 'string', required: true, description: 'exact group id from intercom_list_groups (must not be the automatic group)' },
      },
      output: {
        schema: { type: 'object', additionalProperties: false, properties: { ok: { type: 'boolean', required: true }, error: { type: 'string', required: true } } },
        render: (_args: unknown, value: unknown) => [{ type: 'text', text: (value as { ok: boolean }).ok ? 'group removed' : `failed: ${(value as { error: string }).error}` }],
      },
      execute: async (args: { group_id?: unknown }) => {
        const result = this.removeGroup({ groupId: String(args.group_id) })
        if (result.ok) return { ok: true, error: '' }
        throw new Error(result.error)
      },
    })))

    ctx.effect(() => () => { for (const dispose of disposers) dispose() }, 'intercom: tool disposers')
  }
}

export default IntercomGateway
