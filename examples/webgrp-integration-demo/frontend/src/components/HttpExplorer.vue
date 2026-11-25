<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { Braces, Copy, Database, FileDown, Library, Play, Radio, Send, Trash2 } from "lucide-vue-next";
import type { DemoConfig, HttpRunResult } from "../types";
import { useDemoApi } from "../composables/useDemoApi";

type EndpointId = "schemes" | "library" | "clients" | "export" | "send";
type ExportScope = "space" | "scheme" | "model";
type ExportSelector = "modelId" | "scheme";
type SendSelector = "modelId" | "scheme";
type FileKind = "json" | "svg" | "e" | "cim";
type FileEncoding = "utf-8" | "gbk";

const props = defineProps<{ config: DemoConfig | null }>();
const { runHttp } = useDemoApi();
const endpoint = ref<EndpointId>("schemes");
const running = ref(false);
const result = ref<HttpRunResult | null>(null);
const schemesView = ref<"summary" | "hierarchy" | "models">("summary");
const schemesIncludeProjects = ref(false);
const schemesSchemeId = ref("");
const schemesSchemePath = ref("默认方案");
const libraryPart = ref("all");
const exportScope = ref<ExportScope>("model");
const exportSelector = ref<ExportSelector>("modelId");
const exportModelId = ref("1");
const exportSchemeId = ref("");
const exportSchemePath = ref("默认方案");
const exportModelName = ref("示例模型");
const exportFormats = ref(["json"]);
const exportEncoding = ref<FileEncoding>("utf-8");
const exportIncludeDescendants = ref(true);
const exportMergeE = ref(false);
const exportIncludeAssociatedModels = ref(false);
const exportColorMode = ref<"energy" | "voltage">("energy");
const exportStrict = ref(false);
const exportTemplate = ref("");
const sendSelector = ref<SendSelector>("modelId");
const sendModelId = ref("1");
const sendSchemeId = ref("");
const sendSchemePath = ref("默认方案");
const sendModelName = ref("示例模型");
const sendUrl = ref("");
const sendTemplate = ref("");
const sendFiles = reactive<Record<FileKind, { selected: boolean; encoding: FileEncoding }>>({
  json: { selected: true, encoding: "utf-8" },
  svg: { selected: false, encoding: "utf-8" },
  e: { selected: false, encoding: "gbk" },
  cim: { selected: false, encoding: "utf-8" }
});
const receiver = ref<unknown>(null);
const copied = ref(false);

const sendFileItems: Array<{ kind: FileKind; label: string }> = [
  { kind: "json", label: "JSON" },
  { kind: "svg", label: "SVG" },
  { kind: "e", label: "E 文件" },
  { kind: "cim", label: "CIM/XML" }
];

const templateOptions = ["国网E格式", "主网实时库", "配网实时库", "台区实时库"];

const endpoints = [
  { id: "schemes" as const, label: "方案树", icon: Database, method: "GET", demoPath: "/api/webgrp/schemes", upstream: "/webgrp/v1/schemes?view=summary" },
  { id: "library" as const, label: "图元库", icon: Library, method: "GET", demoPath: "/api/webgrp/library", upstream: "/webgrp/v1/library?part=all" },
  { id: "clients" as const, label: "在线客户端", icon: Radio, method: "GET", demoPath: "/api/webgrp/runtime/clients", upstream: "/webgrp/v1/runtime/clients" },
  { id: "export" as const, label: "模型导出", icon: FileDown, method: "GET", demoPath: "/api/webgrp/models/export", upstream: "/webgrp/v1/models/export" },
  { id: "send" as const, label: "发送到接收器", icon: Send, method: "POST", demoPath: "/api/webgrp/send", upstream: "/webgrp/v1/schemes/model/send" }
];

const selectedEndpoint = computed(() => endpoints.find((item) => item.id === endpoint.value) ?? endpoints[0]);
function schemePathParts(value: string) {
  return value.split("/").map((part) => part.trim()).filter(Boolean);
}

function appendIfPresent(params: URLSearchParams, key: string, value: string) {
  if (value.trim()) params.set(key, value.trim());
}

