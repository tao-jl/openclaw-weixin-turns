# openclaw-weixin-turns

`openclaw-weixin-turns` is a conservative fork of Tencent's `@tencent-weixin/openclaw-weixin` channel plugin.

The goal is narrow: keep the official Weixin account, login, token, polling, context token, media, and sending flows intact, while adding a pre-agent turn coalescing layer so consecutive text messages from the same user can be merged into one conversational turn before they enter OpenClaw Agent runtime.

## Why

In the upstream channel, `monitor.ts` long-polls Weixin and immediately calls `processOneMessage` for every inbound message. If a user sends three short messages in a row, the agent can produce multiple replies.

This fork inserts a small turn runtime before `processOneMessage`:

```text
Weixin getUpdates
  -> ConversationTurnManager
  -> processOneMessage
  -> OpenClaw Agent
  -> sendMessageWeixin
```

## Safety Scope

This fork intentionally does not rewrite the risky parts of the channel:

- QR login
- token acquisition and storage
- account file format
- `getUpdates`
- `sendMessage`
- `context_token`
- media download/upload
- `notifyStart` / `notifyStop`
- OpenClaw `channelRuntime` integration

Only the inbound message scheduling path is changed.

## Channel Compatibility

The package/repository name is new, but the OpenClaw channel id remains:

```text
openclaw-weixin
```

This is intentional for compatibility with existing account files, sessions, cron delivery configs, and route settings.

Do not enable this fork and the official `@tencent-weixin/openclaw-weixin` plugin at the same time. They register the same channel id and would also compete for the same Weixin account polling stream.

## Current Behavior

- Plain text messages from the same sender are buffered briefly.
- When the quiet window expires, buffered text messages are merged with newlines.
- Slash commands are dispatched immediately.
- Media, quoted messages, files, voice, and non-plain-text messages are dispatched immediately.
- Dispatch is queued so polling can continue while the agent is working.

Defaults:

```text
idleMs: 3200
maxWaitMs: 12000
joiner: "\n"
```

## Development

```bash
npm install
npm run typecheck
npm run build
```

## Status

This is an initial turn-coalescing fork. It does not yet implement active run interruption or stale reply suppression. Those should be added only after the merge-only path is stable.
