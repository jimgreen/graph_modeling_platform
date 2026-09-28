// ZIP 解包的路径穿越（zip-slip）安全守卫 —— 此前零覆盖。
//
// 防线是两层，且方案域与空间域**共用一份**（server.mjs 的 zipEntryParts +
// extractZipEntries）：
//   1. zipEntryParts：拒绝对路径（`/…`、盘符 `C:`）、反斜杠归一、拒 `.` / `..` 段；
//   2. extractZipEntries：逐段 safeFilePart 净化后再 isPathInside(targetDir) 复核。
//
// **为什么不能用 AdmZip.addFile 造样本**：实测它会在写入时就把 `root/../../x.json`
// 规范化成 `x.json` —— 服务端根本见不到恶意名字，那样的测试恒绿、完全无效。
// 所以这里手写最小 ZIP（STORE 不压缩 + CRC32），entryName 原样写入，才能真正触达防线。
import { describe, expect, test, beforeAll, afterAll } from "vitest";
import { mkdtempSync, rmSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import AdmZip from "adm-zip";
import { installDomShim } from "./domShim.mjs";
import { apiPath } from "./config.mjs";

installDomShim();

// ===== 最小 ZIP 构造器（entryName 原样写入，不做任何规范化）=====

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function buildZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, content] of entries) {
    const nameBuf = Buffer.from(name, "utf-8");
    const dataBuf = Buffer.from(content, "utf-8");
    const crc = crc32(dataBuf);

    const local = Buffer.alloc(30 + nameBuf.length + dataBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 8); // method = STORE
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(dataBuf.length, 18);
    local.writeUInt32LE(dataBuf.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    nameBuf.copy(local, 30);
    dataBuf.copy(local, 30 + nameBuf.length);
    locals.push(local);

    const central = Buffer.alloc(46 + nameBuf.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 10); // method = STORE
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(dataBuf.length, 20);
    central.writeUInt32LE(dataBuf.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt32LE(offset, 42);
    nameBuf.copy(central, 46);
    centrals.push(central);

    offset += local.length;
  }
  const centralBuf = Buffer.concat(centrals);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralBuf, eocd]);
}

let dataDir;
let server;
let baseUrl;

beforeAll(async () => {
  dataDir = mkdtempSync(join(tmpdir(), "gmp-zipslip-"));
  process.env.GRAPH_MODEL_DATA_DIR = dataDir;
  const { createImageServer } = await import("./server.mjs");
  server = await createImageServer({ port: 0, host: "127.0.0.1" });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
}, 60000);

afterAll(async () => {
  if (server) await new Promise((r) => server.close(r));
  if (dataDir) rmSync(dataDir, { recursive: true, force: true });
});

/** 递归列出目录内所有文件（相对路径，正斜杠） */
function listFiles(dir, depth = 0) {
  if (depth > 8) return [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(full, depth + 1).map((f) => `${e.name}/${f}`));
    else out.push(e.name);
  }
  return out;
}