const schemesPath = computed(() => {
  const params = new URLSearchParams({ view: schemesView.value });
  if (schemesView.value === "summary" && schemesIncludeProjects.value) params.set("includeProjects", "1");
  if (schemesView.value === "models") {
    appendIfPresent(params, "schemeId", schemesSchemeId.value);
    const parts = schemePathParts(schemesSchemePath.value);
    if (parts.length) params.set("schemePath", JSON.stringify(parts));
  }
  return `/api/webgrp/schemes?${params.toString()}`;
});

const libraryPath = computed(() => `/api/webgrp/library?part=${encodeURIComponent(libraryPart.value)}`);

const exportParams = computed(() => {
  const params = new URLSearchParams({
    scope: exportScope.value,
    formats: exportFormats.value.join(","),
    encoding: exportEncoding.value,
    mergeE: exportMergeE.value ? "true" : "false",
    includeAssociatedModels: exportIncludeAssociatedModels.value ? "true" : "false"
  });
  if (exportScope.value === "scheme") {
    appendIfPresent(params, "schemeId", exportSchemeId.value);
    const parts = schemePathParts(exportSchemePath.value);
    if (parts.length) params.set("schemePath", JSON.stringify(parts));
    params.set("includeDescendants", exportIncludeDescendants.value ? "true" : "false");
  } else if (exportScope.value === "model") {
    if (exportSelector.value === "modelId") {
      appendIfPresent(params, "modelId", exportModelId.value);
    } else {
      appendIfPresent(params, "schemeId", exportSchemeId.value);
      const parts = schemePathParts(exportSchemePath.value);
      if (parts.length) params.set("schemePath", JSON.stringify(parts));
      appendIfPresent(params, "name", exportModelName.value);
    }
  }
  if (exportFormats.value.includes("svg")) params.set("colorMode", exportColorMode.value);
  if (exportFormats.value.includes("cim")) params.set("strict", exportStrict.value ? "true" : "false");
  if (exportTemplate.value) params.set("template", exportTemplate.value);
  return params;
});

const exportPath = computed(() => `/api/webgrp/models/export?${exportParams.value.toString()}`);

const sendBody = computed(() => {
  const body: Record<string, unknown> = {
    url: sendUrl.value.trim() || props.config?.demo.receiverUrl || "",
    files: sendFileItems
      .filter(({ kind }) => sendFiles[kind].selected)
      .map(({ kind }) => ({ kind, encoding: sendFiles[kind].encoding })),
    templateName: sendTemplate.value
  };
  if (sendSelector.value === "modelId") {
    if (sendModelId.value.trim()) body.modelId = Number(sendModelId.value) || undefined;
  } else {
    if (sendSchemeId.value.trim()) body.schemeId = Number(sendSchemeId.value) || undefined;
    const parts = schemePathParts(sendSchemePath.value);
    if (parts.length) body.schemePath = parts;
    if (sendModelName.value.trim()) body.name = sendModelName.value.trim();
  }
  return body;
});

const requestPath = computed(() => {
  if (endpoint.value === "schemes") return schemesPath.value;
  if (endpoint.value === "library") return libraryPath.value;
  if (endpoint.value === "export") return exportPath.value;
  if (endpoint.value === "send") return "/api/webgrp/send";
  return "/api/webgrp/runtime/clients";
});

const upstreamPath = computed(() => {
  if (endpoint.value === "schemes") return schemesPath.value.replace("/api/webgrp/schemes", "/webgrp/v1/schemes");
  if (endpoint.value === "library") return libraryPath.value.replace("/api/webgrp/library", "/webgrp/v1/library");
  if (endpoint.value === "export") return exportPath.value.replace("/api/webgrp/models/export", "/webgrp/v1/models/export");
  if (endpoint.value === "send") return "/webgrp/v1/schemes/model/send";
  return "/webgrp/v1/runtime/clients";
});

async function run() {
  running.value = true;
  receiver.value = null;
  if (endpoint.value === "send") {
    result.value = await runHttp(requestPath.value, { method: "POST", body: JSON.stringify(sendBody.value) }, { method: "POST", path: requestPath.value, body: sendBody.value, upstreamPath: upstreamPath.value });
    const receiverResult = await runHttp("/api/receive", {}, { method: "GET", path: "/api/receive" });
    receiver.value = receiverResult.response;
  } else {
    result.value = await runHttp(requestPath.value, {}, { method: "GET", path: requestPath.value, upstreamPath: upstreamPath.value });
  }
  running.value = false;
}

