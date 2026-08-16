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
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { intercomDomain } from "./spec.js";
export { intercomDomain } from "./spec.js";
const AUTO_GROUP_ID = '__auto';
const AUTO_GROUP_NAME = '协作中的对话(自动)';
const MAX_WAKES = 3;
const RATE_LIMIT = 10;
const MAX_TEXT = 8000;
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
let IntercomGateway = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _list_decorators;
    let _groups_decorators;
    let _send_decorators;
    let _dormant_decorators;
    let _wakeSend_decorators;
    let _broadcast_decorators;
    let _readConversation_decorators;
    let _readGroup_decorators;
    let _createGroup_decorators;
    let _addMember_decorators;
    let _removeMember_decorators;
    let _removeGroup_decorators;
    return class IntercomGateway extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _list_decorators = [Remote('list')];
            _groups_decorators = [Remote('groups')];
            _send_decorators = [Remote('send')];
            _dormant_decorators = [Remote('dormant')];
            _wakeSend_decorators = [Remote('wakeSend')];
            _broadcast_decorators = [Remote('broadcast')];
            _readConversation_decorators = [Remote('readConversation')];
            _readGroup_decorators = [Remote('readGroup')];
            _createGroup_decorators = [Remote('createGroup')];
            _addMember_decorators = [Remote('addMember')];
            _removeMember_decorators = [Remote('removeMember')];
            _removeGroup_decorators = [Remote('removeGroup')];
            __esDecorate(this, null, _list_decorators, { kind: "method", name: "list", static: false, private: false, access: { has: obj => "list" in obj, get: obj => obj.list }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _groups_decorators, { kind: "method", name: "groups", static: false, private: false, access: { has: obj => "groups" in obj, get: obj => obj.groups }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _send_decorators, { kind: "method", name: "send", static: false, private: false, access: { has: obj => "send" in obj, get: obj => obj.send }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _dormant_decorators, { kind: "method", name: "dormant", static: false, private: false, access: { has: obj => "dormant" in obj, get: obj => obj.dormant }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _wakeSend_decorators, { kind: "method", name: "wakeSend", static: false, private: false, access: { has: obj => "wakeSend" in obj, get: obj => obj.wakeSend }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _broadcast_decorators, { kind: "method", name: "broadcast", static: false, private: false, access: { has: obj => "broadcast" in obj, get: obj => obj.broadcast }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _readConversation_decorators, { kind: "method", name: "readConversation", static: false, private: false, access: { has: obj => "readConversation" in obj, get: obj => obj.readConversation }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _readGroup_decorators, { kind: "method", name: "readGroup", static: false, private: false, access: { has: obj => "readGroup" in obj, get: obj => obj.readGroup }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _createGroup_decorators, { kind: "method", name: "createGroup", static: false, private: false, access: { has: obj => "createGroup" in obj, get: obj => obj.createGroup }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _addMember_decorators, { kind: "method", name: "addMember", static: false, private: false, access: { has: obj => "addMember" in obj, get: obj => obj.addMember }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _removeMember_decorators, { kind: "method", name: "removeMember", static: false, private: false, access: { has: obj => "removeMember" in obj, get: obj => obj.removeMember }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _removeGroup_decorators, { kind: "method", name: "removeGroup", static: false, private: false, access: { has: obj => "removeGroup" in obj, get: obj => obj.removeGroup }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        // Wait until the tool registry and the storage-domain facility are mounted:
        // without this declaration apply() can run before either provider activates,
        // silently skipping model-tool registration and durable-group loading.
        static inject = ['tools', 'storageDomain'];
        groupStore = (__runInitializers(this, _instanceExtraInitializers), new Map());
        outbox = new Map();
        spentWakes = new WeakMap();
        rateBuckets = new Map();
        counter = 0;
        domain = null;
        titleCache = new Map();
        /** Directed relay feed per group (live view; session logs stay the truth). */
        relayLog = new Map();
        get agents() {
            return this.ctx.get('agents');
        }
        get titleService() {
            return this.ctx.get('sessionTitle');
        }
        get queryService() {
            return this.ctx.get('sessionQuery');
        }
        get subagents() {
            return this.ctx.get('subagents');
        }
        get persistence() {
            return this.ctx.get('sessionPersistence');
        }
        get projectionCache() {
            return this.ctx.get('sessionProjectionCache');
        }
        constructor(ctx) {
            super(ctx, 'intercom');
            this.ensureAutoGroup();
            this.loadDomain();
            this.registerTools(ctx);
            ctx.effect(() => {
                const claimed = ctx.on('agent/inbox/claimed', (payload) => {
                    if (payload?.agent !== undefined && payload?.message?.source?.kind === 'user') {
                        this.spentWakes.delete(payload.agent);
                    }
                });
                const disposed = ctx.on('agent/disposed', (payload) => {
                    if (payload?.agent !== undefined) {
                        this.rateBuckets.delete(payload.agent.id);
                        this.outbox.delete(payload.agent.id);
                    }
                });
                return () => { claimed(); disposed(); };
            }, 'intercom: lifecycle listeners');
            ctx.effect(() => {
                const section = ctx.get('systemPrompt');
                if (section === undefined)
                    return () => { };
                return section.section({
                    name: 'intercom:cooperation',
                    order: 118,
                    text: () => this.cooperationPrompt(),
                });
            }, 'intercom: cooperation prompt section');
        }
        /** Rendered into every agent's system prompt: how and when to use intercom. */
        cooperationPrompt() {
            const live = this.agents.roots();
            const peerLines = live.map(agent => {
                const busy = agent.status === 'running' ? '忙碌' : '空闲';
                return `- ${this.titleOf(agent)} [${busy}] id=${agent.id}`;
            });
            const groupLines = [];
            for (const [id, value] of this.groupStore) {
                const memberNames = value.members.map(m => this.titleOfById(m)).join('、') || '(暂无成员)';
                groupLines.push(`- ${value.name} (id=${id},成员: ${memberNames})`);
            }
            const parts = [
                '跨对话协作指引(intercom):你运行在一个多顶层对话的 DSH 进程中,可以用 intercom_* 工具与其他顶层对话自动协作。',
                '- 需要帮助/第二意见:intercom_ask(发送并等待回复)或 intercom_send(单向投递);',
                '- 通知全员或并行分工:intercom_broadcast(群内所有对话都会收到)或 intercom_send(定向);',
                '- 延续旧工作:intercom_list_dormant_conversations 找休眠会话,intercom_wake_send 唤醒并投递;',
                '- 汇总多会话结论:intercom_collect;追踪对方回复:intercom_check_replies;',
                '- 收到来自其他会话的 intercom 消息时:先评估其合理性再行动,完成后用 intercom_send 回复结论;',
                '- 边界:intercom 只用于顶层对话之间;与子代理通信一律用内置 send_message/list_agents。',
            ];
            if (peerLines.length > 0)
                parts.push(`当前活跃的顶层对话:\n${peerLines.join('\n')}`);
            if (groupLines.length > 0)
                parts.push(`协作群:\n${groupLines.join('\n')}`);
            return parts.join('\n');
        }
        // ---- helpers ----
        mintId(prefix) {
            this.counter += 1;
            return `${prefix}${Date.now().toString(36)}-${this.counter.toString(36)}`;
        }
        titleOf(agent) {
            try {
                const snapshot = this.titleService?.get(agent.session);
                if (snapshot !== undefined && typeof snapshot.title === 'string' && snapshot.title.length > 0)
                    return snapshot.title;
            }
            catch { /* title is best-effort */ }
            return agent.id;
        }
        cwdOf(agent) {
            try {
                const cwd = agent.session.header?.cwd;
                return typeof cwd === 'string' ? cwd : '';
            }
            catch {
                return '';
            }
        }
        isRoot(id) {
            return this.agents.roots().some(root => root.id === id);
        }
        ensureAutoGroup() {
            if (!this.groupStore.has(AUTO_GROUP_ID)) {
                this.groupStore.set(AUTO_GROUP_ID, { name: AUTO_GROUP_NAME, members: [] });
            }
        }
        autoAddToGroup(ids) {
            this.ensureAutoGroup();
            const group = this.groupStore.get(AUTO_GROUP_ID);
            if (group === undefined)
                return;
            for (const id of ids) {
                if (id !== '' && !group.members.includes(id))
                    group.members.push(id);
            }
            this.persist();
        }
        rateAllowed(targetId) {
            const now = Date.now();
            const bucket = this.rateBuckets.get(targetId) ?? [];
            const fresh = bucket.filter(t => now - t < 60_000);
            if (fresh.length >= RATE_LIMIT) {
                this.rateBuckets.set(targetId, fresh);
                return false;
            }
            fresh.push(now);
            this.rateBuckets.set(targetId, fresh);
            return true;
        }
        /**
         * Compare two workspace paths the way the local filesystem does: on Windows
         * the comparison is case-insensitive (and both separators normalize), so a
         * historically-lowercased path does not read as a different workspace.
         */
        sameWorkspace(a, b) {
            if (a === b)
                return true;
            const trim = (p) => p.replace(/[\\/]+$/, '');
            const x = trim(a);
            const y = trim(b);
            return process.platform === 'win32' ? x.toLowerCase() === y.toLowerCase() : x === y;
        }
        /** Resolve a session title with a 5-minute cache; falls back to the id. */
        async titleOfSession(sessionId) {
            const now = Date.now();
            const cached = this.titleCache.get(sessionId);
            if (cached !== undefined && now - cached.at < 300_000)
                return cached.title;
            let title = sessionId;
            if (this.queryService !== undefined) {
                try {
                    const t = await this.queryService.readTitle(sessionId);
                    if (t !== undefined && typeof t.title === 'string' && t.title.trim() !== '')
                        title = t.title;
                }
                catch { /* keep the id */ }
            }
            this.titleCache.set(sessionId, { title, at: now });
            return title;
        }
        /** Zero-I/O title read from the in-memory projection cache; undefined on miss. */
        cachedTitleOf(header) {
            const cache = this.projectionCache;
            if (cache === undefined)
                return undefined;
            try {
                const snapshot = cache.cachedSnapshot(header);
                const title = snapshot?.values?.['title'];
                if (typeof title === 'string' && title.trim() !== '')
                    return title;
            }
            catch { /* fall through to the log-backed read */ }
            return undefined;
        }
        titleOfById(id) {
            const agent = this.agents.get(id);
            if (agent !== undefined)
                return this.titleOf(agent);
            const cached = this.titleCache.get(id);
            if (cached !== undefined)
                return cached.title;
            return id;
        }
        // ---- relay feed (who said what to whom) ----
        recordRelay(groupId, entry) {
            const list = this.relayLog.get(groupId) ?? [];
            list.push(entry);
            if (list.length > 200)
                list.shift();
            this.relayLog.set(groupId, list);
        }
        buildRelay(from, toId, text, messageId) {
            const fromAgent = this.agents.get(from);
            const toAgent = toId === '*' ? undefined : this.agents.get(toId);
            return {
                id: this.mintId('relay-'),
                messageId,
                fromId: from,
                fromTitle: fromAgent === undefined ? from : this.titleOf(fromAgent),
                toId,
                toTitle: toId === '*' ? '全体成员' : (toAgent === undefined ? toId : this.titleOf(toAgent)),
                text,
                time: Date.now(),
            };
        }
        /** A direct send becomes a feed entry of every group containing both parties. */
        recordRelayForPair(from, targetId, text, messageId) {
            const relay = this.buildRelay(from, targetId, text, messageId);
            for (const [groupId, group] of this.groupStore) {
                if (group.members.includes(from) && group.members.includes(targetId))
                    this.recordRelay(groupId, relay);
            }
        }
        /** A broadcast becomes one "from → 全体成员" feed entry of that group. */
        recordBroadcastRelay(groupId, from, text) {
            this.recordRelay(groupId, this.buildRelay(from, '*', text, this.mintId('bcast-')));
        }
        buildMessage(from, fromTitle, text, broadcast = false) {
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
            };
        }
        recordOutbox(from, messageId, targetId) {
            const list = this.outbox.get(from) ?? [];
            list.push({ id: messageId, to: targetId, time: Date.now() });
            if (list.length > 100)
                list.shift();
            this.outbox.set(from, list);
        }
        deliver(request) {
            const { from, targetId } = request;
            if (from === targetId)
                return { ok: false, messageId: '', applied: '', targetId, targetStatus: '', error: 'cannot send to the same conversation' };
            if (!this.isRoot(from))
                return { ok: false, messageId: '', applied: '', targetId, targetStatus: '', error: 'sender is not a top-level conversation; intercom is only for parent agents, use the built-in send_message tool for subagent children' };
            if (!this.isRoot(targetId))
                return { ok: false, messageId: '', applied: '', targetId, targetStatus: '', error: 'target is a subagent child, not a top-level conversation; use the built-in send_message tool for parent-child communication' };
            const target = this.agents.get(targetId);
            if (target === undefined)
                return { ok: false, messageId: '', applied: '', targetId, targetStatus: '', error: `target conversation is not live: ${targetId}` };
            return this.deliverTo(from, target, request);
        }
        /** Shared delivery core: workspace gate, rate limit, wake/queue/steer, group bookkeeping. */
        deliverTo(from, target, request) {
            const targetId = target.id;
            const text = String(request.text).slice(0, MAX_TEXT);
            const delivery = request.delivery === 'steer' ? 'steer' : 'wake';
            const fromAgent = this.agents.get(from);
            if (request.allowCrossWorkspace !== true) {
                const fromCwd = fromAgent === undefined ? '' : this.cwdOf(fromAgent);
                const targetCwd = this.cwdOf(target);
                if (fromCwd !== '' && targetCwd !== '' && !this.sameWorkspace(fromCwd, targetCwd)) {
                    return { ok: false, messageId: '', applied: '', targetId, targetStatus: '', error: `cross-workspace delivery blocked: from ${fromCwd} to ${targetCwd}` };
                }
            }
            if (!this.rateAllowed(targetId))
                return { ok: false, messageId: '', applied: '', targetId, targetStatus: '', error: 'rate limit exceeded for target conversation' };
            const fromTitle = fromAgent === undefined ? from : this.titleOf(fromAgent);
            const message = this.buildMessage(from, fromTitle, text, request.broadcast === true);
            let applied = 'wake';
            try {
                if (delivery === 'steer') {
                    target.steer(message);
                    applied = 'steer';
                }
                else {
                    const spent = this.spentWakes.get(target) ?? 0;
                    if (target.status === 'idle' && spent < MAX_WAKES) {
                        this.spentWakes.set(target, spent + 1);
                        target.followup(message);
                        applied = 'wake';
                    }
                    else {
                        target.inject(message);
                        applied = 'queue';
                    }
                }
            }
            catch (error) {
                return { ok: false, messageId: '', applied: '', targetId, targetStatus: '', error: `delivery failed: ${String(error instanceof Error ? error.message : error)}` };
            }
            this.autoAddToGroup([from, targetId]);
            this.recordRelayForPair(from, targetId, text, message.id);
            this.recordOutbox(from, message.id, targetId);
            return { ok: true, messageId: message.id, applied, targetId, targetStatus: target.status, error: '' };
        }
        /** Concatenated plain-text of a surface message; empty when there is none. */
        messageText(message) {
            if (message === undefined || !Array.isArray(message.content))
                return '';
            return message.content
                .filter(block => block !== null && typeof block === 'object' && block.type === 'text' && typeof block.text === 'string')
                .map(block => block.text)
                .join('\n');
        }
        surfaceEntries(events, sinceTime) {
            const entries = [];
            for (const event of events) {
                if (typeof event.time === 'number' && event.time <= sinceTime)
                    continue;
                const message = event.data?.message;
                if (message === undefined || !Array.isArray(message.content))
                    continue;
                const role = event.type === 'assistant/message' ? 'assistant' : event.type === 'user/message' ? 'user' : null;
                if (role === null)
                    continue;
                const text = message.content
                    .filter(block => block !== null && typeof block === 'object' && block.type === 'text' && typeof block.text === 'string')
                    .map(block => block.text)
                    .join('\n');
                if (text === '')
                    continue;
                entries.push({ role, text, time: typeof event.time === 'number' ? event.time : 0 });
            }
            return entries;
        }
        surfaceText(events, sinceTime) {
            return this.surfaceEntries(events, sinceTime).map(entry => `[${entry.role}] ${entry.text}`).join('\n').slice(0, 16_000);
        }
        lastAssistantText(entries) {
            for (let i = entries.length - 1; i >= 0; i--) {
                const entry = entries[i];
                if (entry !== undefined && entry.role === 'assistant')
                    return entry.text.slice(0, 4000);
            }
            return '';
        }
        continuableProviderName() {
            if (this.subagents === undefined)
                return '';
            try {
                for (const name of this.subagents.list()) {
                    const provider = this.subagents.getProvider(name);
                    if (provider !== undefined && typeof provider.prepareContinuable === 'function')
                        return name;
                }
            }
            catch { /* fall through */ }
            return '';
        }
        // ---- durability ----
        loadDomain() {
            const facility = this.ctx.get('storageDomain');
            if (facility === undefined) {
                console.error('[intercom] storageDomain service unavailable; groups are in-memory only for this process');
                return;
            }
            facility.open(intercomDomain).then(domain => {
                this.domain = domain;
                return domain.global.get();
            }).then(global => {
                if (global === null || typeof global !== 'object' || global.groups === undefined || global.groups === null)
                    return;
                for (const [id, value] of Object.entries(global.groups)) {
                    if (this.groupStore.has(id))
                        continue;
                    this.groupStore.set(id, { name: String(value.name), members: Array.isArray(value.members) ? [...value.members] : [] });
                }
            }).catch(error => {
                console.error(`[intercom] domain load failed: ${String(error instanceof Error ? error.message : error)}`);
            });
        }
        persist() {
            if (this.domain === null)
                return;
            const snapshot = {};
            for (const [id, value] of this.groupStore)
                snapshot[id] = { name: value.name, members: [...value.members] };
            void this.domain.global.set({ groups: snapshot }).catch(error => {
                console.error(`[intercom] persist failed: ${String(error instanceof Error ? error.message : error)}`);
            });
        }
        // ---- Remote methods (Client face) ----
        list() {
            return this.agents.roots().map(agent => ({
                id: agent.id,
                title: this.titleOf(agent),
                status: agent.status,
                cwd: this.cwdOf(agent),
                provider: agent.options?.provider ?? '',
                model: agent.options?.model ?? '',
            }));
        }
        groups() {
            this.ensureAutoGroup();
            const view = [];
            for (const [id, value] of this.groupStore) {
                view.push({ id, name: value.name, memberCount: value.members.length, members: [...value.members] });
            }
            return view;
        }
        send(request) {
            if (request === null || typeof request !== 'object' || typeof request.from !== 'string' || typeof request.targetId !== 'string' || typeof request.text !== 'string') {
                return { ok: false, messageId: '', applied: '', targetId: '', targetStatus: '', error: 'from/targetId/text are required strings' };
            }
            return this.deliver(request);
        }
        async dormant() {
            const persistence = this.persistence;
            if (persistence === undefined)
                return { ok: false, conversations: [], error: 'sessionPersistence service unavailable' };
            try {
                const headers = await persistence.list();
                const liveIds = new Set(this.agents.list().map(agent => agent.id));
                const items = [];
                for (const header of headers) {
                    if (typeof header.id !== 'string' || header.id === '')
                        continue;
                    if (liveIds.has(header.id))
                        continue;
                    if (header.parentSession !== undefined)
                        continue;
                    if (header.origin === 'subagent')
                        continue;
                    const cachedTitle = this.cachedTitleOf(header);
                    if (cachedTitle !== undefined)
                        this.titleCache.set(header.id, { title: cachedTitle, at: Date.now() });
                    items.push({
                        id: header.id,
                        title: cachedTitle !== undefined ? cachedTitle : await this.titleOfSession(header.id),
                        cwd: typeof header.cwd === 'string' ? header.cwd : '',
                        createdAt: typeof header.createdAt === 'number' ? header.createdAt : 0,
                    });
                }
                items.sort((a, b) => b.createdAt - a.createdAt);
                return { ok: true, conversations: items, error: '' };
            }
            catch (error) {
                return { ok: false, conversations: [], error: String(error instanceof Error ? error.message : error) };
            }
        }
        async wakeSend(request) {
            if (request === null || typeof request !== 'object' || typeof request.from !== 'string' || typeof request.targetId !== 'string' || typeof request.text !== 'string') {
                return { ok: false, messageId: '', applied: '', targetId: '', targetStatus: '', resumed: false, error: 'from/targetId/text are required strings' };
            }
            return this.wakeSendInternal(request);
        }
        /** Wake (resume) a dormant top-level session when needed, then deliver like `send`. */
        async wakeSendInternal(request) {
            const from = request.from;
            const targetId = request.targetId;
            const fail = (error) => ({ ok: false, messageId: '', applied: '', targetId, targetStatus: '', resumed: false, error });
            if (from === targetId)
                return fail('cannot send to the same conversation');
            if (!this.isRoot(from))
                return fail('sender is not a top-level conversation; intercom is only for parent agents, use the built-in send_message tool for subagent children');
            const fromAgent = this.agents.get(from);
            let target = this.agents.get(targetId);
            let resumed = false;
            if (target === undefined) {
                const persistence = this.persistence;
                if (persistence === undefined)
                    return fail('target conversation is not live and session persistence is unavailable');
                let header;
                try {
                    const headers = await persistence.list();
                    header = headers.find(h => h.id === targetId);
                }
                catch (error) {
                    return fail(`session listing failed: ${String(error instanceof Error ? error.message : error)}`);
                }
                if (header === undefined)
                    return fail(`unknown session: ${targetId}`);
                if (header.parentSession !== undefined)
                    return fail('target is a subagent child, not a top-level conversation; use the built-in send_message tool for parent-child communication');
                if (request.allowCrossWorkspace !== true) {
                    const fromCwd = fromAgent === undefined ? '' : this.cwdOf(fromAgent);
                    const targetCwd = typeof header.cwd === 'string' ? header.cwd : '';
                    if (fromCwd !== '' && targetCwd !== '' && !this.sameWorkspace(fromCwd, targetCwd)) {
                        return fail(`cross-workspace delivery blocked: from ${fromCwd} to ${targetCwd}`);
                    }
                }
                if (!this.rateAllowed(targetId))
                    return fail('rate limit exceeded for target conversation');
                const agentOptions = await this.resolveTargetModel(targetId);
                if (agentOptions === undefined)
                    return fail(`cannot resume ${targetId}: no model route (no logged request/header and no deployment default)`);
                try {
                    const handle = await this.agents.resume({ resumeSessionId: targetId, agentOptions });
                    target = handle.agent;
                }
                catch (error) {
                    return fail(`resume failed: ${String(error instanceof Error ? error.message : error)}`);
                }
                resumed = true;
            }
            if (target === undefined)
                return fail(`target is still not live after resume: ${targetId}`);
            const result = this.deliverTo(from, target, request);
            return { ...result, resumed };
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
        async resolveTargetModel(targetId) {
            const persistence = this.persistence;
            if (persistence !== undefined) {
                try {
                    const inspected = await persistence.inspect(targetId);
                    if (Array.isArray(inspected?.events)) {
                        for (let i = inspected.events.length - 1; i >= 0; i--) {
                            const event = inspected.events[i];
                            if (event?.type !== 'request/header')
                                continue;
                            const config = event.data?.header?.config;
                            if (typeof config?.provider === 'string' && config.provider !== ''
                                && typeof config?.model === 'string' && config.model !== '') {
                                return { provider: config.provider, model: config.model };
                            }
                        }
                    }
                }
                catch {
                    // inspect unavailable; fall through to the deployment default
                }
            }
            const defaults = this.ctx.get('agentDefaultModel');
            const selection = defaults?.currentSelection?.();
            if (selection !== undefined && typeof selection.provider === 'string' && selection.provider !== ''
                && typeof selection.model === 'string' && selection.model !== '') {
                return { provider: selection.provider, model: selection.model };
            }
            return undefined;
        }
        broadcast(request) {
            if (request === null || typeof request !== 'object' || typeof request.groupId !== 'string' || typeof request.from !== 'string' || typeof request.text !== 'string') {
                return { ok: false, groupId: '', results: [], error: 'groupId/from/text are required strings' };
            }
            const group = this.groupStore.get(request.groupId);
            if (group === undefined)
                return { ok: false, groupId: request.groupId, results: [], error: `unknown group: ${request.groupId}` };
            const results = [];
            for (const memberId of group.members) {
                if (memberId === request.from)
                    continue;
                const r = this.deliver({ from: request.from, targetId: memberId, text: request.text, delivery: request.delivery, broadcast: true });
                results.push({ targetId: memberId, ok: r.ok, applied: r.applied, error: r.error });
            }
            this.recordBroadcastRelay(request.groupId, request.from, String(request.text).slice(0, MAX_TEXT));
            return { ok: true, groupId: request.groupId, results, error: '' };
        }
        async readConversation(request) {
            const sessionId = request === null || typeof request !== 'object' ? '' : String(request.sessionId ?? '');
            if (sessionId === '')
                return { ok: false, entries: [], error: 'sessionId required' };
            try {
                if (this.queryService === undefined)
                    throw new Error('sessionQuery service unavailable');
                const surface = await this.queryService.readSurface(sessionId);
                const maxEvents = request !== null && typeof request === 'object' && typeof request.maxEvents === 'number' && Number.isFinite(request.maxEvents) ? request.maxEvents : 80;
                return { ok: true, entries: this.surfaceEntries(surface.events, -Infinity).slice(-maxEvents), error: '' };
            }
            catch (error) {
                return { ok: false, entries: [], error: String(error instanceof Error ? error.message : error) };
            }
        }
        async readGroup(request) {
            const groupId = request === null || typeof request !== 'object' ? '' : String(request.groupId ?? '');
            const group = this.groupStore.get(groupId);
            if (group === undefined)
                return { ok: false, entries: [], relays: [], error: `unknown group: ${groupId}` };
            if (this.queryService === undefined)
                return { ok: false, entries: [], relays: [], error: 'sessionQuery service unavailable' };
            const sinceTime = request !== null && typeof request === 'object' && typeof request.sinceTime === 'number' ? request.sinceTime : 0;
            const merged = [];
            const backfill = [];
            const seenDirect = new Set();
            const seenBroadcast = new Set();
            for (const memberId of group.members) {
                try {
                    const surface = await this.queryService.readSurface(memberId);
                    const agent = this.agents.get(memberId);
                    const label = agent === undefined ? this.titleOfById(memberId) : this.titleOf(agent);
                    for (const entry of this.surfaceEntries(surface.events, sinceTime)) {
                        merged.push({ ...entry, memberId, memberTitle: label });
                    }
                    // Backfill the relay feed from the persisted relay messages, so the
                    // directed view ("A → B" / "A → 全体") survives backend restarts.
                    for (const event of surface.events) {
                        if (typeof event.time !== 'number' || event.time <= sinceTime)
                            continue;
                        const message = event.data?.message;
                        if (message === undefined || message.source === undefined)
                            continue;
                        const source = message.source;
                        if (source.kind !== 'plugin' || source.plugin !== 'intercom')
                            continue;
                        if (typeof source.senderSessionId !== 'string')
                            continue;
                        const text = this.messageText(message);
                        if (text === '')
                            continue;
                        if (source.broadcast === true) {
                            const key = `bc|${source.senderSessionId}|${text}`;
                            if (seenBroadcast.has(key))
                                continue;
                            seenBroadcast.add(key);
                            backfill.push({
                                id: this.mintId('relay-'),
                                messageId: key,
                                fromId: source.senderSessionId,
                                fromTitle: this.titleOfById(source.senderSessionId),
                                toId: '*',
                                toTitle: '全体成员',
                                text,
                                time: event.time,
                            });
                        }
                        else {
                            const mid = typeof message.id === 'string' ? message.id : '';
                            if (mid !== '' && seenDirect.has(mid))
                                continue;
                            if (mid !== '')
                                seenDirect.add(mid);
                            backfill.push({
                                id: this.mintId('relay-'),
                                messageId: mid,
                                fromId: source.senderSessionId,
                                fromTitle: this.titleOfById(source.senderSessionId),
                                toId: memberId,
                                toTitle: label,
                                text,
                                time: event.time,
                            });
                        }
                    }
                }
                catch { /* skip unreadable member */ }
            }
            merged.sort((a, b) => a.time - b.time);
            const live = this.relayLog.get(groupId) ?? [];
            const liveIds = new Set(live.map(r => r.messageId).filter(id => id !== ''));
            const filtered = backfill.filter(r => r.messageId === '' || !liveIds.has(r.messageId));
            const relays = [...filtered, ...live].sort((a, b) => b.time - a.time).slice(0, 200);
            return { ok: true, entries: merged.slice(-200), relays, error: '' };
        }
        createGroup(request) {
            if (request === null || typeof request !== 'object' || typeof request.name !== 'string' || typeof request.memberIds !== 'string') {
                return { ok: false, groupId: '', name: '', memberCount: 0, error: 'name/memberIds (comma-separated) are required strings' };
            }
            const id = this.mintId('grp-');
            const members = [];
            for (const memberId of String(request.memberIds).split(',').map(s => s.trim())) {
                if (memberId !== '' && this.isRoot(memberId) && !members.includes(memberId))
                    members.push(memberId);
            }
            const name = String(request.name).slice(0, 60) || id;
            this.groupStore.set(id, { name, members });
            this.persist();
            return { ok: true, groupId: id, name, memberCount: members.length, error: '' };
        }
        addMember(request) {
            const groupId = request === null || typeof request !== 'object' ? '' : String(request.groupId ?? '');
            const memberId = request === null || typeof request !== 'object' ? '' : String(request.memberId ?? '');
            const group = this.groupStore.get(groupId);
            if (group === undefined)
                return { ok: false, error: 'unknown group' };
            if (memberId === '')
                return { ok: false, error: 'memberId required' };
            if (!this.isRoot(memberId))
                return { ok: false, error: 'only top-level conversations can join a group' };
            if (!group.members.includes(memberId))
                group.members.push(memberId);
            this.persist();
            return { ok: true, error: '' };
        }
        removeMember(request) {
            const groupId = request === null || typeof request !== 'object' ? '' : String(request.groupId ?? '');
            const memberId = request === null || typeof request !== 'object' ? '' : String(request.memberId ?? '');
            const group = this.groupStore.get(groupId);
            if (group === undefined)
                return { ok: false, error: 'unknown group' };
            const index = group.members.indexOf(memberId);
            if (index !== -1)
                group.members.splice(index, 1);
            this.persist();
            return { ok: true, error: '' };
        }
        removeGroup(request) {
            const groupId = request === null || typeof request !== 'object' ? '' : String(request.groupId ?? '');
            if (groupId === AUTO_GROUP_ID)
                return { ok: false, error: 'the automatic group cannot be removed' };
            if (!this.groupStore.has(groupId))
                return { ok: false, error: `unknown group: ${groupId}` };
            this.groupStore.delete(groupId);
            this.relayLog.delete(groupId);
            this.persist();
            return { ok: true, error: '' };
        }
        // ---- model tools ----
        registerTools(ctx) {
            const tools = ctx.get('tools');
            if (tools === undefined) {
                console.error('[intercom] tools service unavailable; model tools are skipped');
                return;
            }
            const disposers = [];
            disposers.push(tools.register(defineTool({
                name: 'intercom_list_conversations',
                description: 'List all live TOP-LEVEL conversations (parent agents) in this DSH process: id, title, status and cwd (workspace). Subagent children are NOT listed: parent-child communication belongs to the built-in send_message/list_agents tools. Use this to discover peer conversations before addressing one with intercom_send. The id is the only valid address. Coordination is restricted to the same workspace by default.',
                parameters: {},
                output: {
                    schema: { type: 'object', additionalProperties: false, properties: { conversations: { type: 'array', required: true } } },
                    render: (_args, value) => [{ type: 'text', text: `live top-level conversations: ${JSON.stringify(value)}` }],
                },
                execute: async () => {
                    return { conversations: this.agents.roots().map(agent => ({ id: agent.id, title: this.titleOf(agent), status: agent.status, cwd: this.cwdOf(agent) })) };
                },
            })));
            disposers.push(tools.register(defineTool({
                name: 'intercom_list_dormant_conversations',
                description: 'List dormant (persisted but not live) TOP-LEVEL conversations in this DSH process: id, title, cwd and createdAt, newest first. These sessions are stored but have no running agent; use intercom_wake_send to resume one and deliver work to it (延续工作). Subagent children are excluded.',
                parameters: {},
                output: {
                    schema: { type: 'object', additionalProperties: false, properties: { conversations: { type: 'array', required: true } } },
                    render: (_args, value) => [{ type: 'text', text: `dormant top-level conversations: ${JSON.stringify(value)}` }],
                },
                execute: async () => {
                    const result = await this.dormant();
                    return { conversations: result.conversations };
                },
            })));
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
                    render: (_args, _value) => [{ type: 'text', text: 'delivered (see structured value)' }],
                },
                execute: async (args, exec) => {
                    const from = exec.agent;
                    if (from === undefined)
                        throw new Error('intercom_send requires a calling agent (exec.agent was undefined)');
                    const result = this.deliver({ from: from.id, targetId: String(args.target_id), text: String(args.message), delivery: String(args.delivery ?? 'wake') });
                    if (result.ok)
                        return { ok: result.ok, messageId: result.messageId, applied: result.applied, targetId: result.targetId, targetStatus: result.targetStatus };
                    throw new Error(result.error);
                },
            })));
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
                    render: (_args, value) => [{ type: 'text', text: `wake-send ${value.resumed ? '(resumed dormant session) ' : ''}${value.applied}` }],
                },
                execute: async (args, exec) => {
                    const from = exec.agent;
                    if (from === undefined)
                        throw new Error('intercom_wake_send requires a calling agent (exec.agent was undefined)');
                    const result = await this.wakeSendInternal({ from: from.id, targetId: String(args.target_id), text: String(args.message), delivery: String(args.delivery ?? 'wake') });
                    if (result.ok)
                        return { ok: result.ok, messageId: result.messageId, applied: result.applied, targetId: result.targetId, targetStatus: result.targetStatus, resumed: result.resumed };
                    throw new Error(result.error);
                },
            })));
            disposers.push(tools.register(defineTool({
                name: 'intercom_read_conversation',
                description: 'Read the recent conversation surface (user tasks and assistant conclusions) of another session, live or cold. Use this to continue another conversation\'s work (延续工作): extract its current state and hand off locally or to a new conversation. Read-only: never wakes the target.',
                parameters: {
                    target_id: { type: 'string', required: true, description: 'exact session id to read' },
                    max_events: { type: 'number', required: true, description: 'maximum number of recent surface events to read, e.g. 20' },
                },
                output: {
                    schema: { type: 'object', additionalProperties: false, properties: { ok: { type: 'boolean', required: true }, targetId: { type: 'string', required: true }, text: { type: 'string', required: true }, error: { type: 'string', required: true } } },
                    render: (_args, value) => [{ type: 'text', text: value.text }],
                },
                execute: async (args) => {
                    try {
                        const result = await this.readConversation({ sessionId: String(args.target_id), maxEvents: Number(args.max_events) });
                        if (result.ok)
                            return { ok: true, targetId: String(args.target_id), text: result.entries.map(e => `[${e.role}] ${e.text}`).join('\n').slice(0, 16000), error: '' };
                        return { ok: false, targetId: String(args.target_id), text: '', error: result.error };
                    }
                    catch (error) {
                        return { ok: false, targetId: String(args.target_id), text: '', error: String(error instanceof Error ? error.message : error) };
                    }
                },
            })));
            disposers.push(tools.register(defineTool({
                name: 'intercom_check_replies',
                description: 'Collect new conversation content from a target session after a given epoch-milliseconds timestamp. Pass since_time 0 to auto-use the timestamp of your last intercom message to that target. Use after intercom_send to gather the target\'s answer (请求帮助的回收端). Works for cold sessions too. Read-only.',
                parameters: {
                    target_id: { type: 'string', required: true, description: 'exact session id' },
                    since_time: { type: 'number', required: true, description: 'epoch ms; 0 = since your last intercom message to this target' },
                },
                output: {
                    schema: { type: 'object', additionalProperties: false, properties: { ok: { type: 'boolean', required: true }, targetId: { type: 'string', required: true }, hasNew: { type: 'boolean', required: true }, text: { type: 'string', required: true }, error: { type: 'string', required: true } } },
                    render: (_args, value) => [{ type: 'text', text: value.text }],
                },
                execute: async (args, exec) => {
                    const targetId = String(args.target_id);
                    let since = Number(args.since_time);
                    if (since === 0 && exec.agent !== undefined) {
                        const sentList = this.outbox.get(exec.agent.id);
                        if (sentList !== undefined) {
                            for (let i = sentList.length - 1; i >= 0; i--) {
                                const record = sentList[i];
                                if (record !== undefined && record.to === targetId) {
                                    since = record.time;
                                    break;
                                }
                            }
                        }
                    }
                    try {
                        if (this.queryService === undefined)
                            throw new Error('sessionQuery service unavailable');
                        const surface = await this.queryService.readSurface(targetId);
                        const text = this.surfaceText(surface.events, since);
                        return { ok: true, targetId, hasNew: text !== '', text, error: '' };
                    }
                    catch (error) {
                        return { ok: false, targetId, hasNew: false, text: '', error: String(error instanceof Error ? error.message : error) };
                    }
                },
            })));
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
                    render: (_args, value) => [{ type: 'text', text: value.replyText || 'no reply within wait window' }],
                },
                execute: async (args, exec) => {
                    const from = exec.agent;
                    if (from === undefined)
                        throw new Error('intercom_ask requires a calling agent');
                    const sentAt = Date.now();
                    const result = this.deliver({ from: from.id, targetId: String(args.target_id), text: String(args.message), delivery: 'wake' });
                    if (!result.ok)
                        return { ok: false, messageId: '', applied: '', targetId: String(args.target_id), targetStatus: '', replyFound: false, replyText: '', error: result.error };
                    let replyFound = false;
                    let replyText = '';
                    const waitMs = Math.min(30_000, Math.max(0, Number(args.wait_ms) || 0));
                    if (waitMs > 0 && this.queryService !== undefined) {
                        const deadline = Date.now() + waitMs;
                        while (Date.now() < deadline) {
                            await wait(1000);
                            try {
                                const surface = await this.queryService.readSurface(result.targetId);
                                const text = this.surfaceEntries(surface.events, sentAt - 1)
                                    .filter(entry => !entry.text.includes(result.messageId))
                                    .map(entry => `[${entry.role}] ${entry.text}`)
                                    .join('\n');
                                if (text !== '') {
                                    replyFound = true;
                                    replyText = text;
                                    break;
                                }
                            }
                            catch { /* keep polling */ }
                        }
                    }
                    return { ok: true, messageId: result.messageId, applied: result.applied, targetId: result.targetId, targetStatus: result.targetStatus, replyFound, replyText, error: '' };
                },
            })));
            disposers.push(tools.register(defineTool({
                name: 'intercom_collect',
                description: 'Collect the current status and the last assistant conclusion from a list of conversations (parallel cooperation aggregation). Pass target_ids as a comma-separated list of exact ids from intercom_list_conversations. Read-only.',
                parameters: {
                    target_ids: { type: 'string', required: true, description: 'comma-separated exact conversation ids' },
                },
                output: {
                    schema: { type: 'object', additionalProperties: false, properties: { ok: { type: 'boolean', required: true }, results: { type: 'array', required: true }, error: { type: 'string', required: true } } },
                    render: (_args, value) => [{ type: 'text', text: `collected: ${JSON.stringify(value)}` }],
                },
                execute: async (args) => {
                    const ids = String(args.target_ids).split(',').map(s => s.trim()).filter(s => s !== '').slice(0, 20);
                    const results = [];
                    for (const id of ids) {
                        const agent = this.agents.get(id);
                        const status = agent === undefined ? 'not-live' : agent.status;
                        let lastAssistantText = '';
                        try {
                            if (this.queryService !== undefined) {
                                const surface = await this.queryService.readSurface(id);
                                lastAssistantText = this.lastAssistantText(this.surfaceEntries(surface.events, -Infinity));
                            }
                        }
                        catch { /* keep empty */ }
                        results.push({ id, status, lastAssistantText });
                    }
                    return { ok: true, results, error: '' };
                },
            })));
            disposers.push(tools.register(defineTool({
                name: 'intercom_spawn_conversation',
                description: 'Start a new subagent child (durable continuable child via the subagents service) that begins working on the given prompt immediately. NOTE: the new conversation is YOUR SUBAGENT CHILD — manage it with the built-in send_message/list_agents tools, NOT intercom (intercom is only for top-level conversations). The child inherits your workspace, provider and model.',
                parameters: {
                    prompt: { type: 'string', required: true, description: 'first prompt the new child starts working on' },
                },
                output: {
                    schema: { type: 'object', additionalProperties: false, properties: { ok: { type: 'boolean', required: true }, sessionId: { type: 'string', required: true }, transient: { type: 'boolean', required: true }, error: { type: 'string', required: true } } },
                    render: (_args, value) => [{ type: 'text', text: value.sessionId }],
                },
                execute: async (args, exec) => {
                    const from = exec.agent;
                    if (from === undefined)
                        throw new Error('intercom_spawn_conversation requires a calling agent');
                    const promptText = String(args.prompt).slice(0, MAX_TEXT);
                    const providerName = this.continuableProviderName();
                    if (providerName !== '' && this.subagents !== undefined) {
                        try {
                            const start = await this.subagents.startContinuable({
                                provider: providerName,
                                label: 'intercom-spawn',
                                request: { prompt: [{ type: 'text', text: promptText }], parent: from },
                                signal: exec.signal ?? new AbortController().signal,
                            });
                            return { ok: true, sessionId: start.childId, transient: false, error: '' };
                        }
                        catch (error) {
                            console.error(`[intercom] startContinuable failed, falling back to in-process spawn: ${String(error instanceof Error ? error.message : error)}`);
                        }
                    }
                    try {
                        const provider = from.options?.provider ?? '';
                        const model = from.options?.model ?? '';
                        if (provider === '' || model === '')
                            throw new Error('calling agent has no provider/model to inherit');
                        const cwd = this.cwdOf(from);
                        const sessionId = this.mintId('session-intercom-');
                        const handle = await this.agents.create({
                            sessionId,
                            meta: { parentSession: from.id, ...(cwd === '' ? {} : { cwd }) },
                            agentOptions: { provider, model },
                        });
                        const first = { id: this.mintId('dsh-intercom-'), role: 'user', content: [{ type: 'text', text: promptText }], source: { kind: 'user' } };
                        handle.agent.followup(first);
                        return { ok: true, sessionId: handle.agent.id, transient: true, error: '' };
                    }
                    catch (error) {
                        return { ok: false, sessionId: '', transient: true, error: String(error instanceof Error ? error.message : error) };
                    }
                },
            })));
            disposers.push(tools.register(defineTool({
                name: 'intercom_create_group',
                description: 'Create an explicit coordination group (对话群) from a list of TOP-LEVEL conversation ids. Use for multi-conversation cooperation among parent agents: members can be addressed together via intercom_broadcast and read together via intercom_read_group. Groups survive backend restarts.',
                parameters: {
                    name: { type: 'string', required: true, description: 'group display name' },
                    member_ids: { type: 'string', required: true, description: 'comma-separated exact top-level conversation ids' },
                },
                output: {
                    schema: { type: 'object', additionalProperties: false, properties: { ok: { type: 'boolean', required: true }, groupId: { type: 'string', required: true }, name: { type: 'string', required: true }, memberCount: { type: 'number', required: true }, error: { type: 'string', required: true } } },
                    render: (_args, value) => [{ type: 'text', text: value.name }],
                },
                execute: async (args) => {
                    return this.createGroup({ name: String(args.name), memberIds: String(args.member_ids) });
                },
            })));
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
                    render: (_args, value) => [{ type: 'text', text: `broadcast: ${JSON.stringify(value)}` }],
                },
                execute: async (args, exec) => {
                    const from = exec.agent;
                    if (from === undefined)
                        throw new Error('intercom_broadcast requires a calling agent');
                    return this.broadcast({ groupId: String(args.group_id), from: from.id, text: String(args.message), delivery: String(args.delivery ?? 'wake') });
                },
            })));
            disposers.push(tools.register(defineTool({
                name: 'intercom_list_groups',
                description: 'List all coordination groups (对话群), including the automatic group「协作中的对话」that collects top-level conversations involved in intercom traffic. Returns group id, name, memberCount and member ids.',
                parameters: {},
                output: {
                    schema: { type: 'object', additionalProperties: false, properties: { groups: { type: 'array', required: true }, error: { type: 'string', required: true } } },
                    render: (_args, value) => [{ type: 'text', text: `groups: ${JSON.stringify(value)}` }],
                },
                execute: async () => {
                    return { groups: this.groups(), error: '' };
                },
            })));
            disposers.push(tools.register(defineTool({
                name: 'intercom_read_group',
                description: 'Read the merged recent conversation content of every member of a group (对话群聊天记录) since the given epoch-milliseconds timestamp. Pass since_time 0 for no filter. Each member\'s content is labeled with its title.',
                parameters: {
                    group_id: { type: 'string', required: true, description: 'exact group id from intercom_list_groups' },
                    since_time: { type: 'number', required: true, description: 'epoch ms; 0 = no filter' },
                },
                output: {
                    schema: { type: 'object', additionalProperties: false, properties: { ok: { type: 'boolean', required: true }, groupId: { type: 'string', required: true }, text: { type: 'string', required: true }, error: { type: 'string', required: true } } },
                    render: (_args, value) => [{ type: 'text', text: value.text }],
                },
                execute: async (args) => {
                    const result = await this.readGroup({ groupId: String(args.group_id), sinceTime: Number(args.since_time) || 0 });
                    if (result.ok) {
                        const relayLines = result.relays.map(r => r.toId === '*' ? `📢 ${r.fromTitle} → 全体成员: ${r.text}` : `📤 ${r.fromTitle} → ${r.toTitle}: ${r.text}`);
                        const entryLines = result.entries.map(e => `${e.memberTitle ?? ''}: [${e.role}] ${e.text}`);
                        const text = [...relayLines, ...entryLines].join('\n').slice(0, 16000);
                        return { ok: true, groupId: String(args.group_id), text, error: '' };
                    }
                    return { ok: false, groupId: String(args.group_id), text: '', error: result.error };
                },
            })));
            disposers.push(tools.register(defineTool({
                name: 'intercom_remove_group',
                description: 'Delete an explicit coordination group (对话群). The automatic group 「协作中的对话(自动)」cannot be removed. Removing a group only deletes the group record; the member conversations and their histories are untouched.',
                parameters: {
                    group_id: { type: 'string', required: true, description: 'exact group id from intercom_list_groups (must not be the automatic group)' },
                },
                output: {
                    schema: { type: 'object', additionalProperties: false, properties: { ok: { type: 'boolean', required: true }, error: { type: 'string', required: true } } },
                    render: (_args, value) => [{ type: 'text', text: value.ok ? 'group removed' : `failed: ${value.error}` }],
                },
                execute: async (args) => {
                    const result = this.removeGroup({ groupId: String(args.group_id) });
                    if (result.ok)
                        return { ok: true, error: '' };
                    throw new Error(result.error);
                },
            })));
            ctx.effect(() => () => { for (const dispose of disposers)
                dispose(); }, 'intercom: tool disposers');
        }
    };
})();
export { IntercomGateway };
export default IntercomGateway;
//# sourceMappingURL=index.js.map