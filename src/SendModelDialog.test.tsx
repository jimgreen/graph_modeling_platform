// 发送模型弹窗：SSR 静态标记断言（不依赖 DOM 环境，与项目其它组件测试同模式）
// + 请求装配纯函数契约。端到端 multipart 行为见 server/sendModel.test.mjs。
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { SendModelDialog, buildSendRequest } from "./SendModelDialog";

const scope = {
  projectName: "模型甲",
  activeSchemeKey: "scheme-1",
  schemePathForScheme: () => ["方案A", "子方案"],
  activeProjectKey: "project-7",
  schemes: [
    { id: "scheme-1", name: "方案A", projects: [{ id: "project-7", name: "模型甲", project: { idx: 7 } }] }
  ],
  findSavedProjectRecordInSchemes: (schemes: Array<Record<string, any>>, projectId: string) => {
    for (const scheme of schemes) {
      const project = (scheme.projects ?? []).find((item: Record<string, any>) => item.id === projectId);
      if (project) {
        return { scheme, project };
      }
    }
    return null;
  }
};

function render(props: Record<string, unknown>) {
  return renderToStaticMarkup(
    <SendModelDialog open onClose={() => undefined} scope={scope} {...props} />
  );
}

describe("SendModelDialog", () => {
  test("open 为 false 时不渲染", () => {
    expect(renderToStaticMarkup(<SendModelDialog open={false} onClose={() => undefined} scope={scope} />)).toBe("");
  });

  test("渲染标题、URL 输入与四种格式及各自编码选择", () => {
    const html = render({});
    expect(html).toContain("发送模型");
    expect(html).toContain("目标 URL");
    expect(html).toContain('id="send-model-url"');
    expect(html).toContain('id="send-model-format-e"');
    expect(html).toContain('id="send-model-format-json"');
    expect(html).toContain('id="send-model-format-svg"');
    expect(html).toContain('id="send-model-format-cim"');
    expect(html).toContain('id="send-model-encoding-e"');
    expect(html).toContain('id="send-model-encoding-cim"');
    expect(html).toContain('id="send-model-submit"');
    expect(html).toContain('id="send-model-cancel"');
    expect(html).toContain("E 文件");
    expect(html).toContain("CIM/XML");
  });

  test("默认只勾 E 文件，且其编码默认 GBK", () => {
    const html = render({});
    // 四个 Checkbox 中仅一个带选中样式
    expect(html.match(/ant-checkbox-checked/g) ?? []).toHaveLength(1);
    expect(html).toContain(">GBK<");
    expect(html).toContain(">UTF-8<");
  });

  test("右侧展示接收端示例：Python / Node 页签、语法高亮、复制按钮", () => {
    const html = render({});
    expect(html).toContain("接收端示例");
    expect(html).toContain('id="send-model-sample-tabs"');
    expect(html).toContain("Python");
    expect(html).toContain("Node.js");
    expect(html).toContain('id="send-model-sample-copy"');

    // 两段代码都在 DOM 中，默认只显示 Python（Node 面板 display:none）
    expect(html).toContain('id="send-model-sample-code-python"');
    expect(html).toContain('id="send-model-sample-code-node"');
    expect(html).toContain("display:none");

    // 语法高亮：highlight.js 输出的 span class
    expect(html).toContain("hljs-keyword");
    // 代码块逐行渲染并带行号
    expect(html).toContain("send-model-code-line-number");
    // 左栏格式说明
    expect(html).toContain("格式说明");
    expect(html).toContain("send-model-note-kind");
    expect(html).toContain("IEC 61970 CIM16");

    // 契约要点：高亮会把标识符包进 span，逐字断言改看源码
    const source = readFileSync(new URL("./SendModelDialog.tsx", import.meta.url), "utf8");
    expect(source).toContain("request.files.get(field)");
    expect(source).toContain("formData()");
    expect(source).toContain("value.arrayBuffer()");
    expect(source).toContain("e_file");
    expect(source).toContain("iconv.decode");
  });

  test("可选择 E 文件模板，并随请求下发 templateName", () => {
    const html = render({});
    expect(html).toContain('id="send-model-template"');
    expect(html).toContain("默认（按模型当前配置导出）");

    const files = [{ kind: "e", encoding: "gbk" }];
    const withTemplate = buildSendRequest(scope, "http://x/y", files, "配网实时库");
    expect(JSON.parse(withTemplate.init.body)).toEqual({
      url: "http://x/y",
      files,
      templateName: "配网实时库"
    });

    // 未选模板时不带该字段，body 与旧调用逐字节一致
    const withoutTemplate = buildSendRequest(scope, "http://x/y", files);
    expect(JSON.parse(withoutTemplate.init.body)).toEqual({ url: "http://x/y", files });
  });

  test("发送成功后保留弹窗，不再调用 onClose", () => {
    const source = readFileSync(new URL("./SendModelDialog.tsx", import.meta.url), "utf8");
    const successBranch = source.slice(
      source.indexOf('scope.showGlobalMessage?.("发送成功")'),
      source.indexOf("} catch (err) {")
    );

    expect(successBranch).toContain("setSuccess");
    expect(successBranch).not.toContain("onClose()");
  });
});

describe("buildSendRequest", () => {
  test("优先用 modelId 指定模型（与方案路径解耦），body 只带目标地址与格式清单", () => {
    const files = [{ kind: "e", encoding: "gbk" }, { kind: "svg", encoding: "utf-8" }];
    const { requestUrl, init } = buildSendRequest(scope, "http://10.0.0.9:8080/receive", files);

    expect(requestUrl).toContain("/v1/schemes/model/send?modelId=7");
    expect(requestUrl).not.toContain("schemePath=");
    expect(init.method).toBe("POST");
    expect(init.headers["content-type"]).toBe("application/json");
    expect(JSON.parse(init.body)).toEqual({ url: "http://10.0.0.9:8080/receive", files });
  });

  test("未分配 idx 的模型回退 schemePath + name，方案路径缺失时回落默认方案", () => {
    const { requestUrl } = buildSendRequest({ projectName: "模型乙" }, "http://x/y", []);
    expect(requestUrl).not.toContain("modelId=");
    expect(requestUrl).toContain(`schemePath=${encodeURIComponent(JSON.stringify(["默认方案"]))}`);
    expect(requestUrl).toContain(`name=${encodeURIComponent("模型乙")}`);
  });
});
