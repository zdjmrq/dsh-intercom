/**
 * Durable storage declaration of the intercom domain. Groups (explicit and
 * automatic) survive backend restarts; the mailbox is intentionally a
 * transient mirror because the authoritative history lives in the session
 * logs this plugin reads back on demand.
 * @module @deepseek-ai/dsh-host-intercom/spec
 */
import { z } from 'zod';
export declare const groupValueSchema: z.ZodObject<{
    name: z.ZodString;
    members: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
export type GroupValue = z.infer<typeof groupValueSchema>;
/** Global slot: one record holding every group keyed by group id. */
export declare const intercomGlobalSchema: z.ZodObject<{
    groups: z.ZodRecord<z.ZodString, z.ZodObject<{
        name: z.ZodString;
        members: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type IntercomGlobal = z.infer<typeof intercomGlobalSchema>;
export declare const intercomGlobalInitial: IntercomGlobal;
export declare const intercomDomain: {
    name: string;
    version: number;
    global: {
        schema: z.ZodObject<{
            groups: z.ZodRecord<z.ZodString, z.ZodObject<{
                name: z.ZodString;
                members: z.ZodArray<z.ZodString>;
            }, z.core.$strip>>;
        }, z.core.$strip>;
        initial: {
            groups: Record<string, {
                name: string;
                members: string[];
            }>;
        };
    };
    tables: {};
};
//# sourceMappingURL=spec.d.ts.map