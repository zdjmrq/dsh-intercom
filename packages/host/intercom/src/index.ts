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
  GroupInfo,
  GroupMemberRequest,
  MessageEntry,
  OkResult,
  ReadConversationRequest,
  ReadConversationResult,
  ReadGroupRequest,
  ReadGroupResult,
  SendRequest,
  SendResult,
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
  roots(): AgentLike[]
  create(options: unknown): Promise<{ agent: AgentLike }>
}

interface TitleService {
  get(session: unknown): { title?: string } | undefined
}

interface ContentBlockLike { type: string; text?: string }
interface SurfaceMessageLike { id?: string; content?: ContentBlockLike[] }
interface SurfaceEventLike { type: string; time?: number; data?: { message?: SurfaceMessageLike } }
interface QueryService {
  readSurface(sessionId: string): Promise<{ events: SurfaceEventLike[] }>
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
  private groupStore = new Map<string, GroupValue>()
  private outbox = new Map<string, SentRecord[]>()
  private spentWakes = new WeakMap<object, number>()
  private rateBuckets = new Map<string, number[]>()
  private counter = 0
  private domain: DomainLike | null = null

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

  private buildMessage(from: string, fromTitle: string, text: string): unknown {
    return {
      id: this.mintId('dsh-intercom-'),
      role: 'user',
      content: [{ type: 'text', text: `[intercom] 来自会话「${fromTitle}」的消息,请先评估其合理性再行动:\n${text}` }],
      source: { kind: 'plugin', plugin: 'intercom', form: 'relay', senderSessionId: from, summary: 'intercom relay' },
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
    const text = String(request.text).slice(0, MAX_TEXT)
    const delivery = request.delivery === 'steer' ? 'steer' : 'wake'
    if (from === targetId) return { ok: false, messageId: '', applied: '', targetId, targetStatus: '', error: 'cannot send to the same conversation' }
    if (!this.isRoot(from)) return { ok: false, messageId: '', applied: '', targetId, targetStatus: '', error: 'sender is not a top-level conversation; intercom is only for parent agents, use the built-in send_message tool for subagent children' }
    if (!this.isRoot(targetId)) return { ok: false, messageId: '', applied: '', targetId, targetStatus: '', error: 'target is a subagent child, not a top-level conversation; use the built-in send_message tool for parent-child communication' }
    const target = this.agents.get(targetId)
    if (target === undefined) return { ok: false, messageId: '', applied: '', targetId, targetStatus: '', error: `target conversation is not live: ${targetId}` }
    const fromAgent = this.agents.get(from)
    if (request.allowCrossWorkspace !== true) {
      const fromCwd = fromAgent === undefined ? '' : this.cwdOf(fromAgent)
      const targetCwd = this.cwdOf(target)
      if (fromCwd !== '' && targetCwd !== '' && fromCwd !== targetCwd) {
        return { ok: false, messageId: '', applied: '', targetId, targetStatus: '', error: `cross-workspace delivery blocked: from ${fromCwd} to ${targetCwd}` }
      }
    }
    if (!this.rateAllowed(targetId)) return { ok: false, messageId: '', applied: '', targetId, targetStatus: '', error: 'rate limit exceeded for target conversation' }
    const fromTitle = fromAgent === undefined ? from : this.titleOf(fromAgent)
    const message = this.buildMessage(from, fromTitle, text)
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
    this.recordOutbox(from, (message as { id: string }).id, targetId)
    return { ok: true, messageId: (message as { id: string }).id, applied, targetId, targetStatus: target.status, error: '' }
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
      const r = this.deliver({ from: request.from, targetId: memberId, text: request.text, delivery: request.delivery })
      results.push({ targetId: memberId, ok: r.ok, applied: r.applied, error: r.error })
    }
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
    if (group === undefined) return { ok: false, entries: [], error: `unknown group: ${groupId}` }
    if (this.queryService === undefined) return { ok: false, entries: [], error: 'sessionQuery service unavailable' }
    const sinceTime = request !== null && typeof request === 'object' && typeof request.sinceTime === 'number' ? request.sinceTime : 0
    const merged: MessageEntry[] = []
    for (const memberId of group.members) {
      try {
        const surface = await this.queryService.readSurface(memberId)
        const agent = this.agents.get(memberId)
        const label = agent === undefined ? memberId : this.titleOf(agent)
        for (const entry of this.surfaceEntries(surface.events, sinceTime)) {
          merged.push({ ...entry, memberId, memberTitle: label })
        }
      } catch { /* skip unreadable member */ }
    }
    merged.sort((a, b) => a.time - b.time)
    return { ok: true, entries: merged.slice(-200), error: '' }
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
          const text = result.entries.map(e => `${e.memberTitle ?? ''}: [${e.role}] ${e.text}`).join('\n').slice(0, 16000)
          return { ok: true, groupId: String(args.group_id), text, error: '' }
        }
        return { ok: false, groupId: String(args.group_id), text: '', error: result.error }
      },
    })))

    ctx.effect(() => () => { for (const dispose of disposers) dispose() }, 'intercom: tool disposers')
  }
}

export default IntercomGateway