async function clearReceiver() {
  await runHttp("/api/receive", { method: "DELETE", body: JSON.stringify({}) }, { method: "DELETE", path: "/api/receive" });
  receiver.value = null;
}

async function copyRequest() {
  const text = endpoint.value === "send"
    ? JSON.stringify({ method: "POST", path: requestPath.value, body: sendBody.value, upstreamPath: upstreamPath.value }, null, 2)
    : requestPath.value;
  await navigator.clipboard?.writeText(text);
  copied.value = true;
  window.setTimeout(() => (copied.value = false), 1_500);
}
</script>

<template>
  <section class="panel-stack">
    <div class="section-heading">
      <div>
        <p class="eyebrow">02 / HTTP API</p>
        <h2>让后端替你读取和转发</h2>
        <p class="muted">浏览器只调用 FastAPI，FastAPI 再把同一请求翻译成 webgrp 的 HTTP API。</p>
      </div>
      <button class="button primary" type="button" :disabled="running" @click="run">
        <Play :size="15" />
        {{ running ? "请求中…" : "执行请求" }}
      </button>
    </div>

    <div class="endpoint-tabs" role="tablist" aria-label="HTTP 演示接口">
      <button v-for="item in endpoints" :key="item.id" class="endpoint-tab" :class="{ active: endpoint === item.id }" type="button" role="tab" :aria-selected="endpoint === item.id" @click="endpoint = item.id">
        <component :is="item.icon" :size="15" />
        <span>{{ item.label }}</span>
      </button>
    </div>

    <div class="http-grid">
      <div class="control-column">
        <article class="info-block">
          <div class="info-title"><Braces :size="16" />请求构造</div>
          <div v-if="endpoint === 'schemes'" class="form-grid">
            <label>view<select v-model="schemesView"><option value="summary">summary</option><option value="hierarchy">hierarchy</option><option value="models">models</option></select></label>
            <label v-if="schemesView === 'summary'" class="check-item inline-control"><input v-model="schemesIncludeProjects" type="checkbox" />includeProjects</label>
            <label v-if="schemesView === 'models'">schemeId<input v-model="schemesSchemeId" inputmode="numeric" placeholder="可选" /></label>
            <label v-if="schemesView === 'models'" class="span-2">schemePath<input v-model="schemesSchemePath" autocorrect="off" autocapitalize="none" spellcheck="false" /></label>
          </div>
          <div v-else-if="endpoint === 'library'" class="form-grid">
            <label>part<select v-model="libraryPart"><option value="all">all</option><option value="categories">categories</option><option value="devices">devices</option><option value="measurements">measurements</option><option value="device-definitions">device-definitions</option><option value="templates">templates</option></select></label>
          </div>
          <template v-else-if="endpoint === 'export'">
            <div class="form-grid">
              <label>scope<select v-model="exportScope"><option value="space">space</option><option value="scheme">scheme</option><option value="model">model</option></select></label>
              <label v-if="exportScope === 'model'">定位方式<select v-model="exportSelector"><option value="modelId">modelId</option><option value="scheme">scheme + name</option></select></label>
              <label v-if="exportScope === 'model' && exportSelector === 'modelId'">modelId<input v-model="exportModelId" inputmode="numeric" /></label>
              <label v-if="exportScope === 'model' && exportSelector === 'scheme'">schemeId<input v-model="exportSchemeId" inputmode="numeric" placeholder="可选" /></label>
              <label v-if="exportScope !== 'space' && !(exportScope === 'model' && exportSelector === 'modelId')" class="span-2">schemePath<input v-model="exportSchemePath" autocorrect="off" autocapitalize="none" spellcheck="false" /></label>
              <label v-if="exportScope === 'model' && exportSelector === 'scheme'">name<input v-model="exportModelName" /></label>
              <label>encoding<select v-model="exportEncoding"><option value="utf-8">utf-8</option><option value="gbk">gbk</option></select></label>
              <label v-if="exportScope === 'scheme'" class="check-item inline-control"><input v-model="exportIncludeDescendants" type="checkbox" />includeDescendants</label>
              <label class="check-item inline-control"><input v-model="exportMergeE" type="checkbox" />mergeE</label>
              <label class="check-item inline-control"><input v-model="exportIncludeAssociatedModels" type="checkbox" />includeAssociatedModels</label>
              <label v-if="exportFormats.includes('svg')">colorMode<select v-model="exportColorMode"><option value="energy">energy</option><option value="voltage">voltage</option></select></label>
              <label v-if="exportFormats.includes('cim')" class="check-item inline-control"><input v-model="exportStrict" type="checkbox" />strict</label>
              <label v-if="exportFormats.includes('e')">template<select v-model="exportTemplate"><option value="">默认模板</option><option v-for="template in templateOptions" :key="template" :value="template">{{ template }}</option></select></label>
            </div>
            <div class="choice-row">
              <span class="choice-label">formats</span>
              <label v-for="format in ['json', 'svg', 'cim', 'e']" :key="format" class="check-item"><input v-model="exportFormats" type="checkbox" :value="format" />{{ format }}</label>
            </div>
          </template>
          <template v-else-if="endpoint === 'send'">
            <div class="form-grid">
              <label class="span-2">url<input v-model="sendUrl" :placeholder="config?.demo.receiverUrl || 'http://127.0.0.1:8000/api/receive'" autocorrect="off" autocapitalize="none" spellcheck="false" /></label>
              <label>定位方式<select v-model="sendSelector"><option value="modelId">modelId</option><option value="scheme">scheme + name</option></select></label>
              <label v-if="sendSelector === 'modelId'">modelId<input v-model="sendModelId" inputmode="numeric" /></label>
              <label v-if="sendSelector === 'scheme'">schemeId<input v-model="sendSchemeId" inputmode="numeric" placeholder="可选" /></label>
              <label v-if="sendSelector === 'scheme'">name<input v-model="sendModelName" /></label>
              <label v-if="sendSelector === 'scheme'" class="span-2">schemePath<input v-model="sendSchemePath" autocorrect="off" autocapitalize="none" spellcheck="false" /></label>
              <label>templateName<select v-model="sendTemplate"><option value="">默认模板</option><option v-for="template in templateOptions" :key="template" :value="template">{{ template }}</option></select></label>
            </div>
            <fieldset class="file-list">
              <legend>files</legend>
              <label v-for="file in sendFileItems" :key="file.kind" class="file-option">
                <span class="check-item"><input v-model="sendFiles[file.kind].selected" type="checkbox" />{{ file.label }}</span>
                <select v-if="sendFiles[file.kind].selected" v-model="sendFiles[file.kind].encoding" :aria-label="`${file.label} encoding`"><option value="utf-8">utf-8</option><option value="gbk">gbk</option></select>
              </label>
            </fieldset>
          </template>
          <p v-else class="muted request-hint">此接口没有可选查询参数。</p>
          <div class="request-line"><span>{{ selectedEndpoint.method }}</span><code>{{ requestPath }}</code><button class="icon-button" type="button" title="复制请求" @click="copyRequest"><Copy :size="15" /></button></div>
          <p v-if="copied" class="micro-success">已复制到剪贴板</p>
        </article>

        <article v-if="endpoint === 'send'" class="info-block accent-block">
          <div class="info-title"><Send :size="16" />发送目标</div>
          <p>默认目标是示例接收器：<code>{{ sendUrl || config?.demo.receiverUrl }}</code>。你也可以直接修改 url，观察 webgrp 发出的 multipart 字段和文件大小。</p>
          <button class="button text-button" type="button" @click="clearReceiver"><Trash2 :size="14" />清空最近接收</button>
        </article>

        <article v-if="receiver" class="info-block">
          <div class="info-title">接收器回看</div>
          <pre class="code-block compact">{{ JSON.stringify(receiver, null, 2) }}</pre>
        </article>
      </div>

      <div class="response-column">
        <div class="response-meta"><span class="label">RESPONSE</span><span v-if="result" class="status-chip" :class="result.status && result.status < 400 ? 'ok' : 'error'">{{ result.status ?? "ERR" }}</span><span v-if="result" class="muted">{{ result.elapsedMs }} ms</span></div>
        <pre v-if="result" class="code-block response-code">{{ JSON.stringify(result.response ?? { error: result.error }, null, 2) }}</pre>
        <div v-else class="empty-state">执行一个接口，查看 FastAPI 和 webgrp 的真实响应。</div>
      </div>
    </div>
  </section>
</template>
