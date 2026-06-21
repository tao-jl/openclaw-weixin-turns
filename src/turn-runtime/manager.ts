import type { WeixinMessage } from "../api/types.js";

import type { TurnBuffer, TurnRuntimeOptions } from "./types.js";
import { buildMergedMessage, extractText, getPeerId, isImmediateMessage } from "./message-utils.js";

const DEFAULT_IDLE_MS = 3200;
const DEFAULT_MAX_WAIT_MS = 12_000;
const DEFAULT_JOINER = "\n";

export class ConversationTurnManager {
  private readonly buffers = new Map<string, TurnBuffer>();
  private readonly idleMs: number;
  private readonly maxWaitMs: number;
  private readonly joiner: string;
  private readonly now: () => number;
  private readonly setTimer: NonNullable<TurnRuntimeOptions["setTimer"]>;
  private readonly clearTimer: NonNullable<TurnRuntimeOptions["clearTimer"]>;
  private readonly onReady: TurnRuntimeOptions["onReady"];

  constructor(options: TurnRuntimeOptions) {
    this.idleMs = options.idleMs ?? DEFAULT_IDLE_MS;
    this.maxWaitMs = options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
    this.joiner = options.joiner ?? DEFAULT_JOINER;
    this.now = options.now ?? (() => Date.now());
    this.setTimer = options.setTimer ?? ((callback, delayMs) => setTimeout(callback, delayMs));
    this.clearTimer = options.clearTimer ?? ((timer) => clearTimeout(timer as NodeJS.Timeout));
    this.onReady = options.onReady;
  }

  accept(message: WeixinMessage): void {
    const peerId = getPeerId(message);
    if (!peerId || isImmediateMessage(message)) {
      if (peerId) this.flush(peerId);
      void this.onReady(message, { count: 1, peerId });
      return;
    }

    const text = extractText(message);
    if (!text.trim()) {
      this.flush(peerId);
      void this.onReady(message, { count: 1, peerId });
      return;
    }

    const now = this.now();
    const existing = this.buffers.get(peerId);
    if (!existing) {
      this.buffers.set(peerId, {
        peerId,
        entries: [{ message, text, receivedAt: now }],
        firstAt: now,
        lastAt: now,
      });
    } else {
      existing.entries.push({ message, text, receivedAt: now });
      existing.lastAt = now;
    }

    this.schedule(peerId);
  }

  flush(peerId: string): void {
    const buffer = this.buffers.get(peerId);
    if (!buffer) return;
    this.buffers.delete(peerId);
    if (buffer.timer) this.clearTimer(buffer.timer);

    const message = buildMergedMessage(buffer.entries, this.joiner);
    void this.onReady(message, { count: buffer.entries.length, peerId });
  }

  flushAll(): void {
    for (const peerId of [...this.buffers.keys()]) {
      this.flush(peerId);
    }
  }

  private schedule(peerId: string): void {
    const buffer = this.buffers.get(peerId);
    if (!buffer) return;

    if (buffer.timer) this.clearTimer(buffer.timer);

    const elapsed = this.now() - buffer.firstAt;
    const delayMs = Math.max(0, Math.min(this.idleMs, this.maxWaitMs - elapsed));
    buffer.timer = this.setTimer(() => this.flush(peerId), delayMs);
  }
}
