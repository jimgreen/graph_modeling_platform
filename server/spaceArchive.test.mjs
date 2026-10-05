// 空间 ZIP 打包：范围、元信息、以及最危险的一条 —— default 空间不得越界。
import { expect, test, beforeEach, afterEach } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import AdmZip from "adm-zip";
import { spacePathsFor } from "./spaceStore.mjs";
import {
  buildSpaceArchiveBuffer,
  isMissingPathError,
  listSpaceFiles,
  readSpaceArchiveName,
  SPACE_ARCHIVE_META_FILENAME
} from "./spaceArchive.mjs";

let dataDir;
beforeEach(() => {
  dataDir = mkdtempSync(join(tmpdir(), "space-archive-"));
});
afterEach(() => {
  rmSync(dataDir, { recursive: true, force: true });
});

function writeFileAt(root, relativePath, content) {
  const full = join(root, relativePath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

function entryNames(buffer) {
  return new AdmZip(buffer).getEntries().map((entry) => entry.entryName).sort();
}

function metaOf(buffer, rootName) {
  const entry = new AdmZip(buffer).getEntry(`${rootName}/${SPACE_ARCHIVE_META_FILENAME}`);
  return JSON.parse(entry.getData().toString("utf8"));
}

/** 只按条目名造包：便于钉 readSpaceArchiveName 的「找哪个条目」这一层。 */
function zipWithEntries(entries) {
  const zip = new AdmZip();
  for (const [entryName, body] of entries) {
    zip.addFile(entryName, Buffer.from(body, "utf8"));
  }
  return zip;
}

/**
 * 造一个条目名**逐字节按给定值**落盘的 ZIP —— 绕过 adm-zip 写入时必经的 zipnamefix
 * （它把 \ 归一成 /、去掉前导 /，于是「反斜杠条目名」「前导斜杠条目名」这两类
 * 真实存在的包根本造不出来）。
 * 做法：先用等长 ASCII 占位符落盘，再把整个条目名的字节序列原地替换。
 * 名字在 local file header 与 central directory 各出现一次，替换等长 ⇒ 偏移与数据 CRC 都不受影响
 * （CRC 只覆盖数据，不含文件名）。
 * 末尾断言替换处数恰为 2：多出来的命中只能来自 deflate 压缩流，那时宁可炸掉也不能让它静默污染数据。
 */
function zipWithRawEntryName(rawEntryName, body) {
  const marker = rawEntryName.replace(/[\\/]/g, "~").replace(/^~/, ".");
  // 原名须是纯可打印 ASCII —— 否则替换后的字节长度对不上，偏移就会移位。
  if (!/^[\x20-\x7e]+$/.test(rawEntryName)) {
    throw new Error("原条目名必须是纯 ASCII");
  }
  const zip = new AdmZip();
  zip.addFile(marker, Buffer.from(body, "utf8"));
  const buf = Buffer.from(zip.toBuffer());
  const from = Buffer.from(marker, "utf8");
  const to = Buffer.from(rawEntryName, "utf8");
  if (from.length !== to.length) {
    throw new Error(`占位符与原名等长条件被破坏: ${from.length} vs ${to.length}`);
  }
  let patched = 0;
  let at = buf.indexOf(from);
  while (at !== -1) {
    to.copy(buf, at);
    patched += 1;
    at = buf.indexOf(from, at + from.length);
  }
  if (patched !== 2) {
    throw new Error(`条目名应恰好出现 2 次（local header 与 central directory），实际 ${patched} 次`);
  }
  return new AdmZip(buf);
}

test("打包该空间的子目录，包内路径以空间名打头且字节一致", async () => {
  const paths = spacePathsFor(dataDir, "甲空间");
  writeFileAt(paths.root, "schemes/files/a.json", '{"a":1}');
  writeFileAt(paths.root, "images/x.png", "PNGDATA");
  writeFileAt(paths.root, "icons/i.svg", "<svg/>");

  const { buffer, filename } = await buildSpaceArchiveBuffer({ paths, spaceName: "甲空间" });

  expect(filename).toBe("甲空间.zip");
  const zip = new AdmZip(buffer);
  expect(zip.getEntry("甲空间/schemes/files/a.json").getData().toString("utf8")).toBe('{"a":1}');
  expect(zip.getEntry("甲空间/images/x.png").getData().toString("utf8")).toBe("PNGDATA");
  expect(zip.getEntry("甲空间/icons/i.svg").getData().toString("utf8")).toBe("<svg/>");
});

test("打包不含 schemes/trash 下的内容", async () => {
  const paths = spacePathsFor(dataDir, "甲空间");
  writeFileAt(paths.root, "schemes/files/keep.json", "{}");
  writeFileAt(paths.root, "schemes/trash/2026-01-01/old.json", "{}");

  const { buffer } = await buildSpaceArchiveBuffer({ paths, spaceName: "甲空间" });

  expect(entryNames(buffer)).toContain("甲空间/schemes/files/keep.json");
  expect(entryNames(buffer).some((name) => name.includes("/trash/"))).toBe(false);
});

// 这条是本设计里最容易写错、后果最重的一处：default 空间的 root **就是数据根**，
// 同目录下还有 spaces.json 与其它空间（workspaces/<其它 id>/）。
// 一旦改成按 paths.root 递归，导出 default 就等于打包整台机器的全部空间。
test("default 空间只打包自己的子目录，不越界到 spaces.json 或别的空间", async () => {
  const paths = spacePathsFor(dataDir, "default");
  expect(paths.root).toBe(dataDir);           // 前提：default 的根就是数据根
  writeFileAt(paths.root, "schemes/files/a.json", "{}");
  writeFileAt(dataDir, "spaces.json", '{"spaces":[]}');
  writeFileAt(dataDir, "workspaces/乙空间/schemes/files/b.json", "{}");

  const { buffer } = await buildSpaceArchiveBuffer({ paths, spaceName: "default" });

  const names = entryNames(buffer);
  expect(names).toContain("default/schemes/files/a.json");
  expect(names).not.toContain("default/spaces.json");
  expect(names.some((name) => name.includes("workspaces/"))).toBe(false);
  // 也不含数据根下的其它散落目录
  expect(names.every((name) => name.startsWith("default/"))).toBe(true);
});

test("子目录不存在时正常出包（新空间可能还没有 icons/）", async () => {
  const paths = spacePathsFor(dataDir, "甲空间");
  mkdirSync(paths.root, { recursive: true });

  const { buffer } = await buildSpaceArchiveBuffer({ paths, spaceName: "甲空间" });

  expect(entryNames(buffer)).toEqual([`甲空间/${SPACE_ARCHIVE_META_FILENAME}`]);
});

test("包内元信息可被读回；缺元信息时回退到给定名", async () => {
  const paths = spacePathsFor(dataDir, "甲空间");
  mkdirSync(paths.root, { recursive: true });
  const { buffer } = await buildSpaceArchiveBuffer({ paths, spaceName: "甲空间" });

  expect(readSpaceArchiveName(new AdmZip(buffer), "兜底名")).toBe("甲空间");
  expect(readSpaceArchiveName(new AdmZip(), "兜底名")).toBe("兜底名");

  const broken = new AdmZip();
  broken.addFile(`甲空间/${SPACE_ARCHIVE_META_FILENAME}`, Buffer.from("{ 不是 json"));
  expect(readSpaceArchiveName(broken, "兜底名")).toBe("兜底名");
});

test("listSpaceFiles 返回的是相对路径（不含空间名前缀，且一律用 / 分隔）", async () => {
  const paths = spacePathsFor(dataDir, "甲空间");
  writeFileAt(paths.root, "settings/color-config.json", "{}");

  const files = await listSpaceFiles(paths);

  expect(files).toHaveLength(1);
  expect(files[0].relativePath).toBe("settings/color-config.json");
});

// 这条守卫的是「残缺包」那类最隐蔽的故障：把 EACCES 当成「目录不存在」→
// 静默出一个不含任何模型、却返回成功的「备份包」。
test("只有 ENOENT 算「不存在」；EACCES 等 IO 失败必须上抛", () => {
  expect(isMissingPathError({ code: "ENOENT" })).toBe(true);
  expect(isMissingPathError({ code: "EACCES" })).toBe(false);
  expect(isMissingPathError(new Error("boom"))).toBe(false);
});

// 上面那条只测**纯判断**，钉不住 listSpaceFiles 里的调用点是否真的用了它 ——
// 把调用点改成 `.catch(() => null)`，上面七条全绿而残缺包照样出得来。故这里直接钉调用点：
// 毒化其中一个待打包目录（含 NUL 的路径让 stat 以 ERR_INVALID_ARG_VALUE 拒绝，跨平台、无需造权限错误），
// 断言整次列举 rejects。
test("目录读失败即上抛：listSpaceFiles 的调用点不能把非 ENOENT 当「跳过」", async () => {
  const valid = spacePathsFor(dataDir, "甲空间");
  const brokenDir = `${dataDir}${String.fromCharCode(0)}boom`;

  await expect(listSpaceFiles({ ...valid, schemes: brokenDir })).rejects.toThrow();
});

// ——————————————————————————————————————————————————————————————
// 以下覆盖两个一直只走默认值的入参，以及 readSpaceArchiveName 的回退边界。
// ——————————————————————————————————————————————————————————————

// archiveRootName / exportedAt 是本模块唯二的「调用方可覆盖」入口，却长期无人传过 ——
// 默认值分支被全覆盖过一次，就等于两个参数本身从未被验证。
// ① archiveRootName 同时决定**包内所有条目路径**与**返回的 filename**；
// ② 它必须与 meta.name 分开：空间名是自由文本（含 / 时不可能当单段目录名），而 meta.name 要原样往返。
//    把两者混同（用空间名当目录名，或用净化名当 meta.name）会让「带斜杠的空间名」这一路直接崩。
test("archiveRootName 改包内根目录名与文件名，但不碰 meta 里的原始空间名", async () => {
  const paths = spacePathsFor(dataDir, "含/斜杠的空间");
  writeFileAt(paths.root, "schemes/files/a.json", '{"a":1}');

  const { buffer, filename } = await buildSpaceArchiveBuffer({
    paths,
    spaceName: "含/斜杠的空间",
    archiveRootName: "sanitized_root"
  });

  // 根目录名/文件名改的是 archiveRootName，不是空间名
  expect(filename).toBe("sanitized_root.zip");
  expect(entryNames(buffer)).toEqual([
    "sanitized_root/schemes/files/a.json",
    `sanitized_root/${SPACE_ARCHIVE_META_FILENAME}`
  ]);
  // meta.name 仍须是**原始**空间名（含斜杠原样），否则往返后展示名被悄悄改掉
  expect(metaOf(buffer, "sanitized_root").name).toBe("含/斜杠的空间");
  // 包内没有以原始名开头的条目 —— 少了这条，把 archiveRootName 整个忽略掉的变异会漏网
  expect(entryNames(buffer).some((name) => name.startsWith("含/"))).toBe(false);
  // 按新根名仍能读回原始名（导入端就靠这条取展示名）
  expect(readSpaceArchiveName(new AdmZip(buffer), "兜底名")).toBe("含/斜杠的空间");
});

// exportedAt 只写进 space.json 的 meta 字段；zip 条目自身的 mtime 由 adm-zip 在 addFile 时打，
// 与它无关 —— 顺手钉住这点，免得有人以为时间戳只落在文件名/条目上。
test("exportedAt 原样写进 space.json；不落到包名与条目名上", async () => {
  const paths = spacePathsFor(dataDir, "甲空间");
  writeFileAt(paths.root, "schemes/files/a.json", "{}");
  const stamp = "1999-12-31T23:59:59.999Z";

  const { buffer, filename } = await buildSpaceArchiveBuffer({
    paths,
    spaceName: "甲空间",
    exportedAt: stamp
  });

  expect(filename).toBe("甲空间.zip");
  expect(metaOf(buffer, "甲空间").exportedAt).toBe(stamp);
  expect(entryNames(buffer)).not.toContain(stamp);
  expect(JSON.stringify(metaOf(buffer, "甲空间"))).not.toContain("archiveRootName");
});

// 防误伤：两个参数都不传时行为与既有七条完全一致，且默认时间戳是**可解析**的当前时间。
// 这条对判别力有要求：不能断言等于某个固定时刻（那会偶发红），只能用「可解析 + 落在本次调用窗口内」。
test("不传 archiveRootName 与 exportedAt 时保持默认行为", async () => {
  const paths = spacePathsFor(dataDir, "甲空间");
  writeFileAt(paths.root, "schemes/files/a.json", "{}");

  const before = Date.now();
  const { buffer, filename } = await buildSpaceArchiveBuffer({ paths, spaceName: "甲空间" });
  const after = Date.now();

  // archiveRootName 缺省 = spaceName：条目路径与文件名都按空间名打头
  expect(filename).toBe("甲空间.zip");
  expect(entryNames(buffer)).toEqual([
    "甲空间/schemes/files/a.json",
    `甲空间/${SPACE_ARCHIVE_META_FILENAME}`
  ]);
  // exportedAt 缺省 = 当前时刻的 ISO 串（放宽 1s 吸收文件系统/时钟粒度）
  const meta = metaOf(buffer, "甲空间");
  expect(typeof meta.exportedAt).toBe("string");
  const parsed = Date.parse(meta.exportedAt);
  expect(Number.isNaN(parsed)).toBe(false);
  expect(parsed).toBeGreaterThanOrEqual(before - 1000);
  expect(parsed).toBeLessThanOrEqual(after + 1000);
  // 顺带钉住 formatVersion：归档格式版本是与导入端的对接口径
  expect(meta.formatVersion).toBe(1);
});

// readSpaceArchiveName 的层数边界：只认**恰好两段**（<root>/space.json）。
// 深处（3 段及以上）的同名 space.json 必须被忽略 —— 否则一个子目录里恰好叫 space.json
// 的普通文件会把空间名顶成任意内容。
// 两种插入顺序都钉：find() 取首个匹配，若判据写成「最后一个匹配」或依赖遍历顺序，
// 只有一种顺序能暴露。
test("层数超过两段的同名 space.json 不被当元信息；顶层那个始终胜出", () => {
  const deep = zipWithEntries([
    ["root/nested/space.json", JSON.stringify({ name: "深处的名字" })],
    ["root/space.json", JSON.stringify({ name: "顶层名" })]
  ]);
  expect(readSpaceArchiveName(deep, "兜底名")).toBe("顶层名");

  const deepFirst = zipWithEntries([
    ["root/space.json", JSON.stringify({ name: "顶层名" })],
    ["root/nested/space.json", JSON.stringify({ name: "深处的名字" })]
  ]);
  expect(readSpaceArchiveName(deepFirst, "兜底名")).toBe("顶层名");

  // 只有深处的那个时无元信息可用 → 回退（这才是「忽略」的可观察后果）
  const onlyDeep = zipWithEntries([["root/nested/deeper/space.json", JSON.stringify({ name: "深处的名字" })]]);
  expect(readSpaceArchiveName(onlyDeep, "兜底名")).toBe("兜底名");
  // 3 段恰好命中判据之外的边界：parts[1] 是 space.json 但层数不对，同样必须回退
  const threeSegments = zipWithEntries([["a/b/space.json", JSON.stringify({ name: "三段" })]]);
  expect(readSpaceArchiveName(threeSegments, "兜底名")).toBe("兜底名");
  // 段数判据前的 filter(Boolean)：条目名带前导 / 时空段不算一段，仍是「恰好两段」。
  // 少了 filter(Boolean)，本条会数成三段而回退 —— 那正是把合法包误判成无元信息。
  const leadingSlash = zipWithRawEntryName("/root/space.json", JSON.stringify({ name: "前导斜杠名" }));
  expect(readSpaceArchiveName(leadingSlash, "兜底名")).toBe("前导斜杠名");
  // 段数判据并非与 parts[1] 的比对冗余：这里 parts[1] 恰恰是 space.json，只有「恰好两段」能拒掉它
  // （把 === 2 放宽成 >= 2 就会误认成元信息）。readSpaceArchiveName 处理的是**不可信**压缩包，
  // 一个名为 space.json 的**目录**下的文件不该被当成元信息。
  const spaceJsonDir = zipWithEntries([["X/space.json/Y", JSON.stringify({ name: "父目录名是 space.json" })]]);
  expect(readSpaceArchiveName(spaceJsonDir, "兜底名")).toBe("兜底名");
});

// Windows 工具链写出的 zip 里条目名可能用反斜杠分隔（adm-zip 读档时按字节原样取出，
// 只在**写入**时才归一）。本模块先 replace(/\\/gu, "/") 再切段，故 <root>\space.json 应当被认出来。
// 这条判别力强：把 replace 去掉，下面的反斜杠用例会立刻变成兜底名。
// 注意：光断言「反斜杠被认出来」不够 —— 把 replace 换成「删掉反斜杠」对 <root>\space.json
// 也恰好只余一段、同样回退，那样的变异照样是绿的。故必须同时钉住归一后变三段的那一例。
test("条目名用反斜杠分隔时先归一为正斜杠再判层数", () => {
  const backslash = zipWithRawEntryName("ROOT\\space.json", JSON.stringify({ name: "反斜杠名" }));
  expect(readSpaceArchiveName(backslash, "兜底名")).toBe("反斜杠名");

  // 归一后变成三段 ⇒ 仍不算元信息。这条与上一条相反，把「归一」和「层数判据」两件事分开：
  // 若把 replace 换成「删掉反斜杠」而不是「换成正斜杠」，本条会误判成两段而通过。
  const backslashDeep = zipWithRawEntryName(
    "ROOT\\nested\\space.json",
    JSON.stringify({ name: "反斜杠深处的名字" })
  );
  expect(readSpaceArchiveName(backslashDeep, "兜底名")).toBe("兜底名");
});

// 变异验证记录（以下两条经实测为**冗余**，删掉不会让本文件任何用例转红，故不硬凑断言）：
//  ① `String(item.entryName ?? "")` 的 `?? ""` 兜底 —— adm-zip 的 zipFile 读档时
//     `entry.entryName = inBuffer.slice(...)`，恒为字符串；改成直接用 item.entryName 全绿。
//  ② `if (item.isDirectory) return false` 早退 —— 目录条目名以 / 结尾，切段再 filter(Boolean)
//     后末段为空，`parts[1]` 恒不等于 space.json，早退删掉同样全绿。
// 两条都是「给人看的早退」，不承重。真正承重的是段数判据与 parts[1] 的比对。

// name 字段非字符串 / 纯空白时全部回退到 fallbackName。
// 注意断言方向：这里**所有**回退输入的返回值都等于 fallbackName，
// 因此单看一条无法区分「typeof 守卫」与「trim 后为空」两条分支 —— 故同时给出正例
// （非空字符串照常读出、前后空白被 trim 掉），否则一条 typeof 守卫被删掉也照样全绿。
test("meta 的 name 非字符串或纯空白时回退到 fallbackName", () => {
  const cases = [
    ["数字", 42],
    ["零", 0],
    ["null", null],
    ["对象", { a: 1 }],
    ["数组", ["甲空间"]],
    ["布尔", true],
    ["缺 name 字段", undefined],
    ["纯空格", "   "],
    ["空串", ""],
    ["纯制表与换行", "\t\n\r "]
  ];
  for (const [label, name] of cases) {
    const body = name === undefined
      ? JSON.stringify({ formatVersion: 1 })
      : JSON.stringify({ name });
    // 兜底名逐次不同：断言的是「等于本次传入的那个」，而不是笼统的非空，
    // 否则把 fallbackName 写成硬编码常量也能通过。
    expect(readSpaceArchiveName(zipWithEntries([["root/space.json", body]]), `兜底-${label}`)).toBe(`兜底-${label}`);
  }

  // 正例：合法字符串照常读出，且前后空白被 trim（trim 被删则本条红）
  const ok = zipWithEntries([["root/space.json", JSON.stringify({ name: "  甲空间  " })]]);
  expect(readSpaceArchiveName(ok, "兜底名")).toBe("甲空间");

  // meta 根本不是对象（null / 数组 / 字符串）：可选链要兜住，取不到 name 即回退
  for (const body of ["null", "7", '"甲空间"', "[1,2]", "   "]) {
    expect(readSpaceArchiveName(zipWithEntries([["root/space.json", body]]), "兜底名")).toBe("兜底名");
  }
});
