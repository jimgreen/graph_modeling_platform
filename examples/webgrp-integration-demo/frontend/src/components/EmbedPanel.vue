<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { CircleAlert, ExternalLink, LoaderCircle, RefreshCw, ShieldCheck } from "lucide-vue-next";
import type { DemoConfig } from "../types";

type EmbedMode = "iframe" | "qiankun";

defineOptions({ name: "EmbedPanel" });

const BASE_WIDTH = 1440;
const BASE_HEIGHT = 810;

const props = defineProps<{ config: DemoConfig | null; active?: boolean }>();
const mode = ref<EmbedMode>("iframe");
const iframeVersion = ref(0);
const scale = ref(1);
const viewportRef = ref<HTMLElement | null>(null);
const qiankunHostRef = ref<HTMLElement | null>(null);
const qiankunApp = shallowRef<any>(null);
const qiankunLoading = ref(false);
const qiankunError = ref("");
let resizeObserver: ResizeObserver | null = null;

const iframeUrl = computed(() => props.config?.webgrp.frontendUrl ?? "");
const qiankunApiBaseUrl = computed(() => {
  return typeof window === "undefined" ? "" : window.location.origin;
});
const stageStyle = computed(() => ({
  inlineSize: "100%",
  blockSize: "100%"
}));
const contentStyle = computed(() => ({
  width: `${BASE_WIDTH}px`,
  height: `${BASE_HEIGHT}px`,
  transform: `scale(${scale.value})`
}));
const scaleLabel = computed(() => `${Math.round(scale.value * 100)}%`);

function updateScale() {
  const viewport = viewportRef.value;
  if (!viewport) return;
  const width = Math.max(1, viewport.clientWidth - 24);
  const height = Math.max(1, viewport.clientHeight - 24);
  scale.value = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);
}

function reloadFrame() {
  if (mode.value === "iframe") {
    iframeVersion.value += 1;
    return;
  }
  void remountQiankun();
}

function openFrame() {
  if (iframeUrl.value) window.open(iframeUrl.value, "_blank", "noopener,noreferrer");
}

function cleanupQiankunArtifacts() {
  releaseQiankunHostChrome();
  for (const style of Array.from(document.querySelectorAll("style"))) {
    if (style.textContent?.includes('[data-qiankun="graph-modeling-platform"]')) {
      style.remove();
    }
  }
}

function prepareQiankunHostChrome() {
  document.documentElement.classList.add("demo-qiankun-host");
  document.body.classList.add("demo-qiankun-host");
}

function releaseQiankunHostChrome() {
  document.documentElement.classList.remove("demo-qiankun-host");
  document.body.classList.remove("demo-qiankun-host");
}

function syncQiankunHostChrome() {
  if (mode.value === "qiankun" && qiankunApp.value && props.active !== false) {
    prepareQiankunHostChrome();
    return;
  }
  releaseQiankunHostChrome();
}

async function unmountQiankun() {
  const app = qiankunApp.value;
  qiankunApp.value = null;
  try {
    if (app) await app.unmount();
  } catch (error) {
    qiankunError.value = error instanceof Error ? error.message : String(error);
  } finally {
    cleanupQiankunArtifacts();
  }
}

async function mountQiankun() {
  if (!qiankunHostRef.value || !iframeUrl.value || !qiankunApiBaseUrl.value) return;
  qiankunLoading.value = true;
  qiankunError.value = "";
  try {
    try {
      window.localStorage.setItem("graph-modeling-platform:tour-seen", "1");
    } catch {
      // Embedded mode should still work when storage is unavailable.
    }
    const { loadMicroApp } = await import("qiankun");
    const app = loadMicroApp(
      {
        name: "graph-modeling-platform",
        entry: iframeUrl.value,
        container: qiankunHostRef.value,
        props: {
          apiBaseUrl: qiankunApiBaseUrl.value,
          schema: "integration-demo",
          user: "integration-demo-user",
          project: { id: "webgrp-integration-demo", name: "webgrp 接入示例" }
        }
      },
      { sandbox: { experimentalStyleIsolation: true } }
    );
    qiankunApp.value = app;
    await app.mountPromise;
    syncQiankunHostChrome();
  } catch (error) {
    qiankunError.value = error instanceof Error ? error.message : String(error);
    cleanupQiankunArtifacts();
  } finally {
    qiankunLoading.value = false;
  }
}

async function remountQiankun() {
  await unmountQiankun();
  await nextTick();
  await mountQiankun();
}

watch(mode, async (nextMode) => {
  if (nextMode === "qiankun") {
    await nextTick();
    await mountQiankun();
  } else {
    await unmountQiankun();
  }
});

watch(() => props.active, () => {
  syncQiankunHostChrome();
});

watch(iframeUrl, async () => {
  if (mode.value === "iframe") {
    iframeVersion.value += 1;
  } else {
    await remountQiankun();
  }
});

