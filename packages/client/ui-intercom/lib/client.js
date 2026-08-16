window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-intercom",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		//#region src/client/index.ts
		const ICON = "<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244\"/></svg>";
		const CLOSE_ICON = "<svg viewBox=\"0 0 16 16\" width=\"15\" height=\"15\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" aria-hidden=\"true\"><path d=\"M4 4l8 8M12 4l-8 8\"/></svg>";
		const STYLES = `
  .dsh-ic-panel { position: fixed; top: 60px; right: 16px; width: 384px; max-height: calc(100vh - 96px); overflow: auto; background: var(--dsw-alias-bg-overlay, #ffffff); color: var(--dsw-alias-label-primary, #1f2328); border: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.12)); border-radius: 12px; box-shadow: 0 16px 48px rgba(0,0,0,.22); font: 13.5px/1.5 system-ui, -apple-system, sans-serif; pointer-events: auto; z-index: 1000; display: flex; flex-direction: column; }
  .dsh-ic-panel.dsh-ic-wide { width: 680px; height: min(76vh, 560px); overflow: hidden; }
  .dsh-ic-head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.08)); flex: none; cursor: move; user-select: none; -webkit-user-select: none; }
  .dsh-ic-head-title { font-size: 14.5px; font-weight: 600; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .dsh-ic-head-title svg { vertical-align: -2px; margin-right: 6px; color: var(--dsw-alias-brand-primary, #0b57d0); }
  .dsh-ic-sec-title { font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--dsw-alias-label-secondary, #6b7280); margin: 2px 0 6px; }
  .dsh-ic-badge { flex: none; padding: 1px 8px; border-radius: 10px; font-size: 11px; line-height: 16px; }
  .dsh-ic-badge.idle { background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #1a7f37) 14%, transparent); color: var(--dsw-alias-state-success-primary, #1a7f37); }
  .dsh-ic-badge.running { background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #9a6700) 16%, transparent); color: var(--dsw-alias-state-warn-primary, #9a6700); }
  .dsh-ic-item.dormant { opacity: .55; }
  .dsh-ic-item.dormant:hover { opacity: .85; }
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
  .dsh-ic-relays { flex: none; max-height: 42%; overflow: auto; border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.08)); padding: 8px 12px; display: flex; flex-direction: column; gap: 6px; }
  .dsh-ic-relays-title { font-size: 11px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; color: var(--dsw-alias-label-secondary, #6b7280); }
  .dsh-ic-relay { border-left: 3px solid var(--dsw-alias-brand-primary, #0b57d0); background: color-mix(in srgb, var(--dsw-alias-brand-primary, #0b57d0) 7%, transparent); border-radius: 6px; padding: 6px 8px; }
  .dsh-ic-relay-head { font-size: 11.5px; font-weight: 600; color: var(--dsw-alias-brand-primary, #0b57d0); margin-bottom: 2px; }
  .dsh-ic-relay-text { font-size: 12.5px; line-height: 1.45; white-space: pre-wrap; word-break: break-word; color: var(--dsw-alias-label-primary, #1f2328); }
  .dsh-ic-empty { flex: 1; display: flex; align-items: center; justify-content: center; color: var(--dsw-alias-label-secondary, #6b7280); font-size: 12.5px; padding: 16px; text-align: center; }
  .dsh-ic-composer { flex: none; display: flex; gap: 6px; align-items: flex-end; padding: 10px 12px; border-top: 1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.08)); }
  .dsh-ic-composer .dsh-ic-input { margin: 0; resize: none; }
  .dsh-ic-member-row { display: flex; align-items: center; gap: 6px; padding: 3px 6px; border-radius: 6px; font-size: 12.5px; }
  .dsh-ic-member-row:hover { background: var(--dsw-alias-bg-layer-2, rgba(0,0,0,.04)); }
  .dsh-ic-member-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;
		const inject = [
			"slots",
			"locale",
			"remote",
			"remote.intercom",
			"sessions",
			"workspaces"
		];
		function apply(ctx) {
			const remote = ctx.remote.intercom;
			const sessions = ctx.sessions;
			const workspaces = ctx.workspaces;
			ctx.effect(() => {
				const style = document.createElement("style");
				style.dataset.plugin = "@deepseek-ai/dsh-client-ui-intercom";
				style.textContent = STYLES;
				document.head.appendChild(style);
				return () => {
					style.remove();
				};
			}, "ui-intercom: stylesheet");
			const ui = {
				open: false,
				version: 0,
				currentSessionId: "",
				listeners: /* @__PURE__ */ new Set()
			};
			const notify = () => {
				ui.version += 1;
				ui.listeners.forEach((listener) => listener());
			};
			const toggle = () => {
				ui.open = !ui.open;
				notify();
			};
			const useUi = () => {
				const [, setVersion] = (0, react.useState)(ui.version);
				(0, react.useEffect)(() => {
					const listener = () => {
						setVersion(ui.version);
					};
					ui.listeners.add(listener);
					return () => {
						ui.listeners.delete(listener);
					};
				}, []);
				return ui;
			};
			ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
				name: "conversation.session.header.actions",
				id: "intercom",
				order: 30,
				label: "intercom 通信中心"
			}, ((props) => {
				const store = useUi();
				(0, react.useEffect)(() => {
					if (props.sessionId !== void 0 && props.sessionId !== store.currentSessionId) {
						store.currentSessionId = props.sessionId;
						notify();
					}
				});
				return (0, react.createElement)("button", {
					className: "dsh-ic-iconbtn",
					title: "intercom 通信中心",
					onClick: toggle,
					dangerouslySetInnerHTML: { __html: ICON }
				});
			})));
			ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
				name: "sidebar.footer.action",
				id: "intercom",
				order: 40,
				label: "intercom 通信中心"
			}, ((props) => {
				const wide = props.wide === true;
				return (0, react.createElement)("button", {
					className: "dsh-ic-sidebtn" + (wide ? "" : " dsh-ic-sidebtn-rail"),
					title: "intercom 通信中心",
					onClick: toggle,
					dangerouslySetInnerHTML: { __html: ICON + (wide ? "<span class=\"dsh-ic-sidebtn-label\">通信中心</span>" : "") }
				});
			})));
			ctx.slots.inject("shell.overlay", () => ctx.slots.register({
				name: "shell.overlay",
				id: "intercom-panel",
				order: 50,
				label: "intercom 通信中心"
			}, (() => {
				const store = useUi();
				if (!store.open) return null;
				return (0, react.createElement)(IntercomPanel, {
					store,
					remote,
					sessions,
					workspaces,
					notify
				});
			})));
		}
		const IntercomPanel = (props) => {
			const { store, remote, sessions, workspaces, notify } = props;
			const [tab, setTab] = (0, react.useState)("conv");
			const [conversations, setConversations] = (0, react.useState)([]);
			const [dormant, setDormant] = (0, react.useState)([]);
			const [groups, setGroups] = (0, react.useState)([]);
			const [convId, setConvId] = (0, react.useState)("");
			const [groupId, setGroupId] = (0, react.useState)("");
			const [convEntries, setConvEntries] = (0, react.useState)([]);
			const [groupEntries, setGroupEntries] = (0, react.useState)([]);
			const [groupRelays, setGroupRelays] = (0, react.useState)([]);
			const [text, setText] = (0, react.useState)("");
			const [delivery, setDelivery] = (0, react.useState)("wake");
			const [newGroupName, setNewGroupName] = (0, react.useState)("");
			const [addMemberId, setAddMemberId] = (0, react.useState)("");
			const [confirmDeleteGroup, setConfirmDeleteGroup] = (0, react.useState)(false);
			const [loadedOnce, setLoadedOnce] = (0, react.useState)(false);
			const [feedback, setFeedback] = (0, react.useState)({
				text: "",
				tone: ""
			});
			const say = (message, tone = "") => {
				setFeedback({
					text: message,
					tone
				});
			};
			const [pos, setPos] = (0, react.useState)(null);
			const dragRef = (0, react.useRef)(null);
			const onHeadMouseDown = (e) => {
				if (e.button !== 0) return;
				if (e.target?.closest?.("button")) return;
				const panel = e.currentTarget.parentElement;
				if (panel === null) return;
				const rect = panel.getBoundingClientRect();
				dragRef.current = {
					startX: e.clientX,
					startY: e.clientY,
					origX: rect.left,
					origY: rect.top
				};
				document.body.style.userSelect = "none";
				const onMove = (ev) => {
					const d = dragRef.current;
					if (d === null) return;
					const width = 680;
					const maxX = Math.max(0, window.innerWidth - 120);
					const maxY = Math.max(0, window.innerHeight - 60);
					setPos({
						x: Math.min(Math.max(d.origX + ev.clientX - d.startX, 120 - width), maxX),
						y: Math.min(Math.max(d.origY + ev.clientY - d.startY, 0), maxY)
					});
				};
				const onUp = () => {
					dragRef.current = null;
					document.body.style.userSelect = "";
					window.removeEventListener("mousemove", onMove);
					window.removeEventListener("mouseup", onUp);
				};
				window.addEventListener("mousemove", onMove);
				window.addEventListener("mouseup", onUp);
			};
			const refreshLists = async () => {
				try {
					const list = await remote.list();
					if (list.ok && list.value !== void 0) {
						setConversations(list.value);
						const first = list.value[0];
						if (convId === "" && first !== void 0) setConvId(first.id);
					}
					const dormantList = await remote.dormant();
					if (dormantList.ok && dormantList.value !== void 0) setDormant(dormantList.value.conversations);
					const groupList = await remote.groups();
					if (groupList.ok && groupList.value !== void 0) {
						setGroups(groupList.value);
						const firstGroup = groupList.value[0];
						if (groupId === "" && firstGroup !== void 0) setGroupId(firstGroup.id);
					}
				} catch (error) {
					say(`刷新失败: ${String(error instanceof Error ? error.message : error)}`, "err");
				}
			};
			const refreshHistory = async () => {
				try {
					if (tab === "conv" && convId !== "") {
						const r = await remote.readConversation({
							sessionId: convId,
							maxEvents: 80
						});
						if (r.ok && r.value !== void 0) {
							setConvEntries(r.value.entries);
							setLoadedOnce(true);
						}
					} else if (tab === "group" && groupId !== "") {
						const r = await remote.readGroup({
							groupId,
							sinceTime: 0
						});
						if (r.ok && r.value !== void 0) {
							setGroupEntries(r.value.entries);
							setGroupRelays(r.value.relays ?? []);
							setLoadedOnce(true);
						}
					}
				} catch {}
			};
			const refreshLive = async () => {
				try {
					const list = await remote.list();
					if (list.ok && list.value !== void 0) {
						setConversations(list.value);
						const first = list.value[0];
						if (convId === "" && first !== void 0) setConvId(first.id);
					}
					const groupList = await remote.groups();
					if (groupList.ok && groupList.value !== void 0) {
						setGroups(groupList.value);
						const firstGroup = groupList.value[0];
						if (groupId === "" && firstGroup !== void 0) setGroupId(firstGroup.id);
					}
				} catch {}
			};
			const refreshDormantOnly = async () => {
				try {
					const dormantList = await remote.dormant();
					if (dormantList.ok && dormantList.value !== void 0) setDormant(dormantList.value.conversations);
				} catch {}
			};
			(0, react.useEffect)(() => {
				let disposed = false;
				refreshLists();
				const loopLive = () => {
					if (disposed) return;
					refreshLive().finally(() => {
						setTimeout(loopLive, 3e3);
					});
				};
				const loopDormant = () => {
					if (disposed) return;
					refreshDormantOnly().finally(() => {
						setTimeout(loopDormant, 15e3);
					});
				};
				const loopHistory = () => {
					if (disposed) return;
					refreshHistory().finally(() => {
						setTimeout(loopHistory, 2e3);
					});
				};
				const t1 = setTimeout(loopLive, 3e3);
				const t2 = setTimeout(loopDormant, 15e3);
				const t3 = setTimeout(loopHistory, 2e3);
				return () => {
					disposed = true;
					clearTimeout(t1);
					clearTimeout(t2);
					clearTimeout(t3);
				};
			}, []);
			const send = async () => {
				if (text.trim() === "") {
					say("请输入消息");
					return;
				}
				if (store.currentSessionId === "") {
					say("无法确定当前会话");
					return;
				}
				try {
					if (tab === "conv") {
						if (convId === "") {
							say("请先选择一个会话");
							return;
						}
						if (dormant.some((d) => d.id === convId)) {
							const r = await remote.wakeSend({
								from: store.currentSessionId,
								targetId: convId,
								text,
								delivery
							});
							if (r.ok && r.value !== void 0 && r.value.ok) {
								say(`已唤醒并发送 (${r.value.applied})`, "ok");
								refreshLists();
							} else say(`唤醒发送失败: ${r.value?.error ?? r.error?.message ?? "unknown"}`, "err");
						} else {
							const r = await remote.send({
								from: store.currentSessionId,
								targetId: convId,
								text,
								delivery
							});
							if (r.ok && r.value !== void 0 && r.value.ok) say(`已发送 (${r.value.applied})`, "ok");
							else say(`发送失败: ${r.value?.error ?? r.error?.message ?? "unknown"}`, "err");
						}
					} else {
						if (groupId === "") {
							say("请先选择一个群");
							return;
						}
						const r = await remote.broadcast({
							groupId,
							from: store.currentSessionId,
							text,
							delivery
						});
						if (r.ok && r.value !== void 0 && r.value.ok) {
							const delivered = r.value.results.filter((m) => m.ok).length;
							say(`已广播到 ${delivered}/${r.value.results.length} 个成员`, "ok");
						} else say(`广播失败: ${r.value?.error ?? r.error?.message ?? "unknown"}`, "err");
					}
					setText("");
					refreshHistory();
				} catch (error) {
					say(`发送异常: ${String(error instanceof Error ? error.message : error)}`, "err");
				}
			};
			const createGroup = async () => {
				const name = newGroupName.trim();
				if (name === "") {
					say("请输入群名称");
					return;
				}
				try {
					const r = await remote.createGroup({
						name,
						memberIds: store.currentSessionId
					});
					if (r.ok && r.value !== void 0 && r.value.ok) {
						say(`已建群「${r.value.name}」`, "ok");
						setNewGroupName("");
						setGroupId(r.value.groupId);
						setTab("group");
						refreshLists();
					} else say(`建群失败: ${r.value?.error ?? r.error?.message ?? "unknown"}`, "err");
				} catch (error) {
					say(`建群异常: ${String(error instanceof Error ? error.message : error)}`, "err");
				}
			};
			const addMember = async () => {
				if (addMemberId === "") return;
				try {
					const r = await remote.addMember({
						groupId,
						memberId: addMemberId
					});
					if (r.ok && r.value !== void 0 && r.value.ok) {
						say("已添加成员", "ok");
						setAddMemberId("");
						refreshLists();
					} else say(`添加失败: ${r.value?.error ?? r.error?.message ?? "unknown"}`, "err");
				} catch (error) {
					say(`添加异常: ${String(error instanceof Error ? error.message : error)}`, "err");
				}
			};
			const removeMember = async (memberId) => {
				try {
					await remote.removeMember({
						groupId,
						memberId
					});
					refreshLists();
				} catch {}
			};
			const deleteGroup = async () => {
				if (groupId === "" || groupId === "__auto") return;
				if (!confirmDeleteGroup) {
					setConfirmDeleteGroup(true);
					return;
				}
				try {
					const r = await remote.removeGroup({ groupId });
					if (r.ok && r.value !== void 0 && r.value.ok) {
						say("已删除群", "ok");
						setConfirmDeleteGroup(false);
						setGroupId("");
						refreshLists();
						refreshHistory();
					} else say(`删除失败: ${r.value?.error ?? r.error?.message ?? "unknown"}`, "err");
				} catch (error) {
					say(`删除异常: ${String(error instanceof Error ? error.message : error)}`, "err");
				}
			};
			const openSession = (id) => {
				try {
					sessions.open(id);
				} catch {
					say("client sessions service unavailable", "err");
				}
			};
			const startNew = () => {
				try {
					workspaces.startSession();
				} catch {
					say("client workspaces service unavailable", "err");
				}
			};
			const forkCurrent = async () => {
				try {
					const newId = await sessions.fork({ sessionId: store.currentSessionId });
					sessions.open(newId);
				} catch (error) {
					say(`fork 失败: ${String(error instanceof Error ? error.message : error)}`, "err");
				}
			};
			const currentConv = conversations.find((c) => c.id === convId);
			const currentDormant = dormant.find((d) => d.id === convId);
			const currentGroup = groups.find((g) => g.id === groupId);
			const currentTitle = tab === "conv" ? currentConv === void 0 ? currentDormant === void 0 ? convId === "" ? "未选择" : convId : currentDormant.title : currentConv.title : currentGroup === void 0 ? groupId === "" ? "未选择" : groupId : currentGroup.name;
			const addCandidates = conversations.filter((c) => currentGroup === void 0 || !currentGroup.members.includes(c.id));
			const entries = tab === "conv" ? convEntries : groupEntries;
			const displayEntries = tab === "group" ? [...entries].reverse() : entries;
			return (0, react.createElement)("div", {
				className: "dsh-ic-panel dsh-ic-wide",
				style: pos === null ? void 0 : {
					left: pos.x,
					top: pos.y
				}
			}, (0, react.createElement)("div", {
				className: "dsh-ic-head",
				onMouseDown: onHeadMouseDown
			}, (0, react.createElement)("span", {
				className: "dsh-ic-head-title",
				dangerouslySetInnerHTML: { __html: "<svg viewBox=\"0 0 24 24\" width=\"18\" height=\"18\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244\"/></svg>Intercom 通信中心" }
			}), (0, react.createElement)("button", {
				className: "dsh-ic-btn",
				onClick: startNew,
				title: "新建会话"
			}, "＋ 新会话"), (0, react.createElement)("button", {
				className: "dsh-ic-btn",
				onClick: () => {
					forkCurrent();
				},
				disabled: store.currentSessionId === "",
				title: "Fork 当前会话"
			}, "Fork"), (0, react.createElement)("button", {
				className: "dsh-ic-iconbtn",
				title: "关闭",
				onClick: () => {
					store.open = false;
					notify();
				},
				dangerouslySetInnerHTML: { __html: CLOSE_ICON }
			})), (0, react.createElement)("div", { className: "dsh-ic-body" }, (0, react.createElement)("div", { className: "dsh-ic-side" }, (0, react.createElement)("div", { className: "dsh-ic-tabs" }, (0, react.createElement)("button", {
				className: "dsh-ic-tab" + (tab === "conv" ? " active" : ""),
				onClick: () => setTab("conv")
			}, "会话"), (0, react.createElement)("button", {
				className: "dsh-ic-tab" + (tab === "group" ? " active" : ""),
				onClick: () => setTab("group")
			}, "群聊")), tab === "conv" ? (0, react.createElement)("div", { className: "dsh-ic-list" }, conversations.map((c) => (0, react.createElement)("div", {
				key: c.id,
				className: "dsh-ic-item" + (c.id === convId ? " active" : ""),
				onClick: () => {
					setConvId(c.id);
					setTab("conv");
					refreshHistory();
				}
			}, (0, react.createElement)("div", { className: "dsh-ic-item-head" }, (0, react.createElement)("span", {
				className: "dsh-ic-item-title",
				title: c.id
			}, c.title), (0, react.createElement)("span", { className: "dsh-ic-badge " + (c.status === "running" ? "running" : "idle") }, c.status === "running" ? "忙碌" : "空闲")), (0, react.createElement)("span", {
				className: "dsh-ic-cwd",
				title: c.cwd
			}, `📁 ${c.cwd || ""}`))), dormant.length > 0 ? (0, react.createElement)("div", {
				className: "dsh-ic-sec-title",
				style: { margin: "10px 4px 4px" }
			}, `休眠会话 (${dormant.length}) · 发送即唤醒`) : null, dormant.map((d) => (0, react.createElement)("div", {
				key: d.id,
				className: "dsh-ic-item dormant" + (d.id === convId ? " active" : ""),
				onClick: () => {
					setConvId(d.id);
					setTab("conv");
					refreshHistory();
				}
			}, (0, react.createElement)("div", { className: "dsh-ic-item-head" }, (0, react.createElement)("span", {
				className: "dsh-ic-item-title",
				title: d.id
			}, d.title), (0, react.createElement)("span", { className: "dsh-ic-badge idle" }, "💤 休眠")), (0, react.createElement)("span", {
				className: "dsh-ic-cwd",
				title: d.cwd
			}, `📁 ${d.cwd || ""}`)))) : (0, react.createElement)("div", { className: "dsh-ic-list" }, groups.map((g) => (0, react.createElement)("div", {
				key: g.id,
				className: "dsh-ic-item" + (g.id === groupId ? " active" : ""),
				onClick: () => {
					setGroupId(g.id);
					setConfirmDeleteGroup(false);
					refreshHistory();
				}
			}, (0, react.createElement)("div", { className: "dsh-ic-item-head" }, (0, react.createElement)("span", {
				className: "dsh-ic-item-title",
				title: g.id
			}, g.name), (0, react.createElement)("span", { className: "dsh-ic-badge idle" }, `${g.memberCount} 人`)))), (0, react.createElement)("div", { style: {
				marginTop: 8,
				padding: "0 4px"
			} }, (0, react.createElement)("input", {
				className: "dsh-ic-input",
				style: { margin: 0 },
				value: newGroupName,
				onChange: (e) => setNewGroupName(e.target.value),
				placeholder: "新群名称(含当前会话)…"
			}), (0, react.createElement)("button", {
				className: "dsh-ic-btn dsh-ic-btn-primary",
				onClick: () => {
					createGroup();
				},
				style: { marginTop: 6 }
			}, "＋ 新建群")), currentGroup !== void 0 ? (0, react.createElement)("div", { style: {
				marginTop: 10,
				padding: "0 4px"
			} }, (0, react.createElement)("div", { className: "dsh-ic-sec-title" }, "成员"), currentGroup.members.map((m) => (0, react.createElement)("div", {
				key: m,
				className: "dsh-ic-member-row"
			}, (0, react.createElement)("span", {
				className: "dsh-ic-member-name",
				title: m
			}, m === store.currentSessionId ? "● " : "", m), (0, react.createElement)("button", {
				className: "dsh-ic-iconbtn",
				title: "移除",
				onClick: () => {
					removeMember(m);
				},
				dangerouslySetInnerHTML: { __html: CLOSE_ICON }
			}))), (0, react.createElement)("select", {
				className: "dsh-ic-input",
				style: { marginTop: 6 },
				value: addMemberId,
				onChange: (e) => setAddMemberId(e.target.value)
			}, (0, react.createElement)("option", { value: "" }, "＋ 添加会话…"), addCandidates.map((c) => (0, react.createElement)("option", {
				key: c.id,
				value: c.id
			}, c.title))), (0, react.createElement)("button", {
				className: "dsh-ic-btn",
				onClick: () => {
					addMember();
				},
				disabled: addMemberId === "",
				style: { marginTop: 4 }
			}, "添加")) : null, currentGroup !== void 0 && currentGroup.id !== "__auto" ? (0, react.createElement)("button", {
				className: "dsh-ic-btn",
				style: {
					marginTop: 12,
					color: "var(--dsw-alias-state-danger-primary, #d1242f)",
					borderColor: "color-mix(in srgb, var(--dsw-alias-state-danger-primary, #d1242f) 55%, transparent)"
				},
				onClick: () => {
					deleteGroup();
				}
			}, confirmDeleteGroup ? "⚠ 确认删除?再点一次执行" : "🗑 删除本群") : null)), (0, react.createElement)("div", { className: "dsh-ic-main" }, (0, react.createElement)("div", { className: "dsh-ic-chat-head" }, (0, react.createElement)("span", {
				className: "dsh-ic-chat-title",
				title: currentTitle
			}, currentTitle), tab === "conv" && currentConv !== void 0 ? (0, react.createElement)("span", { className: "dsh-ic-badge " + (currentConv.status === "running" ? "running" : "idle") }, currentConv.status === "running" ? "忙碌" : "空闲") : null, tab === "conv" && currentConv === void 0 && currentDormant !== void 0 ? (0, react.createElement)("span", { className: "dsh-ic-badge idle" }, "💤 休眠 · 发送即唤醒") : null, tab === "conv" && convId !== "" ? (0, react.createElement)("button", {
				className: "dsh-ic-btn",
				onClick: () => openSession(convId),
				title: "在界面中打开"
			}, "打开") : null), tab === "group" && groupId !== "" && groupRelays.length > 0 ? (0, react.createElement)("div", { className: "dsh-ic-relays" }, (0, react.createElement)("div", { className: "dsh-ic-relays-title" }, `沟通动态 (${groupRelays.length})`), groupRelays.map((r) => (0, react.createElement)("div", {
				key: r.id,
				className: "dsh-ic-relay"
			}, (0, react.createElement)("div", { className: "dsh-ic-relay-head" }, r.toId === "*" ? `📢 ${r.fromTitle} → 全体成员` : `📤 ${r.fromTitle} → ${r.toTitle}`), (0, react.createElement)("div", { className: "dsh-ic-relay-text" }, r.text)))) : null, tab === "conv" && convId === "" || tab === "group" && groupId === "" ? (0, react.createElement)("div", { className: "dsh-ic-empty" }, "从左侧选择一个会话或群,开始查看和发送消息") : (0, react.createElement)("div", { className: "dsh-ic-msgs" }, displayEntries.map((m, index) => (0, react.createElement)("div", {
				key: `${m.time}-${index}`,
				className: "dsh-ic-msg " + m.role
			}, m.memberTitle !== void 0 && m.memberTitle !== "" ? (0, react.createElement)("span", { className: "dsh-ic-msg-from" }, tab === "group" && m.role === "user" ? `${m.memberTitle} 的输入` : m.memberTitle) : null, m.text)), displayEntries.length === 0 ? (0, react.createElement)("div", { className: "dsh-ic-empty" }, loadedOnce ? "暂无消息" : "加载中…") : null), (0, react.createElement)("div", { className: "dsh-ic-composer" }, (0, react.createElement)("select", {
				className: "dsh-ic-input",
				style: {
					width: 108,
					flex: "none",
					margin: 0
				},
				value: delivery,
				onChange: (e) => setDelivery(e.target.value)
			}, (0, react.createElement)("option", { value: "wake" }, "唤醒"), (0, react.createElement)("option", { value: "steer" }, "介入")), (0, react.createElement)("textarea", {
				className: "dsh-ic-input",
				style: {
					flex: 1,
					margin: 0,
					minHeight: 34,
					maxHeight: 90
				},
				rows: 1,
				value: text,
				onChange: (e) => setText(e.target.value),
				placeholder: tab === "conv" ? currentConv === void 0 && currentDormant !== void 0 ? "该会话休眠中,发送将唤醒它…" : "发消息给该会话…" : "广播给群成员…"
			}), (0, react.createElement)("button", {
				className: "dsh-ic-btn dsh-ic-btn-primary",
				style: { flex: "none" },
				onClick: () => {
					send();
				}
			}, tab === "conv" && currentConv === void 0 && currentDormant !== void 0 ? "唤醒并发送" : "发送")), (0, react.createElement)("div", {
				className: "dsh-ic-feedback" + (feedback.tone === "err" ? " err" : feedback.tone === "ok" ? " ok" : ""),
				style: {
					flex: "none",
					padding: "2px 12px 8px"
				}
			}, feedback.text))));
		};
		//#endregion
		exports.IntercomPanel = IntercomPanel;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map