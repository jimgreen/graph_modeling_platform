// server/server.mjs 两个内部读盘函数的直测 —— 此前零直呼。
//
// ## 为什么这两个值得单独立文件
//
// - `readReferencedImageExportPathById`：SVG/E 导出的图片内联入口。
//   `svgExport.test.mjs` 已经**经真实 server** 覆盖了它的正反两条路径
//   （存在 → 内联成 data URL、已登记但文件丢失 → 不阻断另一张），
//   但那是集成测试：改坏了要起 server 才看得到，且看不出「为什么这张没内联」。
// - `findSchemeProjectRecordByIndex`：以 model_id（idx）定位模型的唯一实现，
//   被「发送模型」与 SVG 背景页重建共用。此前只有 HTTP 层的 e2e 覆盖，
//   **判据本身**（非安全整数 / ≤0 直接 null、损坏文件不参与匹配）从未被执行过。
//
// 两者都接 `options.paths` / `options.filesRoot`，故只需把路径指向 tmpdir，
// **不必起 HTTP server**。
//
// 注意：`.test.mjs` 必须是纯 JS —— 不要写 `as never` / 类型标注 / 非空断言，
// 那些会触发 RollupError: Parse failure，表现为「Tests: no tests」（看着像通过，实际没跑）。
import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  findSchemeProjectRecordByIndex,
  readReferencedImageExportPathById
} from "./server.mjs";

// 1×1 透明 PNG
const PNG_1X1_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

let dataDir;
/** 传给被测函数的 paths；形状与 server.mjs 的 defaultPaths 同构，只补本测试用得到的三个。 */
let paths;

beforeEach(() => {
  dataDir = mkdtempSync(join(tmpdir(), "server-internals-"));
  const images = join(dataDir, "images");
  const schemes = join(dataDir, "schemes");
  const schemeFiles = join(schemes, "files");
  mkdirSync(images, { recursive: true });
  mkdirSync(schemeFiles, { recursive: true });
  paths = {
    root: dataDir,
    images,
    manifest: join(images, "manifest.json"),
    schemes,
    schemeFiles
  };
});

