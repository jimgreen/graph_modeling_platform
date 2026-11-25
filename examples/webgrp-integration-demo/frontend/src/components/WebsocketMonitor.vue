<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { Cable, Check, CircleStop, Copy, PlugZap, RotateCw, Send, X } from "lucide-vue-next";
import type { DemoConfig, WsEvent } from "../types";

defineOptions({ name: "WebsocketMonitor" });

const props = defineProps<{ config: DemoConfig | null; space: string }>();
const socket = ref<WebSocket | null>(null);
const connectionState = ref<"idle" | "connecting" | "connected" | "closed" | "error">("idle");
const events = ref<WsEvent[]>([]);
const selectedId = ref("");
const scopeType = ref<"space" | "scheme" | "model">("space");
const schemePath = ref("默认方案");
const modelId = ref("1");
const files = ref({ json: true, xml: false, e: false });
const encoding = ref<"utf-8" | "gbk">("utf-8");
const subscriptionId = ref("");
const copied = ref(false);

const selectedEvent = computed(() => events.value.find((event) => event.id === selectedId.value) ?? events.value[0] ?? null);
const wsUrl = computed(() => `/api/ws?space=${encodeURIComponent(props.space)}`);
const stateLabel = computed(() => ({ idle: "未连接", connecting: "连接中", connected: "已连接", closed: "已关闭", error: "连接错误" })[connectionState.value]);

function appendEvent(direction: WsEvent["direction"], payload: any, type = String(payload?.type ?? "message")) {
  const event: WsEvent = { id: `event-${Date.now()}-${Math.random().toString(16).slice(2)}`, at: new Date().toLocaleTimeString(), direction, type, payload };
  events.value.unshift(event);
  selectedId.value = event.id;
}

function openConnection() {
  closeConnection();
  connectionState.value = "connecting";
  const nextSocket = new WebSocket(wsUrl.value);
  socket.value = nextSocket;
  nextSocket.addEventListener("open", () => {
    connectionState.value = "connected";
    appendEvent("system", { type: "browser.connected", url: wsUrl.value }, "browser.connected");
  });
  nextSocket.addEventListener("message", (message) => {
    let payload: unknown;
    try {
      payload = JSON.parse(message.data);
    } catch {
      payload = { type: "raw", value: String(message.data) };
    }
    if (typeof payload === "object" && payload && (payload as any).type === "subscribed") subscriptionId.value = String((payload as any).data?.subscriptionId ?? "");
    if (typeof payload === "object" && payload && (payload as any).type === "unsubscribed") subscriptionId.value = "";
    appendEvent("inbound", payload, String((payload as any)?.type ?? "message"));
  });
  nextSocket.addEventListener("error", () => {
    connectionState.value = "error";
    appendEvent("system", { type: "browser.error", message: "浏览器到 FastAPI 的 WebSocket 连接失败。" }, "browser.error");
  });
  nextSocket.addEventListener("close", (event) => {
    if (socket.value === nextSocket) socket.value = null;
    connectionState.value = "closed";
    appendEvent("system", { type: "browser.closed", code: event.code, reason: event.reason }, "browser.closed");
  });
}

function closeConnection() {
  socket.value?.close(1000, "demo closed");
  socket.value = null;
  subscriptionId.value = "";
  if (connectionState.value !== "idle") connectionState.value = "closed";
}

function send(payload: Record<string, unknown>) {
  if (!socket.value || socket.value.readyState !== WebSocket.OPEN) return;
  socket.value.send(JSON.stringify(payload));
  appendEvent("outbound", payload, String(payload.type ?? "message"));
}

function subscribe() {
  const scope = scopeType.value === "space"
    ? { type: "space" }
    : scopeType.value === "scheme"
      ? { type: "scheme", schemePath: schemePath.value.split("/").map((part) => part.trim()).filter(Boolean) }
      : { type: "model", modelId: Number(modelId.value) || 1 };
  const selectedFiles = Object.entries(files.value).filter(([, selected]) => selected).map(([kind]) => ({ kind, encoding: kind === "e" ? "gbk" : encoding.value }));
  send({ type: "subscribe", requestId: `demo-${Date.now().toString(36)}`, scope, files: selectedFiles });
}

function unsubscribe() {
  if (subscriptionId.value) send({ type: "unsubscribe", requestId: `demo-${Date.now().toString(36)}`, subscriptionId: subscriptionId.value });
}

