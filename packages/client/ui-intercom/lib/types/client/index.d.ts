/**
 * Browser half of the intercom plugin: the chat-style communication center.
 * Left column lists top-level conversations and coordination groups; the right
 * pane shows the message history and the single composer. Backed by the
 * intercom Host Remote (`ctx.remote.intercom`).
 * @module @deepseek-ai/dsh-client-ui-intercom/client
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { type FunctionComponent } from 'react';
interface ConversationInfo {
    id: string;
    title: string;
    status: string;
    cwd: string;
    provider: string;
    model: string;
}
interface DormantConversation {
    id: string;
    title: string;
    cwd: string;
    createdAt: number;
}
interface GroupInfo {
    id: string;
    name: string;
    memberCount: number;
    members: string[];
}
interface MessageEntry {
    role: 'user' | 'assistant';
    text: string;
    time: number;
    memberId?: string;
    memberTitle?: string;
}
interface RemoteEnvelope<T> {
    ok: boolean;
    value?: T;
    error?: {
        message: string;
    };
}
interface RemoteFace {
    list(): Promise<RemoteEnvelope<ConversationInfo[]>>;
    dormant(): Promise<RemoteEnvelope<{
        ok: boolean;
        conversations: DormantConversation[];
        error: string;
    }>>;
    groups(): Promise<RemoteEnvelope<GroupInfo[]>>;
    send(request: {
        from: string;
        targetId: string;
        text: string;
        delivery: string;
    }): Promise<RemoteEnvelope<{
        ok: boolean;
        messageId: string;
        applied: string;
        targetId: string;
        targetStatus: string;
        error: string;
    }>>;
    wakeSend(request: {
        from: string;
        targetId: string;
        text: string;
        delivery: string;
    }): Promise<RemoteEnvelope<{
        ok: boolean;
        messageId: string;
        applied: string;
        targetId: string;
        targetStatus: string;
        resumed: boolean;
        error: string;
    }>>;
    broadcast(request: {
        groupId: string;
        from: string;
        text: string;
        delivery: string;
    }): Promise<RemoteEnvelope<{
        ok: boolean;
        groupId: string;
        results: Array<{
            targetId: string;
            ok: boolean;
            applied: string;
            error: string;
        }>;
        error: string;
    }>>;
    readConversation(request: {
        sessionId: string;
        maxEvents: number;
    }): Promise<RemoteEnvelope<{
        ok: boolean;
        entries: MessageEntry[];
        error: string;
    }>>;
    readGroup(request: {
        groupId: string;
        sinceTime: number;
    }): Promise<RemoteEnvelope<{
        ok: boolean;
        entries: MessageEntry[];
        error: string;
    }>>;
    createGroup(request: {
        name: string;
        memberIds: string;
    }): Promise<RemoteEnvelope<{
        ok: boolean;
        groupId: string;
        name: string;
        memberCount: number;
        error: string;
    }>>;
    addMember(request: {
        groupId: string;
        memberId: string;
    }): Promise<RemoteEnvelope<{
        ok: boolean;
        error: string;
    }>>;
    removeMember(request: {
        groupId: string;
        memberId: string;
    }): Promise<RemoteEnvelope<{
        ok: boolean;
        error: string;
    }>>;
}
interface SessionsFace {
    open(id: string): void;
    fork(opts: {
        sessionId: string;
    }): Promise<string>;
}
interface WorkspacesFace {
    startSession(workspaceId?: string): void;
}
interface UiStore {
    open: boolean;
    version: number;
    currentSessionId: string;
    listeners: Set<() => void>;
}
export declare const inject: string[];
export declare function apply(ctx: ClientContext): void;
interface PanelProps {
    store: UiStore;
    remote: RemoteFace;
    sessions: SessionsFace;
    workspaces: WorkspacesFace;
    notify: () => void;
}
declare const IntercomPanel: FunctionComponent<PanelProps>;
export { IntercomPanel };
//# sourceMappingURL=index.d.ts.map