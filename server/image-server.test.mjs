import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, test } from "vitest";
import AdmZip from "adm-zip";
import { apiPath } from "./config.mjs";
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

const eSectionLines = (text, section) => {
  const match = new RegExp(`<${section}>\\n([\\s\\S]*?)\\n<\\/${section}>`, "u").exec(text);
  return match ? match[1].split("\n") : [];
};

const eVisualWidth = (value) =>
  Array.from(String(value ?? "")).reduce((width, char) => width + (/[^\u0000-\u00ff]/u.test(char) ? 5 / 3 : 1), 0);

const sequentialTokenStartColumns = (line, tokens) => {
  let cursor = 0;
  return tokens.map((token) => {
    const index = line.indexOf(token, cursor);
    expect(index, `Cannot find "${token}" in "${line}" after ${cursor}`).toBeGreaterThanOrEqual(0);
    cursor = index + String(token).length;
    return eVisualWidth(line.slice(0, index));
  });
};

const expectEFieldsAlignedWithHeader = (text, section, columns, rowValues) => {
  const lines = eSectionLines(text, section);
  const header = lines.find((line) => line.startsWith("@"));
  const row = lines.find((line) => line.startsWith("#") && rowValues.every((value) => line.includes(String(value))));
  expect(header).toBeTruthy();
  expect(row).toBeTruthy();
  const headerColumns = sequentialTokenStartColumns(header, columns);
  const rowColumns = sequentialTokenStartColumns(row, rowValues);
  expect(rowColumns).toHaveLength(headerColumns.length);
  rowColumns.forEach((column, index) => expect(column).toBeCloseTo(headerColumns[index], 0));
};

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

  test("writes saved project E files as field-aligned sections", async () => {
    const root = await mkdtemp(join(tmpdir(), "scheme-e-field-aligned-"));
    try {
      const filesRoot = join(root, "files");
      const trashRoot = join(root, "trash");
      await saveSchemeProjectRecord({
        filesRoot,
        trashRoot,
        schemePath: ["默认方案", "子方案"],
        record: {
          name: "新模型",
          updatedAt: "2026-07-11T00:00:00.000Z",
          project: {
            version: 1,
            name: "新模型",
            powerBaseValue: 100,
            voltageUnit: "kV",
            powerUnit: "MW",
            currentUnit: "A",
            nodes: [
              {
                id: "bus-1",
                kind: "ac-bus",
                name: "交流母线-1",
                position: { x: 0, y: 0 },
                size: { width: 120, height: 8 },
                params: { idx: "1", vbase: "110", voltage: "110", run_stat: "1" },
                terminals: [{ id: "t1", type: "ac", vbase: "110" }]
              },
              {
                id: "bus-2",
                kind: "ac-bus",
                name: "交流母线-2",
                position: { x: 280, y: 0 },
                size: { width: 120, height: 8 },
                params: { idx: "2", vbase: "110", voltage: "110", run_stat: "1" },
                terminals: [{ id: "t1", type: "ac", vbase: "110" }]
              },
              {
                id: "line-1",
                kind: "ac-line",
                name: "交流线路（自适应）-1",
                position: { x: 120, y: 80 },
                size: { width: 160, height: 40 },
                params: { idx: "1", r: "0.1", x: "1.0", b: "0.0", run_stat: "1" },
                terminals: [
                  { id: "i", type: "ac" },
                  { id: "j", type: "ac" }
                ]
              },
              {
                id: "break-1",
                kind: "ac-box-breaker",
                name: "盒型开关-1",
                position: { x: 60, y: 80 },
                size: { width: 80, height: 40 },
                params: { idx: "1", status: "1", run_stat: "1" },
                terminals: [
                  { id: "i", type: "ac" },
                  { id: "j", type: "ac" }
                ]
              }
            ],
            edges: [
              { id: "e-bus1-break", sourceId: "bus-1", sourceTerminalId: "t1", targetId: "break-1", targetTerminalId: "i" },
              { id: "e-break-line", sourceId: "break-1", sourceTerminalId: "j", targetId: "line-1", targetTerminalId: "i" },
              { id: "e-line-bus2", sourceId: "line-1", sourceTerminalId: "j", targetId: "bus-2", targetTerminalId: "t1" }
            ]
          }
        },
        measurementConfig: {}
      });

      const eFile = await readFile(join(filesRoot, "默认方案", "子方案", "新模型.e"), "utf-8");

      expect(eFile).toContain("<Model>\n");
      expect(eFile).not.toContain("<PowerBase>\n");
      expectEFieldsAlignedWithHeader(
        eFile,
        "Model",
        ["path", "name", "p_base", "u_unit", "p_unit", "i_unit"],
        ["默认方案/子方案", "新模型", "100", "kV", "MW", "A"]
      );
      expect(eFile).toContain("<ACNode>\n");
      const acNodeLines = eSectionLines(eFile, "ACNode");
      expect(acNodeLines.find((line) => line.startsWith("@"))?.trim().split(/\s+/u).slice(1)).toEqual([
        "idx",
        "name",
        "vbase",
        "run_stat"
      ]);
      expect(acNodeLines.find((line) => line.startsWith("#"))?.trim().split(/\s+/u).slice(1)).toEqual([
        "1",
        "交流母线-1",
        "110",
        "1"
      ]);
      expectEFieldsAlignedWithHeader(eFile, "ACNode", ["idx", "name", "vbase", "run_stat"], ["1", "交流母线-1", "110", "1"]);
      expect(eFile).toContain("<ACBranch>\n");
      expect(eFile).toContain("@    idx    name                 i_node    j_node    r      x      b      run_stat\n");
      expect(eFile).toContain("#    1      交流线路（自适应）-1    3         2         0.1    1.0    0.0    1\n");
      expect(eFile).toContain("<ACBreak>\n");
      expect(eFile).toContain("@    idx    name         i_node    j_node    status    run_stat\n");
      expect(eFile).toContain("#    1      盒型开关-1    1         3         1         1\n");
      expect(eFile.trimEnd()).toContain("</ACBreak>");
      expect(eFile).not.toContain('"modelParameters"');
      expect(eFile).not.toContain('"devices"');
      expectEFieldsAlignedWithHeader(
        eFile,
        "ACBranch",
        ["idx", "name", "i_node", "j_node", "r", "x", "b", "run_stat"],
        ["1", "交流线路（自适应）-1", "3", "2", "0.1", "1.0", "0.0", "1"]
      );
      expectEFieldsAlignedWithHeader(
        eFile,
        "ACBreak",
        ["idx", "name", "i_node", "j_node", "status", "run_stat"],
        ["1", "盒型开关-1", "1", "3", "1", "1"]
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("applies persisted parameter export controls to backend-generated E files", async () => {
    const root = await mkdtemp(join(tmpdir(), "scheme-e-export-controls-"));
    try {
      const filesRoot = join(root, "files");
      const trashRoot = join(root, "trash");
      const parameterDefinitions = [
        { cnName: "电阻", enName: "r", valueType: "float", typicalValue: "0.1", exportEnabled: false, exportName: "r" },
        { cnName: "电抗", enName: "x", valueType: "float", typicalValue: "1.2", exportEnabled: true, exportName: "reactance" }
      ];
      await saveSchemeProjectRecord({
        filesRoot,
        trashRoot,
        schemePath: ["默认方案"],
        record: {
          name: "参数导出控制",
          updatedAt: "2026-07-12T00:00:00.000Z",
          project: {
            version: 1,
            name: "参数导出控制",
            nodes: [
              {
                id: "line-1",
                kind: "ac-line",
                name: "交流线路-1",
                position: { x: 100, y: 100 },
                size: { width: 160, height: 40 },
                params: {
                  idx: "1",
                  r: "0.1",
                  x: "1.2",
                  b: "0",
                  run_stat: "1",
                  _customParamDefinitions: JSON.stringify(parameterDefinitions)
                },
                terminals: [
                  { id: "i", type: "ac" },
                  { id: "j", type: "ac" }
                ]
              }
            ],
            edges: []
          }
        },
        measurementConfig: {}
      });

      const eFile = await readFile(join(filesRoot, "默认方案", "参数导出控制.e"), "utf-8");
      const lines = eSectionLines(eFile, "ACBranch");
      const columns = lines.find((line) => line.startsWith("@"))?.trim().split(/\s+/u).slice(1) ?? [];

      expect(columns).toContain("reactance");
      expect(columns).not.toContain("r");
      expect(columns).not.toContain("x");
      expect(eFile).toContain("1.2");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("writes three-winding transformers as independent E devices with three-side parameters", async () => {
    const root = await mkdtemp(join(tmpdir(), "scheme-e-three-winding-"));
    try {
      const filesRoot = join(root, "files");
      const trashRoot = join(root, "trash");
      await saveSchemeProjectRecord({
        filesRoot,
        trashRoot,
        schemePath: ["默认方案"],
        record: {
          name: "三绕组主变模型",
          updatedAt: "2026-07-12T00:00:00.000Z",
          project: {
            version: 1,
            name: "三绕组主变模型",
            nodes: [
              {
                id: "transformer-3",
                kind: "ac-three-winding-transformer",
                name: "三绕组主变-1",
                position: { x: 100, y: 100 },
                size: { width: 100, height: 100 },
                params: {
                  idx: "1",
                  highResistancePu: "0.01",
                  highReactancePu: "0.11",
                  highMagnetizingConductancePu: "0.001",
                  highMagnetizingSusceptancePu: "0.002",
                  highTapRatio: "1.01",
                  highShift: "1",
                  mediumResistancePu: "0.02",
                  mediumReactancePu: "0.12",
                  mediumMagnetizingConductancePu: "0.003",
                  mediumMagnetizingSusceptancePu: "0.004",
                  mediumTapRatio: "1.02",
                  mediumShift: "2",
                  lowResistancePu: "0.03",
                  lowReactancePu: "0.13",
                  lowMagnetizingConductancePu: "0.005",
                  lowMagnetizingSusceptancePu: "0.006",
                  lowTapRatio: "1.03",
                  lowShift: "3",
                  run_stat: "1"
                },
                terminals: [
                  { id: "t1", type: "ac", vbase: "220" },
                  { id: "t2", type: "ac", vbase: "110" },
                  { id: "t3", type: "ac", vbase: "10" }
                ]
              }
            ],
            edges: []
          }
        },
        measurementConfig: {}
      });

      const eFile = await readFile(join(filesRoot, "默认方案", "三绕组主变模型.e"), "utf-8");
      const lines = eSectionLines(eFile, "ACTransfomer3");

      expect(lines.find((line) => line.startsWith("@"))?.trim().split(/\s+/u).slice(1)).toEqual([
        "idx",
        "name",
        "t1_node",
        "t2_node",
        "t3_node",
        "neutral_node",
        "r1",
        "x1",
        "gt1",
        "bt1",
        "tap1",
        "shift1",
        "r2",
        "x2",
        "gt2",
        "bt2",
        "tap2",
        "shift2",
        "r3",
        "x3",
        "gt3",
        "bt3",
        "tap3",
        "shift3",
        "run_stat"
      ]);
      expect(lines.find((line) => line.startsWith("#"))?.trim().split(/\s+/u).slice(1)).toEqual([
        "1",
        "三绕组主变-1",
        "1",
        "2",
        "3",
        "0",
        "0.01",
        "0.11",
        "0.001",
        "0.002",
        "1.01",
        "1",
        "0.02",
        "0.12",
        "0.003",
        "0.004",
        "1.02",
        "2",
        "0.03",
        "0.13",
        "0.005",
        "0.006",
        "1.03",
        "3",
        "1"
      ]);
      expect(eFile).not.toContain("idx_xf_t1");
      expect(eFile).not.toContain("三绕组主变-1_高压绕组");
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
            canvasBackgroundImage: apiPath("/images/canvas-bg"),
            nodes: [
              {
                id: "image-node",
                kind: "static-image",
                name: "图片",
                position: { x: 100, y: 80 },
                size: { width: 80, height: 60 },
                params: {
                  backgroundImageAssetId: "node-bg",
                  backgroundImage: apiPath("/images/node-bg")
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
      expect(svg).not.toContain('href="' + apiPath('/images/'));
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
            canvasBackgroundImage: apiPath("/images/missing-bg?id=1"),
            nodes: [],
            edges: []
          }
        },
        measurementConfig: {},
        imagePathById: {}
      });

      const svg = await readFile(join(filesRoot, "默认方案", "缺失图片清单.svg"), "utf-8");
      // 当 imagePathById 为空时，保留原始 API 路径（不转换为 data/images/）
      expect(svg).toContain('href="' + apiPath('/images/missing-bg?id=1') + '"');
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

  test("embeds backend images referenced inside svg data url backgrounds", () => {
    const nestedSvg = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160" viewBox="0 0 240 160">',
      '<image href="' + apiPath('/images/nested-photo') + '" x="0" y="0" width="240" height="160"/>',
      "</svg>"
    ].join("");
    const svg = buildSvgFile(
      {
        version: 1,
        name: "内嵌图片导出",
        canvasWidth: 320,
        canvasHeight: 180,
        nodes: [
          {
            id: "nested-image-node",
            kind: "static-text",
            name: "图片",
            position: { x: 120, y: 90 },
            size: { width: 120, height: 80 },
            params: {
              text: "文字",
              backgroundImage: `data:image/svg+xml;utf8,${encodeURIComponent(nestedSvg)}`
            },
            terminals: []
          }
        ],
        edges: []
      },
      {},
      {
        imagePathById: {
          "nested-photo": "data:image/png;base64,bmVzdGVkLXBob3Rv"
        }
      }
    );

    expect(svg).toContain('href="data:image/png;base64,bmVzdGVkLXBob3Rv"');
    expect(svg).not.toContain(apiPath('/images/nested-photo'));
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
      expect(useTag).not.toContain("class=");
    }
    expect(defs).not.toContain("export-node-geometry");
  });

  test("normalizes server SVG device ids from the export type and permanent index", () => {
    const svg = buildSvgFile({
      version: 1,
      name: "统一设备ID",
      canvasWidth: 600,
      canvasHeight: 260,
      nodes: [
        {
          id: "ac-box-breaker-aakyra2",
          kind: "ac-box-breaker",
          name: "盒型开关-1",
          position: { x: 120, y: 120 },
          size: { width: 150, height: 76 },
          params: { idx: "1", _labelText: "盒型开关-1" },
          terminals: []
        },
        {
          id: "node-1783339759502-u3qq",
          kind: "ac-box-breaker",
          name: "盒型开关-2",
          position: { x: 300, y: 120 },
          size: { width: 150, height: 76 },
          params: { idx: "2", _labelText: "盒型开关-2" },
          terminals: []
        }
      ],
      edges: [
        {
          id: "switch-edge",
          sourceId: "ac-box-breaker-aakyra2",
          targetId: "node-1783339759502-u3qq"
        }
      ]
    });
    const useTags = svgUseTags(svg);

    expect(useTags[0]).toContain('id="ACBreak-1"');
    expect(useTags[1]).toContain('id="ACBreak-2"');
    expect(svg).toContain('source-dev-id="ACBreak-1"');
    expect(svg).toContain('target-dev-id="ACBreak-2"');
    expect(svg).toContain('<polyline id="edge-1"');
    expect(svg).not.toContain('edge-id=');
    expect(svg).not.toContain('source-layer-id=');
    expect(svg).not.toContain('target-layer-id=');
    expect(svg).not.toContain('switch-edge');
    expect(svg).toContain('<text id="label_ACBreak-1"');
    expect(svg).toContain('dev-id="ACBreak-1"');
    expect(svg).not.toContain('dev-id="node-1783339759502-u3qq"');
  });

  test("exports static graphics with stable semantic ids", () => {
    const svg = buildSvgFile({
      version: 1,
      name: "静态图元ID",
      canvasWidth: 600,
      canvasHeight: 260,
      nodes: [
        {
          id: "node-static-b",
          kind: "static-circle",
          name: "圆形2",
          position: { x: 120, y: 120 },
          size: { width: 80, height: 80 },
          params: {},
          terminals: []
        },
        {
          id: "node-custom-static",
          kind: "custom-StaticButton-2",
          name: "自定义按钮",
          position: { x: 440, y: 120 },
          size: { width: 120, height: 48 },
          params: { component_type: "StaticButton", text: "按钮" },
          terminals: []
        },
        {
          id: "node-static-a",
          kind: "static-circle",
          name: "圆形1",
          position: { x: 280, y: 120 },
          size: { width: 80, height: 80 },
          params: {},
          terminals: []
        }
      ],
      edges: []
    });

    expect(svg).toContain('id="static-circle-1"');
    expect(svg).toContain('id="static-circle-2"');
    expect(svg).toContain('id="custom-StaticButton-2-1"');
    expect(svg).not.toContain('id="node-static-a"');
    expect(svg).not.toContain('id="node-static-b"');
    expect(svg).not.toContain('id="node-custom-static"');
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
              groupStyleOverride: { color: "#2563eb", fontSize: 18 },
              items: [
                {
                  id: "server-m",
                  name: "P主",
                  measurementTypeId: "activePower",
                  sourcePoint: "server-load.activePower",
                  visible: true,
                  unitOverride: "kW",
                  styleOverride: { color: "#dc2626" }
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
    expect(textLayer).not.toContain('class="export-node-label-layer"');
    expect(textLayer).not.toContain('node-id="server-load"');
    expect(textLayer).toContain('<text id="label_server-load" layer-id="layer-default"');
    expect(textLayer).toContain('dev-id="server-load"');
    expect(textLayer).not.toContain(' idx=');
    expect(textLayer).not.toContain(' name=');
    expect(textLayer).not.toContain(' dev-kind=');
    expect(textLayer).not.toContain('dev-idx=');
    expect(textLayer).not.toContain('dev-name=');
    expect(textLayer).not.toContain('class="export-node-label');
    const labelText = textLayer.match(/<text id="label_server-load"[^>]*>/)?.[0] ?? "";
    expect(labelText).toContain('x="150" y="164"');
    expect(labelText).not.toContain("transform=");
    expect(textLayer).toContain(">LOAD-1</text>");
    expect(measurementLayer).toContain('class="mg"');
    const measurementGroupTag = measurementLayer.match(/<g class="mg"[^>]*>/)?.[0] ?? "";
    expect(measurementGroupTag).toContain('layer-id="layer-default"');
    expect(measurementGroupTag).toContain('dev="server-load"');
    expect(measurementGroupTag).not.toContain(' mg=');
    expect(measurementGroupTag).not.toContain(' idx=');
    expect(measurementGroupTag).not.toContain(' name=');
    expect(measurementGroupTag).not.toContain(' kind=');
    expect(measurementLayer).toMatch(/<rect\b[^>]*fill="transparent"[^>]*stroke-width="0"/);
    expect(measurementLayer).not.toContain('mf="activePower"');
    expect(measurementLayer).toContain('mt="activePower"');
    expect(measurementLayer).not.toContain('mid=');
    expect(measurementLayer).not.toContain('m-name=');
    expect(measurementLayer).not.toContain('m-value=');
    expect(measurementLayer).not.toContain('class="export-measurement');
    expect(measurementLayer).not.toContain('class="measurement-');
    expect(measurementLayer).not.toContain('dev-id=');
    expect(measurementLayer).not.toContain('dev-idx=');
    expect(measurementLayer).not.toContain('dev-name=');
    expect(measurementLayer).not.toContain('动态量测</title>');
    const measurementRow = measurementLayer.match(/<text\b[^>]*><tspan>P主<\/tspan><tspan id="mv-server-load-server-m"[\s\S]*?<\/text>/)?.[0] ?? "";
    const valueText = measurementRow.match(/<tspan id="mv-server-load-server-m" class="mv"[^>]*>--<\/tspan>/)?.[0] ?? "";
    const unitText = measurementRow.match(/<tspan dx="[^"]+">kW<\/tspan>/)?.[0] ?? "";
    expect(measurementRow).toContain('<tspan>P主</tspan>');
    expect(valueText).not.toContain('mid=');
    expect(valueText).toContain('mt="activePower"');
    expect(valueText).not.toContain('mf=');
    expect(measurementRow).toContain('fill="#dc2626"');
    expect(measurementRow).toContain('font-size="18"');
    expect(valueText).not.toContain('mg=');
    expect(valueText).not.toContain('term=');
    expect(unitText).toContain('dx="');
    expect(unitText).not.toContain(' x="');
    expect(measurementLayer).not.toContain("data-export-measurement-");
    expect(svg).toContain('<polyline id="edge-1"');
    expect(svg).not.toContain('edge-id=');
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
    expect(svg).not.toContain("data-export-");
  });

  test("keys server-exported measurement metadata by the stable device id", () => {
    const nodeId = "ac-load-ja8lfjt";
    const svg = buildSvgFile(
      {
        version: 1,
        name: "量测标识测试",
        nodes: [{
          id: nodeId,
          kind: "ac-load",
          name: "交流负荷-2",
          position: { x: 140, y: 100 },
          size: { width: 80, height: 48 },
          params: { idx: "2" },
          terminals: []
        }],
        edges: [],
        measurements: {
          version: 1,
          groups: [{
            id: `measurement-${nodeId}`,
            nodeId,
            visible: true,
            anchor: "custom",
            offset: { x: 40, y: -30 },
            layout: "vertical",
            items: [{
              id: `measurement-${nodeId}-reactivePower-1`,
              measurementTypeId: "reactivePower",
              sourcePoint: `${nodeId}.reactivePower`,
              visible: true
            }, {
              id: `measurement-${nodeId}-external-2`,
              measurementTypeId: "reactivePower",
              sourcePoint: "plant.load.1.p",
              visible: true
            }]
          }]
        }
      },
      {
        measurementTypes: [{ id: "reactivePower", name: "无功功率", shortLabel: "Q", defaultUnit: "Mvar" }],
        deviceProfiles: [{ deviceKind: "ac-load", items: [{ measurementTypeId: "reactivePower" }] }]
      }
    );
    const measurementLayer = svgSectionBetween(svg, '<g id="Measurement_Layer">', '<g id="Other_Layer">');

    expect(svgUseTags(svg).some((tag) => tag.includes('id="ACLoad-2"'))).toBe(true);
    const measurementGroupTag = measurementLayer.match(/<g class="mg"[^>]*>/)?.[0] ?? "";
    expect(measurementGroupTag).toContain('layer-id="layer-default"');
    expect(measurementGroupTag).toContain('dev="ACLoad-2"');
    expect(measurementGroupTag).not.toContain(' mg=');
    expect(measurementGroupTag).not.toContain(' idx=');
    expect(measurementGroupTag).not.toContain(' name=');
    expect(measurementGroupTag).not.toContain(' kind=');
    expect(measurementLayer).toContain('id="mv-ACLoad-2-reactivePower-1"');
    expect(measurementLayer).not.toContain('mid=');
    expect(measurementLayer).not.toContain('mf="reactivePower"');
    expect(measurementLayer).toContain('mf="plant.load.1.p"');
    expect(measurementLayer).not.toContain(nodeId);
  });

  test("writes vertical device label tokens with absolute x and y coordinates", () => {
    const svg = buildSvgFile({
      canvasWidth: 320,
      canvasHeight: 220,
      nodes: [
        {
          id: "server-vertical-label",
          kind: "ac-load",
          name: "负荷A",
          position: { x: 140, y: 100 },
          size: { width: 80, height: 60 },
          params: {
            _labelText: "A1",
            _labelX: "10",
            _labelY: "64",
            _labelRotation: "90"
          },
          terminals: []
        }
      ],
      edges: []
    });
    const textLayer = svgSectionBetween(svg, '<g id="Text_Layer">', '<g id="Measurement_Layer">');
    const labelTokens = Array.from(
      textLayer.matchAll(/<text id="label_server-vertical-label_\d+"[^>]*>/g),
      (match) => match[0]
    );

    expect(labelTokens).toHaveLength(2);
    expect(labelTokens[0]).toContain('x="150" y="155.6"');
    expect(labelTokens[1]).toContain('x="150" y="172.4"');
    expect(labelTokens.every((token) => !token.includes("transform="))).toBe(true);
  });

  test("renders measurement items that the editor treats as visible when visibility is unspecified", () => {
    const svg = buildSvgFile(
      {
        canvasWidth: 320,
        canvasHeight: 220,
        nodes: [
          {
            id: "server-box-breaker",
            kind: "ac-box-breaker",
            name: "盒型开关-1",
            position: { x: 140, y: 100 },
            size: { width: 150, height: 76 },
            params: { idx: "1" },
            terminals: []
          }
        ],
        edges: [],
        measurements: {
          version: 1,
          groups: [
            {
              id: "server-box-group",
              nodeId: "server-box-breaker",
              visible: true,
              labelVisible: true,
              unitVisible: true,
              anchor: "custom",
              offset: { x: 0, y: 80 },
              layout: "vertical",
              items: [
                {
                  id: "server-box-current",
                  measurementTypeId: "current",
                  sourcePoint: "server-box-breaker.current"
                }
              ]
            }
          ]
        }
      },
      {
        measurementTypes: [
          {
            id: "current",
            name: "电流",
            shortLabel: "I",
            defaultUnit: "A",
            defaultVisible: false
          }
        ],
        deviceProfiles: [{ deviceKind: "ac-breaker", items: [{ measurementTypeId: "current" }] }]
      }
    );

    const measurementLayer = svgSectionBetween(svg, '<g id="Measurement_Layer">', '<g id="Other_Layer">');
    expect(measurementLayer).toContain('class="mg"');
    expect(measurementLayer).toContain('class="mv" mt="current"');
    expect(measurementLayer).not.toContain('mf="current"');
    expect(measurementLayer).not.toContain('mid=');
    expect(measurementLayer).toContain(">I</tspan>");
    expect(measurementLayer).toContain(">A</tspan>");
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
