import { installDomShim } from "./domShim.mjs";

installDomShim();

function safeFileBase(name) {
  return String(name ?? "").trim().replace(/[\\/:*?"<>|]+/g, "_") || "未命名";
}

export async function buildModelUpdatePayload({
  record,
  schemePath,
  files,
  paths,
  now = () => new Date()
}) {
  const name = String(record?.name ?? record?.project?.name ?? "").trim();
  const project = record?.project ?? {};
  const idx = Number(project.idx);
  const base = safeFileBase(name);
  const startedAt = now();
  const payloadFiles = [];
  const { encodeTextBytes, withXmlEncodingDeclaration } = await import("./xmlEncoding.mjs");

  for (const spec of files) {
    const kind = String(spec?.kind ?? "").trim().toLowerCase();
    if (!["json", "xml", "e"].includes(kind)) {
      throw new Error("暂不支持的模型文件类型：" + spec.kind);
    }
    const encoding = spec.encoding === "gbk" ? "gbk" : "utf-8";
    let text;
    let field;
    let ext;
    let mime;
    let outputKind = kind;

    if (kind === "json") {
      text = JSON.stringify(project);
      field = "json_file";
      ext = ".json";
      mime = "application/json";
    } else if (kind === "e") {
      const { buildEFileForSavedModel } = await import("./eFileExport.mjs");
      const { file, error } = await buildEFileForSavedModel({
        parts: schemePath,
        name,
        templateName: "",
        paths
      });
      if (error) throw Object.assign(new Error(error.message), { code: error.code });
      text = String(file?.text ?? "");
      field = "e_file";
      ext = ".e";
      mime = "text/plain";
    } else {
      const { buildCimForSavedModel } = await import("./cimExport.mjs");
      const { xml, error } = await buildCimForSavedModel({
        parts: schemePath,
        name,
        stableCreatedAt: true,
        paths
      });
      if (error) throw Object.assign(new Error(error.message), { code: error.code });
      text = withXmlEncodingDeclaration(String(xml ?? ""), encoding);
      field = "cim_file";
      ext = ".xml";
      mime = "application/xml";
      outputKind = "cim";
    }

    const bytes = encodeTextBytes(text, encoding);
    payloadFiles.push({
      kind: outputKind,
      field,
      filename: base + ext,
      contentType: mime + "; charset=" + encoding,
      encoding,
      bytes: bytes.length,
      contentBase64: bytes.toString("base64")
    });
  }

  return {
    model_id: Number.isSafeInteger(idx) && idx > 0 ? String(idx) : "",
    model_name: name,
    template_name: "",
    scheme_path: JSON.stringify(schemePath),
    sent_at: startedAt.toISOString(),
    files: payloadFiles
  };
}
