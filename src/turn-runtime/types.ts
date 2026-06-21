import type { WeixinMessage } from "../api/types.js";

export type TurnAction =
  | { type: "wait" }
  | { type: "dispatch"; message: WeixinMessage; count: number };

export type TurnRuntimeOptions = {
  idleMs?: number;
  maxWaitMs?: number;
  joiner?: string;
  now?: () => number;
  setTimer?: (callback: () => void, delayMs: number) => unknown;
  clearTimer?: (timer: unknown) => void;
  onReady: (message: WeixinMessage, metadata: { count: number; peerId: string }) => void | Promise<void>;
};

export type TurnEntry = {
  message: WeixinMessage;
  text: string;
  receivedAt: number;
};

export type TurnBuffer = {
  peerId: string;
  entries: TurnEntry[];
  firstAt: number;
  lastAt: number;
  timer?: unknown;
};
