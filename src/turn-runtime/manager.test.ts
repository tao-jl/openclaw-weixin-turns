import { describe, expect, it } from "vitest";

import { MessageItemType } from "../api/types.js";
import type { WeixinMessage } from "../api/types.js";

import { ConversationTurnManager } from "./manager.js";

function textMessage(text: string, overrides: Partial<WeixinMessage> = {}): WeixinMessage {
  return {
    from_user_id: "user@im.wechat",
    context_token: "ctx",
    item_list: [{ type: MessageItemType.TEXT, text_item: { text } }],
    ...overrides,
  };
}

describe("ConversationTurnManager", () => {
  it("coalesces consecutive plain text messages from the same peer", () => {
    const ready: Array<{ message: WeixinMessage; count: number }> = [];
    const manager = new ConversationTurnManager({
      setTimer: () => 1,
      clearTimer: () => {},
      onReady: (message, metadata) => ready.push({ message, count: metadata.count }),
    });

    manager.accept(textMessage("第一句"));
    manager.accept(textMessage("第二句"));
    manager.flush("user@im.wechat");

    expect(ready).toHaveLength(1);
    expect(ready[0]!.count).toBe(2);
    expect(ready[0]!.message.item_list?.[0]?.text_item?.text).toBe("第一句\n第二句");
  });

  it("dispatches slash commands immediately", () => {
    const ready: Array<{ message: WeixinMessage; count: number }> = [];
    const manager = new ConversationTurnManager({
      setTimer: () => 1,
      clearTimer: () => {},
      onReady: (message, metadata) => ready.push({ message, count: metadata.count }),
    });

    manager.accept(textMessage("/stop"));

    expect(ready).toHaveLength(1);
    expect(ready[0]!.count).toBe(1);
    expect(ready[0]!.message.item_list?.[0]?.text_item?.text).toBe("/stop");
  });

  it("dispatches non-plain-text messages immediately", () => {
    const ready: Array<{ message: WeixinMessage; count: number }> = [];
    const imageMessage: WeixinMessage = {
      from_user_id: "user@im.wechat",
      item_list: [{ type: MessageItemType.IMAGE, image_item: {} }],
    };
    const manager = new ConversationTurnManager({
      setTimer: () => 1,
      clearTimer: () => {},
      onReady: (message, metadata) => ready.push({ message, count: metadata.count }),
    });

    manager.accept(imageMessage);

    expect(ready).toHaveLength(1);
    expect(ready[0]!.message.item_list?.[0]?.type).toBe(MessageItemType.IMAGE);
  });

  it("flushes pending text before immediate messages from the same peer", () => {
    const ready: Array<{ message: WeixinMessage; count: number }> = [];
    const manager = new ConversationTurnManager({
      setTimer: () => 1,
      clearTimer: () => {},
      onReady: (message, metadata) => ready.push({ message, count: metadata.count }),
    });

    manager.accept(textMessage("还没说完"));
    manager.accept(textMessage("/stop"));

    expect(ready).toHaveLength(2);
    expect(ready[0]!.message.item_list?.[0]?.text_item?.text).toBe("还没说完");
    expect(ready[1]!.message.item_list?.[0]?.text_item?.text).toBe("/stop");
  });
});
