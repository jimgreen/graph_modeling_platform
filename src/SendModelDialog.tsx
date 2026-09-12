// @ts-nocheck
import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { Input, Button, Checkbox, Select, Segmented } from "antd";
import hljs from "highlight.js/lib/core";
import python from "highlight.js/lib/languages/python";
import javascript from "highlight.js/lib/languages/javascript";
import "highlight.js/styles/github-dark.css";

// 只注册用到的两种语言：highlight.js 全量包含几十种语言，按需注册才不会拖大包
hljs.registerLanguage("python", python);
hljs.registerLanguage("javascript", javascript);
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

// 接收端示例代码：贴给下游（Python 或 Node）照着起一个服务就能收下发送过去的文件。
// 契约与后端 form.append 一致：普通字段 model_id / model_name / scheme_path / sent_at，
// 文件字段 e_file(.e) / json_file(.json) / svg_file(.svg) / cim_file(.xml)，各自带 charset。
// 关键点：按字节落盘，解码只用于预览——E 文件是 GBK，先解码再按 UTF-8 写会把中文写坏。
const RECEIVER_SAMPLES = [
  {
    key: "python",
    label: "Python（Flask，pip install flask）",
    code: `# 接收端示例（Python 3.11 + Flask）
from flask import Flask, jsonify, request

app = Flask(__name__)


@app.post("/receive")
def receive():
    # 普通字段按 UTF-8 直接读
    model_id = request.form.get("model_id", "")        # "7"
    model_name = request.form.get("model_name", "")    # "厂站模型"

    saved = []
    for field in ("e_file", "json_file", "svg_file", "cim_file"):
        upload = request.files.get(field)
        if upload is None:
            continue
        raw = upload.read()                            # 原始字节，不要先解码再写盘
        # charset 只用来解码预览；E 文件默认 GBK，其余 UTF-8
        charset = upload.headers.get("Content-Type", "")
        encoding = "gbk" if "gbk" in charset.lower() else "utf-8"
        text = raw.decode(encoding, errors="replace")
        with open(upload.filename, "wb") as out:       # 落盘存原始字节
            out.write(raw)
        saved.append({
            "field": field,
            "filename": upload.filename,
            "bytes": len(raw),
            "preview": text[:80],
        })

    return jsonify(ok=True, model_id=model_id, model_name=model_name, files=saved)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8080)`
  },
  {
    key: "node",
    label: "Node.js（仅预览 GBK 需要 iconv-lite）",
    code: `// 接收端示例（Node 18+，multipart 解析用内置 Response，无需第三方库）
import { createServer } from "node:http";
import { writeFileSync } from "node:fs";
import iconv from "iconv-lite"; // 仅预览 GBK 需要：pnpm add iconv-lite

createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);

  // 把原始字节交给 Response，即可拿到 multipart 解析结果
  const form = await new Response(Buffer.concat(chunks), {
    headers: { "content-type": req.headers["content-type"] }
  }).formData();

  const modelId = form.get("model_id");                 // "7"
  const modelName = form.get("model_name");             // "厂站模型"
  const schemePath = JSON.parse(form.get("scheme_path") || "[]");

  const saved = [];
  for (const [field, value] of form.entries()) {
    if (typeof value === "string") continue;            // 普通字段已在上面读过
    const bytes = Buffer.from(await value.arrayBuffer());
    const isGbk = /charset=gbk/i.test(value.type);
    const preview = (isGbk ? iconv.decode(bytes, "gbk") : bytes.toString("utf-8")).slice(0, 80);
    writeFileSync(value.name, bytes);                   // 落盘存原始字节
    saved.push({ field, filename: value.name, bytes: bytes.length, preview });
  }

  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ ok: true, modelId, modelName, schemePath, files: saved }));
}).listen(8080, "127.0.0.1", () => console.log("接收端已启动：http://127.0.0.1:8080/receive"));`
  }
];

// 示例 key → highlight.js 语言名。逐行高亮：代码块要显示行号，若按整段高亮后再拆行
// 会打断跨行的 span 配对，分行独立高亮最稳（示例里没有跨行字符串或多行注释）。
const RECEIVER_SAMPLE_LANGUAGES = { python: "python", node: "javascript" };
const HIGHLIGHTED_SAMPLES = RECEIVER_SAMPLES.map((sample) => {
  const language = RECEIVER_SAMPLE_LANGUAGES[sample.key] ?? "javascript";
  const htmlLines = sample.code.split("\n").map((line) => hljs.highlight(line, { language }).value);
  return { ...sample, language, htmlLines };
});