async function importSchemeZip(zipBuffer) {
  const res = await fetch(`${baseUrl}${apiPath("/schemes/import")}`, {
    method: "POST",
    headers: { "content-type": "application/zip" },
    body: zipBuffer
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

describe("ZIP 解包 zip-slip 防护", () => {
  test("样本构造器有效：原始恶意条目名确实写进了 ZIP（否则下面全是假绿）", () => {
    // 鉴别力自检：若构造器自己把 `..` 规范化掉，整组用例就恒绿、形同虚设。
    const buf = buildZip([["root/../../ESCAPE.json", "x"]]);
    const names = new AdmZip(buf).getEntries().map((e) => e.entryName);
    expect(names).toContain("root/../../ESCAPE.json");
    // 对照：AdmZip.addFile 反而会把名字规范化掉 —— 这就是不能用它造样本的原因
    const viaAdm = new AdmZip();
    viaAdm.addFile("root/../../NORMALIZED.json", Buffer.from("x"));
    expect(new AdmZip(viaAdm.toBuffer()).getEntries()[0].entryName).not.toContain("..");
  });

  const malicious = [
    ["父目录穿越", "root/../../ESCAPE-dotdot.json"],
    ["反斜杠穿越", "root/..\\..\\ESCAPE-backslash.json"],
    ["深层穿越（多级）", "root/../../../../../../../../../../ESCAPE-deep.json"],
    ["绝对路径", "/absolute/Escape-abs.json"],
    ["Windows 盘符", "C:/Windows/Escape-drive.json"],
    ["嵌套穿越", "root/schemes/files/EVIL/../../../ESCAPE-nested.json"],
    ["纯点段", "root/./ESCAPE-dot.json"]
  ];

  for (const [label, entryName] of malicious) {
    test(`${label} 被拒（${entryName}）`, async () => {
      const { status, json } = await importSchemeZip(
        buildZip([["root/ok.json", '{"ok":true}'], [entryName, "PWNED"]])
      );
      expect(status, `${label} 未被拒绝`).toBe(400);
      expect(String(json.error ?? "")).toMatch(/不安全路径|无效路径/u);
    });
  }

  test("恶意条目零逃逸：dataDir 内无越界文件，dataDir 外无任何写入", async () => {
    // 综合投放全部恶意条目，事后核查磁盘真实状态（不只看响应码）
    const buf = buildZip(malicious.map(([, name]) => [name, "PWNED"]));
    const { status } = await importSchemeZip(buf);
    expect(status).toBe(400);

    // dataDir 之外不得出现任何逃逸文件
    for (const p of [
      resolve(dataDir, "..", "ESCAPE-dotdot.json"),
      resolve(dataDir, "..", "ESCAPE-backslash.json"),
      resolve(dataDir, "..", "Escape-abs.json"),
      resolve(dataDir, "..", "..", "ESCAPE-deep.json"),
      resolve(dataDir, "..", "..", "..", "..", "ESCAPE-nested.json"),
      resolve(dataDir, "..", "..", "..", "..", "..", "..", "..", "..", "..", "ESCAPE-deep.json")
    ]) {
      expect(existsSync(p), `文件逃逸到了 ${p}`).toBe(false);
    }

    // 且 dataDir 内没有把「ESCAPE」写进 schemes 树
    const inside = listFiles(dataDir);
    expect(inside.filter((f) => f.includes("ESCAPE")), "逃逸文件被写进了数据目录内").toEqual([]);
  });

  test("合法 ZIP 仍能正常导入（回归：别把正常路径也拦下）", async () => {
    const project = { version: 1, name: "正常方案模型", nodes: [], edges: [] };
    const buf = buildZip([
      ["root/正常方案.json", JSON.stringify(project)],
      ["root/schemes/files/正常方案/子方案/交流设备.json", JSON.stringify(project)]
    ]);
    const { status, json } = await importSchemeZip(buf);
    expect(status, `合法 ZIP 被拒：${JSON.stringify(json)}`).toBe(200);
    expect(json.ok).toBe(true);
    expect(listFiles(dataDir).some((f) => f.includes("正常方案"))).toBe(true);
  });

  /**
   * 第二层（isPathInside 复核）用**行为样本区分不出来** —— 如实说明而不是假装覆盖了。
   *
   * 实测：删掉 extractZipEntries 里的 `if (!isPathInside(targetDir, targetPath)) throw`，
   * 上面 10 条全绿。原因是第一层 zipEntryParts 已经把绝对路径、盘符、`.`/`..` 段全拒了，
   * 剩下的条目经 safeFilePart 净化后不可能再逃出 targetDir —— 两层不是独立的判据，
   * 第二层是**纵深防御**。
   *
   * 也试过构造「能过第一层但过不了第二层」的样本（`...` 段、超长段触发截断、
   * `..%2f` 之类），逐一推演后都不成立：sanitizeSegment 对 `^\.+$` 用 fallback 兜底，
   * 截断只会变短不会新增分隔符，全链路也不做 URL 解码。
   *
   * 所以这里用静态断言守住这一层：删掉它会被发现，同时留下「它当前不可被行为验证」
   * 这个事实，免得日后有人反复尝试造样本、或误以为已有行为覆盖。
   */
  test("纵深防御：第二层 isPathInside 复核仍在（行为样本不可区分，故静态钉住）", () => {
    const src = readFileSync(fileURLToPath(new URL("./server.mjs", import.meta.url)), "utf8");
    expect(
      /if \(!isPathInside\(targetDir, targetPath\)\)/.test(src),
      "extractZipEntries 的 isPathInside 复核被删了 —— 它是 zipEntryParts 之后的第二道防线"
    ).toBe(true);
    expect(
      /zip 文件包含越界路径。/.test(src),
      "越界路径的报错文案消失了（说明该分支被改写或移除）"
    ).toBe(true);
  });
});
