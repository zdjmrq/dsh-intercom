/**
 * Browser half of the intercom plugin: the chat-style communication center.
 * Left column lists top-level conversations and coordination groups; the right
 * pane shows the message history and the single composer. Backed by the
 * intercom Host Remote (`ctx.remote.intercom`).
 * @module @deepseek-ai/dsh-client-ui-intercom/client
 */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-host-intercom/remote'
import { createElement as h, useEffect, useState, type FunctionComponent } from 'react'

const ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244"/></svg>'
const CLOSE_ICON = '<svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>'

const STYLES = `
  .dsh-ic-panel { position: fixed; top: 60px; right: 16px; width: 384px; max-height: calc(100vh - 96px); overflow: auto; background: var(--dsw-alias-bg-overlay, #ffffff); color: var(--dsw-alias-label-primary, #1f2328); border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.12)); border-radius: 12px; box-shadow: 0 16px 48px rgba(0,0,0,.22); font: 13.5px/1.5 system-ui, -apple-system, sans-serif; pointer-events: auto; z-index: 1000; display: flex; flex-direction: column; }
  .dsh-ic-panel.dsh-ic-wide { width: 680px; height: min(76vh, 560px); overflow: hidden; }
  .dsh-ic-head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.08)); flex: none; }
  .dsh-ic-head-title { font-size: 14.5px; font-weight: 600; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .dsh-ic-head-title svg { vertical-align: -2px; margin-right: 6px; color: var(--dsw-alias-brand-primary, #0b57d0); }
  .dsh-ic-sec-title { font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--dsw-alias-label-secondary, #6b7280); margin: 2px 0 6px; }
  .dsh-ic-badge { flex: none; padding: 1px 8px; border-radius: 10px; font-size: 11px; line-height: 16px; }
  .dsh-ic-badge.idle { background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #1a7f37) 14%, transparent); color: var(--dsw-alias-state-success-primary, #1a7f37); }
  .dsh-ic-badge.running { background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #9a6700) 16%, transparent); color: var(--dsw-alias-state-warn-primary, #9a6700); }
  .dsh-ic-cwd { display: block; color: var(--dsw-alias-label-secondary, #6b7280); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .dsh-ic-btn { flex: none; display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.14)); border-radius: 6px; background: transparent; color: var(--dsw-alias-label-primary, #1f2328); font-size: 12.5px; cursor: pointer; }
  .dsh-ic-btn:hover { background: var(--dsw-alias-bg-layer-2, rgba(0,0,0,.05)); }
  .dsh-ic-btn:disabled { opacity: .45; cursor: default; }
  .dsh-ic-btn-primary { background: var(--dsw-alias-brand-primary, #0b57d0); border-color: transparent; color: #fff; font-weight: 500; }
  .dsh-ic-btn-primary:hover { background: var(--dsw-alias-brand-primary, #0b57d0); filter: brightness(1.08); }
  .dsh-ic-iconbtn { flex: none; align-self: center; display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; box-sizing: border-box; border: none; border-radius: 7px; background: transparent; color: var(--dsw-alias-label-primary, #24292f); cursor: pointer; padding: 0; margin: 0; line-height: 0; }
  .dsh-ic-iconbtn svg { display: block; }
  .dsh-ic-iconbtn:hover { background: var(--dsw-alias-bg-layer-2, rgba(0,0,0,.06)); }
  .dsh-ic-sidebtn { display: flex; align-items: center; gap: 8px; width: 100%; box-sizing: border-box; padding: 6px 8px; border: none; border-radius: 8px; background: transparent; color: var(--dsw-alias-label-primary, #24292f); font: 14px/1.5 system-ui, -apple-system, sans-serif; cursor: pointer; }
  .dsh-ic-sidebtn:hover { background: var(--dsw-alias-bg-layer-2, rgba(0,0,0,.06)); }
  .dsh-ic-sidebtn svg { flex: none; }
  .dsh-ic-sidebtn-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .dsh-ic-sidebtn-rail { justify-content: center; padding: 6px 0; }
  .dsh-ic-input { width: 100%; box-sizing: border-box; margin: 4px 0; padding: 7px 9px; border: 1px solid var(--dsw-alias-border-l2, rgba(0,0,0,.2)); border-radius: 8px; background: var(--dsw-alias-bg-layer-1, #ffffff); color: var(--dsw-alias-label-primary, #1f2328); font: inherit; }
  .dsh-ic-input:focus { outline: 2px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #0b57d0) 35%, transparent); outline-offset: -1px; border-color: var(--dsw-alias-brand-primary, #0b57d0); }
  .dsh-ic-feedback { min-height: 16px; padding: 4px 2px; color: var(--dsw-alias-label-secondary, #6b7280); font-size: 12.5px; white-space: pre-wrap; word-break: break-all; }
  .dsh-ic-feedback.err { color: var(--dsw-alias-state-error-primary, #d1242f); }
  .dsh-ic-feedback.ok { color: var(--dsw-alias-state-success-primary, #1a7f37); }
  .dsh-ic-body { display: flex; flex: 1; min-height: 0; }
  .dsh-ic-side { width: 212px; flex: none; border-right: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.08)); display: flex; flex-direction: column; min-height: 0; }
  .dsh-ic-tabs { display: flex; gap: 4px; padding: 8px 8px 6px; border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.06)); flex: none; }
  .dsh-ic-tab { flex: 1; padding: 5px 0; border: none; border-radius: 6px; background: transparent; color: var(--dsw-alias-label-secondary, #6b7280); font-size: 12.5px; font-weight: 500; cursor: pointer; }
  .dsh-ic-tab:hover { background: var(--dsw-alias-bg-layer-2, rgba(0,0,0,.04)); }
  .dsh-ic-tab.active { background: color-mix(in srgb, var(--dsw-alias-brand-primary, #0b57d0) 12%, transparent); color: var(--dsw-alias-brand-primary, #0b57d0); }
  .dsh-ic-list { flex: 1; overflow: auto; padding: 6px; }
  .dsh-ic-item { padding: 6px 8px; border-radius: 8px; cursor: pointer; }
  .dsh-ic-item:hover { background: var(--dsw-alias-bg-layer-2, rgba(0,0,0,.04)); }
  .dsh-ic-item.active { background: color-mix(in srgb, var(--dsw-alias-brand-primary, #0b57d0) 10%, transparent); }
  .dsh-ic-item-head { display: flex; align-items: center; gap: 6px; }
  .dsh-ic-item-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; font-size: 13.5px; }
  .dsh-ic-main { flex: 1; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
  .dsh-ic-chat-head { flex: none; display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.08)); }
  .dsh-ic-chat-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; font-size: 13.5px; }
  .dsh-ic-msgs { flex: 1; overflow: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
  .dsh-ic-msg { max-width: 78%; padding: 7px 10px; border-radius: 10px; font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
  .dsh-ic-msg.user { align-self: flex-end; background: var(--dsw-alias-brand-primary, #0b57d0); color: #fff; border-bottom-right-radius: 3px; }
  .dsh-ic-msg.assistant { align-self: flex-start; background: var(--dsw-alias-bg-layer-2, rgba(0,0,0,.05)); color: var(--dsw-alias-label-primary, #1f2328); border-bottom-left-radius: 3px; }
  .dsh-ic-msg-from { display: block; font-size: 11px; color: var(--dsw-alias-label-secondary, #6b7280); margin-bottom: 2px; }
  .dsh-ic-empty { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--dsw-alias-label-secondary, #6b7280); font-size: 12.5px; padding: 16px; text-align: center; }
  .dsh-ic-composer { flex: none; display: flex; gap: 6px; align-items: flex-end; padding: 10px 12px; border-top: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.08)); }
  .dsh-ic-composer .dsh-ic-input { margin: 0; resize: none; }
  .dsh-ic-member-row { display: flex; align-items: center; gap: 6px; padding: 3px 6px; border-radius: 6px; font-size: 12.5px; }
  .dsh-ic-member-row:hover { background: var(--dsw-alias-bg-layer-2, rgba(0,0,0,.04)); }
  .dsh-ic-member-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`

