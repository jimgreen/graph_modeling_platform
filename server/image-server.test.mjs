import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import AdmZip from "adm-zip";
import {
  archiveStaleSchemeFiles,
  buildSvgFile,
  createSchemeArchiveBuffer,
  deleteSchemeProjectRecord,
  deleteSchemeRecordDirectory,
  extractIconLibraryImageEntries,
  importSchemeArchiveBuffer,
  readSchemeProjectRecord,
  readSchemesFromFiles,
  saveSchemeProjectRecord,
  saveSchemeRecordDirectory
} from "./image-server.mjs";

const svgSectionBetween = (svg, start, end) => {
  const startIndex = svg.indexOf(start);
  const endIndex = svg.indexOf(end);
  if (startIndex < 0 || endIndex < 0 || endIndex <= startIndex) {
    return "";
  }
  return svg.slice(startIndex, endIndex);
};

const svgDefsSection = (svg) => svg.match(/<defs[^>]*>[\s\S]*?<\/defs>/)?.[0] ?? "";
const svgUseTags = (svg) => Array.from(svg.matchAll(/<use\b[^>]*>/g), (match) => match[0]);

describe("icon library import", () => {
  test("extracts browser-displayable icons from Office-style archives", () => {
    const zip = new AdmZip();
    zip.addFile("ppt/media/image1.png", Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    zip.addFile("ppt/media/image2.svg", Buffer.from("<svg viewBox=\"0 0 10 10\"><rect width=\"10\" height=\"10\"/></svg>", "utf-8"));
    zip.addFile("ppt/media/vector.emf", Buffer.from("emf", "utf-8"));

    const result = extractIconLibraryImageEntries(zip.toBuffer(), "电力图标.pptx");

    expect(result.entries).toHaveLength(2);
    expect(result.entries.map((entry) => entry.mimeType).sort()).toEqual(["image/png", "image/svg+xml"]);
    expect(result.entries[0].name).toContain("电力图标");
  });

  test("extracts jpeg images with Office .jpeg extension from pptx archives", () => {
    const zip = new AdmZip();
    zip.addFile("ppt/media/image1.jpeg", Buffer.from([0xff, 0xd8, 0xff, 0xd9]));

    const result = extractIconLibraryImageEntries(zip.toBuffer(), "现场照片.pptx");

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      mimeType: "image/jpeg",
      entryName: "ppt/media/image1.jpeg"
    });
  });

  test("converts Office custom geometry icons into saved SVG assets", () => {
    const zip = new AdmZip();
    zip.addFile(
      "ppt/slides/slide1.xml",
      Buffer.from(
        `
        <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:cSld>
            <p:spTree>
              <p:sp>
                <p:spPr>
                  <a:solidFill><a:srgbClr val="1F2937"/></a:solidFill>
                  <a:custGeom>
                    <a:pathLst>
                      <a:path w="100000" h="80000">
                        <a:moveTo><a:pt x="50000" y="0"/></a:moveTo>
                        <a:lnTo><a:pt x="100000" y="80000"/></a:lnTo>
                        <a:lnTo><a:pt x="0" y="80000"/></a:lnTo>
                        <a:close/>
                      </a:path>
                    </a:pathLst>
                  </a:custGeom>
                </p:spPr>
              </p:sp>
            </p:spTree>
          </p:cSld>
        </p:sld>
        `,
        "utf-8"
      )
    );

    const result = extractIconLibraryImageEntries(zip.toBuffer(), "文档图标.pptx");

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].mimeType).toBe("image/svg+xml");
    expect(result.entries[0].name).toContain("矢量图标");
    const svg = result.entries[0].bytes.toString("utf-8");
    expect(svg).toContain("<svg");
    expect(svg).toContain("<path");
    expect(svg).toContain("M 50000 0");
    expect(svg).toContain("#1f2937");
  });
});

