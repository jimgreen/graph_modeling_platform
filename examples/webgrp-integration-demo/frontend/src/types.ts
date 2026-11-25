export type PanelKey = "overview" | "http" | "websocket" | "recipes";

export type DemoConfig = {
  ok: boolean;
  demo: {
    httpBaseUrl: string;
    receiverUrl: string;
  };
  webgrp: {
    frontendUrl: string;
    httpBaseUrl: string;
    apiBaseUrl: string;
    subscriptionUrl: string;
    space: string;
  };
  capabilities: string[];
};
export type ApiEnvelope<T = unknown> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
};

export type RequestSnapshot = {
  method: string;
  path: string;
  body?: unknown;
  upstreamPath?: string;
};

export type HttpRunResult = {
  request: RequestSnapshot;
  status: number | null;
  elapsedMs: number;
  response: unknown;
  error?: string;
};

export type WsEvent = {
  id: string;
  at: string;
  direction: "inbound" | "outbound" | "system";
  type: string;
  payload: unknown;
};
