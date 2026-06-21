# openclaw-weixin-turns

`openclaw-weixin-turns` 是基于腾讯 `@tencent-weixin/openclaw-weixin` 的保守 fork。

目标很窄：保留官方微信账号、扫码登录、token、长轮询、上下文 token、媒体和发送流程，只在消息进入 Agent 之前增加一层“对话轮次整理”，让同一个用户连续发送的多条文本消息先合并成一个 conversational turn，再交给 OpenClaw。

## 为什么做

官方通道目前在 `monitor.ts` 中拉到微信消息后，会逐条调用 `processOneMessage`。用户连续发三句话时，小墨可能会分别回复三次。

这个 fork 的链路是：

```text
Weixin getUpdates
  -> ConversationTurnManager
  -> processOneMessage
  -> OpenClaw Agent
  -> sendMessageWeixin
```

## 安全范围

这个 fork 不重写高风险链路：

- 扫码登录
- token 获取和保存
- 账号文件结构
- `getUpdates`
- `sendMessage`
- `context_token`
- 媒体下载/上传
- `notifyStart` / `notifyStop`
- OpenClaw `channelRuntime` 集成

当前只改入站消息调度。

## 通道兼容性

仓库/包名是新的，但 OpenClaw channel id 仍然保持：

```text
openclaw-weixin
```

这是为了兼容现有账号、会话、定时任务投递配置和路由配置。

不要同时启用本 fork 和官方 `@tencent-weixin/openclaw-weixin` 插件。它们注册同一个 channel id，也会竞争同一个微信账号的轮询流。

## 当前行为

- 同一发送者的纯文本消息会短暂缓冲。
- quiet window 到期后，多条文本用换行合并。
- 斜杠命令立即处理。
- 图片、文件、语音、引用消息等非纯文本立即处理。
- Agent 处理会排队执行，但微信轮询不会被 Agent 回复阻塞。

默认值：

```text
idleMs: 3200
maxWaitMs: 12000
joiner: "\n"
```

## 开发

```bash
npm install
npm run typecheck
npm run build
```

## 状态

这是第一版“对话轮次合并”实现，暂未加入主动打断和旧回复抑制。建议等合并路径稳定后，再加 run controller。
