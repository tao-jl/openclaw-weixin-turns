import { MessageItemType } from "../api/types.js";
import type { MessageItem, WeixinMessage } from "../api/types.js";

export function getPeerId(message: WeixinMessage): string {
  return message.from_user_id ?? message.session_id ?? "";
}

export function extractText(message: WeixinMessage): string {
  for (const item of message.item_list ?? []) {
    if (item.type === MessageItemType.TEXT && item.text_item?.text != null) {
      return String(item.text_item.text);
    }
  }
  return "";
}

export function isPlainTextMessage(message: WeixinMessage): boolean {
  const items = message.item_list ?? [];
  if (items.length !== 1) return false;
  const item = items[0];
  return item.type === MessageItemType.TEXT && item.text_item?.text != null && !item.ref_msg;
}

export function isImmediateMessage(message: WeixinMessage): boolean {
  const text = extractText(message).trim();
  if (text.startsWith("/")) return true;
  return !isPlainTextMessage(message);
}

export function buildMergedMessage(entries: Array<{ message: WeixinMessage; text: string }>, joiner: string): WeixinMessage {
  const last = entries[entries.length - 1]!.message;
  const first = entries[0]!.message;
  const mergedText = entries.map((entry) => entry.text.trim()).filter(Boolean).join(joiner);
  const baseItem: MessageItem = { ...(last.item_list?.[0] ?? {}) };

  return {
    ...last,
    from_user_id: last.from_user_id ?? first.from_user_id,
    to_user_id: last.to_user_id ?? first.to_user_id,
    context_token: last.context_token ?? first.context_token,
    session_id: last.session_id ?? first.session_id,
    create_time_ms: first.create_time_ms ?? last.create_time_ms,
    update_time_ms: last.update_time_ms,
    item_list: [
      {
        ...baseItem,
        type: MessageItemType.TEXT,
        text_item: {
          ...(baseItem.text_item ?? {}),
          text: mergedText,
        },
      },
    ],
  };
}
