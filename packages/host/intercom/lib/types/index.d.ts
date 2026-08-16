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
import type { Context } from '@deepseek-ai/cordis';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { BroadcastRequest, BroadcastResult, ConversationInfo, CreateGroupRequest, CreateGroupResult, DormantListResult, GroupInfo, GroupMemberRequest, OkResult, ReadConversationRequest, ReadConversationResult, ReadGroupRequest, ReadGroupResult, SendRequest, SendResult, WakeSendRequest, WakeSendResult } from './types.ts';
export type * from './types.ts';
export { intercomDomain } from './spec.ts';
export declare class IntercomGateway extends TypertRemoteService {
    static inject: string[];
    private groupStore;
    private outbox;
    private spentWakes;
    private rateBuckets;
    private counter;
    private domain;
    private titleCache;
    private get agents();
    private get titleService();
    private get queryService();
    private get subagents();
    private get persistence();
    constructor(ctx: Context);
    private mintId;
    private titleOf;
    private cwdOf;
    private isRoot;
    private ensureAutoGroup;
    private autoAddToGroup;
    private rateAllowed;
    /**
     * Compare two workspace paths the way the local filesystem does: on Windows
     * the comparison is case-insensitive (and both separators normalize), so a
     * historically-lowercased path does not read as a different workspace.
     */
    private sameWorkspace;
    /** Resolve a session title with a 5-minute cache; falls back to the id. */
    private titleOfSession;
    private buildMessage;
    private recordOutbox;
    private deliver;
    /** Shared delivery core: workspace gate, rate limit, wake/queue/steer, group bookkeeping. */
    private deliverTo;
    private surfaceEntries;
    private surfaceText;
    private lastAssistantText;
    private continuableProviderName;
    private loadDomain;
    private persist;
    list(): ConversationInfo[];
    groups(): GroupInfo[];
    send(request: SendRequest): SendResult;
    dormant(): Promise<DormantListResult>;
    wakeSend(request: WakeSendRequest): Promise<WakeSendResult>;
    /** Wake (resume) a dormant top-level session when needed, then deliver like `send`. */
    private wakeSendInternal;
    broadcast(request: BroadcastRequest): BroadcastResult;
    readConversation(request: ReadConversationRequest): Promise<ReadConversationResult>;
    readGroup(request: ReadGroupRequest): Promise<ReadGroupResult>;
    createGroup(request: CreateGroupRequest): CreateGroupResult;
    addMember(request: GroupMemberRequest): OkResult;
    removeMember(request: GroupMemberRequest): OkResult;
    private registerTools;
}
export default IntercomGateway;
//# sourceMappingURL=index.d.ts.map