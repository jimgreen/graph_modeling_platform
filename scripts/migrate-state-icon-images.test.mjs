// scripts/migrate-state-icon-images.mjs 直测 —— 此前零直测。
//
// ## 为什么值得测
//
// 脚本会**改写用户的设备库**（library.json 里的内嵌 base64 位图换成 /webgrp/images 引用），
// 并往图片目录写文件、往 manifest.json 追加条目。三条纪律此前只在注释里：
//   1. 默认 dry-run，一个字节都不写；
//   2. 缺 library.json 直接 exit 1，而不是「无事可做」；
//   3. `--apply` 前先备份 .bak，且重复运行幂等（内容哈希决定 id）。
//
// ## 为什么安全
//
// 脚本按 `process.cwd()` 定位 `data/`，所以测试一律用 `cwd: tmpdir` 启动 ——
// 仓库的真实 data/ 不会被读到或写到。样本 library.json 在 tmpdir 里现造。
import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("./migrate-state-icon-images.mjs", import.meta.url));

// 1×1 透明 PNG
const PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
const PNG_DATA_URL = `data:image/png;base64,${PNG_B64}`;
// 另一个内容不同的位图（只有 PNG 魔数，够脚本算哈希用）
const PNG2_DATA_URL = "data:image/png;base64,iVBORw0KGgo=";

let workDir;
let libraryPath;
let imageDir;

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "migrate-state-icons-"));
  imageDir = join(workDir, "data", "images");
  libraryPath = join(workDir, "data", "device-library", "library.json");
  mkdirSync(join(workDir, "data", "device-library"), { recursive: true });
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

/** 写一份含内嵌位图的设备库，返回原始文本（用于事后比对未被改动）。 */
function seedLibrary(library) {
  const raw = JSON.stringify(library, null, 2);
  writeFileSync(libraryPath, raw, "utf-8");
  return raw;
}

/** 跑脚本，cwd 指向 tmpdir 沙箱。 */
function run(args = []) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args], { cwd: workDir, encoding: "utf-8" });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

const sampleLibrary = () => ({
  customDeviceTemplates: [
    {
      kind: "custom-icon-a",
      stateDefinitions: [
        { name: "正常", icon: PNG_DATA_URL },
        { name: "告警", image: PNG_DATA_URL }
      ]
    }
  ]
});

