/**
 * Wire contracts of the intercom Host Remote. Every type here is plain
 * lossless JSON: the Remote params/returns, the panel projections, and the
 * model-tool payloads all share this vocabulary. They are `type` aliases
 * (not interfaces) so they structurally satisfy the JsonValue checks of the
 * tool registry and the typert codecs.
 * @module @deepseek-ai/dsh-host-intercom/types
 */
/** One live top-level conversation as projected for the panel and the tools. */
export type ConversationInfo = {
    /** Session id — the only valid address. */
    id: string;
    /** Latest folded title, falling back to the id. */
    title: string;
    /** `idle` or `running`. */
    status: string;
    /** Absolute working directory, empty when unknown. */
    cwd: string;
    provider: string;
    model: string;
};
/** One coordination group (对话群), including the automatic one. */
export type GroupInfo = {
    id: string;
    name: string;
    memberCount: number;
    members: string[];
};
/** One chat entry projected from a session surface. */
export type MessageEntry = {
    role: 'user' | 'assistant';
    text: string;
    time: number;
    /** Present only on group-merged entries. */
    memberId?: string;
    /** Present only on group-merged entries. */
    memberTitle?: string;
};
export type SendRequest = {
    from: string;
    targetId: string;
    text: string;
    /** `wake` (default) or `steer`. */
    delivery: string;
    /** Explicit opt-in for cross-workspace delivery. */
    allowCrossWorkspace?: boolean;
};
export type SendResult = {
    ok: boolean;
    messageId: string;
    /** `wake` | `queue` | `steer`. */
    applied: string;
    targetId: string;
    targetStatus: string;
    error: string;
};
export type BroadcastRequest = {
    groupId: string;
    from: string;
    text: string;
    delivery: string;
};
export type BroadcastMemberResult = {
    targetId: string;
    ok: boolean;
    applied: string;
    error: string;
};
export type BroadcastResult = {
    ok: boolean;
    groupId: string;
    results: BroadcastMemberResult[];
    error: string;
};
export type ReadConversationRequest = {
    sessionId: string;
    maxEvents: number;
};
export type ReadConversationResult = {
    ok: boolean;
    entries: MessageEntry[];
    error: string;
};
export type ReadGroupRequest = {
    groupId: string;
    sinceTime: number;
};
export type ReadGroupResult = {
    ok: boolean;
    entries: MessageEntry[];
    error: string;
};
export type CreateGroupRequest = {
    name: string;
    /** Comma-separated top-level conversation ids. */
    memberIds: string;
};
export type CreateGroupResult = {
    ok: boolean;
    groupId: string;
    name: string;
    memberCount: number;
    error: string;
};
export type GroupMemberRequest = {
    groupId: string;
    memberId: string;
};
/** One dormant (persisted but not live) top-level session, projected for the panel. */
export type DormantConversation = {
    id: string;
    title: string;
    cwd: string;
    createdAt: number;
};
export type DormantListResult = {
    ok: boolean;
    conversations: DormantConversation[];
    error: string;
};
export type WakeSendRequest = {
    from: string;
    targetId: string;
    text: string;
    /** `wake` (default) or `steer`. */
    delivery: string;
    /** Explicit opt-in for cross-workspace delivery. */
    allowCrossWorkspace?: boolean;
};
export type WakeSendResult = {
    ok: boolean;
    messageId: string;
    /** `wake` | `queue` | `steer`. */
    applied: string;
    targetId: string;
    targetStatus: string;
    /** True when this call resumed a dormant session before delivering. */
    resumed: boolean;
    error: string;
};
export type OkResult = {
    ok: boolean;
    error: string;
};
//# sourceMappingURL=types.d.ts.map