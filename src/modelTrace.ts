type ModelTracePayload = Record<string, unknown> | undefined;

function traceEnabled(): boolean {
  const scope = globalThis as any;
  if (scope.__MODEL_TRACE__ === false) return false;
  try {
    return scope.localStorage?.getItem("gmp_model_trace") !== "0";
  } catch {
    return true;
  }
}

export function modelTrace(event: string, payload?: ModelTracePayload): void {
  if (!traceEnabled() || typeof console === "undefined") return;
  console.info("[MODEL-TRACE]", event, payload ?? {});
}
