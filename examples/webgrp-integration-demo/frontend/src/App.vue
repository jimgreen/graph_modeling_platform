<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Activity, BookOpen, Braces, Cable, ExternalLink, LayoutDashboard, RefreshCw, Server, Settings2, Wifi } from "lucide-vue-next";
import EmbedPanel from "./components/EmbedPanel.vue";
import HttpExplorer from "./components/HttpExplorer.vue";
import RecipePanel from "./components/RecipePanel.vue";
import WebsocketMonitor from "./components/WebsocketMonitor.vue";
import { useDemoApi } from "./composables/useDemoApi";
import type { PanelKey } from "./types";

const { config, loading, lastError, loadConfig } = useDemoApi();
const activePanel = ref<PanelKey>("overview");
const tabs = [
  { key: "overview" as const, label: "嵌入预览", icon: LayoutDashboard, hint: "iframe" },
  { key: "http" as const, label: "HTTP API", icon: Braces, hint: "proxy" },
  { key: "websocket" as const, label: "WebSocket", icon: Cable, hint: "live" },
  { key: "recipes" as const, label: "接入配方", icon: BookOpen, hint: "copy" }
];
const connectionLabel = computed(() => config.value ? "配置已加载" : loading.value ? "正在连接" : "等待后端");

onMounted(loadConfig);
</script>

<template>
  <div class="integration-shell">
    <header class="demo-topbar">
      <div class="brand-lockup">
        <div class="brand-mark"><Activity :size="18" /></div>
        <div><div class="brand-name">WEBGRP</div><div class="brand-subtitle">INTEGRATION LAB</div></div>
      </div>
      <div class="topbar-meta">
        <span class="connection-state"><span class="status-dot" :class="config ? 'online' : ''"></span>{{ connectionLabel }}</span>
        <span class="space-badge"><Settings2 :size="14" />space: {{ config?.webgrp.space || "—" }}</span>
        <button class="icon-button" type="button" title="重新读取配置" :disabled="loading" @click="loadConfig"><RefreshCw :size="16" /></button>
      </div>
    </header>

    <div class="demo-workspace">
      <aside class="demo-sidebar">
        <div class="sidebar-intro"><p class="eyebrow">DEVELOPER TOOL</p><p>一套可运行的 webgrp 接入样例，按调用方向拆开每一条链路。</p></div>
        <nav class="tab-nav" role="tablist" aria-label="示例模块">
          <button v-for="tab in tabs" :key="tab.key" type="button" class="nav-item" :class="{ active: activePanel === tab.key }" role="tab" :aria-selected="activePanel === tab.key" @click="activePanel = tab.key">
            <component :is="tab.icon" :size="17" /><span><strong>{{ tab.label }}</strong><small>{{ tab.hint }}</small></span><span v-if="activePanel === tab.key" class="nav-indicator"></span>
          </button>
        </nav>
        <div class="sidebar-footer"><div class="footer-line"><Server :size="14" /> FastAPI bridge</div><div class="footer-line"><Wifi :size="14" /> {{ config?.webgrp.apiBaseUrl || "webgrp API" }}</div><a v-if="config" :href="`${config.demo.httpBaseUrl}/docs`" target="_blank" rel="noreferrer"><ExternalLink :size="13" /> OpenAPI docs</a></div>
      </aside>

      <main class="demo-main-content">
        <div v-if="lastError" class="callout error-callout"><span>{{ lastError }}</span><button class="button text-button" type="button" @click="loadConfig">重试</button></div>
        <div id="panel-overview" role="tabpanel" v-show="activePanel === 'overview'" :aria-hidden="activePanel !== 'overview'">
          <EmbedPanel :config="config" :active="activePanel === 'overview'" />
        </div>
        <div id="panel-http" role="tabpanel" v-show="activePanel === 'http'" :aria-hidden="activePanel !== 'http'">
          <HttpExplorer :config="config" />
        </div>
        <div id="panel-websocket" role="tabpanel" v-show="activePanel === 'websocket'" :aria-hidden="activePanel !== 'websocket'">
          <WebsocketMonitor :config="config" :space="config?.webgrp.space || 'default'" />
        </div>
        <div id="panel-recipes" role="tabpanel" v-show="activePanel === 'recipes'" :aria-hidden="activePanel !== 'recipes'">
          <RecipePanel :config="config" />
        </div>
      </main>
    </div>
  </div>
</template>
