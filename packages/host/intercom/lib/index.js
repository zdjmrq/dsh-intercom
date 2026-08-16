import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { z } from "zod";
import { defineDomain } from "@deepseek-ai/dsh-storage-domain";
//#region lib/types/spec.js
/**
* Durable storage declaration of the intercom domain. Groups (explicit and
* automatic) survive backend restarts; the mailbox is intentionally a
* transient mirror because the authoritative history lives in the session
* logs this plugin reads back on demand.
* @module @deepseek-ai/dsh-host-intercom/spec
*/
const groupValueSchema = z.object({
	name: z.string(),
	members: z.array(z.string())
});
const intercomDomain = defineDomain({
	name: "intercom",
	version: 0,
	global: {
		schema: z.object({ groups: z.record(z.string(), groupValueSchema) }),
		initial: { groups: {} }
	},
	tables: {}
});
//#endregion
//#region lib/types/index.js
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
var __runInitializers = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) if (kind === "field") initializers.unshift(_);
		else descriptor[key] = _;
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
const AUTO_GROUP_ID = "__auto";
const AUTO_GROUP_NAME = "协作中的对话(自动)";
const MAX_WAKES = 3;
const RATE_LIMIT = 10;
const MAX_TEXT = 8e3;
function wait(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
let IntercomGateway = (() => {
	let _classSuper = TypertRemoteService;
	let _instanceExtraInitializers = [];
	let _list_decorators;
	let _groups_decorators;
	let _send_decorators;
	let _broadcast_decorators;
	let _readConversation_decorators;
	let _readGroup_decorators;
	let _createGroup_decorators;
	let _addMember_decorators;
	let _removeMember_decorators;
	return class IntercomGateway extends _classSuper {
		static {
			const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
			_list_decorators = [Remote("list")];
			_groups_decorators = [Remote("groups")];
			_send_decorators = [Remote("send")];
			_broadcast_decorators = [Remote("broadcast")];
			_readConversation_decorators = [Remote("readConversation")];
			_readGroup_decorators = [Remote("readGroup")];
			_createGroup_decorators = [Remote("createGroup")];
			_addMember_decorators = [Remote("addMember")];
			_removeMember_decorators = [Remote("removeMember")];
			__esDecorate(this, null, _list_decorators, {
				kind: "method",
				name: "list",
				static: false,
				private: false,
				access: {
					has: (obj) => "list" in obj,
					get: (obj) => obj.list
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _groups_decorators, {
				kind: "method",
				name: "groups",
				static: false,
				private: false,
				access: {
					has: (obj) => "groups" in obj,
					get: (obj) => obj.groups
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _send_decorators, {
				kind: "method",
				name: "send",
				static: false,
				private: false,
				access: {
					has: (obj) => "send" in obj,
					get: (obj) => obj.send
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _broadcast_decorators, {
				kind: "method",
				name: "broadcast",
				static: false,
				private: false,
				access: {
					has: (obj) => "broadcast" in obj,
					get: (obj) => obj.broadcast
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _readConversation_decorators, {
				kind: "method",
				name: "readConversation",
				static: false,
				private: false,
				access: {
					has: (obj) => "readConversation" in obj,
					get: (obj) => obj.readConversation
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _readGroup_decorators, {
				kind: "method",
				name: "readGroup",
				static: false,
				private: false,
				access: {
					has: (obj) => "readGroup" in obj,
					get: (obj) => obj.readGroup
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _createGroup_decorators, {
				kind: "method",
				name: "createGroup",
				static: false,
				private: false,
				access: {
					has: (obj) => "createGroup" in obj,
					get: (obj) => obj.createGroup
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _addMember_decorators, {
				kind: "method",
				name: "addMember",
				static: false,
				private: false,
				access: {
					has: (obj) => "addMember" in obj,
					get: (obj) => obj.addMember
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _removeMember_decorators, {
				kind: "method",
				name: "removeMember",
				static: false,
				private: false,
				access: {
					has: (obj) => "removeMember" in obj,
					get: (obj) => obj.removeMember
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		static inject = ["tools", "storageDomain"];
		groupStore = (__runInitializers(this, _instanceExtraInitializers), /* @__PURE__ */ new Map());
		outbox = /* @__PURE__ */ new Map();
		spentWakes = /* @__PURE__ */ new WeakMap();
		rateBuckets = /* @__PURE__ */ new Map();
		counter = 0;
		domain = null;
		get agents() {
			return this.ctx.get("agents");
		}
		get titleService() {
			return this.ctx.get("sessionTitle");
		}
		get queryService() {
			return this.ctx.get("sessionQuery");
		}
		get subagents() {
			return this.ctx.get("subagents");
		}
		constructor(ctx) {
			super(ctx, "intercom");
			this.ensureAutoGroup();
			this.loadDomain();
			this.registerTools(ctx);
			ctx.effect(() => {
				const claimed = ctx.on("agent/inbox/claimed", (payload) => {
					if (payload?.agent !== void 0 && payload?.message?.source?.kind === "user") this.spentWakes.delete(payload.agent);
				});
				const disposed = ctx.on("agent/disposed", (payload) => {
					if (payload?.agent !== void 0) {
						this.rateBuckets.delete(payload.agent.id);
						this.outbox.delete(payload.agent.id);
					}
				});
				return () => {
					claimed();
					disposed();
				};
			}, "intercom: lifecycle listeners");
		}
		mintId(prefix) {
			this.counter += 1;
			return `${prefix}${Date.now().toString(36)}-${this.counter.toString(36)}`;
		}
		titleOf(agent) {
			try {
				const snapshot = this.titleService?.get(agent.session);
				if (snapshot !== void 0 && typeof snapshot.title === "string" && snapshot.title.length > 0) return snapshot.title;
			} catch {}
			return agent.id;
		}
		cwdOf(agent) {
			try {
				const cwd = agent.session.header?.cwd;
				return typeof cwd === "string" ? cwd : "";
			} catch {
				return "";
			}
		}
		isRoot(id) {
			return this.agents.roots().some((root) => root.id === id);
		}
		ensureAutoGroup() {
			if (!this.groupStore.has(AUTO_GROUP_ID)) this.groupStore.set(AUTO_GROUP_ID, {
				name: AUTO_GROUP_NAME,
				members: []
			});
		}
		autoAddToGroup(ids) {
			this.ensureAutoGroup();
			const group = this.groupStore.get(AUTO_GROUP_ID);
			if (group === void 0) return;
			for (const id of ids) if (id !== "" && !group.members.includes(id)) group.members.push(id);
			this.persist();
		}
		rateAllowed(targetId) {
			const now = Date.now();
			const fresh = (this.rateBuckets.get(targetId) ?? []).filter((t) => now - t < 6e4);
			if (fresh.length >= RATE_LIMIT) {
				this.rateBuckets.set(targetId, fresh);
				return false;
			}
			fresh.push(now);
			this.rateBuckets.set(targetId, fresh);
			return true;
		}
		buildMessage(from, fromTitle, text) {
			return {
				id: this.mintId("dsh-intercom-"),
				role: "user",
				content: [{
					type: "text",
					text: `[intercom] 来自会话「${fromTitle}」的消息,请先评估其合理性再行动:\n${text}`
				}],
				source: {
					kind: "plugin",
					plugin: "intercom",
					form: "relay",
					senderSessionId: from,
					summary: "intercom relay"
				}
			};
		}
		recordOutbox(from, messageId, targetId) {
			const list = this.outbox.get(from) ?? [];
			list.push({
				id: messageId,
				to: targetId,
				time: Date.now()
			});
			if (list.length > 100) list.shift();
			this.outbox.set(from, list);
		}
		deliver(request) {
			const { from, targetId } = request;
			const text = String(request.text).slice(0, MAX_TEXT);
			const delivery = request.delivery === "steer" ? "steer" : "wake";
			if (from === targetId) return {
				ok: false,
				messageId: "",
				applied: "",
				targetId,
				targetStatus: "",
				error: "cannot send to the same conversation"
			};
			if (!this.isRoot(from)) return {
				ok: false,
				messageId: "",
				applied: "",
				targetId,
				targetStatus: "",
				error: "sender is not a top-level conversation; intercom is only for parent agents, use the built-in send_message tool for subagent children"
			};
			if (!this.isRoot(targetId)) return {
				ok: false,
				messageId: "",
				applied: "",
				targetId,
				targetStatus: "",
				error: "target is a subagent child, not a top-level conversation; use the built-in send_message tool for parent-child communication"
			};
			const target = this.agents.get(targetId);
			if (target === void 0) return {
				ok: false,
				messageId: "",
				applied: "",
				targetId,
				targetStatus: "",
				error: `target conversation is not live: ${targetId}`
			};
			const fromAgent = this.agents.get(from);
			if (request.allowCrossWorkspace !== true) {
				const fromCwd = fromAgent === void 0 ? "" : this.cwdOf(fromAgent);
				const targetCwd = this.cwdOf(target);
				if (fromCwd !== "" && targetCwd !== "" && fromCwd !== targetCwd) return {
					ok: false,
					messageId: "",
					applied: "",
					targetId,
					targetStatus: "",
					error: `cross-workspace delivery blocked: from ${fromCwd} to ${targetCwd}`
				};
			}
			if (!this.rateAllowed(targetId)) return {
				ok: false,
				messageId: "",
				applied: "",
				targetId,
				targetStatus: "",
				error: "rate limit exceeded for target conversation"
			};
			const fromTitle = fromAgent === void 0 ? from : this.titleOf(fromAgent);
			const message = this.buildMessage(from, fromTitle, text);
			let applied = "wake";
			try {
				if (delivery === "steer") {
					target.steer(message);
					applied = "steer";
				} else {
					const spent = this.spentWakes.get(target) ?? 0;
					if (target.status === "idle" && spent < MAX_WAKES) {
						this.spentWakes.set(target, spent + 1);
						target.followup(message);
						applied = "wake";
					} else {
						target.inject(message);
						applied = "queue";
					}
				}
			} catch (error) {
				return {
					ok: false,
					messageId: "",
					applied: "",
					targetId,
					targetStatus: "",
					error: `delivery failed: ${String(error instanceof Error ? error.message : error)}`
				};
			}
			this.autoAddToGroup([from, targetId]);
			this.recordOutbox(from, message.id, targetId);
			return {
				ok: true,
				messageId: message.id,
				applied,
				targetId,
				targetStatus: target.status,
				error: ""
			};
		}
		surfaceEntries(events, sinceTime) {
			const entries = [];
			for (const event of events) {
				if (typeof event.time === "number" && event.time <= sinceTime) continue;
				const message = event.data?.message;
				if (message === void 0 || !Array.isArray(message.content)) continue;
				const role = event.type === "assistant/message" ? "assistant" : event.type === "user/message" ? "user" : null;
				if (role === null) continue;
				const text = message.content.filter((block) => block !== null && typeof block === "object" && block.type === "text" && typeof block.text === "string").map((block) => block.text).join("\n");
				if (text === "") continue;
				entries.push({
					role,
					text,
					time: typeof event.time === "number" ? event.time : 0
				});
			}
			return entries;
		}
		surfaceText(events, sinceTime) {
			return this.surfaceEntries(events, sinceTime).map((entry) => `[${entry.role}] ${entry.text}`).join("\n").slice(0, 16e3);
		}
		lastAssistantText(entries) {
			for (let i = entries.length - 1; i >= 0; i--) {
				const entry = entries[i];
				if (entry !== void 0 && entry.role === "assistant") return entry.text.slice(0, 4e3);
			}
			return "";
		}
		continuableProviderName() {
			if (this.subagents === void 0) return "";
			try {
				for (const name of this.subagents.list()) {
					const provider = this.subagents.getProvider(name);
					if (provider !== void 0 && typeof provider.prepareContinuable === "function") return name;
				}
			} catch {}
			return "";
		}
		loadDomain() {
			const facility = this.ctx.get("storageDomain");
			if (facility === void 0) {
				console.error("[intercom] storageDomain service unavailable; groups are in-memory only for this process");
				return;
			}
			facility.open(intercomDomain).then((domain) => {
				this.domain = domain;
				return domain.global.get();
			}).then((global) => {
				if (global === null || typeof global !== "object" || global.groups === void 0 || global.groups === null) return;
				for (const [id, value] of Object.entries(global.groups)) {
					if (this.groupStore.has(id)) continue;
					this.groupStore.set(id, {
						name: String(value.name),
						members: Array.isArray(value.members) ? [...value.members] : []
					});
				}
			}).catch((error) => {
				console.error(`[intercom] domain load failed: ${String(error instanceof Error ? error.message : error)}`);
			});
		}
		persist() {
			if (this.domain === null) return;
			const snapshot = {};
			for (const [id, value] of this.groupStore) snapshot[id] = {
				name: value.name,
				members: [...value.members]
			};
			this.domain.global.set({ groups: snapshot }).catch((error) => {
				console.error(`[intercom] persist failed: ${String(error instanceof Error ? error.message : error)}`);
			});
		}
		list() {
			return this.agents.roots().map((agent) => ({
				id: agent.id,
				title: this.titleOf(agent),
				status: agent.status,
				cwd: this.cwdOf(agent),
				provider: agent.options?.provider ?? "",
				model: agent.options?.model ?? ""
			}));
		}
		groups() {
			this.ensureAutoGroup();
			const view = [];
			for (const [id, value] of this.groupStore) view.push({
				id,
				name: value.name,
				memberCount: value.members.length,
				members: [...value.members]
			});
			return view;
		}
		send(request) {
			if (request === null || typeof request !== "object" || typeof request.from !== "string" || typeof request.targetId !== "string" || typeof request.text !== "string") return {
				ok: false,
				messageId: "",
				applied: "",
				targetId: "",
				targetStatus: "",
				error: "from/targetId/text are required strings"
			};
			return this.deliver(request);
		}
		broadcast(request) {
			if (request === null || typeof request !== "object" || typeof request.groupId !== "string" || typeof request.from !== "string" || typeof request.text !== "string") return {
				ok: false,
				groupId: "",
				results: [],
				error: "groupId/from/text are required strings"
			};
			const group = this.groupStore.get(request.groupId);
			if (group === void 0) return {
				ok: false,
				groupId: request.groupId,
				results: [],
				error: `unknown group: ${request.groupId}`
			};
			const results = [];
			for (const memberId of group.members) {
				if (memberId === request.from) continue;
				const r = this.deliver({
					from: request.from,
					targetId: memberId,
					text: request.text,
					delivery: request.delivery
				});
				results.push({
					targetId: memberId,
					ok: r.ok,
					applied: r.applied,
					error: r.error
				});
			}
			return {
				ok: true,
				groupId: request.groupId,
				results,
				error: ""
			};
		}
		async readConversation(request) {
			const sessionId = request === null || typeof request !== "object" ? "" : String(request.sessionId ?? "");
			if (sessionId === "") return {
				ok: false,
				entries: [],
				error: "sessionId required"
			};
			try {
				if (this.queryService === void 0) throw new Error("sessionQuery service unavailable");
				const surface = await this.queryService.readSurface(sessionId);
				const maxEvents = request !== null && typeof request === "object" && typeof request.maxEvents === "number" && Number.isFinite(request.maxEvents) ? request.maxEvents : 80;
				return {
					ok: true,
					entries: this.surfaceEntries(surface.events, -Infinity).slice(-maxEvents),
					error: ""
				};
			} catch (error) {
				return {
					ok: false,
					entries: [],
					error: String(error instanceof Error ? error.message : error)
				};
			}
		}
		async readGroup(request) {
			const groupId = request === null || typeof request !== "object" ? "" : String(request.groupId ?? "");
			const group = this.groupStore.get(groupId);
			if (group === void 0) return {
				ok: false,
				entries: [],
				error: `unknown group: ${groupId}`
			};
			if (this.queryService === void 0) return {
				ok: false,
				entries: [],
				error: "sessionQuery service unavailable"
			};
			const sinceTime = request !== null && typeof request === "object" && typeof request.sinceTime === "number" ? request.sinceTime : 0;
			const merged = [];
			for (const memberId of group.members) try {
				const surface = await this.queryService.readSurface(memberId);
				const agent = this.agents.get(memberId);
				const label = agent === void 0 ? memberId : this.titleOf(agent);
				for (const entry of this.surfaceEntries(surface.events, sinceTime)) merged.push({
					...entry,
					memberId,
					memberTitle: label
				});
			} catch {}
			merged.sort((a, b) => a.time - b.time);
			return {
				ok: true,
				entries: merged.slice(-200),
				error: ""
			};
		}
		createGroup(request) {
			if (request === null || typeof request !== "object" || typeof request.name !== "string" || typeof request.memberIds !== "string") return {
				ok: false,
				groupId: "",
				name: "",
				memberCount: 0,
				error: "name/memberIds (comma-separated) are required strings"
			};
			const id = this.mintId("grp-");
			const members = [];
			for (const memberId of String(request.memberIds).split(",").map((s) => s.trim())) if (memberId !== "" && this.isRoot(memberId) && !members.includes(memberId)) members.push(memberId);
			const name = String(request.name).slice(0, 60) || id;
			this.groupStore.set(id, {
				name,
				members
			});
			this.persist();
			return {
				ok: true,
				groupId: id,
				name,
				memberCount: members.length,
				error: ""
			};
		}
		addMember(request) {
			const groupId = request === null || typeof request !== "object" ? "" : String(request.groupId ?? "");
			const memberId = request === null || typeof request !== "object" ? "" : String(request.memberId ?? "");
			const group = this.groupStore.get(groupId);
			if (group === void 0) return {
				ok: false,
				error: "unknown group"
			};
			if (memberId === "") return {
				ok: false,
				error: "memberId required"
			};
			if (!this.isRoot(memberId)) return {
				ok: false,
				error: "only top-level conversations can join a group"
			};
			if (!group.members.includes(memberId)) group.members.push(memberId);
			this.persist();
			return {
				ok: true,
				error: ""
			};
		}
		removeMember(request) {
			const groupId = request === null || typeof request !== "object" ? "" : String(request.groupId ?? "");
			const memberId = request === null || typeof request !== "object" ? "" : String(request.memberId ?? "");
			const group = this.groupStore.get(groupId);
			if (group === void 0) return {
				ok: false,
				error: "unknown group"
			};
			const index = group.members.indexOf(memberId);
			if (index !== -1) group.members.splice(index, 1);
			this.persist();
			return {
				ok: true,
				error: ""
			};
		}
		registerTools(ctx) {
			const tools = ctx.get("tools");
			if (tools === void 0) {
				console.error("[intercom] tools service unavailable; model tools are skipped");
				return;
			}
			const disposers = [];
			disposers.push(tools.register(defineTool({
				name: "intercom_list_conversations",
				description: "List all live TOP-LEVEL conversations (parent agents) in this DSH process: id, title, status and cwd (workspace). Subagent children are NOT listed: parent-child communication belongs to the built-in send_message/list_agents tools. Use this to discover peer conversations before addressing one with intercom_send. The id is the only valid address. Coordination is restricted to the same workspace by default.",
				parameters: {},
				output: {
					schema: {
						type: "object",
						additionalProperties: false,
						properties: { conversations: {
							type: "array",
							required: true
						} }
					},
					render: (_args, value) => [{
						type: "text",
						text: `live top-level conversations: ${JSON.stringify(value)}`
					}]
				},
				execute: async () => {
					return { conversations: this.agents.roots().map((agent) => ({
						id: agent.id,
						title: this.titleOf(agent),
						status: agent.status,
						cwd: this.cwdOf(agent)
					})) };
				}
			})));
			disposers.push(tools.register(defineTool({
				name: "intercom_send",
				description: "Send a message to another live TOP-LEVEL conversation (parent agent) in the SAME workspace. Both sender and target must be top-level conversations; for subagent children use the built-in send_message tool instead. target_id must be an exact id from intercom_list_conversations. delivery wake: an idle target immediately starts a new turn to work on it; a busy target queues it for its next step. delivery steer: inserts into the target's current turn (use sparingly). Rate-limited; wake budget prevents message loops. Use intercom_ask when you need a reply.",
				parameters: {
					target_id: {
						type: "string",
						required: true,
						description: "exact top-level conversation id from intercom_list_conversations"
					},
					message: {
						type: "string",
						required: true,
						description: "message text to deliver"
					},
					delivery: {
						type: "string",
						required: true,
						description: "delivery mode: wake (default behavior, also applied for any other value) or steer"
					}
				},
				output: {
					schema: {
						type: "object",
						additionalProperties: false,
						properties: {
							ok: {
								type: "boolean",
								required: true
							},
							messageId: {
								type: "string",
								required: true
							},
							applied: {
								type: "string",
								required: true
							},
							targetId: {
								type: "string",
								required: true
							},
							targetStatus: {
								type: "string",
								required: true
							}
						}
					},
					render: (_args, _value) => [{
						type: "text",
						text: "delivered (see structured value)"
					}]
				},
				execute: async (args, exec) => {
					const from = exec.agent;
					if (from === void 0) throw new Error("intercom_send requires a calling agent (exec.agent was undefined)");
					const result = this.deliver({
						from: from.id,
						targetId: String(args.target_id),
						text: String(args.message),
						delivery: String(args.delivery ?? "wake")
					});
					if (result.ok) return {
						ok: result.ok,
						messageId: result.messageId,
						applied: result.applied,
						targetId: result.targetId,
						targetStatus: result.targetStatus
					};
					throw new Error(result.error);
				}
			})));
			disposers.push(tools.register(defineTool({
				name: "intercom_read_conversation",
				description: "Read the recent conversation surface (user tasks and assistant conclusions) of another session, live or cold. Use this to continue another conversation's work (延续工作): extract its current state and hand off locally or to a new conversation. Read-only: never wakes the target.",
				parameters: {
					target_id: {
						type: "string",
						required: true,
						description: "exact session id to read"
					},
					max_events: {
						type: "number",
						required: true,
						description: "maximum number of recent surface events to read, e.g. 20"
					}
				},
				output: {
					schema: {
						type: "object",
						additionalProperties: false,
						properties: {
							ok: {
								type: "boolean",
								required: true
							},
							targetId: {
								type: "string",
								required: true
							},
							text: {
								type: "string",
								required: true
							},
							error: {
								type: "string",
								required: true
							}
						}
					},
					render: (_args, value) => [{
						type: "text",
						text: value.text
					}]
				},
				execute: async (args) => {
					try {
						const result = await this.readConversation({
							sessionId: String(args.target_id),
							maxEvents: Number(args.max_events)
						});
						if (result.ok) return {
							ok: true,
							targetId: String(args.target_id),
							text: result.entries.map((e) => `[${e.role}] ${e.text}`).join("\n").slice(0, 16e3),
							error: ""
						};
						return {
							ok: false,
							targetId: String(args.target_id),
							text: "",
							error: result.error
						};
					} catch (error) {
						return {
							ok: false,
							targetId: String(args.target_id),
							text: "",
							error: String(error instanceof Error ? error.message : error)
						};
					}
				}
			})));
			disposers.push(tools.register(defineTool({
				name: "intercom_check_replies",
				description: "Collect new conversation content from a target session after a given epoch-milliseconds timestamp. Pass since_time 0 to auto-use the timestamp of your last intercom message to that target. Use after intercom_send to gather the target's answer (请求帮助的回收端). Works for cold sessions too. Read-only.",
				parameters: {
					target_id: {
						type: "string",
						required: true,
						description: "exact session id"
					},
					since_time: {
						type: "number",
						required: true,
						description: "epoch ms; 0 = since your last intercom message to this target"
					}
				},
				output: {
					schema: {
						type: "object",
						additionalProperties: false,
						properties: {
							ok: {
								type: "boolean",
								required: true
							},
							targetId: {
								type: "string",
								required: true
							},
							hasNew: {
								type: "boolean",
								required: true
							},
							text: {
								type: "string",
								required: true
							},
							error: {
								type: "string",
								required: true
							}
						}
					},
					render: (_args, value) => [{
						type: "text",
						text: value.text
					}]
				},
				execute: async (args, exec) => {
					const targetId = String(args.target_id);
					let since = Number(args.since_time);
					if (since === 0 && exec.agent !== void 0) {
						const sentList = this.outbox.get(exec.agent.id);
						if (sentList !== void 0) for (let i = sentList.length - 1; i >= 0; i--) {
							const record = sentList[i];
							if (record !== void 0 && record.to === targetId) {
								since = record.time;
								break;
							}
						}
					}
					try {
						if (this.queryService === void 0) throw new Error("sessionQuery service unavailable");
						const surface = await this.queryService.readSurface(targetId);
						const text = this.surfaceText(surface.events, since);
						return {
							ok: true,
							targetId,
							hasNew: text !== "",
							text,
							error: ""
						};
					} catch (error) {
						return {
							ok: false,
							targetId,
							hasNew: false,
							text: "",
							error: String(error instanceof Error ? error.message : error)
						};
					}
				}
			})));
			disposers.push(tools.register(defineTool({
				name: "intercom_ask",
				description: "Ask another live TOP-LEVEL conversation for help and optionally wait up to wait_ms (cap 30000) for its reply. Both parties must be top-level conversations (for subagent children use send_message). This is send + bounded reply collection in one call: the target is woken if idle, and any new reply text is returned in replyText.",
				parameters: {
					target_id: {
						type: "string",
						required: true,
						description: "exact top-level conversation id from intercom_list_conversations"
					},
					message: {
						type: "string",
						required: true,
						description: "the task or question for the target"
					},
					wait_ms: {
						type: "number",
						required: true,
						description: "milliseconds to wait for a reply, 0 = do not wait, capped at 30000"
					}
				},
				output: {
					schema: {
						type: "object",
						additionalProperties: false,
						properties: {
							ok: {
								type: "boolean",
								required: true
							},
							messageId: {
								type: "string",
								required: true
							},
							applied: {
								type: "string",
								required: true
							},
							targetId: {
								type: "string",
								required: true
							},
							targetStatus: {
								type: "string",
								required: true
							},
							replyFound: {
								type: "boolean",
								required: true
							},
							replyText: {
								type: "string",
								required: true
							},
							error: {
								type: "string",
								required: true
							}
						}
					},
					render: (_args, value) => [{
						type: "text",
						text: value.replyText || "no reply within wait window"
					}]
				},
				execute: async (args, exec) => {
					const from = exec.agent;
					if (from === void 0) throw new Error("intercom_ask requires a calling agent");
					const sentAt = Date.now();
					const result = this.deliver({
						from: from.id,
						targetId: String(args.target_id),
						text: String(args.message),
						delivery: "wake"
					});
					if (!result.ok) return {
						ok: false,
						messageId: "",
						applied: "",
						targetId: String(args.target_id),
						targetStatus: "",
						replyFound: false,
						replyText: "",
						error: result.error
					};
					let replyFound = false;
					let replyText = "";
					const waitMs = Math.min(3e4, Math.max(0, Number(args.wait_ms) || 0));
					if (waitMs > 0 && this.queryService !== void 0) {
						const deadline = Date.now() + waitMs;
						while (Date.now() < deadline) {
							await wait(1e3);
							try {
								const surface = await this.queryService.readSurface(result.targetId);
								const text = this.surfaceEntries(surface.events, sentAt - 1).filter((entry) => !entry.text.includes(result.messageId)).map((entry) => `[${entry.role}] ${entry.text}`).join("\n");
								if (text !== "") {
									replyFound = true;
									replyText = text;
									break;
								}
							} catch {}
						}
					}
					return {
						ok: true,
						messageId: result.messageId,
						applied: result.applied,
						targetId: result.targetId,
						targetStatus: result.targetStatus,
						replyFound,
						replyText,
						error: ""
					};
				}
			})));
			disposers.push(tools.register(defineTool({
				name: "intercom_collect",
				description: "Collect the current status and the last assistant conclusion from a list of conversations (parallel cooperation aggregation). Pass target_ids as a comma-separated list of exact ids from intercom_list_conversations. Read-only.",
				parameters: { target_ids: {
					type: "string",
					required: true,
					description: "comma-separated exact conversation ids"
				} },
				output: {
					schema: {
						type: "object",
						additionalProperties: false,
						properties: {
							ok: {
								type: "boolean",
								required: true
							},
							results: {
								type: "array",
								required: true
							},
							error: {
								type: "string",
								required: true
							}
						}
					},
					render: (_args, value) => [{
						type: "text",
						text: `collected: ${JSON.stringify(value)}`
					}]
				},
				execute: async (args) => {
					const ids = String(args.target_ids).split(",").map((s) => s.trim()).filter((s) => s !== "").slice(0, 20);
					const results = [];
					for (const id of ids) {
						const agent = this.agents.get(id);
						const status = agent === void 0 ? "not-live" : agent.status;
						let lastAssistantText = "";
						try {
							if (this.queryService !== void 0) {
								const surface = await this.queryService.readSurface(id);
								lastAssistantText = this.lastAssistantText(this.surfaceEntries(surface.events, -Infinity));
							}
						} catch {}
						results.push({
							id,
							status,
							lastAssistantText
						});
					}
					return {
						ok: true,
						results,
						error: ""
					};
				}
			})));
			disposers.push(tools.register(defineTool({
				name: "intercom_spawn_conversation",
				description: "Start a new subagent child (durable continuable child via the subagents service) that begins working on the given prompt immediately. NOTE: the new conversation is YOUR SUBAGENT CHILD — manage it with the built-in send_message/list_agents tools, NOT intercom (intercom is only for top-level conversations). The child inherits your workspace, provider and model.",
				parameters: { prompt: {
					type: "string",
					required: true,
					description: "first prompt the new child starts working on"
				} },
				output: {
					schema: {
						type: "object",
						additionalProperties: false,
						properties: {
							ok: {
								type: "boolean",
								required: true
							},
							sessionId: {
								type: "string",
								required: true
							},
							transient: {
								type: "boolean",
								required: true
							},
							error: {
								type: "string",
								required: true
							}
						}
					},
					render: (_args, value) => [{
						type: "text",
						text: value.sessionId
					}]
				},
				execute: async (args, exec) => {
					const from = exec.agent;
					if (from === void 0) throw new Error("intercom_spawn_conversation requires a calling agent");
					const promptText = String(args.prompt).slice(0, MAX_TEXT);
					const providerName = this.continuableProviderName();
					if (providerName !== "" && this.subagents !== void 0) try {
						return {
							ok: true,
							sessionId: (await this.subagents.startContinuable({
								provider: providerName,
								label: "intercom-spawn",
								request: {
									prompt: [{
										type: "text",
										text: promptText
									}],
									parent: from
								},
								signal: exec.signal ?? new AbortController().signal
							})).childId,
							transient: false,
							error: ""
						};
					} catch (error) {
						console.error(`[intercom] startContinuable failed, falling back to in-process spawn: ${String(error instanceof Error ? error.message : error)}`);
					}
					try {
						const provider = from.options?.provider ?? "";
						const model = from.options?.model ?? "";
						if (provider === "" || model === "") throw new Error("calling agent has no provider/model to inherit");
						const cwd = this.cwdOf(from);
						const sessionId = this.mintId("session-intercom-");
						const handle = await this.agents.create({
							sessionId,
							meta: {
								parentSession: from.id,
								...cwd === "" ? {} : { cwd }
							},
							agentOptions: {
								provider,
								model
							}
						});
						const first = {
							id: this.mintId("dsh-intercom-"),
							role: "user",
							content: [{
								type: "text",
								text: promptText
							}],
							source: { kind: "user" }
						};
						handle.agent.followup(first);
						return {
							ok: true,
							sessionId: handle.agent.id,
							transient: true,
							error: ""
						};
					} catch (error) {
						return {
							ok: false,
							sessionId: "",
							transient: true,
							error: String(error instanceof Error ? error.message : error)
						};
					}
				}
			})));
			disposers.push(tools.register(defineTool({
				name: "intercom_create_group",
				description: "Create an explicit coordination group (对话群) from a list of TOP-LEVEL conversation ids. Use for multi-conversation cooperation among parent agents: members can be addressed together via intercom_broadcast and read together via intercom_read_group. Groups survive backend restarts.",
				parameters: {
					name: {
						type: "string",
						required: true,
						description: "group display name"
					},
					member_ids: {
						type: "string",
						required: true,
						description: "comma-separated exact top-level conversation ids"
					}
				},
				output: {
					schema: {
						type: "object",
						additionalProperties: false,
						properties: {
							ok: {
								type: "boolean",
								required: true
							},
							groupId: {
								type: "string",
								required: true
							},
							name: {
								type: "string",
								required: true
							},
							memberCount: {
								type: "number",
								required: true
							},
							error: {
								type: "string",
								required: true
							}
						}
					},
					render: (_args, value) => [{
						type: "text",
						text: value.name
					}]
				},
				execute: async (args) => {
					return this.createGroup({
						name: String(args.name),
						memberIds: String(args.member_ids)
					});
				}
			})));
			disposers.push(tools.register(defineTool({
				name: "intercom_broadcast",
				description: "Broadcast one message to every member of a group (对话群) except yourself. Members are top-level conversations only; live members receive it with wake semantics (idle members start a new turn immediately, busy members queue it). Returns per-member delivery results.",
				parameters: {
					group_id: {
						type: "string",
						required: true,
						description: "exact group id from intercom_list_groups"
					},
					message: {
						type: "string",
						required: true,
						description: "message text to broadcast"
					},
					delivery: {
						type: "string",
						required: true,
						description: "wake or steer"
					}
				},
				output: {
					schema: {
						type: "object",
						additionalProperties: false,
						properties: {
							ok: {
								type: "boolean",
								required: true
							},
							groupId: {
								type: "string",
								required: true
							},
							results: {
								type: "array",
								required: true
							},
							error: {
								type: "string",
								required: true
							}
						}
					},
					render: (_args, value) => [{
						type: "text",
						text: `broadcast: ${JSON.stringify(value)}`
					}]
				},
				execute: async (args, exec) => {
					const from = exec.agent;
					if (from === void 0) throw new Error("intercom_broadcast requires a calling agent");
					return this.broadcast({
						groupId: String(args.group_id),
						from: from.id,
						text: String(args.message),
						delivery: String(args.delivery ?? "wake")
					});
				}
			})));
			disposers.push(tools.register(defineTool({
				name: "intercom_list_groups",
				description: "List all coordination groups (对话群), including the automatic group「协作中的对话」that collects top-level conversations involved in intercom traffic. Returns group id, name, memberCount and member ids.",
				parameters: {},
				output: {
					schema: {
						type: "object",
						additionalProperties: false,
						properties: {
							groups: {
								type: "array",
								required: true
							},
							error: {
								type: "string",
								required: true
							}
						}
					},
					render: (_args, value) => [{
						type: "text",
						text: `groups: ${JSON.stringify(value)}`
					}]
				},
				execute: async () => {
					return {
						groups: this.groups(),
						error: ""
					};
				}
			})));
			disposers.push(tools.register(defineTool({
				name: "intercom_read_group",
				description: "Read the merged recent conversation content of every member of a group (对话群聊天记录) since the given epoch-milliseconds timestamp. Pass since_time 0 for no filter. Each member's content is labeled with its title.",
				parameters: {
					group_id: {
						type: "string",
						required: true,
						description: "exact group id from intercom_list_groups"
					},
					since_time: {
						type: "number",
						required: true,
						description: "epoch ms; 0 = no filter"
					}
				},
				output: {
					schema: {
						type: "object",
						additionalProperties: false,
						properties: {
							ok: {
								type: "boolean",
								required: true
							},
							groupId: {
								type: "string",
								required: true
							},
							text: {
								type: "string",
								required: true
							},
							error: {
								type: "string",
								required: true
							}
						}
					},
					render: (_args, value) => [{
						type: "text",
						text: value.text
					}]
				},
				execute: async (args) => {
					const result = await this.readGroup({
						groupId: String(args.group_id),
						sinceTime: Number(args.since_time) || 0
					});
					if (result.ok) {
						const text = result.entries.map((e) => `${e.memberTitle ?? ""}: [${e.role}] ${e.text}`).join("\n").slice(0, 16e3);
						return {
							ok: true,
							groupId: String(args.group_id),
							text,
							error: ""
						};
					}
					return {
						ok: false,
						groupId: String(args.group_id),
						text: "",
						error: result.error
					};
				}
			})));
			ctx.effect(() => () => {
				for (const dispose of disposers) dispose();
			}, "intercom: tool disposers");
		}
	};
})();
//#endregion
export { IntercomGateway, IntercomGateway as default, intercomDomain };