async function copySelected() {
  if (!selectedEvent.value) return;
  await navigator.clipboard?.writeText(JSON.stringify(selectedEvent.value.payload, null, 2));
  copied.value = true;
  window.setTimeout(() => (copied.value = false), 1_500);
}

onBeforeUnmount(closeConnection);
</script>

<template>
  <section class="panel-stack">
    <div class="section-heading">
      <div>
        <p class="eyebrow">03 / WEBSOCKET</p>
        <h2>看见模型保存后的实时消息</h2>
        <p class="muted">浏览器连的是 FastAPI 桥，FastAPI 再连 webgrp 订阅通道。连接断开后不会补发离线消息。</p>
      </div>
      <div class="button-row">
        <button class="button primary" type="button" :disabled="connectionState === 'connecting'" @click="openConnection"><PlugZap :size="15" />{{ connectionState === 'connected' ? "重新连接" : "连接上游" }}</button>
        <button class="button secondary" type="button" :disabled="!socket" @click="closeConnection"><CircleStop :size="15" />关闭</button>
      </div>
    </div>

    <div class="ws-statusbar">
      <span class="status-dot" :class="connectionState === 'connected' ? 'online' : connectionState === 'error' ? 'danger' : ''"></span>
      <strong>{{ stateLabel }}</strong>
      <code>{{ wsUrl }}</code>
      <span class="spacer"></span>
      <span v-if="subscriptionId" class="status-chip ok"><Check :size="13" />{{ subscriptionId }}</span>
      <span v-else class="muted">未订阅</span>
    </div>

    <div class="ws-grid">
      <div class="control-column">
        <article class="info-block">
          <div class="info-title"><Cable :size="16" />订阅帧</div>
          <div class="segmented" role="tablist" aria-label="订阅范围">
            <button v-for="scope in ['space', 'scheme', 'model']" :key="scope" type="button" :class="{ active: scopeType === scope }" role="tab" :aria-selected="scopeType === scope" @click="scopeType = scope as typeof scopeType">{{ scope }}</button>
          </div>
          <label v-if="scopeType === 'scheme'">schemePath<input v-model="schemePath" /></label>
          <label v-if="scopeType === 'model'">modelId<input v-model="modelId" inputmode="numeric" /></label>
          <div class="choice-row"><span class="choice-label">files</span><label v-for="(selected, kind) in files" :key="kind" class="check-item"><input v-model="files[kind as keyof typeof files]" type="checkbox" />{{ kind }}</label></div>
          <label class="select-line">E/XML encoding<select v-model="encoding"><option value="utf-8">utf-8</option><option value="gbk">gbk</option></select></label>
          <div class="button-row"><button class="button primary" type="button" :disabled="connectionState !== 'connected'" @click="subscribe"><Send :size="15" />发送 subscribe</button><button class="button secondary" type="button" :disabled="!subscriptionId" @click="unsubscribe"><X :size="15" />unsubscribe</button></div>
        </article>
        <article class="info-block">
          <div class="info-title"><RotateCw :size="16" />恢复方式</div>
          <p class="muted">这条演示桥不自动重连。重新连接后再次订阅，并用 HTTP API 重新读取快照，避免把离线期间的变化误当成已收到。</p>
        </article>
      </div>

      <div class="event-column">
        <div class="event-list" aria-label="WebSocket 事件时间线">
          <button v-for="event in events" :key="event.id" type="button" class="event-row" :class="{ selected: selectedEvent?.id === event.id }" @click="selectedId = event.id">
            <span class="event-direction" :class="event.direction">{{ event.direction === 'inbound' ? '←' : event.direction === 'outbound' ? '→' : '·' }}</span>
            <span class="event-type">{{ event.type }}</span>
            <time>{{ event.at }}</time>
          </button>
          <div v-if="!events.length" class="empty-state">连接后，这里会显示 bridge.ready、subscribed 和 model.updated。</div>
        </div>
        <div class="event-detail">
          <div class="response-meta"><span class="label">FRAME</span><button v-if="selectedEvent" class="icon-button" type="button" title="复制 JSON" @click="copySelected"><Copy :size="15" /></button><span v-if="copied" class="micro-success">已复制</span></div>
          <pre v-if="selectedEvent" class="code-block response-code">{{ JSON.stringify(selectedEvent.payload, null, 2) }}</pre>
          <div v-else class="empty-state">选择一条事件查看原始 JSON。</div>
        </div>
      </div>
    </div>
  </section>
</template>