interface ConversationInfo { id: string; title: string; status: string; cwd: string; provider: string; model: string }
interface GroupInfo { id: string; name: string; memberCount: number; members: string[] }
interface MessageEntry { role: 'user' | 'assistant'; text: string; time: number; memberId?: string; memberTitle?: string }
interface RemoteEnvelope<T> { ok: boolean; value?: T; error?: { message: string } }

interface RemoteFace {
  list(): Promise<RemoteEnvelope<ConversationInfo[]>>
  groups(): Promise<RemoteEnvelope<GroupInfo[]>>
  send(request: { from: string; targetId: string; text: string; delivery: string }): Promise<RemoteEnvelope<{ ok: boolean; messageId: string; applied: string; targetId: string; targetStatus: string; error: string }>>
  broadcast(request: { groupId: string; from: string; text: string; delivery: string }): Promise<RemoteEnvelope<{ ok: boolean; groupId: string; results: Array<{ targetId: string; ok: boolean; applied: string; error: string }>; error: string }>>
  readConversation(request: { sessionId: string; maxEvents: number }): Promise<RemoteEnvelope<{ ok: boolean; entries: MessageEntry[]; error: string }>>
  readGroup(request: { groupId: string; sinceTime: number }): Promise<RemoteEnvelope<{ ok: boolean; entries: MessageEntry[]; error: string }>>
  createGroup(request: { name: string; memberIds: string }): Promise<RemoteEnvelope<{ ok: boolean; groupId: string; name: string; memberCount: number; error: string }>>
  addMember(request: { groupId: string; memberId: string }): Promise<RemoteEnvelope<{ ok: boolean; error: string }>>
  removeMember(request: { groupId: string; memberId: string }): Promise<RemoteEnvelope<{ ok: boolean; error: string }>>
}