onMounted(() => {
  updateScale();
  resizeObserver = new ResizeObserver(updateScale);
  if (viewportRef.value) resizeObserver.observe(viewportRef.value);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  void unmountQiankun();
});
</script>

<template>
  <section class="panel-stack">
    <div class="section-heading">
      <div>
        <p class="eyebrow">01 / EMBED</p>
        <h2>把 webgrp 放进宿主页面</h2>
        <p class="muted">两种嵌入方式共用同一个宿主容器。容器变窄时，示例会按基准画布自动缩放 webgrp，保持完整画布可见。</p>
      </div>
      <div class="button-row">
        <button class="button secondary" type="button" @click="reloadFrame">
          <RefreshCw :size="15" />
          刷新预览
        </button>
        <button class="button secondary" type="button" :disabled="!iframeUrl" @click="openFrame">
          <ExternalLink :size="15" />
          新窗口打开
        </button>
      </div>
    </div>

    <div class="embed-grid">
      <div class="embed-stage">
        <div class="stage-toolbar">
          <span class="status-dot online"></span>
          <span>{{ mode === "iframe" ? "iframe / webgrp" : "qiankun / graph-modeling-platform" }}</span>
          <code>{{ iframeUrl || "等待后端配置" }}</code>
        </div>

        <div class="embed-controls">
          <div class="segmented embed-mode-switch" role="tablist" aria-label="嵌入模式">
            <button type="button" role="tab" :aria-selected="mode === 'iframe'" :class="{ active: mode === 'iframe' }" @click="mode = 'iframe'">iframe 直接嵌入</button>
            <button type="button" role="tab" :aria-selected="mode === 'qiankun'" :class="{ active: mode === 'qiankun' }" @click="mode = 'qiankun'">qiankun 微前端</button>
          </div>
          <span class="scale-readout">自动缩放 {{ scaleLabel }} · 基准 {{ BASE_WIDTH }} × {{ BASE_HEIGHT }}</span>
        </div>

        <div ref="viewportRef" class="embed-viewport">
          <div class="embed-stage-shell" :style="stageStyle">
            <div class="embed-stage-content" :style="contentStyle">
              <iframe v-if="mode === 'iframe' && iframeUrl" :key="iframeVersion" class="embed-app-surface" :src="iframeUrl" title="webgrp 建模页面 iframe 嵌入预览" loading="lazy"></iframe>
              <div v-else-if="mode === 'qiankun'" ref="qiankunHostRef" class="embed-app-surface qiankun-host"></div>
              <div v-else class="empty-state">FastAPI 尚未返回 webgrp 页面地址。</div>
            </div>
          </div>
        </div>

        <div v-if="mode === 'qiankun' && qiankunLoading" class="embed-status"><LoaderCircle :size="15" class="spin" />正在调用 qiankun mount…</div>
        <div v-else-if="mode === 'qiankun' && qiankunError" class="embed-status error"><CircleAlert :size="15" />{{ qiankunError }}<span>请用 <code>VITE_QIANKUN=true pnpm dev</code> 启动 webgrp。</span></div>
      </div>

      <div class="stacked-notes">
        <article class="info-block accent-block">
          <div class="info-title"><ShieldCheck :size="16" />空间语义</div>
          <p>iframe 不拼接 <code>?space=</code>。webgrp 页面按自己的 <code>gmp_space</code> Cookie 选择空间；HTTP 和 WebSocket 使用示例配置中的 <code>{{ config?.webgrp.space || "default" }}</code>。</p>
        </article>
        <article class="info-block">
          <div class="info-title">iframe 直接嵌入</div>
          <pre class="code-block">{{ `<iframe\n  src="${iframeUrl || "http://127.0.0.1:5173/app/"}"\n  title="电力系统建模"\n  style="width:100%;height:100%;border:0"\n/>` }}</pre>
        </article>
        <article class="info-block">
          <div class="info-title">qiankun 嵌入</div>
          <pre class="code-block">{{ `loadMicroApp({\n  name: "graph-modeling-platform",\n  entry: "${iframeUrl || "http://127.0.0.1:5173/app/"}",\n  container: "#webgrp-container",\n  props: {\n    apiBaseUrl: "${qiankunApiBaseUrl || "http://127.0.0.1:5173"}",\n    user: "integration-demo-user"\n  }\n})` }}</pre>
        </article>
        <article class="info-block">
          <div class="info-title">小容器如何缩放</div>
          <p class="muted">宿主区域通过 <code>ResizeObserver</code> 监听宽高，按 <code>min(容器宽 / 1440, 容器高 / 810)</code> 计算比例，容器变大时允许放大，变小时自动缩小。iframe 和 qiankun 都挂在同一个固定基准画布中，因此缩放规则一致。</p>
        </article>
      </div>
    </div>
  </section>
</template>