// 格式说明：与后端 buildFileText 的实际产出对齐，让人一眼看清各格式装的是什么
const FORMAT_NOTES = [
  { label: "E 文件", text: "电力系统 E 格式文本，按当前模板导出，下游多为 GBK" },
  { label: "JSON", text: "模型工程文件：节点 / 连线 / 分组 / 图层 / 量测" },
  { label: "SVG", text: "自包含矢量图：样式内联、引用图片内联，按电压着色" },
  { label: "CIM/XML", text: "IEC 61970 CIM16：AC 设备 + 拓扑端子 + 量测" }
];

type Props = {
  open: boolean;
  onClose: () => void;
  scope: Record<string, any>;
};
// 当前模型的稳定序号 idx（接口里叫 model_id，与全局线路/全网拓扑同一口径）：
// 后端按 idx 定位模型，与方案路径解耦（改名、移到别的方案后仍能定位）。
// 已保存模型从方案树记录取 project.idx（摘要与完整记录都带），取不到时返回 0，
// 调用方回退 schemePath + name —— 不用内存里的 projectIdx，避免切换模型后残留旧 idx 发错模型。
function currentModelIndex(scope: Record<string, any>): number {
  const { schemes, activeProjectKey, findSavedProjectRecordInSchemes } = scope;
  if (typeof findSavedProjectRecordInSchemes !== "function") {
    return 0;
  }
  const owner = findSavedProjectRecordInSchemes(schemes, activeProjectKey);
  const saved = Number(owner?.project?.project?.idx);
  return Number.isSafeInteger(saved) && saved > 0 ? saved : 0;
}

