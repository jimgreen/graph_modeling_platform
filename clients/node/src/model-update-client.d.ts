import type { EventEmitter } from "node:events";

export type SubscriptionScope =
  | { type: "space" }
  | { type: "scheme"; schemePath: string[] }
  | { type: "model"; modelId: string | number };

export type SubscriptionFile = {
  kind: "json" | "xml" | "e";
  encoding?: "utf-8" | "gbk";
};

export type SubscriptionHandle = {
  id: string;
  scope: SubscriptionScope;
  files: SubscriptionFile[];
  readonly subscriptionId: string | null;
};

export type ModelUpdateClientOptions = {
  url: string;
  space?: string;
  reconnect?: boolean;
  reconnectMinDelayMs?: number;
  reconnectMaxDelayMs?: number;
  reconnectJitter?: number;
  ackTimeoutMs?: number;
  wsOptions?: Record<string, unknown>;
  webSocketFactory?: (url: string, options?: Record<string, unknown>) => WebSocketLike;
  onResynchronized?: (client: ModelUpdateClient) => void | Promise<void>;
};

export type WebSocketLike = {
  readyState: number;
  on(event: string, listener: (...args: any[]) => void): this;
  once(event: string, listener: (...args: any[]) => void): this;
  send(data: string): void;
  close(code?: number, reason?: string): void;
};

export class ModelUpdateError extends Error {
  code: string;
  requestId?: string;
  subscriptionId?: string;
  retryable: boolean;
  cause?: unknown;
}

export class ModelUpdateClient extends EventEmitter {
  constructor(options: ModelUpdateClientOptions);
  readonly url: string;
  readonly state: "idle" | "connecting" | "connected" | "disconnected" | "closed";
  connect(): Promise<void>;
  close(): void;
  subscribe(input: { scope: SubscriptionScope; files: SubscriptionFile[] }): Promise<SubscriptionHandle>;
  unsubscribe(handle: SubscriptionHandle): Promise<void>;
  on(event: string, listener: (payload: any) => void): this;
}