describe("migrate-state-icon-images —— 默认 dry-run", () => {
  test("★ library.json 一个字节都没变，且没有备份 / 没有图片文件", () => {
    const before = seedLibrary(sampleLibrary());
    const { status, stdout } = run();

    expect(status).toBe(0);
    expect(readFileSync(libraryPath, "utf-8")).toBe(before);
    // 没建图片目录（dry-run 阶段不会 mkdir）
    expect(existsSync(imageDir)).toBe(false);
    expect(readdirSync(join(workDir, "data", "device-library"))).toEqual(["library.json"]);
  });

  test("自报 DRY-RUN 并明示未写入任何文件", () => {
    seedLibrary(sampleLibrary());
    const { status, stdout } = run();

    expect(status).toBe(0);
    expect(stdout).toContain("(DRY-RUN)");
    expect(stdout).toContain("DRY-RUN:未写入任何文件");
  });

  test("报告命中数与体积变化，且体积确实变小", () => {
    seedLibrary(sampleLibrary());
    const { status, stdout } = run();

    expect(status).toBe(0);
    // 两个字段引用同一张图：命中 2 次、去重后唯一 1 张
    expect(stdout).toContain("内嵌位图字段命中: 2");
    expect(stdout).toContain("去重后唯一位图: 1");
    expect(stdout).toContain("改写的图片字段: 2");
    expect(stdout).toMatch(/\d+\.\d% 减少/u);
  });

  test("纯 SVG data URL 里的位图 href 也能命中（不是只有裸位图字段）", () => {
    const svg = `data:image/svg+xml;utf8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg"><image href="${PNG_DATA_URL}"/></svg>`
    )}`;
    seedLibrary({ customDeviceTemplates: [{ kind: "custom-svg", stateDefinitions: [{ name: "正常", icon: svg }] }] });
    const { status, stdout } = run();

    expect(status).toBe(0);
    expect(stdout).toContain("内嵌位图字段命中: 1");
    expect(stdout).toContain("改写的图片字段: 1");
  });

  test("不含位图的库照跑不误（命中数为 0，不写不改）", () => {
    const before = seedLibrary({ customDeviceTemplates: [{ kind: "plain", stateDefinitions: [{ name: "正常", icon: "data:image/svg+xml;utf8,%3Csvg%2F%3E" }] }] });
    const { status, stdout } = run();

    expect(status).toBe(0);
    expect(stdout).toContain("内嵌位图字段命中: 0");
    expect(readFileSync(libraryPath, "utf-8")).toBe(before);
  });

  test("★ 缺 library.json → exit 1（不是「无事可做」静默通过）", () => {
    // beforeEach 只建目录、不写文件，所以这里文件本就不存在
    expect(existsSync(libraryPath)).toBe(false);
    const { status, stdout, stderr } = run();

    expect(status).toBe(1);
    expect(stderr).toContain("找不到 library.json");
    expect(stdout).not.toContain("DRY-RUN");
  });

  test("library.json 存在但不是合法 JSON → exit 1（不吞解析错误）", () => {
    writeFileSync(libraryPath, "{ 这不是 JSON", "utf-8");
    const { status } = run();

    expect(status).not.toBe(0);
  });
});
// ─── --apply ─────────────────────────────────────────────

describe("migrate-state-icon-images —— --apply", () => {
  const readLibrary = () => JSON.parse(readFileSync(libraryPath, "utf-8"));
  const iconPaths = (library) =>
    library.customDeviceTemplates[0].stateDefinitions.map((s) => s.icon ?? s.image);
  // 图片目录里还有 manifest.json 与它的 .bak，只取位图文件
  const imageFiles = () =>
    (existsSync(imageDir) ? readdirSync(imageDir) : []).filter((name) => name.endsWith(".png"));

  test("★ 位图字段被换成 /webgrp/images 引用，图片文件按 id 落盘", () => {
    seedLibrary(sampleLibrary());
    const { status } = run(["--apply"]);

    expect(status).toBe(0);
    const paths = iconPaths(readLibrary());
    // 两处引用同一张图 ⇒ 同一个 id
    expect(paths[0]).toMatch(/^\/webgrp\/images\/img-mig-[0-9a-f]{16}$/u);
    expect(paths[1]).toBe(paths[0]);

    expect(imageFiles()).toEqual([`${paths[0].split("/").pop()}.png`]);
    // 文件内容就是原始位图字节
    const written = readFileSync(join(imageDir, imageFiles()[0]));
    expect(written.equals(Buffer.from(PNG_B64, "base64"))).toBe(true);
  });

  test("★ 内容哈希去重：两张不同的图各存一份，同图多处引用只存一份", () => {
    seedLibrary({
      customDeviceTemplates: [
        {
          kind: "custom-icon-a",
          stateDefinitions: [
            { name: "正常", icon: PNG_DATA_URL },
            { name: "告警", icon: PNG_DATA_URL },
            { name: "其他", icon: PNG2_DATA_URL }
          ]
        }
      ]
    });
    const { status, stdout } = run(["--apply"]);

    expect(status).toBe(0);
    expect(stdout).toContain("内嵌位图字段命中: 3");
    expect(stdout).toContain("去重后唯一位图: 2");
    expect(stdout).toContain("去重合并: 1");
    expect(imageFiles().length).toBe(2);
  });

  test("manifest.json 被创建并追加条目（id / filename / size / mimeType）", () => {
    seedLibrary(sampleLibrary());
    run(["--apply"]);

    const manifest = JSON.parse(readFileSync(join(imageDir, "manifest.json"), "utf-8"));
    expect(manifest.length).toBe(1);
    const [item] = manifest;
    expect(item.id).toMatch(/^img-mig-[0-9a-f]{16}$/u);
    expect(item.filename).toBe(`${item.id}.png`);
    expect(item.mimeType).toBe("image/png");
    expect(item.size).toBe(Buffer.from(PNG_B64, "base64").length);
  });

  test("★ 覆盖前先备份 .bak，备份内容等于原库", () => {
    const before = seedLibrary(sampleLibrary());
    const { status, stdout } = run(["--apply"]);

    expect(status).toBe(0);
    expect(stdout).toContain("备份后缀");
    const backups = readdirSync(join(workDir, "data", "device-library")).filter((n) => n.endsWith(".bak"));
    expect(backups.length).toBe(1);
    expect(backups[0]).toMatch(/^library\.json\.\d{4}-\d{2}-\d{2}T[\d-]+Z\.bak$/u);
    expect(readFileSync(join(workDir, "data", "device-library", backups[0]), "utf-8")).toBe(before);
  });

  test("★ 幂等：第二次 --apply 不再改库、不再新增图片与 manifest 条目", () => {
    seedLibrary(sampleLibrary());
    run(["--apply"]);
    const libraryAfterFirst = readFileSync(libraryPath, "utf-8");
    const manifestAfterFirst = readFileSync(join(imageDir, "manifest.json"), "utf-8");
    const imagesAfterFirst = imageFiles().slice();

    const { status, stdout } = run(["--apply"]);

    expect(status).toBe(0);
    expect(stdout).toContain("(APPLY)");
    expect(stdout).toContain("内嵌位图字段命中: 0");
    expect(stdout).toContain("新增图片文件: 0");
    expect(readFileSync(libraryPath, "utf-8")).toBe(libraryAfterFirst);
    expect(readFileSync(join(imageDir, "manifest.json"), "utf-8")).toBe(manifestAfterFirst);
    expect(imageFiles()).toEqual(imagesAfterFirst);
  });

  test("已存在的 manifest 条目不会被重复追加（另一个模板引用同一张图）", () => {
    seedLibrary(sampleLibrary());
    run(["--apply"]);
    seedLibrary({
      customDeviceTemplates: [{ kind: "custom-icon-b", stateDefinitions: [{ name: "正常", icon: PNG_DATA_URL }] }]
    });

    run(["--apply"]);
    const manifest = JSON.parse(readFileSync(join(imageDir, "manifest.json"), "utf-8"));
    // 同一张图 ⇒ 同一个 id ⇒ 仍是 1 条
    expect(manifest.length).toBe(1);
    expect(imageFiles().length).toBe(1);
  });
});