// 发送请求装配（纯函数，便于单测锁定前端契约；后端行为见 server/sendModel.test.mjs）：
// 优先 modelId 指定模型；模型尚未分配 idx 时回退 schemePath + name（后端两种都收）。
export function buildSendRequest(
  scope: Record<string, any>,
  url: string,
  files: Array<{ kind: string; encoding: string }>
) {
  const modelName = String(scope.projectName ?? "");
  const modelId = currentModelIndex(scope);
  const target = modelId > 0
    ? `modelId=${modelId}`
    : `${schemePathQueryParam("schemePath", backendExportSchemePath(scope))}&name=${encodeURIComponent(modelName)}`;
  return {
    requestUrl: apiPath(`/v1/schemes/model/send?${target}`),
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
  // 复制接收端示例后的反馈：{ key: 哪个示例, ok: 是否复制成功 }
  const [copyState, setCopyState] = useState<{ key: string; ok: boolean } | null>(null);
  // 当前展示的接收端示例（默认 Python）
  const [activeSample, setActiveSample] = useState("python");
  // 发送成功提示：成功后保留弹窗，便于继续发送或核对接收结果
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!open) return;
    try {
      setUrl(localStorage.getItem(TARGET_URL_STORAGE_KEY) ?? "");
    } catch {
      setUrl("");
    }
    setError("");
    setSuccess("");
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

  // 复制示例代码：剪贴板仅在 https/已授权时可用，失败也要给出可见反馈
  const copySample = async (sample: { key: string; code: string }) => {
    try {
      await navigator.clipboard.writeText(sample.code);
      setCopyState({ key: sample.key, ok: true });
    } catch {
      setCopyState({ key: sample.key, ok: false });
    }
  };

  // 右侧当前展示的示例（复制按钮据此取代码）
  const activeSampleDefinition =
    HIGHLIGHTED_SAMPLES.find((sample) => sample.key === activeSample) ?? HIGHLIGHTED_SAMPLES[0];

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
    setSuccess("");
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
      // 成功后保留弹窗：便于继续发送或对照右侧示例核对接收结果，成功文案给在弹窗内
      setSuccess(`发送成功（接收端返回 HTTP ${payload?.data?.status ?? 200}，用时 ${payload?.data?.elapsedMs ?? "-"}ms）。`);
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
        className="e-device-interface-dialog window-close-host send-model-dialog"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        style={{ width: 900, maxWidth: "94vw", display: "flex", flexDirection: "column", maxHeight: "80vh", fontSize: 12 }}
        aria-label="发送模型"
      >
        <WindowCloseButton label="关闭发送模型" onClick={onClose} />
        <div className="image-picker-title" style={{ padding: "8px 58px 8px 12px" }}>
          <h2 style={{ fontSize: 14, margin: 0 }}>发送模型</h2>
        </div>
        <div style={{ display: "flex", gap: 12, padding: "8px 12px", flex: "1 1 auto", minHeight: 0, overflow: "hidden" }}>
          {/* 左栏：目标 URL + 发送格式 */}
          <div style={{ flex: "0 0 400px", display: "flex", flexDirection: "column", gap: 4, minWidth: 0, overflowY: "auto" }}>
            <div style={{ fontWeight: 600, color: "#0f172a" }}>目标 URL</div>
            <Input
              id="send-model-url"
              value={url}
              placeholder={URL_HINT}
              disabled={sending}
              onChange={(event) => setUrl(event.target.value)}
              onPressEnter={() => void submit()}
              style={{ fontSize: 12 }}
            />
            <div style={{ fontWeight: 600, color: "#0f172a", marginTop: 8 }}>发送格式</div>
            <table className="send-model-format-table">
              <thead>
                <tr>
                  <th>格式</th>
                  <th style={{ width: 112 }}>字符编码</th>
                </tr>
              </thead>
              <tbody>
                {SEND_FORMATS.map((format) => (
                  <tr key={format.kind}>
                    <td>
                      <Checkbox
                        id={`send-model-format-${format.kind}`}
                        checked={Boolean(checked[format.kind])}
                        disabled={sending}
                        onChange={(event) => setChecked((prev) => ({ ...prev, [format.kind]: event.target.checked }))}
                      >
                        {format.label}
                      </Checkbox>
                    </td>
                    <td>
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
          <div style={{ fontWeight: 600, color: "#0f172a", marginTop: 8 }}>格式说明</div>
          <div className="send-model-notes">
            {FORMAT_NOTES.map((note) => (
              <div key={note.label} className="send-model-note">
                <span className="send-model-note-kind">{note.label}</span>
                <span>{note.text}</span>
              </div>
            ))}
          </div>
          {/* 状态文案不带 auto 外边距：剩余空间留给按钮区，它自然沉到按钮上方 */}
          {error && (
            <div id="send-model-error" style={{ color: "#dc2626", paddingTop: 10 }}>{error}</div>
          )}
          {!error && success && (
            <div id="send-model-success" style={{ color: "#16a34a", paddingTop: 10 }}>{success}</div>
          )}
          {/* 操作按钮固定在左栏底部 */}
          <div className="send-model-actions">
            <Button id="send-model-cancel" onClick={onClose} disabled={sending}>取消</Button>
            <Button id="send-model-submit" type="primary" loading={sending} onClick={() => void submit()}>
              <Send size={12} />
              <span>发送</span>
            </Button>
          </div>
          </div>

          {/* 右栏：接收端示例。默认 Python，Segmented 切换；与左栏同一 flex 行故等高 */}
          <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: 6, borderLeft: "1px solid #e2e8f0", paddingLeft: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ fontWeight: 600, color: "#0f172a" }}>接收端示例</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Segmented
                  id="send-model-sample-tabs"
                  size="small"
                  value={activeSample}
                  onChange={(value) => setActiveSample(String(value))}
                  options={[{ value: "python", label: "Python" }, { value: "node", label: "Node.js" }]}
                />
                <button
                  type="button"
                  id="send-model-sample-copy"
                  className="send-model-copy-button"
                  onClick={() => void copySample(activeSampleDefinition)}
                >
                  {copyState?.key === activeSample ? (copyState.ok ? "已复制" : "复制失败") : "复制"}
                </button>
              </div>
            </div>
            <div className="send-model-hint">
              把目标 URL 填成示例服务监听的地址（如 http://127.0.0.1:8080/receive）即可收到勾选格式的文件；Python 需 pip install flask，Node 仅 GBK 预览需 iconv-lite。
            </div>
            {HIGHLIGHTED_SAMPLES.map((sample) => (
              <pre
                key={sample.key}
                id={`send-model-sample-code-${sample.key}`}
                className="send-model-code"
                style={{ display: sample.key === activeSample ? "block" : "none" }}
              ><code className="hljs">{sample.htmlLines.map((lineHtml, index) => (
                  <span key={index} className="send-model-code-line">
                    <span className="send-model-code-line-number">{index + 1}</span>
                    <span className="send-model-code-line-content" dangerouslySetInnerHTML={{ __html: lineHtml || "&nbsp;" }}/>
                  </span>
                ))}</code></pre>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