describe("scheme file persistence", () => {
  test("reads scheme directories as lightweight project summaries by default", async () => {
    const root = await mkdtemp(join(tmpdir(), "scheme-summary-read-"));
    try {
      const filesRoot = join(root, "files");
      await mkdir(join(filesRoot, "IEEE标准算例"), { recursive: true });
      await writeFile(join(filesRoot, "IEEE标准算例", "IEEE118.json"), "{ this is intentionally not parsed", "utf-8");

      const schemes = await readSchemesFromFiles({ filesRoot });

      expect(schemes).toHaveLength(1);
      expect(schemes[0].name).toBe("IEEE标准算例");
      expect(schemes[0].projects).toHaveLength(1);
      expect(schemes[0].projects[0].name).toBe("IEEE118");
      expect(schemes[0].projects[0].project).toMatchObject({
        name: "IEEE118",
        nodes: [],
        edges: [],
        __summaryOnly: true
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("reads one full project file on demand", async () => {
    const root = await mkdtemp(join(tmpdir(), "scheme-project-read-"));
    try {
      const filesRoot = join(root, "files");
      await mkdir(join(filesRoot, "IEEE标准算例"), { recursive: true });
      await writeFile(
        join(filesRoot, "IEEE标准算例", "IEEE118.json"),
        JSON.stringify({
          version: 1,
          name: "IEEE118",
          nodes: [
            {
              id: "bus-1",
              kind: "ac-bus",
              name: "母线1",
              position: { x: 0, y: 0 },
              size: { width: 120, height: 16 },
              params: {},
              terminals: []
            }
          ],
          edges: []
        }),
        "utf-8"
      );

      const record = await readSchemeProjectRecord({
        filesRoot,
        schemePath: ["IEEE标准算例"],
        name: "IEEE118"
      });

      expect(record?.name).toBe("IEEE118");
      expect(record?.project.nodes).toHaveLength(1);
      expect(record?.project.nodes[0].id).toBe("bus-1");
      expect(record?.project.__summaryOnly).toBeUndefined();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("moves stale scheme files into trash instead of permanently deleting them", async () => {
    const root = await mkdtemp(join(tmpdir(), "scheme-persistence-"));
    try {
      const filesRoot = join(root, "files");
      const trashRoot = join(root, "trash");
      const schemeDir = join(filesRoot, "默认方案");
      const staleFile = join(schemeDir, "qinling.json");
      const keptFile = join(schemeDir, "山西.json");
      await mkdir(schemeDir, { recursive: true });
      await writeFile(staleFile, "{\"name\":\"qinling\"}", "utf-8");
      await writeFile(keptFile, "{\"name\":\"山西\"}", "utf-8");

      await archiveStaleSchemeFiles(
        filesRoot,
        new Set([keptFile]),
        new Set([filesRoot, schemeDir]),
        { trashRoot, archiveId: "test-archive" }
      );

      await expect(readFile(keptFile, "utf-8")).resolves.toContain("山西");
      await expect(readFile(staleFile, "utf-8")).rejects.toThrow();
      await expect(readFile(join(trashRoot, "test-archive", "默认方案", "qinling.json"), "utf-8")).resolves.toContain("qinling");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("saves one project file without rewriting or removing sibling models", async () => {
    const root = await mkdtemp(join(tmpdir(), "scheme-single-project-"));
    try {
      const filesRoot = join(root, "files");
      const trashRoot = join(root, "trash");
      const schemeDir = join(filesRoot, "默认方案");
      const siblingFile = join(schemeDir, "qinling.json");
      const projectFile = join(schemeDir, "山西.json");
      await mkdir(schemeDir, { recursive: true });
      await writeFile(siblingFile, "{\"name\":\"qinling\"}", "utf-8");
      await writeFile(projectFile, "{\"name\":\"old\"}", "utf-8");

      await saveSchemeProjectRecord({
        filesRoot,
        trashRoot,
        schemePath: ["默认方案"],
        record: {
          name: "山西",
          updatedAt: "2026-06-08T12:00:00.000Z",
          project: {
            version: 1,
            name: "山西",
            nodes: [],
            edges: []
          }
        },
        measurementConfig: {}
      });

      await expect(readFile(siblingFile, "utf-8")).resolves.toContain("qinling");
      await expect(readFile(projectFile, "utf-8")).resolves.toContain("山西");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("writes saved project svg image hrefs as root-relative image file paths", async () => {
    const root = await mkdtemp(join(tmpdir(), "scheme-svg-image-paths-"));
    try {
      const filesRoot = join(root, "files");
      const trashRoot = join(root, "trash");
      await saveSchemeProjectRecord({
        filesRoot,
        trashRoot,
        schemePath: ["默认方案"],
        record: {
          name: "图片模型",
          updatedAt: "2026-06-12T00:00:00.000Z",
          project: {
            version: 1,
            name: "图片模型",
            canvasBackgroundImage: "/api/images/canvas-bg",
            nodes: [
              {
                id: "image-node",
                kind: "static-image",
                name: "图片",
                position: { x: 100, y: 80 },
                size: { width: 80, height: 60 },
                params: {
                  backgroundImageAssetId: "node-bg",
                  backgroundImage: "/api/images/node-bg"
                },
                terminals: []
              }
            ],
            edges: []
          }
        },
        measurementConfig: {},
        imagePathById: {
          "canvas-bg": "data/images/canvas-bg.png",
          "node-bg": "data/images/node-bg.jpg"
        }
      });

      const svg = await readFile(join(filesRoot, "默认方案", "图片模型.svg"), "utf-8");
      expect(svg).toContain('href="data/images/canvas-bg.png"');
      expect(svg).toContain('href="data/images/node-bg.jpg"');
      expect(svg).not.toContain('href="/api/images/');
      expect(svg).not.toContain('href="http://');
      expect(svg).not.toContain('href="https://');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("writes saved project svg image href fallbacks without backend api paths", async () => {
    const root = await mkdtemp(join(tmpdir(), "scheme-svg-image-path-fallback-"));
    try {
      const filesRoot = join(root, "files");
      const trashRoot = join(root, "trash");
      await saveSchemeProjectRecord({
        filesRoot,
        trashRoot,
        schemePath: ["默认方案"],
        record: {
          name: "缺失图片清单",
          updatedAt: "2026-06-12T00:00:00.000Z",
          project: {
            version: 1,
            name: "缺失图片清单",
            canvasBackgroundImage: "/api/images/missing-bg?id=1",
            nodes: [],
            edges: []
          }
        },
        measurementConfig: {},
        imagePathById: {}
      });

      const svg = await readFile(join(filesRoot, "默认方案", "缺失图片清单.svg"), "utf-8");
      // 当 imagePathById 为空时，保留原始 API 路径（不转换为 data/images/）
      expect(svg).toContain('href="/api/images/missing-bg?id=1"');
      expect(svg).not.toContain('href="data/images/');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("writes saved project svg image fit modes", async () => {
    const root = await mkdtemp(join(tmpdir(), "scheme-svg-image-fit-"));
    try {
      const filesRoot = join(root, "files");
      const trashRoot = join(root, "trash");
      await saveSchemeProjectRecord({
        filesRoot,
        trashRoot,
        schemePath: ["默认方案"],
        record: {
          name: "图片显示方式",
          updatedAt: "2026-07-05T00:00:00.000Z",
          project: {
            version: 1,
            name: "图片显示方式",
            canvasBackgroundImage: "canvas-bg.png",
            canvasBackgroundImageFit: "stretch",
            nodes: [
              {
                id: "image-node",
                kind: "static-image",
                name: "图片",
                position: { x: 100, y: 80 },
                size: { width: 80, height: 60 },
                params: {
                  backgroundImage: "node-bg.png",
                  backgroundImageFit: "tile"
                },
                terminals: []
              }
            ],
            edges: []
          }
        },
        measurementConfig: {}
      });

      const svg = await readFile(join(filesRoot, "默认方案", "图片显示方式.svg"), "utf-8");
      expect(svg).toContain('class="export-canvas-background-image"');
      expect(svg).toContain('preserveAspectRatio="none"');
      expect(svg).toContain("<pattern");
      expect(svg).toContain('class="node-background-image"');
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("deduplicates server SVG device state symbols and references active state", () => {
    const svg = buildSvgFile(
      {
        version: 1,
        name: "服务端状态SVG",
        canvasWidth: 360,
        canvasHeight: 220,
        nodes: [
          {
            id: "switch-open",
            kind: "ac-switch",
            name: "开关开",
            position: { x: 120, y: 100 },
            size: { width: 80, height: 60 },
            params: { status: "0" },
            terminals: []
          },
          {
            id: "switch-closed",
            kind: "ac-switch",
            name: "开关闭",
            position: { x: 240, y: 100 },
            size: { width: 80, height: 60 },
            params: { status: "1" },
            terminals: []
          }
        ],
        edges: []
      },
      { measurementTypes: [], deviceProfiles: [] }
    );
    const defs = svgDefsSection(svg);
    const useTags = svgUseTags(svg);

    expect(defs).toContain('<symbol id="symbol_ACSwitch_ac-switch_state_0"');
    expect(defs).toContain('<symbol id="symbol_ACSwitch_ac-switch_state_1"');
    expect(defs.match(/<symbol id="symbol_ACSwitch_ac-switch_state_/g)).toHaveLength(2);
    expect(defs).not.toContain("switch-open");
    expect(defs).not.toContain("switch-closed");
    expect(useTags).toHaveLength(2);
    expect(useTags[0]).toContain('href="#symbol_ACSwitch_ac-switch_state_0"');
    expect(useTags[1]).toContain('href="#symbol_ACSwitch_ac-switch_state_1"');
    for (const useTag of useTags) {
      expect(useTag).not.toContain("xlink:href");
      expect(useTag).not.toContain("data-export-node-id");
      expect(useTag).not.toContain("dev-id=");
    }
  });

  test("writes device labels to Text_Layer and measurements to Measurement_Layer instead of defs", () => {
    const svg = buildSvgFile(
      {
        version: 1,
        name: "SVG分层",
        canvasWidth: 320,
        canvasHeight: 220,
        nodes: [
          {
            id: "server-load",
            kind: "ac-load",
            name: "负荷A",
            position: { x: 140, y: 100 },
            size: { width: 80, height: 60 },
            params: {
              idx: "LOAD-1",
              _labelText: "LOAD-1",
              _labelX: "10",
              _labelY: "64"
            },
            terminals: []
          },
          {
            id: "server-load-copy",
            kind: "ac-load",
            name: "负荷B",
            position: { x: 220, y: 100 },
            size: { width: 80, height: 60 },
            params: {
              idx: "LOAD-2"
            },
            terminals: []
          },
          {
            id: "server-source",
            kind: "ac-source",
            name: "电源A",
            position: { x: 60, y: 100 },
            size: { width: 80, height: 60 },
            params: {
              idx: "SRC-1"
            },
            terminals: []
          }
        ],
        edges: [
          {
            id: "server-edge",
            sourceId: "server-source",
            targetId: "server-load"
          }
        ],
        measurements: {
          version: 1,
          groups: [
            {
              id: "server-group",
              nodeId: "server-load",
              visible: true,
              labelVisible: true,
              unitVisible: true,
              anchor: "custom",
              offset: { x: 40, y: -30 },
              layout: "vertical",
              items: [
                {
                  id: "server-m",
                  name: "P主",
                  measurementTypeId: "activePower",
                  sourcePoint: "server-load.activePower",
                  visible: true,
                  unitOverride: "kW"
                }
              ]
            }
          ]
        }
      },
      { measurementTypes: [], deviceProfiles: [] }
    );
    const defs = svgDefsSection(svg);
    const textLayer = svgSectionBetween(svg, '<g id="Text_Layer">', '<g id="Measurement_Layer">');
    const measurementLayer = svgSectionBetween(svg, '<g id="Measurement_Layer">', '<g id="Other_Layer">');
    const useTags = svgUseTags(svg);

    expect(defs).not.toContain("export-node-label");
    expect(defs).not.toContain("LOAD-1");
    expect(defs).not.toContain("export-measurement-group");
    expect(defs).not.toContain("P主");
    expect(defs.match(/<symbol id="symbol_ACLoad_ac-load_default/g)).toHaveLength(1);
    expect(textLayer).toContain('class="export-node-label-layer"');
    expect(textLayer).toContain('node-id="server-load"');
    expect(textLayer).toContain('dev-id="server-load"');
    expect(textLayer).toContain('dev-idx="LOAD-1"');
    expect(textLayer).toContain('dev-name="负荷A"');
    expect(textLayer).toContain('transform="translate(140 100)"');
    expect(textLayer).toContain('class="export-node-label horizontal" transform="translate(10 64)"');
    expect(textLayer).toContain(">LOAD-1</text>");
    expect(measurementLayer).toContain('class="export-measurement-group measurement-group"');
    expect(measurementLayer).toContain('m-name="P主"');
    expect(measurementLayer).toContain('m-field="server-load.activePower"');
    expect(measurementLayer).toContain('m-type="activePower"');
    expect(measurementLayer).toContain('m-value="1"');
    expect(measurementLayer).toContain('dev-id="server-load"');
    expect(measurementLayer).toContain('dev-idx="LOAD-1"');
    expect(measurementLayer).toContain('dev-name="负荷A"');
    expect(measurementLayer).not.toContain("data-export-measurement-");
    expect(svg).toContain('source-dev-id="server-source"');
    expect(svg).toContain('target-dev-id="server-load"');
    expect(useTags).toHaveLength(3);
    for (const useTag of useTags) {
      expect(useTag).not.toContain("xlink:href");
      expect(useTag).not.toContain("data-export-node-id");
      expect(useTag).not.toContain("dev-id=");
      expect(useTag).not.toContain("dev-idx=");
      expect(useTag).not.toContain("dev-name=");
      expect(useTag).not.toContain("dev-kind=");
    }
    expect(svg).not.toContain("data-export-device-id");
    expect(svg).not.toContain("data-export-device-idx");
    expect(svg).not.toContain("data-export-device-name");
    expect(svg).not.toContain("data-export-device-kind");
  });

  test("deletes one project by archiving only that model's files", async () => {
    const root = await mkdtemp(join(tmpdir(), "scheme-delete-project-"));
    try {
      const filesRoot = join(root, "files");
      const trashRoot = join(root, "trash");
      const schemeDir = join(filesRoot, "默认方案");
      const siblingFile = join(schemeDir, "qinling.json");
      const projectFile = join(schemeDir, "山西.json");
      await mkdir(schemeDir, { recursive: true });
      await writeFile(siblingFile, "{\"name\":\"qinling\"}", "utf-8");
      await writeFile(projectFile, "{\"name\":\"山西\"}", "utf-8");

      await deleteSchemeProjectRecord({
        filesRoot,
        trashRoot,
        schemePath: ["默认方案"],
        name: "山西",
        archiveId: "delete-project"
      });

      await expect(readFile(siblingFile, "utf-8")).resolves.toContain("qinling");
      await expect(readFile(projectFile, "utf-8")).rejects.toThrow();
      await expect(readFile(join(trashRoot, "delete-project", "默认方案", "山西.json"), "utf-8")).resolves.toContain("山西");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("renames one scheme directory without rewriting sibling schemes", async () => {
    const root = await mkdtemp(join(tmpdir(), "scheme-rename-"));
    try {
      const filesRoot = join(root, "files");
      const oldSchemeDir = join(filesRoot, "旧方案");
      const siblingDir = join(filesRoot, "默认方案");
      await mkdir(oldSchemeDir, { recursive: true });
      await mkdir(siblingDir, { recursive: true });
      await writeFile(join(oldSchemeDir, "qinling.json"), "{\"name\":\"qinling\"}", "utf-8");
      await writeFile(join(siblingDir, "山西.json"), "{\"name\":\"山西\"}", "utf-8");

      await saveSchemeRecordDirectory({
        filesRoot,
        schemePath: ["新方案"],
        previousSchemePath: ["旧方案"]
      });

      await expect(readFile(join(filesRoot, "新方案", "qinling.json"), "utf-8")).resolves.toContain("qinling");
      await expect(readFile(join(siblingDir, "山西.json"), "utf-8")).resolves.toContain("山西");
      await expect(readFile(join(oldSchemeDir, "qinling.json"), "utf-8")).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("deletes one scheme directory by archiving only that scheme", async () => {
    const root = await mkdtemp(join(tmpdir(), "scheme-delete-"));
    try {
      const filesRoot = join(root, "files");
      const trashRoot = join(root, "trash");
      await mkdir(join(filesRoot, "默认方案"), { recursive: true });
      await mkdir(join(filesRoot, "待删方案"), { recursive: true });
      await writeFile(join(filesRoot, "默认方案", "山西.json"), "{\"name\":\"山西\"}", "utf-8");
      await writeFile(join(filesRoot, "待删方案", "qinling.json"), "{\"name\":\"qinling\"}", "utf-8");

      await deleteSchemeRecordDirectory({
        filesRoot,
        trashRoot,
        schemePath: ["待删方案"],
        archiveId: "delete-scheme"
      });

      await expect(readFile(join(filesRoot, "默认方案", "山西.json"), "utf-8")).resolves.toContain("山西");
      await expect(readFile(join(filesRoot, "待删方案", "qinling.json"), "utf-8")).rejects.toThrow();
      await expect(readFile(join(trashRoot, "delete-scheme", "待删方案", "qinling.json"), "utf-8")).resolves.toContain("qinling");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("exports one scheme directory as a zip while preserving child scheme folders", async () => {
    const root = await mkdtemp(join(tmpdir(), "scheme-export-zip-"));
    try {
      const filesRoot = join(root, "files");
      await mkdir(join(filesRoot, "默认方案", "1-1"), { recursive: true });
      await writeFile(join(filesRoot, "默认方案", "电压等级.json"), "{\"name\":\"电压等级\"}", "utf-8");
      await writeFile(join(filesRoot, "默认方案", "1-1", "1-1-1.json"), "{\"name\":\"1-1-1\"}", "utf-8");

      const { buffer, filename } = await createSchemeArchiveBuffer({
        filesRoot,
        schemePath: ["默认方案"]
      });
      const zip = new AdmZip(buffer);
      const entryNames = zip.getEntries().map((entry) => entry.entryName.replace(/\\/gu, "/"));

      expect(filename).toBe("默认方案.zip");
      expect(entryNames).toContain("默认方案/电压等级.json");
      expect(entryNames).toContain("默认方案/1-1/1-1-1.json");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("imports a scheme zip as a directory tree and requires overwrite on duplicate folders", async () => {
    const root = await mkdtemp(join(tmpdir(), "scheme-import-zip-"));
    try {
      const filesRoot = join(root, "files");
      const trashRoot = join(root, "trash");
      const zip = new AdmZip();
      zip.addFile("默认方案/线路.json", Buffer.from("{\"name\":\"线路\"}", "utf-8"));
      zip.addFile("默认方案/1-1/1-1-1.json", Buffer.from("{\"name\":\"1-1-1\"}", "utf-8"));

      const imported = await importSchemeArchiveBuffer({
        filesRoot,
        trashRoot,
        buffer: zip.toBuffer(),
        fileName: "默认方案.zip"
      });

      expect(imported.conflict).toBe(false);
      await expect(readFile(join(filesRoot, "默认方案", "线路.json"), "utf-8")).resolves.toContain("线路");
      await expect(readFile(join(filesRoot, "默认方案", "1-1", "1-1-1.json"), "utf-8")).resolves.toContain("1-1-1");

      const conflict = await importSchemeArchiveBuffer({
        filesRoot,
        trashRoot,
        buffer: zip.toBuffer(),
        fileName: "默认方案.zip"
      });
      expect(conflict).toMatchObject({ conflict: true, duplicateSchemeName: "默认方案" });

      const overwriteZip = new AdmZip();
      overwriteZip.addFile("默认方案/速度.json", Buffer.from("{\"name\":\"速度\"}", "utf-8"));
      await importSchemeArchiveBuffer({
        filesRoot,
        trashRoot,
        buffer: overwriteZip.toBuffer(),
        fileName: "默认方案.zip",
        mode: "overwrite"
      });

      await expect(readFile(join(filesRoot, "默认方案", "速度.json"), "utf-8")).resolves.toContain("速度");
      await expect(readFile(join(filesRoot, "默认方案", "线路.json"), "utf-8")).rejects.toThrow();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
