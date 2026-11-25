import { ref } from "vue";
import type { DemoConfig, HttpRunResult } from "../types";

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
export function useDemoApi() {
  const config = ref<DemoConfig | null>(null);
  const loading = ref(false);
  const lastError = ref("");

  async function loadConfig() {
    loading.value = true;
    lastError.value = "";
    try {
      const response = await fetch("/api/config", { signal: AbortSignal.timeout(8_000) });
      const payload = (await readPayload(response)) as DemoConfig;
      if (!response.ok || !payload?.ok) throw new Error("示例后端未返回有效配置。");
      config.value = payload;
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : String(error);
    } finally {
      loading.value = false;
    }
  }

  async function runHttp(path: string, options: RequestInit = {}, snapshot?: HttpRunResult["request"]): Promise<HttpRunResult> {
    const started = performance.now();
    const request: HttpRunResult["request"] = snapshot ?? {
      method: options.method ?? "GET",
      path,
      body: options.body ? JSON.parse(String(options.body)) : undefined
    };
    try {
      const response = await fetch(path, {
        ...options,
        headers: { "content-type": "application/json", ...(options.headers ?? {}) },
        signal: AbortSignal.timeout(25_000)
      });
      return {
        request,
        status: response.status,
        elapsedMs: Math.round((performance.now() - started) * 10) / 10,
        response: await readPayload(response)
      };
    } catch (error) {
      return {
        request,
        status: null,
        elapsedMs: Math.round((performance.now() - started) * 10) / 10,
        response: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  return { config, loading, lastError, loadConfig, runHttp };
}