afterEach(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

/** 在 manifest 登记一张图；dropFile=true 时只登记不落盘（逼 readFile 失败）。 */
function registerImage({ id, filename = `${id}.png`, mimeType = "image/png", dropFile = false }) {
  const current = manifestEntries();
  current.push({
    id,
    name: `${id}.png`,
    folderId: "root",
    mimeType,
    size: Buffer.from(PNG_1X1_BASE64, "base64").length,
    filename,
    createdAt: new Date(0).toISOString()
  });
  writeFileSync(paths.manifest, JSON.stringify(current), "utf-8");
  if (!dropFile) {
    writeFileSync(join(paths.images, filename), Buffer.from(PNG_1X1_BASE64, "base64"));
  }
}

function manifestEntries() {
  try {
    const parsed = JSON.parse(readFileSync(paths.manifest, "utf-8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** 造一个最小模型 project JSON 落在指定方案目录下。 */
function seedProject(schemeDirName, fileName, project) {
  const dir = join(paths.schemeFiles, schemeDirName);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${fileName}.json`), JSON.stringify(project), "utf-8");
}

// ─── readReferencedImageExportPathById ───────────────────

describe("readReferencedImageExportPathById", () => {
  test("命中已登记且文件存在的图 → 返回 data URL", async () => {
    registerImage({ id: "img-1" });
    const result = await readReferencedImageExportPathById(["img-1"], { paths });
    expect(result).toHaveProperty("img-1");
    expect(result["img-1"]).toBe(`data:image/png;base64,${PNG_1X1_BASE64}`);
  });

  test("只内联被点名的图（manifest 里有的其它图不进结果）", async () => {
    registerImage({ id: "img-1" });
    registerImage({ id: "img-2" });
    const result = await readReferencedImageExportPathById(["img-1"], { paths });
    expect(Object.keys(result)).toEqual(["img-1"]);
  });

  test("空 ids 集合直接返回 {}，不读 manifest（早退，可观测为「manifest 坏掉也不报错」）", async () => {
    writeFileSync(paths.manifest, "这不是 JSON", "utf-8");
    for (const ids of [[], null, undefined, "", [""], ["   "], [null], [undefined]]) {
      const result = await readReferencedImageExportPathById(ids, { paths });
      expect(result, JSON.stringify(ids ?? null)).toEqual({});
    }
  });

  test("未登记的 id 静默跳过（结果里没有该键，不是报错）", async () => {
    registerImage({ id: "img-1" });
    const result = await readReferencedImageExportPathById(["不存在"], { paths });
    expect(result).toEqual({});
  });

  test("已登记但文件丢失 → 该键缺席，其余图照常内联（不阻断导出）", async () => {
    registerImage({ id: "img-ok" });
    registerImage({ id: "img-missing", dropFile: true });
    const result = await readReferencedImageExportPathById(["img-ok", "img-missing"], { paths });
    // 关键：一张失败不牵连另一张
    expect(Object.keys(result)).toEqual(["img-ok"]);
  });

  test("ids 两端空白被 trim 后仍能命中", async () => {
    registerImage({ id: "img-1" });
    const result = await readReferencedImageExportPathById(["  img-1  "], { paths });
    expect(Object.keys(result)).toEqual(["img-1"]);
  });

  test("重复 id 只内联一次", async () => {
    registerImage({ id: "img-1" });
    const result = await readReferencedImageExportPathById(["img-1", "img-1"], { paths });
    expect(Object.keys(result)).toEqual(["img-1"]);
  });

  test("mimeType 非 image/* 时不产出 data URL（不把任意文件内联进 SVG）", async () => {
    registerImage({ id: "img-txt", mimeType: "text/plain" });
    const result = await readReferencedImageExportPathById(["img-txt"], { paths });
    expect(result).toEqual({});
  });

  test("filename 为空时不产出（缺登记信息的 manifest 条目被跳过）", async () => {
    writeFileSync(paths.manifest, JSON.stringify([
      { id: "img-1", mimeType: "image/png", filename: "" }
    ]), "utf-8");
    expect(await readReferencedImageExportPathById(["img-1"], { paths })).toEqual({});
  });

  test("★ filename 里的目录成分被压成单段（防跨目录读文件）", async () => {
    // manifest.json 随空间 ZIP 一起进来、内容由提供方控制。四处消费点直接把它
    // join 到图片目录再读/再删，故 readManifest 出口处就压平了。
    // 这里登记 "../../../../etc/passwd"，断言结果读不出该路径（退回图片目录下的同名文件）。
    writeFileSync(paths.manifest, JSON.stringify([{
      id: "img-evil",
      name: "evil.png",
      folderId: "root",
      mimeType: "image/png",
      filename: "../../../../etc/passwd",
      createdAt: new Date(0).toISOString()
    }]), "utf-8");
    // 在「图片目录旁」放一个同名文件，验证读的是被压平后的那一个
    writeFileSync(join(paths.images, "passwd"), Buffer.from(PNG_1X1_BASE64, "base64"));
    const result = await readReferencedImageExportPathById(["img-evil"], { paths });
    expect(Object.keys(result)).toEqual(["img-evil"]);
    expect(result["img-evil"]).toBe(`data:image/png;base64,${PNG_1X1_BASE64}`);
  });

  test("manifest 整体不是数组时按空表处理（不抛错）", async () => {
    for (const payload of [{ a: 1 }, "字符串", 42, null]) {
      writeFileSync(paths.manifest, JSON.stringify(payload), "utf-8");
      const result = await readReferencedImageExportPathById(["img-1"], { paths });
      expect(result, JSON.stringify(payload)).toEqual({});
    }
  });

  test("manifest 文件不存在时返回空对象（数据根刚建、还没上传过图片的情形）", async () => {
    rmSync(paths.manifest, { force: true });
    expect(await readReferencedImageExportPathById(["img-1"], { paths })).toEqual({});
  });
});

// ─── findSchemeProjectRecordByIndex ──────────────────────

describe("findSchemeProjectRecordByIndex", () => {
  const project = (over = {}) => ({
    name: "模型",
    idx: 1,
    nodes: [],
    edges: [],
    ...over
  });

  test("按 idx 命中模型，回 name / schemePath / project / updatedAt", async () => {
    seedProject("方案A", "模型A", project({ name: "模型A", idx: 7 }));
    const found = await findSchemeProjectRecordByIndex({ index: 7, paths });
    expect(found).not.toBeNull();
    expect(found.name).toBe("模型A");
    // schemePath 是**方案目录层级**，不含模型文件名（模型由 name 定位，不由路径定位）
    expect(found.schemePath).toEqual(["方案A"]);
    expect(found.project.idx).toBe(7);
    expect(typeof found.updatedAt).toBe("string");
  });

  test("★ idx 与方案路径解耦：同名模型在别的方案下也能按 idx 找到", async () => {
    // 这是该函数的全部意义（模型改名或移到别的方案后 model_id 不变）
    seedProject("方案A", "重名模型", project({ name: "重名模型", idx: 42 }));
    seedProject("方案B", "重名模型", project({ name: "重名模型", idx: 43 }));
    const found = await findSchemeProjectRecordByIndex({ index: 43, paths });
    expect(found.schemePath).toEqual(["方案B"]);
  });

  test("idx 非安全整数 / ≤0 / 非数值一律 null（不遍历文件系统）", async () => {
    // 种子用 idx: 99 —— 目标若是 1.5 之类被判非法，不该误命中任何模型
    seedProject("方案A", "模型", project({ idx: 99 }));
    for (const index of [0, -1, 1.5, NaN, Infinity, "abc", null, undefined, {}, [1], []]) {
      const found = await findSchemeProjectRecordByIndex({ index, paths });
      expect(found, JSON.stringify(index ?? null)).toBeNull();
    }
  });

  test("★ 单元素数组 [1] 被 Number() 折成 1 而命中（不是非法）", async () => {
    // Number([1]) === 1、Number([]) === 0。判据是 Number.isSafeInteger(Number(v))，
    // 故数组会「意外合法」。记录实测行为：收紧它属行为变更，不该悄悄发生。
    seedProject("方案A", "模型", project({ idx: 1 }));
    expect(await findSchemeProjectRecordByIndex({ index: [1], paths })).not.toBeNull();
    // 空数组折成 0 ⇒ 被 ≤0 拦下
    expect(await findSchemeProjectRecordByIndex({ index: [], paths })).toBeNull();
  });

  test("数字字符串被 Number() 转换后可用（query 参数总是字符串）", async () => {
    seedProject("方案A", "子方案", project({ idx: 5 }));
    const found = await findSchemeProjectRecordByIndex({ index: "5", paths });
    expect(found).not.toBeNull();
    expect(found.project.idx).toBe(5);
  });

  test("找不到时返回 null（不抛错）", async () => {
    seedProject("方案A", "子方案", project({ idx: 1 }));
    expect(await findSchemeProjectRecordByIndex({ index: 999, paths })).toBeNull();
  });

  test("损坏的 JSON 文件被跳过，不阻断同目录其它模型", async () => {
    const dir = join(paths.schemeFiles, "方案A");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "坏文件.json"), "{不是 JSON", "utf-8");
    seedProject("方案A", "好文件", project({ name: "好模型", idx: 8 }));
    const found = await findSchemeProjectRecordByIndex({ index: 8, paths });
    expect(found).not.toBeNull();
    expect(found.name).toBe("好模型");
  });

  test("idx 存成字符串时也能匹配（Number(parsed.idx) === target）", async () => {
    seedProject("方案A", "子方案", project({ name: "字符串序号模型", idx: "12" }));
    const found = await findSchemeProjectRecordByIndex({ index: 12, paths });
    expect(found).not.toBeNull();
    expect(found.name).toBe("字符串序号模型");
  });

  test("scheme.json 是索引文件、不参与 idx 匹配", async () => {
    const dir = join(paths.schemeFiles, "方案A");
    mkdirSync(dir, { recursive: true });
    // isModelJsonFile 显式排除 scheme.json —— 它是方案索引，不是模型
    writeFileSync(join(dir, "scheme.json"), JSON.stringify({ idx: 3 }), "utf-8");
    expect(await findSchemeProjectRecordByIndex({ index: 3, paths })).toBeNull();
  });

  test("非 .json 结尾的文件不参与匹配", async () => {
    const dir = join(paths.schemeFiles, "方案A");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "模型.e"), "whatever", "utf-8");
    writeFileSync(join(dir, "模型.svg"), "<svg/>", "utf-8");
    expect(await findSchemeProjectRecordByIndex({ index: 3, paths })).toBeNull();
  });

  test("同名 .json 派生文件确实算模型（判据只看 .json 后缀，不看中间扩展名）", async () => {
    // 「模型.e.json」以 .json 结尾 ⇒ 被当作模型。这是判据的真实边界，
    // 记下来是为了让日后有人收紧 isModelJsonFile 时知道会影响到这类文件名。
    seedProject("方案A", "模型.e.json", project({ name: "派生名模型", idx: 4 }));
    const found = await findSchemeProjectRecordByIndex({ index: 4, paths });
    expect(found).not.toBeNull();
    expect(found.name).toBe("派生名模型");
  });

  test("深层嵌套的方案目录也能递归找到", async () => {
    seedProject("一级/二级/三级", "深模型", project({ name: "深模型", idx: 21 }));
    const found = await findSchemeProjectRecordByIndex({ index: 21, paths });
    expect(found).not.toBeNull();
    expect(found.schemePath).toEqual(["一级", "二级", "三级"]);
  });

  test("filesRoot 缺省取 paths.schemeFiles，显式给出时改用它", async () => {
    const alt = join(dataDir, "alt-files");
    mkdirSync(join(alt, "方案Z"), { recursive: true });
    writeFileSync(join(alt, "方案Z", "另类模型.json"), JSON.stringify(project({ name: "另类模型", idx: 33 })), "utf-8");
    // 默认根下没有 idx=33
    expect(await findSchemeProjectRecordByIndex({ index: 33, paths })).toBeNull();
    // 显式换根后能找到
    const found = await findSchemeProjectRecordByIndex({ index: 33, paths, filesRoot: alt });
    expect(found).not.toBeNull();
    expect(found.schemePath).toEqual(["方案Z"]);
  });

  test("目录不存在返回 null（ENOENT 当「不存在」，不是报错）", async () => {
    expect(await findSchemeProjectRecordByIndex({ index: 1, paths })).toBeNull();
  });
});
