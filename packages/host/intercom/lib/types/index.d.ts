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
import type { BroadcastRequest, BroadcastResult, ConversationInfo, CreateGroupRequest, CreateGroupResult, GroupInfo, GroupMemberRequest, OkResult, ReadConversationRequest, ReadConversationResult, ReadGroupRequest, ReadGroupResult, SendRequest, SendResult } from './types.ts';
export type * from './types.ts';
export { intercomDomain } from './spec.ts';
export declare class IntercomGateway extends TypertRemoteService {
    private groupStore;
    private outbox;
    private spentWakes;
    private rateBuckets;
    private counter;
    private domain;
    private get agents();
    private get titleService();
    private get queryService();
    private get subagents();
    constructor(ctx: Context);
    private mintId;
    private titleOf;
    private cwdOf;
    private isRoot;
    private ensureAutoGroup;
    private autoAddToGroup;
    private rateAllowed;
    private buildMessage;
    private recordOutbox;
    private deliver;
    private surfaceEntries;
    private surfaceText;
    private lastAssistantText;
    private continuableProviderName;
    private loadDomain;
    private persist;
    list(): ConversationInfo[];
    groups(): GroupInfo[];
    send(request: SendRequest): SendResult;
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