interface SessionsFace {
  open(id: string): void
  fork(opts: { sessionId: string }): Promise<string>
}
interface WorkspacesFace {
  startSession(workspaceId?: string): void
}

interface UiStore {
  open: boolean
  version: number
  currentSessionId: string
  listeners: Set<() => void>
}

/** Structural event type for owned input handlers. */
type ValueEvent = { target: { value: string } }

export const inject = ['slots', 'locale', 'remote', 'remote.intercom', 'sessions', 'workspaces']

export function apply(ctx: ClientContext): void {
  const remote = ctx.remote.intercom as unknown as RemoteFace
  const sessions = ctx.sessions as unknown as SessionsFace
  const workspaces = ctx.workspaces as unknown as WorkspacesFace

  // Owned stylesheet, removed with the plugin.
  ctx.effect(() => {
    const style = document.createElement('style')
    style.dataset.plugin = '@deepseek-ai/dsh-client-ui-intercom'
    style.textContent = STYLES
    document.head.appendChild(style)
    return () => { style.remove() }
  }, 'ui-intercom: stylesheet')

  const ui: UiStore = { open: false, version: 0, currentSessionId: '', listeners: new Set() }
  const notify = (): void => { ui.version += 1; ui.listeners.forEach(listener => listener()) }
  const toggle = (): void => { ui.open = !ui.open; notify() }

  const useUi = (): UiStore => {
    const [, setVersion] = useState(ui.version)
    useEffect(() => {
      const listener = (): void => { setVersion(ui.version) }
      ui.listeners.add(listener)
      return () => { ui.listeners.delete(listener) }
    }, [])
    return ui
  }

  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions',
    id: 'intercom',
    order: 30,
    label: 'intercom 通信中心',
  }, ((props: { sessionId?: string }) => {
    const store = useUi()
    useEffect(() => {
      if (props.sessionId !== undefined && props.sessionId !== store.currentSessionId) {
        store.currentSessionId = props.sessionId
        notify()
      }
    })
    return h('button', { className: 'dsh-ic-iconbtn', title: 'intercom 通信中心', onClick: toggle, dangerouslySetInnerHTML: { __html: ICON } })
  }) as FunctionComponent))

  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
    name: 'sidebar.footer.action',
    id: 'intercom',
    order: 40,
    label: 'intercom 通信中心',
  }, ((props: { wide?: boolean }) => {
    const wide = props.wide === true
    return h('button', {
      className: 'dsh-ic-sidebtn' + (wide ? '' : ' dsh-ic-sidebtn-rail'),
      title: 'intercom 通信中心',
      onClick: toggle,
      dangerouslySetInnerHTML: { __html: ICON + (wide ? '<span class="dsh-ic-sidebtn-label">通信中心</span>' : '') },
    })
  }) as FunctionComponent))

  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'intercom-panel',
    order: 50,
    label: 'intercom 通信中心',
  }, (() => {
    const store = useUi()
    if (!store.open) return null
    return h(IntercomPanel, { store, remote, sessions, workspaces, notify })
  }) as FunctionComponent))
}

interface PanelProps {
  store: UiStore
  remote: RemoteFace
  sessions: SessionsFace
  workspaces: WorkspacesFace
  notify: () => void
}

