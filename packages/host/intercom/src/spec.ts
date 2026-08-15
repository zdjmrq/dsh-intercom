/**
 * Durable storage declaration of the intercom domain. Groups (explicit and
 * automatic) survive backend restarts; the mailbox is intentionally a
 * transient mirror because the authoritative history lives in the session
 * logs this plugin reads back on demand.
 * @module @deepseek-ai/dsh-host-intercom/spec
 */

import { z } from 'zod'
import { defineDomain } from '@deepseek-ai/dsh-storage-domain'

export const groupValueSchema = z.object({
  name: z.string(),
  members: z.array(z.string()),
})
export type GroupValue = z.infer<typeof groupValueSchema>

/** Global slot: one record holding every group keyed by group id. */
export const intercomGlobalSchema = z.object({
  groups: z.record(z.string(), groupValueSchema),
})
export type IntercomGlobal = z.infer<typeof intercomGlobalSchema>

export const intercomGlobalInitial: IntercomGlobal = { groups: {} }

export const intercomDomain = defineDomain({
  name: 'intercom',
  version: 0,
  global: {
    schema: intercomGlobalSchema,
    initial: intercomGlobalInitial,
  },
  tables: {},
})
