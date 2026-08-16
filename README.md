# dsh-intercom

DSH 网页插件：**顶层会话(父代理)之间的通信中心**——在线会话列表(含工作区)、对话式私聊面板、协作群(对话群)、以及一组模型可调用工具(`intercom_*`),让对话在需要时**自动协调其他对话**(请求帮助、并行合作、延续工作)。已发布至 [dsh-plugin](https://github.com/topics/dsh-plugin) 主题。

> A DeepSeek Harness web plugin: a communication center between TOP-LEVEL conversations — live conversation list with workspaces, a chat-style messaging panel, coordination groups (对话群), and `intercom_*` model tools for autonomous cross-conversation cooperation (asking for help, parallel work, continuing work).

## 功能

| 能力 | 说明 |
| --- | --- |
| **通信中心面板** | 侧栏「通信中心」入口(图标+文字)与会话头图标按钮;聊天式双栏:左侧会话/群聊 Tab,右侧消息气泡流 + 底部输入框;唤醒/介入两种投递模式;DSH 主题色深浅色自适应 |
| **顶层会话列表** | 只列 `agents.roots()`(父代理),含标题、忙碌/空闲状态、工作区路径;子代理不进入本视图 |
| **休眠会话唤醒** | 面板同时列出**休眠会话**(持久化但未运行的历史对话,灰显💤);选中后发送即**自动恢复(resume)并投递**——延续工作不用手动点开旧会话;模型工具侧对应 `intercom_list_dormant_conversations` + `intercom_wake_send` |
| **对话间消息** | 空闲目标**唤醒即开工**,忙碌目标排队不打断;介入(steer)需显式选择;限频(10 条/分钟/目标)+ 唤醒预算(3 次/人工输入重置)防消息风暴;来源定型包装防提示注入;Windows 下工作区路径比较大小写无关 |
| **协作群(对话群)** | 自动群「协作中的对话」收集通信流量成员;可建显式群、增删成员、**广播**到全员、合并阅读群记录;**群数据经 storage-domain 持久化,重启不丢** |
| **模型工具 ×13** | `intercom_list_conversations` / `intercom_list_dormant_conversations` / `intercom_send` / `intercom_wake_send`(唤醒+投递)/ `intercom_ask`(发+有界等待回复)/ `intercom_check_replies` / `intercom_read_conversation`(冷会话可读,延续工作)/ `intercom_collect`(并行汇总)/ `intercom_spawn_conversation`(创建子代理)/ `intercom_create_group` / `intercom_broadcast` / `intercom_list_groups` / `intercom_read_group` |
| **边界隔离** | intercom 只服务**顶层会话之间**;父↔子代理通信完全交给内置 `send_message`/`list_agents`,本插件不拦截、不越权;跨工作区投递默认拒绝 |

## 安装

把本仓库集成到你的 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 源码工作区(按源码方式安装):

1. 将 `packages/host/intercom` 与 `packages/client/ui-intercom` 两个目录复制到工作区的 `packages/host/` 与 `packages/client/` 下;
2. 在工作区根目录执行 `git apply install.patch`(含 api-remotes 挂载、web-app 组合注册、根 tsconfig 引用与 paths 映射;如版本有出入请对照补丁手工合并);
3. 安装与构建:

```powershell
pnpm install
pnpm exec tsc -b tsconfig.host.json
pnpm exec tsc -b tsconfig.client.json
pnpm --filter @deepseek-ai/dsh-host-intercom bundle
pnpm --filter @deepseek-ai/dsh-client-ui-intercom bundle
pnpm --filter @deepseek-ai/dsh-api-remotes bundle
```

4. 重启后台(例如 `pnpm dsh web`),刷新页面后即可在侧栏底部看到「通信中心」入口。

> 两个包的 `lib/` 产物(含 typert 契约与客户端 module-loader 包)已随仓库附带,通常无需重新生成;若安装后修改了 `src/`,务必重跑第 3 步并重新构建前端。

## 工作原理

- **Host Remote**:`@deepseek-ai/dsh-host-intercom` 以 Typert Remote 服务(`ctx.remote.intercom`)暴露 11 个方法(list/dormant/groups/send/wakeSend/broadcast/readConversation/readGroup/createGroup/addMember/removeMember),客户端经 `api-remotes` 挂载调用;同名服务类在宿主侧注册 13 个 `intercom_*` 模型工具,并以 `static inject` 等待 `tools`/`storageDomain` 就位后才激活。
- **投递**:空闲目标 `agent.followup`(唤醒开工),忙碌目标 `agent.inject`(排队),`steer` 显式介入;休眠目标先经 `agents.resume` 恢复再投递;消息来源 `kind:'plugin' + form:'relay' + senderSessionId` 并包装「来自会话X」提示。
- **群持久化**:`storage-domain` 全局槽保存全部群(含自动群),启动时加载;信箱不落盘——历史记录永远以会话日志为准,面板实时读回。
- **UI**:客户端 `dsh.client` 元数据 + web-app 组合行挂载;面板注册于 `shell.overlay`,入口注册于 `sidebar.footer.action` 与 `conversation.session.header.actions`。

## 要求

- DeepSeek Harness 源码工作区(本插件按 `0.1.0-rc.5` 版结构集成)
- Node.js 22+、pnpm

## 相关项目(双向互链)

- [dsh-plugin-suite](https://github.com/zdjmrq/dsh-plugin-suite) — 定制插件套件(局部 fork),含 `dsh-restart-plugin` 与 `dsh-careful-full-access` 的累计补丁,一次性安装全部功能;
- [dsh-restart-plugin](https://github.com/zdjmrq/dsh-restart-plugin) — 一键关闭后台服务 / 刷新前端(保留热插件);
- [dsh-text-open-source](https://github.com/zdjmrq/dsh-text-open-source) — 「文字开源」枢纽仓库:本插件的可复刻文字描述见 [plugins/dsh-intercom.md](https://github.com/zdjmrq/dsh-text-open-source/blob/main/plugins/dsh-intercom.md)(不依赖代码即可复刻、便于理解与微调);
- [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) — 官方上游。

## License

MIT
