<script setup lang="ts">
import { computed, ref } from "vue";
import { Check, Copy, FileCode2 } from "lucide-vue-next";
import type { DemoConfig } from "../types";

const props = defineProps<{ config: DemoConfig | null }>();
const copiedKey = ref("");
const frontendUrl = computed(() => props.config?.webgrp.frontendUrl ?? "http://127.0.0.1:5173");
const apiUrl = computed(() => props.config?.webgrp.apiBaseUrl ?? "http://127.0.0.1:5174/webgrp");
const wsUrl = computed(() => props.config?.webgrp.subscriptionUrl ?? "ws://127.0.0.1:5174/webgrp/v1/subscriptions/ws");
const snippets = computed(() => [
  { key: "iframe", title: "iframe 嵌入", language: "HTML", code: `<iframe\n  src="${frontendUrl.value}"\n  title="电力系统建模"\n  style="width:100%;height:720px;border:0"\n></iframe>` },
  { key: "fetch", title: "后端读取模型", language: "Python", code: `import httpx\n\nurl = "${apiUrl.value}/v1/models/export"\nparams = {\n    "scope": "model",\n    "modelId": 12,\n    "formats": "json,svg",\n    "space": "${props.config?.webgrp.space ?? "default"}",\n}\nresponse = httpx.get(url, params=params, timeout=25)\nresponse.raise_for_status()\nprint(response.json())` },
  { key: "ws", title: "Python 订阅更新", language: "Python", code: `import json\nimport websocket\n\nurl = "${wsUrl.value}?space=${encodeURIComponent(props.config?.webgrp.space ?? "default")}"\nws = websocket.create_connection(url)\nws.send(json.dumps({\n    "type": "subscribe",\n    "requestId": "demo-1",\n    "scope": {"type": "space"},\n    "files": [{"kind": "json"}, {"kind": "e", "encoding": "gbk"}],\n}))\nprint(ws.recv())  # subscribed\nprint(ws.recv())  # model.updated` },
  { key: "recover", title: "恢复后重新读取", language: "Python", code: `# webgrp 不重放离线消息\n# 连接恢复后，重新 GET 当前模型快照\nasync def on_resynchronized(client):\n    await fetch_current_snapshot()` }
]);

async function copy(key: string, code: string) {
  await navigator.clipboard?.writeText(code);
  copiedKey.value = key;
  window.setTimeout(() => (copiedKey.value = ""), 1_500);
}
</script>

<template>
  <section class="panel-stack">
    <div class="section-heading">
      <div>
        <p class="eyebrow">04 / RECIPES</p>
        <h2>把能跑的请求带回你的系统</h2>
        <p class="muted">下面的代码片段跟随当前 FastAPI 返回的 webgrp 地址生成，适合直接复制到自己的宿主页面或后端服务。</p>
      </div>
    </div>
    <div class="recipe-grid">
      <article v-for="snippet in snippets" :key="snippet.key" class="recipe-card">
        <div class="recipe-heading"><div><FileCode2 :size="16" /><strong>{{ snippet.title }}</strong><span class="language-tag">{{ snippet.language }}</span></div><button class="icon-button" type="button" title="复制代码" @click="copy(snippet.key, snippet.code)"><Check v-if="copiedKey === snippet.key" :size="15" /><Copy v-else :size="15" /></button></div>
        <pre class="code-block recipe-code"><code>{{ snippet.code }}</code></pre>
      </article>
    </div>
  </section>
</template>