const IntercomPanel: FunctionComponent<PanelProps> = (props) => {
  const { store, remote, sessions, workspaces, notify } = props
  const [tab, setTab] = useState<'conv' | 'group'>('conv')
  const [conversations, setConversations] = useState<ConversationInfo[]>([])
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [convId, setConvId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [convEntries, setConvEntries] = useState<MessageEntry[]>([])
  const [groupEntries, setGroupEntries] = useState<MessageEntry[]>([])
  const [text, setText] = useState('')
  const [delivery, setDelivery] = useState('wake')
  const [newGroupName, setNewGroupName] = useState('')
  const [addMemberId, setAddMemberId] = useState('')
  const [feedback, setFeedback] = useState<{ text: string; tone: string }>({ text: '', tone: '' })

  const say = (message: string, tone = ''): void => { setFeedback({ text: message, tone }) }

  const refreshLists = async (): Promise<void> => {
    try {
      const list = await remote.list()
      if (list.ok && list.value !== undefined) {
        setConversations(list.value)
        const first = list.value[0]
        if (convId === '' && first !== undefined) setConvId(first.id)
      }
      const groupList = await remote.groups()
      if (groupList.ok && groupList.value !== undefined) {
        setGroups(groupList.value)
        const firstGroup = groupList.value[0]
        if (groupId === '' && firstGroup !== undefined) setGroupId(firstGroup.id)
      }
    } catch (error) {
      say(`刷新失败: ${String(error instanceof Error ? error.message : error)}`, 'err')
    }
  }

  const refreshHistory = async (): Promise<void> => {
    try {
      if (tab === 'conv' && convId !== '') {
        const r = await remote.readConversation({ sessionId: convId, maxEvents: 80 })
        if (r.ok && r.value !== undefined) setConvEntries(r.value.entries)
      } else if (tab === 'group' && groupId !== '') {
        const r = await remote.readGroup({ groupId, sinceTime: 0 })
        if (r.ok && r.value !== undefined) setGroupEntries(r.value.entries)
      }
    } catch { /* history is best-effort */ }
  }

  useEffect(() => {
    let disposed = false
    void refreshLists()
    const loopLists = (): void => {
      if (disposed) return
      void refreshLists().finally(() => { setTimeout(loopLists, 3000) })
    }
    const loopHistory = (): void => {
      if (disposed) return
      void refreshHistory().finally(() => { setTimeout(loopHistory, 2000) })
    }
    const t1 = setTimeout(loopLists, 3000)
    const t2 = setTimeout(loopHistory, 2000)
    return () => { disposed = true; clearTimeout(t1); clearTimeout(t2) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const send = async (): Promise<void> => {
    if (text.trim() === '') { say('请输入消息'); return }
    if (store.currentSessionId === '') { say('无法确定当前会话'); return }
    try {
      if (tab === 'conv') {
        if (convId === '') { say('请先选择一个会话'); return }
        const r = await remote.send({ from: store.currentSessionId, targetId: convId, text, delivery })
        if (r.ok && r.value !== undefined && r.value.ok) say(`已发送 (${r.value.applied})`, 'ok')
        else say(`发送失败: ${r.value?.error ?? r.error?.message ?? 'unknown'}`, 'err')
      } else {
        if (groupId === '') { say('请先选择一个群'); return }
        const r = await remote.broadcast({ groupId, from: store.currentSessionId, text, delivery })
        if (r.ok && r.value !== undefined && r.value.ok) {
          const delivered = r.value.results.filter(m => m.ok).length
          say(`已广播到 ${delivered}/${r.value.results.length} 个成员`, 'ok')
        } else say(`广播失败: ${r.value?.error ?? r.error?.message ?? 'unknown'}`, 'err')
      }
      setText('')
      void refreshHistory()
    } catch (error) {
      say(`发送异常: ${String(error instanceof Error ? error.message : error)}`, 'err')
    }
  }

  const createGroup = async (): Promise<void> => {
    const name = newGroupName.trim()
    if (name === '') { say('请输入群名称'); return }
    try {
      const r = await remote.createGroup({ name, memberIds: store.currentSessionId })
      if (r.ok && r.value !== undefined && r.value.ok) {
        say(`已建群「${r.value.name}」`, 'ok')
        setNewGroupName('')
        setGroupId(r.value.groupId)
        setTab('group')
        void refreshLists()
      } else say(`建群失败: ${r.value?.error ?? r.error?.message ?? 'unknown'}`, 'err')
    } catch (error) { say(`建群异常: ${String(error instanceof Error ? error.message : error)}`, 'err') }
  }

  const addMember = async (): Promise<void> => {
    if (addMemberId === '') return
    try {
      const r = await remote.addMember({ groupId, memberId: addMemberId })
      if (r.ok && r.value !== undefined && r.value.ok) { say('已添加成员', 'ok'); setAddMemberId(''); void refreshLists() }
      else say(`添加失败: ${r.value?.error ?? r.error?.message ?? 'unknown'}`, 'err')
    } catch (error) { say(`添加异常: ${String(error instanceof Error ? error.message : error)}`, 'err') }
  }

  const removeMember = async (memberId: string): Promise<void> => {
    try {
      await remote.removeMember({ groupId, memberId })
      void refreshLists()
    } catch { /* best-effort */ }
  }

  const openSession = (id: string): void => {
    try { sessions.open(id) } catch { say('client sessions service unavailable', 'err') }
  }

  const startNew = (): void => {
    try { workspaces.startSession() } catch { say('client workspaces service unavailable', 'err') }
  }

  const forkCurrent = async (): Promise<void> => {
    try {
      const newId = await sessions.fork({ sessionId: store.currentSessionId })
      sessions.open(newId)
    } catch (error) { say(`fork 失败: ${String(error instanceof Error ? error.message : error)}`, 'err') }
  }

  const currentConv = conversations.find(c => c.id === convId)
  const currentGroup = groups.find(g => g.id === groupId)
  const currentTitle = tab === 'conv'
    ? (currentConv === undefined ? (convId === '' ? '未选择' : convId) : currentConv.title)
    : (currentGroup === undefined ? (groupId === '' ? '未选择' : groupId) : currentGroup.name)
  const addCandidates = conversations.filter(c => currentGroup === undefined || !currentGroup.members.includes(c.id))
  const entries = tab === 'conv' ? convEntries : groupEntries

  return h('div', { className: 'dsh-ic-panel dsh-ic-wide' },
    h('div', { className: 'dsh-ic-head' },
      h('span', { className: 'dsh-ic-head-title', dangerouslySetInnerHTML: { __html: ICON + 'Intercom 通信中心' } }),
      h('button', { className: 'dsh-ic-btn', onClick: startNew, title: '新建会话' }, '＋ 新会话'),
      h('button', { className: 'dsh-ic-btn', onClick: () => { void forkCurrent() }, disabled: store.currentSessionId === '', title: 'Fork 当前会话' }, 'Fork'),
      h('button', { className: 'dsh-ic-iconbtn', title: '关闭', onClick: () => { store.open = false; notify() }, dangerouslySetInnerHTML: { __html: CLOSE_ICON } }),
    ),
    h('div', { className: 'dsh-ic-body' },
      h('div', { className: 'dsh-ic-side' },
        h('div', { className: 'dsh-ic-tabs' },
          h('button', { className: 'dsh-ic-tab' + (tab === 'conv' ? ' active' : ''), onClick: () => setTab('conv') }, '会话'),
          h('button', { className: 'dsh-ic-tab' + (tab === 'group' ? ' active' : ''), onClick: () => setTab('group') }, '群聊'),
        ),
        tab === 'conv'
          ? h('div', { className: 'dsh-ic-list' },
              conversations.map(c => h('div', { key: c.id, className: 'dsh-ic-item' + (c.id === convId ? ' active' : ''), onClick: () => { setConvId(c.id); setTab('conv') } },
                h('div', { className: 'dsh-ic-item-head' },
                  h('span', { className: 'dsh-ic-item-title', title: c.id }, c.title),
                  h('span', { className: 'dsh-ic-badge ' + (c.status === 'running' ? 'running' : 'idle') }, c.status === 'running' ? '忙碌' : '空闲'),
                ),
                h('span', { className: 'dsh-ic-cwd', title: c.cwd }, `📁 ${c.cwd || ''}`),
              )),
            )
          : h('div', { className: 'dsh-ic-list' },
              groups.map(g => h('div', { key: g.id, className: 'dsh-ic-item' + (g.id === groupId ? ' active' : ''), onClick: () => setGroupId(g.id) },
                h('div', { className: 'dsh-ic-item-head' },
                  h('span', { className: 'dsh-ic-item-title', title: g.id }, g.name),
                  h('span', { className: 'dsh-ic-badge idle' }, `${g.memberCount} 人`),
                ),
              )),
              h('div', { style: { marginTop: 8, padding: '0 4px' } },
                h('input', { className: 'dsh-ic-input', style: { margin: 0 }, value: newGroupName, onChange: (e: ValueEvent) => setNewGroupName(e.target.value), placeholder: '新群名称(含当前会话)…' }),
                h('button', { className: 'dsh-ic-btn dsh-ic-btn-primary', onClick: () => { void createGroup() }, style: { marginTop: 6 } }, '＋ 新建群'),
              ),
              currentGroup !== undefined ? h('div', { style: { marginTop: 10, padding: '0 4px' } },
                h('div', { className: 'dsh-ic-sec-title' }, '成员'),
                currentGroup.members.map(m => h('div', { key: m, className: 'dsh-ic-member-row' },
                  h('span', { className: 'dsh-ic-member-name', title: m }, m === store.currentSessionId ? '● ' : '', m),
                  h('button', { className: 'dsh-ic-iconbtn', title: '移除', onClick: () => { void removeMember(m) }, dangerouslySetInnerHTML: { __html: CLOSE_ICON } }),
                )),
                h('select', { className: 'dsh-ic-input', style: { marginTop: 6 }, value: addMemberId, onChange: (e: ValueEvent) => setAddMemberId(e.target.value) },
                  h('option', { value: '' }, '＋ 添加会话…'),
                  addCandidates.map(c => h('option', { key: c.id, value: c.id }, c.title)),
                ),
                h('button', { className: 'dsh-ic-btn', onClick: () => { void addMember() }, disabled: addMemberId === '', style: { marginTop: 4 } }, '添加'),
              ) : null,
            ),
      ),
      h('div', { className: 'dsh-ic-main' },
        h('div', { className: 'dsh-ic-chat-head' },
          h('span', { className: 'dsh-ic-chat-title', title: currentTitle }, currentTitle),
          tab === 'conv' && currentConv !== undefined ? h('span', { className: 'dsh-ic-badge ' + (currentConv.status === 'running' ? 'running' : 'idle') }, currentConv.status === 'running' ? '忙碌' : '空闲') : null,
          tab === 'conv' && convId !== '' ? h('button', { className: 'dsh-ic-btn', onClick: () => openSession(convId), title: '在界面中打开' }, '打开') : null,
        ),
        (tab === 'conv' && convId === '') || (tab === 'group' && groupId === '')
          ? h('div', { className: 'dsh-ic-empty' }, '从左侧选择一个会话或群,开始查看和发送消息')
          : h('div', { className: 'dsh-ic-msgs' },
              entries.map((m, index) => h('div', { key: `${m.time}-${index}`, className: 'dsh-ic-msg ' + m.role },
                m.memberTitle !== undefined && m.memberTitle !== '' && m.role === 'assistant' ? h('span', { className: 'dsh-ic-msg-from' }, m.memberTitle) : null,
                m.text,
              )),
              entries.length === 0 ? h('div', { className: 'dsh-ic-empty' }, '暂无消息') : null,
            ),
        h('div', { className: 'dsh-ic-composer' },
          h('select', { className: 'dsh-ic-input', style: { width: 108, flex: 'none', margin: 0 }, value: delivery, onChange: (e: ValueEvent) => setDelivery(e.target.value) },
            h('option', { value: 'wake' }, '唤醒'),
            h('option', { value: 'steer' }, '介入'),
          ),
          h('textarea', { className: 'dsh-ic-input', style: { flex: 1, margin: 0, minHeight: 34, maxHeight: 90 }, rows: 1, value: text, onChange: (e: ValueEvent) => setText(e.target.value), placeholder: tab === 'conv' ? '发消息给该会话…' : '广播给群成员…' }),
          h('button', { className: 'dsh-ic-btn dsh-ic-btn-primary', style: { flex: 'none' }, onClick: () => { void send() } }, '发送'),
        ),
        h('div', { className: 'dsh-ic-feedback' + (feedback.tone === 'err' ? ' err' : feedback.tone === 'ok' ? ' ok' : ''), style: { flex: 'none', padding: '2px 12px 8px' } }, feedback.text),
      ),
    ),
  )
}

export { IntercomPanel }
