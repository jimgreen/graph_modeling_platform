// @ts-nocheck
import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { Input, Button, Checkbox, Select } from "antd";
import { WindowCloseButton } from "./WindowCloseButton";
import { apiPath } from "./config";
import { schemePathQueryParam } from "./appExtracted/appPersistenceLibraryExport";
import { backendExportSchemePath } from "./backendExportPath";

// 上次成功发送的目标 URL（跨会话回填；localStorage 不可用时静默退回空）
const TARGET_URL_STORAGE_KEY = "sendModelTargetUrl";
// POST body 上限之外的客户端校验：非空 http/https 交给后端再判一次
const URL_HINT = "http://主机:端口/接收路径";

// 可发送格式：顺序与顶栏导出菜单一致。
// E 文件默认 GBK（下游电力系统多为 GBK），其余默认 UTF-8。
const SEND_FORMATS = [
  { kind: "e", label: "E 文件", defaultEncoding: "gbk" },
  { kind: "json", label: "JSON", defaultEncoding: "utf-8" },
  { kind: "svg", label: "SVG", defaultEncoding: "utf-8" },
  { kind: "cim", label: "CIM/XML", defaultEncoding: "utf-8" }
];

type Props = {
  open: boolean;
  onClose: () => void;
  scope: Record<string, any>;
};

// 发送请求装配（纯函数，便于单测锁定前端契约；后端行为见 server/sendModel.test.mjs）：
// 与既有导出端点同口径 —— schemePath 走 query，body 只带目标地址与格式清单。
export function buildSendRequest(
  scope: Record<string, any>,
  url: string,
  files: Array<{ kind: string; encoding: string }>
) {
  const modelName = String(scope.projectName ?? "");
  const path = backendExportSchemePath(scope);
  return {
    requestUrl: apiPath(
      `/v1/schemes/model/send?${schemePathQueryParam("schemePath", path)}&name=${encodeURIComponent(modelName)}`
    ),
    init: {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url, files })
    }
  };
}

export function SendModelDialog({ open, onClose, scope }: Props) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({ e: true });
  const [encoding, setEncoding] = useState<Record<string, string>>(
    Object.fromEntries(SEND_FORMATS.map((format) => [format.kind, format.defaultEncoding]))
  );

  useEffect(() => {
    if (!open) return;
    try {
      setUrl(localStorage.getItem(TARGET_URL_STORAGE_KEY) ?? "");
    } catch {
      setUrl("");
    }
    setError("");
  }, [open]);

  // ESC 键关闭弹窗（document 级别监听）
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async () => {
    const target = url.trim();
    if (!target) {
      setError("请填写目标 URL。");
      return;
    }
    const files = SEND_FORMATS
      .filter((format) => checked[format.kind])
      .map((format) => ({ kind: format.kind, encoding: encoding[format.kind] }));
    if (files.length === 0) {
      setError("至少选择一种发送格式。");
      return;
    }
    // 与导出同口径：发送的是已保存模型，未保存时先走既有保存提示
    if (typeof scope.ensureSavedBeforeExport === "function" && !scope.ensureSavedBeforeExport()) {
      return;
    }

    setSending(true);
    setError("");
    try {
      const { requestUrl, init } = buildSendRequest(scope, target, files);
      const response = await fetch(requestUrl, init);
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error?.message ?? `发送失败（HTTP ${response.status}）。`);
      }
      try {
        localStorage.setItem(TARGET_URL_STORAGE_KEY, target);
      } catch {
        /* 隐私模式等场景下忽略 */
      }
      scope.showGlobalMessage?.("发送成功");
      onClose();
    } catch (err) {
      // 失败保留弹窗，便于改地址重试
      setError(err instanceof Error ? err.message : "发送失败。");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="image-picker-backdrop" onPointerDown={onClose}>
      <section
        className="e-device-interface-dialog window-close-host"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        style={{ width: 460, display: "flex", flexDirection: "column", maxHeight: "80vh", fontSize: 12 }}
        aria-label="发送模型"
      >
        <WindowCloseButton label="关闭发送模型" onClick={onClose} />
        <div className="image-picker-title" style={{ padding: "8px 58px 8px 12px" }}>
          <h2 style={{ fontSize: 14, margin: 0 }}>发送模型</h2>
        </div>
        <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" }}>
          <div style={{ fontWeight: 600 }}>目标 URL</div>
          <Input
            id="send-model-url"
            value={url}
            placeholder={URL_HINT}
            disabled={sending}
            onChange={(event) => setUrl(event.target.value)}
            onPressEnter={() => void submit()}
            style={{ fontSize: 12 }}
          />
          <div style={{ fontWeight: 600, marginTop: 8 }}>发送格式</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "4px 8px", textAlign: "left", fontWeight: 600 }}>格式</th>
                <th style={{ padding: "4px 8px", textAlign: "left", fontWeight: 600, width: 120 }}>字符编码</th>
              </tr>
            </thead>
            <tbody>
              {SEND_FORMATS.map((format) => (
                <tr key={format.kind} style={{ borderBottom: "1px solid #f1f5f9", lineHeight: 1.4 }}>
                  <td style={{ padding: "3px 8px" }}>
                    <Checkbox
                      id={`send-model-format-${format.kind}`}
                      checked={Boolean(checked[format.kind])}
                      disabled={sending}
                      onChange={(event) => setChecked((prev) => ({ ...prev, [format.kind]: event.target.checked }))}
                    >
                      {format.label}
                    </Checkbox>
                  </td>
                  <td style={{ padding: "3px 8px" }}>
                    <Select
                      id={`send-model-encoding-${format.kind}`}
                      size="small"
                      value={encoding[format.kind]}
                      disabled={!checked[format.kind] || sending}
                      style={{ width: 104 }}
                      onChange={(value) => setEncoding((prev) => ({ ...prev, [format.kind]: value }))}
                      options={[{ value: "utf-8", label: "UTF-8" }, { value: "gbk", label: "GBK" }]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {error && (
            <div id="send-model-error" style={{ color: "#dc2626", marginTop: 4 }}>{error}</div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "8px 12px", borderTop: "1px solid #e2e8f0" }}>
          <Button id="send-model-cancel" onClick={onClose} disabled={sending}>取消</Button>
          <Button id="send-model-submit" type="primary" loading={sending} onClick={() => void submit()}>
            <Send size={12} />
            <span>发送</span>
          </Button>
        </div>
      </section>
    </div>
  );
}
