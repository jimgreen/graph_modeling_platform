import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(rootDir, "public", "icon-library", "docer-free-compatible");

const commonAttrs =
  'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';

const iconCategories = [
  {
    id: "electric-power",
    label: "电力设备",
    description: "电网、母线、变压器、开关、负荷等图上建模常用电力元件。",
    icons: [
      {
        id: "ac-source",
        name: "交流电源",
        color: "#2563eb",
        tags: ["AC", "source", "generator", "power"],
        body: `
          <circle cx="32" cy="32" r="20" ${commonAttrs}/>
          <path d="M14 32h8" ${commonAttrs}/>
          <path d="M42 32h8" ${commonAttrs}/>
          <path d="M22 32c3-10 7-10 10 0s7 10 10 0" ${commonAttrs}/>
        `,
      },
      {
        id: "dc-source",
        name: "直流电源",
        color: "#0f766e",
        tags: ["DC", "source", "battery"],
        body: `
          <circle cx="32" cy="32" r="20" ${commonAttrs}/>
          <path d="M14 32h8" ${commonAttrs}/>
          <path d="M42 32h8" ${commonAttrs}/>
          <path d="M24 27h10" ${commonAttrs}/>
          <path d="M39 27v10" ${commonAttrs}/>
          <path d="M34 37h10" ${commonAttrs}/>
        `,
      },
      {
        id: "busbar",
        name: "母线",
        color: "#1f2937",
        tags: ["bus", "busbar", "node"],
        body: `
          <path d="M14 32h36" ${commonAttrs}/>
          <path d="M20 24v16" ${commonAttrs}/>
          <path d="M32 24v16" ${commonAttrs}/>
          <path d="M44 24v16" ${commonAttrs}/>
        `,
      },
      {
        id: "transformer",
        name: "变压器",
        color: "#7c3aed",
        tags: ["transformer", "voltage"],
        body: `
          <circle cx="25" cy="32" r="12" ${commonAttrs}/>
          <circle cx="39" cy="32" r="12" ${commonAttrs}/>
          <path d="M8 32h5" ${commonAttrs}/>
          <path d="M51 32h5" ${commonAttrs}/>
        `,
      },
      {
        id: "circuit-breaker-open",
        name: "断路器开断",
        color: "#dc2626",
        tags: ["breaker", "open", "status0"],
        body: `
          <path d="M10 32h16" ${commonAttrs}/>
          <path d="M38 32h16" ${commonAttrs}/>
          <path d="M26 32l12-12" ${commonAttrs}/>
          <circle cx="26" cy="32" r="3" fill="currentColor"/>
          <circle cx="38" cy="32" r="3" fill="currentColor"/>
        `,
      },
      {
        id: "circuit-breaker-closed",
        name: "断路器闭合",
        color: "#16a34a",
        tags: ["breaker", "closed", "status1"],
        body: `
          <path d="M10 32h44" ${commonAttrs}/>
          <circle cx="26" cy="32" r="3" fill="currentColor"/>
          <circle cx="38" cy="32" r="3" fill="currentColor"/>
        `,
      },
      {
        id: "disconnector-open",
        name: "刀闸开断",
        color: "#dc2626",
        tags: ["disconnector", "switch", "open"],
        body: `
          <path d="M12 36h14" ${commonAttrs}/>
          <path d="M40 36h12" ${commonAttrs}/>
          <path d="M26 36l14-18" ${commonAttrs}/>
          <circle cx="26" cy="36" r="3" fill="currentColor"/>
          <circle cx="40" cy="36" r="3" fill="currentColor"/>
        `,
      },
      {
        id: "disconnector-closed",
        name: "刀闸闭合",
        color: "#16a34a",
        tags: ["disconnector", "switch", "closed"],
        body: `
          <path d="M12 36h40" ${commonAttrs}/>
          <circle cx="26" cy="36" r="3" fill="currentColor"/>
          <circle cx="40" cy="36" r="3" fill="currentColor"/>
        `,
      },
      {
        id: "load",
        name: "负荷",
        color: "#ea580c",
        tags: ["load", "consumer"],
        body: `
          <path d="M32 10v12" ${commonAttrs}/>
          <path d="M18 22h28l-14 30z" ${commonAttrs}/>
          <path d="M24 34h16" ${commonAttrs}/>
        `,
      },
      {
        id: "ground",
        name: "接地",
        color: "#475569",
        tags: ["ground", "earth"],
        body: `
          <path d="M32 12v26" ${commonAttrs}/>
          <path d="M20 38h24" ${commonAttrs}/>
          <path d="M24 45h16" ${commonAttrs}/>
          <path d="M28 52h8" ${commonAttrs}/>
        `,
      },
    ],
  },
  {
    id: "converter",
    label: "变流器",
    description: "AC/DC、DC/AC、DC/DC、AC/AC 以及整流、逆变类电力电子设备。",
    icons: [
      {
        id: "acdc-converter",
        name: "ACDC变流器",
        color: "#0891b2",
        tags: ["ACDC", "converter", "rectifier"],
        body: `
          <rect x="12" y="16" width="40" height="32" rx="4" ${commonAttrs}/>
          <path d="M18 32c2-7 5-7 7 0s5 7 7 0" ${commonAttrs}/>
          <path d="M36 27h10" ${commonAttrs}/>
          <path d="M41 27v10" ${commonAttrs}/>
          <path d="M36 37h10" ${commonAttrs}/>
        `,
      },
      {
        id: "dcac-converter",
        name: "DCAC变流器",
        color: "#0891b2",
        tags: ["DCAC", "converter", "inverter"],
        body: `
          <rect x="12" y="16" width="40" height="32" rx="4" ${commonAttrs}/>
          <path d="M18 27h9" ${commonAttrs}/>
          <path d="M22.5 27v10" ${commonAttrs}/>
          <path d="M18 37h9" ${commonAttrs}/>
          <path d="M34 32c2-7 5-7 7 0s5 7 7 0" ${commonAttrs}/>
        `,
      },
      {
        id: "dcdc-converter",
        name: "DCDC变流器",
        color: "#0f766e",
        tags: ["DCDC", "converter"],
        body: `
          <rect x="12" y="16" width="40" height="32" rx="4" ${commonAttrs}/>
          <path d="M18 27h10" ${commonAttrs}/>
          <path d="M23 27v10" ${commonAttrs}/>
          <path d="M18 37h10" ${commonAttrs}/>
          <path d="M36 27h10" ${commonAttrs}/>
          <path d="M41 27v10" ${commonAttrs}/>
          <path d="M36 37h10" ${commonAttrs}/>
        `,
      },
      {
        id: "acac-converter",
        name: "ACAC变流器",
        color: "#0284c7",
        tags: ["ACAC", "converter"],
        body: `
          <rect x="12" y="16" width="40" height="32" rx="4" ${commonAttrs}/>
          <path d="M18 32c2-7 5-7 7 0s5 7 7 0" ${commonAttrs}/>
          <path d="M36 32c2-7 5-7 7 0s5 7 7 0" ${commonAttrs}/>
        `,
      },
      {
        id: "inverter",
        name: "逆变器",
        color: "#7c3aed",
        tags: ["inverter", "DCAC"],
        body: `
          <rect x="14" y="14" width="36" height="36" rx="6" ${commonAttrs}/>
          <path d="M20 40h10" ${commonAttrs}/>
          <path d="M25 28v12" ${commonAttrs}/>
          <path d="M20 28h10" ${commonAttrs}/>
          <path d="M34 34c2-7 5-7 7 0s5 7 7 0" ${commonAttrs}/>
        `,
      },
      {
        id: "rectifier",
        name: "整流器",
        color: "#0d9488",
        tags: ["rectifier", "ACDC"],
        body: `
          <rect x="14" y="14" width="36" height="36" rx="6" ${commonAttrs}/>
          <path d="M18 32c2-7 5-7 7 0s5 7 7 0" ${commonAttrs}/>
          <path d="M36 27h10" ${commonAttrs}/>
          <path d="M41 27v10" ${commonAttrs}/>
          <path d="M36 37h10" ${commonAttrs}/>
        `,
      },
      {
        id: "dcac-vertical",
        name: "DCAC竖型变流器",
        color: "#2563eb",
        tags: ["DCAC", "vertical", "converter"],
        body: `
          <rect x="18" y="10" width="28" height="44" rx="4" ${commonAttrs}/>
          <path d="M25 17h14" ${commonAttrs}/>
          <path d="M32 17v10" ${commonAttrs}/>
          <path d="M25 27h14" ${commonAttrs}/>
          <path d="M24 41c2-7 5-7 8 0s6 7 8 0" ${commonAttrs}/>
        `,
      },
      {
        id: "filter-reactor",
        name: "滤波电抗器",
        color: "#475569",
        tags: ["reactor", "filter"],
        body: `
          <path d="M10 32h8" ${commonAttrs}/>
          <path d="M46 32h8" ${commonAttrs}/>
          <path d="M18 32c0-8 8-8 8 0s8 8 8 0 8-8 8 0 8 8 8 0" ${commonAttrs}/>
        `,
      },
    ],
  },
  {
    id: "renewable-generation",
    label: "新能源与发电",
    description: "光伏、风电、水电、火电、柴油机等电源类图标。",
    icons: [
      {
        id: "solar-panel",
        name: "光伏板",
        color: "#f59e0b",
        tags: ["solar", "pv", "renewable"],
        body: `
          <path d="M18 24h34l-6 24H12z" ${commonAttrs}/>
          <path d="M20 32h28" ${commonAttrs}/>
          <path d="M18 40h28" ${commonAttrs}/>
          <path d="M29 24l-4 24" ${commonAttrs}/>
          <path d="M41 24l-4 24" ${commonAttrs}/>
          <path d="M32 8v8" ${commonAttrs}/>
          <path d="M18 13l5 5" ${commonAttrs}/>
          <path d="M46 13l-5 5" ${commonAttrs}/>
        `,
      },
      {
        id: "wind-turbine",
        name: "风力发电机",
        color: "#0ea5e9",
        tags: ["wind", "turbine", "renewable"],
        body: `
          <circle cx="32" cy="25" r="3" fill="currentColor"/>
          <path d="M32 28v26" ${commonAttrs}/>
          <path d="M32 25l-3-16" ${commonAttrs}/>
          <path d="M34 26l15 5" ${commonAttrs}/>
          <path d="M30 26L18 37" ${commonAttrs}/>
          <path d="M23 54h18" ${commonAttrs}/>
        `,
      },
      {
        id: "hydro-generator",
        name: "水电机组",
        color: "#0284c7",
        tags: ["hydro", "generator", "water"],
        body: `
          <circle cx="32" cy="25" r="13" ${commonAttrs}/>
          <path d="M32 12v13l10 7" ${commonAttrs}/>
          <path d="M14 44c5-4 10-4 15 0s10 4 15 0 5-4 10 0" ${commonAttrs}/>
          <path d="M14 52c5-4 10-4 15 0s10 4 15 0 5-4 10 0" ${commonAttrs}/>
        `,
      },
      {
        id: "thermal-generator",
        name: "火力发电机",
        color: "#ea580c",
        tags: ["thermal", "generator", "coal"],
        body: `
          <path d="M16 48h32" ${commonAttrs}/>
          <path d="M18 48V28l10 6V26l10 8V24l10 7v17" ${commonAttrs}/>
          <path d="M20 20c3-6 0-8 4-13" ${commonAttrs}/>
          <path d="M31 20c3-6 0-8 4-13" ${commonAttrs}/>
          <path d="M42 20c3-6 0-8 4-13" ${commonAttrs}/>
        `,
      },
      {
        id: "diesel-generator",
        name: "柴油发电机",
        color: "#64748b",
        tags: ["diesel", "generator", "engine"],
        body: `
          <rect x="12" y="28" width="34" height="18" rx="3" ${commonAttrs}/>
          <path d="M20 28v-8h16v8" ${commonAttrs}/>
          <path d="M46 34h6v8h-6" ${commonAttrs}/>
          <circle cx="21" cy="46" r="4" ${commonAttrs}/>
          <circle cx="39" cy="46" r="4" ${commonAttrs}/>
          <path d="M24 22h10" ${commonAttrs}/>
          <path d="M17 36h18" ${commonAttrs}/>
        `,
      },
      {
        id: "gas-turbine",
        name: "燃气轮机",
        color: "#be123c",
        tags: ["gas", "turbine", "generator"],
        body: `
          <path d="M12 40h40" ${commonAttrs}/>
          <path d="M16 40c4-16 12-24 24-24h8c-3 10-2 18 4 24" ${commonAttrs}/>
          <path d="M24 40c3-8 8-12 16-12" ${commonAttrs}/>
          <path d="M17 50h30" ${commonAttrs}/>
        `,
      },
      {
        id: "grid-import",
        name: "外部电网",
        color: "#2563eb",
        tags: ["grid", "import", "source"],
        body: `
          <path d="M16 52L32 10l16 42" ${commonAttrs}/>
          <path d="M22 36h20" ${commonAttrs}/>
          <path d="M20 44h24" ${commonAttrs}/>
          <path d="M27 24h10" ${commonAttrs}/>
          <path d="M32 10v42" ${commonAttrs}/>
        `,
      },
      {
        id: "microgrid",
        name: "微电网",
        color: "#4f46e5",
        tags: ["microgrid", "network"],
        body: `
          <circle cx="32" cy="32" r="7" ${commonAttrs}/>
          <circle cx="16" cy="20" r="5" ${commonAttrs}/>
          <circle cx="50" cy="22" r="5" ${commonAttrs}/>
          <circle cx="18" cy="48" r="5" ${commonAttrs}/>
          <circle cx="48" cy="46" r="5" ${commonAttrs}/>
          <path d="M22 23l5 5" ${commonAttrs}/>
          <path d="M44 25l-7 4" ${commonAttrs}/>
          <path d="M23 44l5-7" ${commonAttrs}/>
          <path d="M43 42l-6-6" ${commonAttrs}/>
        `,
      },
    ],
  },
  {
    id: "storage",
    label: "储能",
    description: "电池、超级电容、储氢、储热、飞轮等储能设备。",
    icons: [
      {
        id: "battery",
        name: "电池储能",
        color: "#16a34a",
        tags: ["battery", "storage", "BESS"],
        body: `
          <rect x="14" y="22" width="34" height="24" rx="3" ${commonAttrs}/>
          <path d="M48 30h4v8h-4" ${commonAttrs}/>
          <path d="M22 34h10" ${commonAttrs}/>
          <path d="M27 29v10" ${commonAttrs}/>
          <path d="M36 34h6" ${commonAttrs}/>
        `,
      },
      {
        id: "battery-stack",
        name: "电池簇",
        color: "#15803d",
        tags: ["battery", "rack", "cluster"],
        body: `
          <rect x="16" y="12" width="32" height="40" rx="3" ${commonAttrs}/>
          <path d="M16 24h32" ${commonAttrs}/>
          <path d="M16 36h32" ${commonAttrs}/>
          <path d="M24 18h8" ${commonAttrs}/>
          <path d="M24 30h8" ${commonAttrs}/>
          <path d="M24 42h8" ${commonAttrs}/>
          <path d="M38 18v6" ${commonAttrs}/>
          <path d="M38 30v6" ${commonAttrs}/>
          <path d="M38 42v6" ${commonAttrs}/>
        `,
      },
      {
        id: "supercapacitor",
        name: "超级电容",
        color: "#7c3aed",
        tags: ["capacitor", "storage"],
        body: `
          <path d="M12 32h14" ${commonAttrs}/>
          <path d="M38 32h14" ${commonAttrs}/>
          <path d="M27 18v28" ${commonAttrs}/>
          <path d="M37 18v28" ${commonAttrs}/>
          <path d="M20 20h6" ${commonAttrs}/>
          <path d="M17 23h12" ${commonAttrs}/>
        `,
      },
      {
        id: "flywheel",
        name: "飞轮储能",
        color: "#475569",
        tags: ["flywheel", "storage"],
        body: `
          <circle cx="32" cy="32" r="20" ${commonAttrs}/>
          <circle cx="32" cy="32" r="7" ${commonAttrs}/>
          <path d="M32 12v13" ${commonAttrs}/>
          <path d="M32 39v13" ${commonAttrs}/>
          <path d="M12 32h13" ${commonAttrs}/>
          <path d="M39 32h13" ${commonAttrs}/>
        `,
      },
      {
        id: "hydrogen-tank",
        name: "储氢罐",
        color: "#06b6d4",
        tags: ["hydrogen", "tank", "storage"],
        body: `
          <rect x="16" y="18" width="32" height="28" rx="14" ${commonAttrs}/>
          <path d="M24 46v8" ${commonAttrs}/>
          <path d="M40 46v8" ${commonAttrs}/>
          <path d="M25 32h14" ${commonAttrs}/>
          <path d="M25 26v12" ${commonAttrs}/>
          <path d="M39 26v12" ${commonAttrs}/>
          <path d="M24 54h16" ${commonAttrs}/>
        `,
      },
      {
        id: "heat-storage",
        name: "储热罐",
        color: "#ea580c",
        tags: ["heat", "storage", "tank"],
        body: `
          <rect x="18" y="14" width="28" height="40" rx="10" ${commonAttrs}/>
          <path d="M24 26h16" ${commonAttrs}/>
          <path d="M24 38h16" ${commonAttrs}/>
          <path d="M28 22c-3 4 3 6 0 10" ${commonAttrs}/>
          <path d="M36 22c-3 4 3 6 0 10" ${commonAttrs}/>
        `,
      },
      {
        id: "compressed-air",
        name: "压缩空气储能",
        color: "#0284c7",
        tags: ["compressed-air", "storage"],
        body: `
          <rect x="14" y="22" width="36" height="24" rx="12" ${commonAttrs}/>
          <path d="M18 34h28" ${commonAttrs}/>
          <path d="M22 28c4-4 8-4 12 0s8 4 12 0" ${commonAttrs}/>
          <path d="M22 40c4 4 8 4 12 0s8-4 12 0" ${commonAttrs}/>
        `,
      },
      {
        id: "ev-charger",
        name: "充电桩",
        color: "#2563eb",
        tags: ["EV", "charger", "storage"],
        body: `
          <rect x="18" y="12" width="22" height="40" rx="4" ${commonAttrs}/>
          <path d="M24 20h10v10H24z" ${commonAttrs}/>
          <path d="M40 24h5l3 5v13c0 4-5 4-5 0V31" ${commonAttrs}/>
          <path d="M29 36l-4 7h7l-4 7" ${commonAttrs}/>
        `,
      },
    ],
  },
  {
    id: "thermal",
    label: "热力设备",
    description: "锅炉、换热器、热泵、水泵、阀门、冷却塔等热力系统元件。",
    icons: [
      {
        id: "boiler",
        name: "锅炉",
        color: "#dc2626",
        tags: ["boiler", "heat"],
        body: `
          <rect x="16" y="18" width="32" height="34" rx="6" ${commonAttrs}/>
          <path d="M24 18v-6h16v6" ${commonAttrs}/>
          <path d="M24 40c-3-4 0-8 4-10 0 4 6 5 4 10 4-2 8 1 8 5 0 5-4 7-8 7s-8-2-8-7c0-2 1-4 2-5" ${commonAttrs}/>
        `,
      },
      {
        id: "heat-exchanger",
        name: "换热器",
        color: "#ea580c",
        tags: ["heat-exchanger", "thermal"],
        body: `
          <rect x="16" y="16" width="32" height="32" rx="6" ${commonAttrs}/>
          <path d="M12 24h40" ${commonAttrs}/>
          <path d="M12 40h40" ${commonAttrs}/>
          <path d="M24 18c-7 8 7 12 0 20s7 6 0 12" ${commonAttrs}/>
          <path d="M40 18c-7 8 7 12 0 20s7 6 0 12" ${commonAttrs}/>
        `,
      },
      {
        id: "heat-pump",
        name: "热泵",
        color: "#be123c",
        tags: ["heat-pump", "thermal"],
        body: `
          <rect x="14" y="18" width="36" height="28" rx="5" ${commonAttrs}/>
          <path d="M22 32h20" ${commonAttrs}/>
          <path d="M34 24l8 8-8 8" ${commonAttrs}/>
          <path d="M22 22c-3 4 3 6 0 10" ${commonAttrs}/>
          <path d="M22 36c-3 4 3 6 0 10" ${commonAttrs}/>
        `,
      },
      {
        id: "pump",
        name: "水泵",
        color: "#0284c7",
        tags: ["pump", "water", "thermal"],
        body: `
          <circle cx="32" cy="32" r="16" ${commonAttrs}/>
          <path d="M12 32h8" ${commonAttrs}/>
          <path d="M44 32h8" ${commonAttrs}/>
          <path d="M32 16v16l12 6" ${commonAttrs}/>
          <path d="M24 50h16" ${commonAttrs}/>
        `,
      },
      {
        id: "valve-open",
        name: "阀门打开",
        color: "#16a34a",
        tags: ["valve", "open", "thermal"],
        body: `
          <path d="M10 32h12" ${commonAttrs}/>
          <path d="M42 32h12" ${commonAttrs}/>
          <path d="M22 22l20 20" ${commonAttrs}/>
          <path d="M42 22L22 42" ${commonAttrs}/>
          <path d="M32 22V12" ${commonAttrs}/>
          <path d="M24 12h16" ${commonAttrs}/>
        `,
      },
      {
        id: "valve-closed",
        name: "阀门关闭",
        color: "#dc2626",
        tags: ["valve", "closed", "thermal"],
        body: `
          <path d="M10 32h44" ${commonAttrs}/>
          <path d="M22 22l20 20" ${commonAttrs}/>
          <path d="M42 22L22 42" ${commonAttrs}/>
          <path d="M32 22V12" ${commonAttrs}/>
          <path d="M24 12h16" ${commonAttrs}/>
          <path d="M22 46h20" ${commonAttrs}/>
        `,
      },
      {
        id: "cooling-tower",
        name: "冷却塔",
        color: "#0ea5e9",
        tags: ["cooling", "tower", "thermal"],
        body: `
          <path d="M22 52h20l-4-36H26z" ${commonAttrs}/>
          <path d="M24 16h16" ${commonAttrs}/>
          <path d="M20 52h24" ${commonAttrs}/>
          <path d="M26 10c4 4 8 4 12 0" ${commonAttrs}/>
          <path d="M24 6c5 5 11 5 16 0" ${commonAttrs}/>
        `,
      },
      {
        id: "pipe-network",
        name: "管网",
        color: "#475569",
        tags: ["pipe", "network", "thermal"],
        body: `
          <path d="M12 24h20v28" ${commonAttrs}/>
          <path d="M32 24h20" ${commonAttrs}/>
          <path d="M32 38h16" ${commonAttrs}/>
          <circle cx="12" cy="24" r="4" ${commonAttrs}/>
          <circle cx="52" cy="24" r="4" ${commonAttrs}/>
          <circle cx="48" cy="38" r="4" ${commonAttrs}/>
          <circle cx="32" cy="52" r="4" ${commonAttrs}/>
        `,
      },
    ],
  },
  {
    id: "hydrogen",
    label: "氢能",
    description: "电解槽、燃料电池、储氢、压缩机、加氢站等氢能系统元件。",
    icons: [
      {
        id: "electrolyzer",
        name: "电解槽",
        color: "#06b6d4",
        tags: ["hydrogen", "electrolyzer"],
        body: `
          <rect x="14" y="16" width="36" height="34" rx="5" ${commonAttrs}/>
          <path d="M22 24h20" ${commonAttrs}/>
          <path d="M22 32h20" ${commonAttrs}/>
          <path d="M22 40h20" ${commonAttrs}/>
          <path d="M24 10v6" ${commonAttrs}/>
          <path d="M40 10v6" ${commonAttrs}/>
          <path d="M24 56v-6" ${commonAttrs}/>
          <path d="M40 56v-6" ${commonAttrs}/>
        `,
      },
      {
        id: "fuel-cell",
        name: "燃料电池",
        color: "#14b8a6",
        tags: ["hydrogen", "fuel-cell"],
        body: `
          <rect x="16" y="16" width="32" height="32" rx="5" ${commonAttrs}/>
          <path d="M22 24h20" ${commonAttrs}/>
          <path d="M22 32h20" ${commonAttrs}/>
          <path d="M22 40h20" ${commonAttrs}/>
          <path d="M10 26h6" ${commonAttrs}/>
          <path d="M48 38h6" ${commonAttrs}/>
          <path d="M12 26c2-4 5-4 8 0" ${commonAttrs}/>
          <path d="M44 38c2 4 5 4 8 0" ${commonAttrs}/>
        `,
      },
      {
        id: "hydrogen-compressor",
        name: "氢气压缩机",
        color: "#0891b2",
        tags: ["hydrogen", "compressor"],
        body: `
          <circle cx="30" cy="32" r="15" ${commonAttrs}/>
          <path d="M10 32h5" ${commonAttrs}/>
          <path d="M45 32h9" ${commonAttrs}/>
          <path d="M30 17v15l11 7" ${commonAttrs}/>
          <path d="M22 52h20" ${commonAttrs}/>
        `,
      },
      {
        id: "hydrogen-station",
        name: "加氢站",
        color: "#0f766e",
        tags: ["hydrogen", "station"],
        body: `
          <rect x="16" y="16" width="22" height="36" rx="4" ${commonAttrs}/>
          <path d="M22 24h10v10H22z" ${commonAttrs}/>
          <path d="M38 24h6l4 6v15c0 5-6 5-6 0V34" ${commonAttrs}/>
          <path d="M22 44h10" ${commonAttrs}/>
          <path d="M22 50h20" ${commonAttrs}/>
        `,
      },
      {
        id: "hydrogen-pipeline",
        name: "氢气管线",
        color: "#06b6d4",
        tags: ["hydrogen", "pipe"],
        body: `
          <path d="M10 32h44" ${commonAttrs}/>
          <path d="M18 24v16" ${commonAttrs}/>
          <path d="M46 24v16" ${commonAttrs}/>
          <path d="M24 26h16" ${commonAttrs}/>
          <path d="M24 38h16" ${commonAttrs}/>
          <path d="M28 20v24" ${commonAttrs}/>
          <path d="M36 20v24" ${commonAttrs}/>
        `,
      },
      {
        id: "gas-mixer",
        name: "混气器",
        color: "#64748b",
        tags: ["hydrogen", "mixer"],
        body: `
          <path d="M10 20h18l18 24h8" ${commonAttrs}/>
          <path d="M10 44h18l18-24h8" ${commonAttrs}/>
          <circle cx="32" cy="32" r="6" ${commonAttrs}/>
          <path d="M29 32h6" ${commonAttrs}/>
        `,
      },
    ],
  },
  {
    id: "measurement-control",
    label: "测控保护",
    description: "表计、传感器、保护、通信、控制器等测控类图标。",
    icons: [
      {
        id: "meter",
        name: "表计",
        color: "#2563eb",
        tags: ["meter", "measurement"],
        body: `
          <circle cx="32" cy="34" r="19" ${commonAttrs}/>
          <path d="M20 36a12 12 0 0 1 24 0" ${commonAttrs}/>
          <path d="M32 34l9-9" ${commonAttrs}/>
          <path d="M26 50h12" ${commonAttrs}/>
        `,
      },
      {
        id: "sensor",
        name: "传感器",
        color: "#7c3aed",
        tags: ["sensor", "measurement"],
        body: `
          <circle cx="32" cy="32" r="8" ${commonAttrs}/>
          <path d="M16 32a16 16 0 0 1 32 0" ${commonAttrs}/>
          <path d="M10 32a22 22 0 0 1 44 0" ${commonAttrs}/>
          <path d="M32 40v12" ${commonAttrs}/>
          <path d="M24 52h16" ${commonAttrs}/>
        `,
      },
      {
        id: "relay-protection",
        name: "继电保护",
        color: "#dc2626",
        tags: ["relay", "protection"],
        body: `
          <path d="M32 10l18 8v14c0 12-7 19-18 22-11-3-18-10-18-22V18z" ${commonAttrs}/>
          <path d="M32 20v14" ${commonAttrs}/>
          <path d="M25 34h14" ${commonAttrs}/>
          <path d="M28 42h8" ${commonAttrs}/>
        `,
      },
      {
        id: "plc-controller",
        name: "PLC控制器",
        color: "#475569",
        tags: ["PLC", "controller"],
        body: `
          <rect x="12" y="16" width="40" height="32" rx="4" ${commonAttrs}/>
          <path d="M20 24h8" ${commonAttrs}/>
          <path d="M20 32h8" ${commonAttrs}/>
          <path d="M20 40h8" ${commonAttrs}/>
          <path d="M36 24h8" ${commonAttrs}/>
          <path d="M36 32h8" ${commonAttrs}/>
          <path d="M36 40h8" ${commonAttrs}/>
        `,
      },
      {
        id: "communication",
        name: "通信",
        color: "#0891b2",
        tags: ["communication", "network"],
        body: `
          <circle cx="18" cy="44" r="5" ${commonAttrs}/>
          <circle cx="32" cy="20" r="5" ${commonAttrs}/>
          <circle cx="46" cy="44" r="5" ${commonAttrs}/>
          <path d="M21 40l8-15" ${commonAttrs}/>
          <path d="M35 25l8 15" ${commonAttrs}/>
          <path d="M23 44h18" ${commonAttrs}/>
        `,
      },
      {
        id: "alarm",
        name: "告警",
        color: "#f59e0b",
        tags: ["alarm", "warning"],
        body: `
          <path d="M32 10l24 42H8z" ${commonAttrs}/>
          <path d="M32 24v12" ${commonAttrs}/>
          <circle cx="32" cy="44" r="2.5" fill="currentColor"/>
        `,
      },
      {
        id: "trend-chart",
        name: "趋势曲线",
        color: "#16a34a",
        tags: ["trend", "chart"],
        body: `
          <path d="M12 50h40" ${commonAttrs}/>
          <path d="M12 50V14" ${commonAttrs}/>
          <path d="M18 42l8-9 8 5 12-18" ${commonAttrs}/>
          <path d="M42 20h4v4" ${commonAttrs}/>
        `,
      },
      {
        id: "terminal-node",
        name: "端子节点",
        color: "#1f2937",
        tags: ["terminal", "node"],
        body: `
          <circle cx="32" cy="32" r="8" ${commonAttrs}/>
          <path d="M32 8v16" ${commonAttrs}/>
          <path d="M32 40v16" ${commonAttrs}/>
          <path d="M8 32h16" ${commonAttrs}/>
          <path d="M40 32h16" ${commonAttrs}/>
        `,
      },
    ],
  },
  {
    id: "generic-shapes",
    label: "通用图形",
    description: "文本、图片、容器、标注、方向、区域等通用绘图元素。",
    icons: [
      {
        id: "text-label",
        name: "文本标签",
        color: "#334155",
        tags: ["text", "label"],
        body: `
          <path d="M16 18h32" ${commonAttrs}/>
          <path d="M32 18v30" ${commonAttrs}/>
          <path d="M24 48h16" ${commonAttrs}/>
        `,
      },
      {
        id: "image-placeholder",
        name: "图片",
        color: "#2563eb",
        tags: ["image", "picture"],
        body: `
          <rect x="12" y="14" width="40" height="36" rx="4" ${commonAttrs}/>
          <circle cx="24" cy="26" r="4" ${commonAttrs}/>
          <path d="M16 44l12-12 8 8 5-5 7 9" ${commonAttrs}/>
        `,
      },
      {
        id: "container",
        name: "容器",
        color: "#64748b",
        tags: ["container", "group"],
        body: `
          <rect x="12" y="16" width="40" height="32" rx="5" ${commonAttrs}/>
          <path d="M20 24h24" ${commonAttrs}/>
          <path d="M20 32h12" ${commonAttrs}/>
          <path d="M20 40h18" ${commonAttrs}/>
        `,
      },
      {
        id: "subsystem",
        name: "子系统",
        color: "#7c3aed",
        tags: ["subsystem", "module"],
        body: `
          <rect x="12" y="18" width="22" height="18" rx="3" ${commonAttrs}/>
          <rect x="30" y="28" width="22" height="18" rx="3" ${commonAttrs}/>
          <path d="M34 24h12" ${commonAttrs}/>
          <path d="M18 42h12" ${commonAttrs}/>
        `,
      },
      {
        id: "arrow-flow",
        name: "流向箭头",
        color: "#0f766e",
        tags: ["arrow", "flow"],
        body: `
          <path d="M10 32h38" ${commonAttrs}/>
          <path d="M38 20l12 12-12 12" ${commonAttrs}/>
        `,
      },
      {
        id: "annotation",
        name: "注释",
        color: "#f59e0b",
        tags: ["annotation", "note"],
        body: `
          <path d="M14 16h36v28H28L16 54V44h-2z" ${commonAttrs}/>
          <path d="M22 26h20" ${commonAttrs}/>
          <path d="M22 34h14" ${commonAttrs}/>
        `,
      },
      {
        id: "boundary",
        name: "边界区域",
        color: "#475569",
        tags: ["boundary", "area"],
        body: `
          <rect x="12" y="14" width="40" height="36" rx="6" ${commonAttrs} stroke-dasharray="5 5"/>
          <path d="M22 24h20" ${commonAttrs}/>
          <path d="M22 32h20" ${commonAttrs}/>
          <path d="M22 40h20" ${commonAttrs}/>
        `,
      },
      {
        id: "manual-bend",
        name: "人工拐点",
        color: "#ea580c",
        tags: ["bend", "route", "line"],
        body: `
          <path d="M12 20h20v24h20" ${commonAttrs}/>
          <circle cx="32" cy="20" r="4" fill="currentColor"/>
          <circle cx="32" cy="44" r="4" fill="currentColor"/>
        `,
      },
    ],
  },
];

const generatedCommonAttrs =
  'fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"';

const generatedThinAttrs =
  'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';

function generatedIcon(id, name, color, tags, body) {
  return { id, name, color, tags, body };
}

function generatedCategory(id, label, description, icons) {
  return { id, label, description, icons };
}

function gPath(d, attrs = generatedCommonAttrs) {
  return `<path d="${d}" ${attrs}/>`;
}

function gLine(x1, y1, x2, y2, attrs = generatedCommonAttrs) {
  return `<path d="M${x1} ${y1}L${x2} ${y2}" ${attrs}/>`;
}

function gRect(x, y, width, height, rx = 0, attrs = generatedCommonAttrs) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}"${rx ? ` rx="${rx}"` : ""} ${attrs}/>`;
}

function gCircle(cx, cy, r, attrs = generatedCommonAttrs) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" ${attrs}/>`;
}

function gText(content, x = 32, y = 34, size = 9) {
  return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Microsoft YaHei, sans-serif" font-size="${size}" font-weight="700" fill="currentColor">${escapeXml(content)}</text>`;
}

function buildAdditionalDocerCompatibleCategories() {
  return [
    generatedCategory("grid-primary-equipment", "电网一次设备", "互感器、避雷器、电容器、开关柜、电缆终端等一次设备图标。", [
      generatedIcon("current-transformer", "电流互感器", "#2563eb", ["ct", "measurement", "grid"], `${gCircle(28, 32, 12)}${gCircle(38, 32, 12)}${gLine(8, 32, 16, 32)}${gLine(50, 32, 56, 32)}${gText("CT", 33, 32, 8)}`),
      generatedIcon("voltage-transformer", "电压互感器", "#7c3aed", ["pt", "measurement", "grid"], `${gRect(18, 16, 28, 32, 4)}${gLine(10, 32, 18, 32)}${gLine(46, 32, 54, 32)}${gPath("M24 24h16M24 32h16M24 40h16")}${gText("PT", 32, 32, 8)}`),
      generatedIcon("surge-arrester", "避雷器", "#dc2626", ["arrester", "surge", "protection"], `${gLine(32, 10, 32, 54)}${gPath("M24 18h16l-12 12h12L28 42h12")}${gLine(22, 54, 42, 54)}`),
      generatedIcon("capacitor-bank", "电容器组", "#16a34a", ["capacitor", "bank", "reactive"], `${gLine(10, 32, 22, 32)}${gLine(42, 32, 54, 32)}${gLine(24, 18, 24, 46)}${gLine(30, 18, 30, 46)}${gLine(36, 18, 36, 46)}${gLine(42, 18, 42, 46)}`),
      generatedIcon("shunt-reactor", "并联电抗器", "#475569", ["reactor", "coil", "reactive"], `${gLine(10, 32, 16, 32)}${gPath("M16 32c0-7 8-7 8 0s8 7 8 0 8-7 8 0 8 7 8 0")}${gLine(48, 32, 54, 32)}${gLine(32, 40, 32, 54)}${gLine(24, 54, 40, 54)}`),
      generatedIcon("dropout-fuse", "跌落式熔断器", "#ea580c", ["fuse", "protection"], `${gLine(12, 42, 24, 42)}${gLine(42, 22, 54, 22)}${gLine(24, 42, 42, 22)}${gCircle(24, 42, 3)}${gCircle(42, 22, 3)}${gPath("M30 28l8 8")}`),
      generatedIcon("switchgear-cabinet", "开关柜", "#334155", ["switchgear", "cabinet"], `${gRect(18, 10, 28, 44, 3)}${gLine(18, 24, 46, 24)}${gLine(18, 38, 46, 38)}${gCircle(38, 17, 2)}${gCircle(38, 31, 2)}${gCircle(38, 45, 2)}`),
      generatedIcon("ring-main-unit", "环网柜", "#0f766e", ["rmu", "switchgear"], `${gRect(14, 14, 36, 36, 4)}${gCircle(32, 32, 12)}${gPath("M32 20v24M20 32h24")}${gCircle(32, 32, 3)}`),
      generatedIcon("cable-terminal", "电缆终端", "#64748b", ["cable", "terminal"], `${gPath("M16 50c12-12 20-24 32-36")}${gPath("M20 44h20")}${gPath("M24 38h18")}${gCircle(48, 14, 4)}${gLine(48, 18, 54, 24)}`),
      generatedIcon("transmission-tower", "输电铁塔", "#475569", ["tower", "transmission"], `${gPath("M32 8L18 56h28z")}${gLine(12, 22, 52, 22)}${gLine(16, 34, 48, 34)}${gLine(22, 46, 42, 46)}${gPath("M22 22l20 34M42 22L22 56")}`),
      generatedIcon("bus-coupler", "母联开关", "#2563eb", ["bus", "coupler"], `${gLine(8, 24, 56, 24)}${gLine(8, 42, 56, 42)}${gLine(32, 24, 32, 42)}${gCircle(32, 24, 3)}${gCircle(32, 42, 3)}${gText("BC", 32, 34, 8)}`),
      generatedIcon("feeder-bay", "馈线间隔", "#0891b2", ["feeder", "bay"], `${gLine(12, 14, 52, 14)}${gLine(32, 14, 32, 52)}${gRect(22, 24, 20, 12, 2)}${gCircle(32, 44, 4)}${gLine(24, 52, 40, 52)}`),
    ]),
    generatedCategory("industrial-loads", "工业负荷", "电机、风机、压缩机、输送线、炉窑、机械臂等工业用能负荷。", [
      generatedIcon("electric-motor", "电动机", "#2563eb", ["motor", "load"], `${gCircle(32, 32, 18)}${gText("M", 32, 32, 18)}${gLine(8, 32, 14, 32)}${gLine(50, 32, 56, 32)}`),
      generatedIcon("industrial-fan", "工业风机", "#0ea5e9", ["fan", "load"], `${gCircle(32, 32, 18)}${gCircle(32, 32, 3, 'fill="currentColor" stroke="none"')}${gPath("M32 29c4-12 13-10 12-2-1 6-7 6-12 2M35 34c12 4 10 13 2 12-6-1-6-7-2-12M29 35c-12 4-13-5-7-10 5-4 9 1 7 10")}`),
      generatedIcon("air-compressor", "空气压缩机", "#64748b", ["compressor", "air"], `${gCircle(26, 34, 12)}${gRect(36, 24, 14, 20, 3)}${gLine(8, 34, 14, 34)}${gLine(50, 34, 56, 34)}${gPath("M26 22v12l9 5")}`),
      generatedIcon("conveyor", "输送线", "#475569", ["conveyor", "load"], `${gRect(12, 30, 40, 10, 5)}${gCircle(20, 35, 4)}${gCircle(32, 35, 4)}${gCircle(44, 35, 4)}${gLine(18, 24, 46, 24)}${gPath("M40 19l6 5-6 5")}`),
      generatedIcon("industrial-furnace", "工业炉", "#dc2626", ["furnace", "heat"], `${gRect(16, 16, 32, 36, 4)}${gPath("M24 43c-2-5 3-8 5-12 2 5 8 6 6 12 4-2 7 1 7 4 0 4-4 6-10 6s-10-2-10-6c0-2 1-3 2-4")}${gLine(20, 16, 44, 16)}`),
      generatedIcon("crusher", "破碎机", "#334155", ["crusher", "load"], `${gRect(14, 18, 36, 28, 3)}${gPath("M20 22l8 20 8-20 8 20")}${gLine(10, 46, 54, 46)}${gLine(24, 54, 40, 54)}`),
      generatedIcon("robot-arm", "机械臂", "#7c3aed", ["robot", "arm"], `${gCircle(18, 48, 6)}${gLine(18, 42, 28, 28)}${gCircle(28, 28, 4)}${gLine(32, 28, 46, 20)}${gCircle(46, 20, 3)}${gPath("M48 18l6-6M48 22l6 4")}`),
      generatedIcon("welding-machine", "焊机", "#f59e0b", ["welding", "load"], `${gRect(14, 24, 24, 22, 3)}${gCircle(22, 35, 4)}${gLine(38, 35, 50, 24)}${gPath("M50 24l4-6M50 24l6 2M48 20l4 8")}${gLine(20, 46, 20, 54)}${gLine(32, 46, 32, 54)}`),
      generatedIcon("production-line", "产线", "#0f766e", ["production", "line"], `${gRect(10, 20, 12, 12, 2)}${gRect(28, 20, 12, 12, 2)}${gRect(46, 20, 8, 12, 2)}${gLine(22, 26, 28, 26)}${gLine(40, 26, 46, 26)}${gLine(10, 44, 54, 44)}${gPath("M48 39l6 5-6 5")}`),
      generatedIcon("cooling-fan-tower", "冷却风机", "#0891b2", ["cooling", "fan"], `${gRect(18, 18, 28, 34, 5)}${gCircle(32, 30, 10)}${gPath("M32 30l-6-6M32 30l8-2M32 30l-2 8")}${gLine(22, 52, 42, 52)}`),
      generatedIcon("crane", "行车吊机", "#ea580c", ["crane", "load"], `${gLine(10, 16, 54, 16)}${gLine(16, 16, 16, 52)}${gLine(48, 16, 48, 52)}${gLine(28, 16, 28, 34)}${gRect(24, 34, 8, 8, 1)}${gPath("M28 42v8l-4 4M28 50l4 4")}`),
      generatedIcon("industrial-boiler-load", "工艺锅炉", "#be123c", ["boiler", "industrial"], `${gRect(18, 12, 28, 40, 8)}${gLine(24, 24, 40, 24)}${gLine(24, 36, 40, 36)}${gPath("M28 48c-3-5 2-7 4-12 2 5 7 7 4 12")}`),
    ]),
    generatedCategory("automation-communication", "自动化通信", "服务器、网关、交换机、RTU、IED、HMI、摄像头和通信链路。", [
      generatedIcon("server-rack", "服务器机柜", "#334155", ["server", "rack"], `${gRect(18, 10, 28, 44, 3)}${gLine(18, 24, 46, 24)}${gLine(18, 38, 46, 38)}${gCircle(24, 17, 1.5)}${gCircle(24, 31, 1.5)}${gCircle(24, 45, 1.5)}`),
      generatedIcon("edge-gateway", "边缘网关", "#2563eb", ["gateway", "edge"], `${gRect(16, 22, 32, 20, 4)}${gCircle(26, 32, 3)}${gCircle(38, 32, 3)}${gLine(26, 22, 26, 14)}${gLine(38, 22, 38, 14)}${gPath("M22 14h20")}`),
      generatedIcon("network-switch", "网络交换机", "#0f766e", ["switch", "network"], `${gRect(12, 24, 40, 18, 3)}${gLine(18, 32, 22, 32)}${gLine(26, 32, 30, 32)}${gLine(34, 32, 38, 32)}${gLine(42, 32, 46, 32)}`),
      generatedIcon("wireless-router", "无线路由器", "#0891b2", ["router", "wifi"], `${gRect(16, 34, 32, 12, 3)}${gCircle(24, 40, 1.5, 'fill="currentColor" stroke="none"')}${gPath("M22 26a14 14 0 0 1 20 0")}${gPath("M26 30a8 8 0 0 1 12 0")}${gCircle(32, 32, 1.5)}`),
      generatedIcon("rtu-terminal", "RTU终端", "#7c3aed", ["rtu", "terminal"], `${gRect(14, 16, 36, 32, 3)}${gText("RTU", 32, 32, 10)}${gLine(20, 48, 20, 56)}${gLine(32, 48, 32, 56)}${gLine(44, 48, 44, 56)}`),
      generatedIcon("ied-device", "IED装置", "#4f46e5", ["ied", "relay"], `${gRect(14, 16, 36, 32, 3)}${gText("IED", 32, 32, 10)}${gCircle(22, 24, 2)}${gCircle(42, 24, 2)}${gLine(22, 42, 42, 42)}`),
      generatedIcon("hmi-panel", "HMI面板", "#0ea5e9", ["hmi", "screen"], `${gRect(10, 14, 44, 30, 4)}${gPath("M18 34l7-8 6 5 8-10 7 9")}${gLine(26, 52, 38, 52)}${gLine(32, 44, 32, 52)}`),
      generatedIcon("historian", "历史数据库", "#475569", ["historian", "database"], `${gPath("M18 18c0-4 28-4 28 0v28c0 4-28 4-28 0z")}${gPath("M18 18c0 4 28 4 28 0M18 32c0 4 28 4 28 0")}${gPath("M26 44h12")}`),
      generatedIcon("firewall", "防火墙", "#dc2626", ["firewall", "security"], `${gRect(12, 16, 40, 32, 3)}${gPath("M12 26h40M12 38h40M24 16v10M40 26v12M24 38v10")}${gPath("M31 35c-2-4 2-6 4-10 1 5 6 6 4 10")}`),
      generatedIcon("camera-monitor", "视频监控", "#64748b", ["camera", "monitor"], `${gRect(12, 22, 26, 16, 3)}${gPath("M38 27l12-6v18l-12-6z")}${gCircle(22, 30, 4)}${gLine(20, 46, 44, 46)}`),
      generatedIcon("antenna-station", "通信天线", "#0891b2", ["antenna", "station"], `${gLine(32, 24, 32, 54)}${gPath("M22 54h20")}${gPath("M25 18a10 10 0 0 1 14 0M20 12a18 18 0 0 1 24 0")}${gCircle(32, 24, 3)}`),
      generatedIcon("cloud-platform", "云平台", "#2563eb", ["cloud", "platform"], `${gPath("M18 42h28a8 8 0 0 0 0-16 14 14 0 0 0-27-4A10 10 0 0 0 18 42z")}${gPath("M28 34h8M32 30v8")}`),
    ]),
    generatedCategory("flow-diagram", "流程图与业务图", "处理、判断、数据库、文档、延迟、连接点等通用流程图图元。", [
      generatedIcon("flow-process", "流程处理", "#2563eb", ["flow", "process"], `${gRect(12, 20, 40, 24, 2)}${gText("P", 32, 32, 14)}`),
      generatedIcon("flow-decision", "流程判断", "#7c3aed", ["flow", "decision"], `${gPath("M32 10l22 22-22 22L10 32z")}${gText("?", 32, 32, 14)}`),
      generatedIcon("flow-database", "流程数据库", "#475569", ["flow", "database"], `${gPath("M18 18c0-5 28-5 28 0v28c0 5-28 5-28 0z")}${gPath("M18 18c0 5 28 5 28 0M18 32c0 5 28 5 28 0")}`),
      generatedIcon("flow-terminator", "开始结束", "#16a34a", ["flow", "terminator"], `${gRect(12, 22, 40, 20, 10)}${gText("END", 32, 32, 9)}`),
      generatedIcon("flow-document", "流程文档", "#0ea5e9", ["flow", "document"], `${gPath("M16 12h32v34c-10-6-18 6-32 0z")}${gLine(24, 24, 40, 24)}${gLine(24, 32, 36, 32)}`),
      generatedIcon("flow-delay", "流程延迟", "#f59e0b", ["flow", "delay"], `${gPath("M16 16h18a16 16 0 0 1 0 32H16z")}${gText("D", 30, 32, 12)}`),
      generatedIcon("flow-connector", "流程连接点", "#64748b", ["flow", "connector"], `${gCircle(32, 32, 17)}${gText("A", 32, 32, 12)}`),
      generatedIcon("flow-offpage", "离页连接", "#334155", ["flow", "offpage"], `${gPath("M16 12h32v28L32 54 16 40z")}${gText("1", 32, 31, 13)}`),
      generatedIcon("flow-preparation", "流程准备", "#0891b2", ["flow", "preparation"], `${gPath("M20 16h24l10 16-10 16H20L10 32z")}${gText("R", 32, 32, 12)}`),
      generatedIcon("flow-subprocess", "子流程", "#4f46e5", ["flow", "subprocess"], `${gRect(12, 20, 40, 24, 2)}${gLine(20, 20, 20, 44)}${gLine(44, 20, 44, 44)}`),
      generatedIcon("flow-merge", "流程合并", "#0f766e", ["flow", "merge"], `${gPath("M12 14l20 38 20-38z")}${gLine(32, 14, 32, 52)}`),
      generatedIcon("flow-manual", "人工操作", "#ea580c", ["flow", "manual"], `${gPath("M14 18h36l-6 28H20z")}${gText("手", 32, 32, 13)}`),
    ]),
    generatedCategory("building-facility", "建筑与设施", "厂房、站房、仓库、数据中心、实验室、泵房和充电站等设施图标。", [
      generatedIcon("factory-building", "厂房", "#475569", ["factory", "facility"], `${gPath("M14 50V28l10 6V26l10 8V24l16 10v16z")}${gLine(18, 50, 54, 50)}${gPath("M20 42h6M32 42h6M44 42h6")}`),
      generatedIcon("substation-building", "变电站站房", "#2563eb", ["substation", "building"], `${gRect(14, 24, 36, 26, 2)}${gPath("M12 24l20-14 20 14")}${gLine(24, 50, 24, 36)}${gLine(40, 50, 40, 36)}${gText("S", 32, 34, 10)}`),
      generatedIcon("warehouse", "仓库", "#64748b", ["warehouse"], `${gPath("M10 28l22-14 22 14v24H10z")}${gRect(24, 36, 16, 16)}${gLine(16, 28, 48, 28)}`),
      generatedIcon("data-center", "数据中心", "#334155", ["data", "center"], `${gRect(14, 12, 36, 40, 3)}${gLine(14, 24, 50, 24)}${gLine(14, 36, 50, 36)}${gCircle(22, 18, 1.5)}${gCircle(22, 30, 1.5)}${gCircle(22, 42, 1.5)}`),
      generatedIcon("laboratory", "实验室", "#7c3aed", ["lab", "facility"], `${gLine(24, 12, 40, 12)}${gLine(28, 12, 28, 28)}${gPath("M28 28L18 50h28L36 28")}${gLine(23, 40, 41, 40)}`),
      generatedIcon("office-building", "办公楼", "#0ea5e9", ["office", "building"], `${gRect(18, 10, 28, 44, 2)}${gPath("M24 18h4M36 18h4M24 28h4M36 28h4M24 38h4M36 38h4")}${gRect(29, 46, 6, 8)}`),
      generatedIcon("pump-room", "泵房", "#0284c7", ["pump", "room"], `${gRect(12, 24, 40, 28, 2)}${gPath("M12 24l20-12 20 12")}${gCircle(32, 38, 8)}${gLine(18, 38, 24, 38)}${gLine(40, 38, 46, 38)}`),
      generatedIcon("tank-farm", "罐区", "#0f766e", ["tank", "facility"], `${gRect(14, 20, 14, 28, 7)}${gRect(36, 16, 14, 32, 7)}${gLine(12, 52, 52, 52)}${gLine(21, 48, 21, 54)}${gLine(43, 48, 43, 54)}`),
      generatedIcon("charging-station-facility", "充电站", "#16a34a", ["charging", "station"], `${gPath("M12 26l20-14 20 14v26H12z")}${gRect(22, 30, 12, 18, 2)}${gPath("M40 30h5l3 5v10c0 4-5 4-5 0v-7")}`),
      generatedIcon("parking-lot", "停车场", "#2563eb", ["parking"], `${gRect(14, 12, 36, 40, 3)}${gText("P", 32, 32, 22)}${gLine(18, 52, 46, 52)}`),
      generatedIcon("lighting-pole", "照明杆", "#f59e0b", ["lighting", "facility"], `${gLine(30, 20, 30, 54)}${gPath("M30 20h16l6 6H36z")}${gPath("M42 28c-5 6-13 6-18 0")}${gLine(22, 54, 38, 54)}`),
      generatedIcon("control-room", "控制室", "#4f46e5", ["control", "room"], `${gRect(12, 18, 40, 30, 4)}${gPath("M20 38l6-7 5 4 7-10 7 9")}${gLine(22, 54, 42, 54)}${gLine(32, 48, 32, 54)}`),
    ]),
    generatedCategory("weather-environment", "气象与环境", "日照、云雨、风、雪、温湿度、粉尘、碳排和环保类图标。", [
      generatedIcon("sun-radiation", "日照", "#f59e0b", ["sun", "radiation"], `${gCircle(32, 32, 9)}${gPath("M32 8v8M32 48v8M8 32h8M48 32h8M15 15l6 6M43 43l6 6M49 15l-6 6M21 43l-6 6")}`),
      generatedIcon("cloud-rain", "降雨", "#0284c7", ["rain", "cloud"], `${gPath("M18 34h28a8 8 0 0 0 0-16 13 13 0 0 0-25-3A9 9 0 0 0 18 34z")}${gLine(24, 42, 20, 50)}${gLine(34, 42, 30, 50)}${gLine(44, 42, 40, 50)}`),
      generatedIcon("wind-speed", "风速", "#0ea5e9", ["wind"], `${gPath("M12 24h30a6 6 0 1 0-6-6")}${gPath("M10 34h38a5 5 0 1 1-5 5")}${gPath("M18 44h18")}`),
      generatedIcon("snow", "降雪", "#60a5fa", ["snow"], `${gLine(32, 12, 32, 52)}${gLine(15, 22, 49, 42)}${gLine(49, 22, 15, 42)}${gCircle(32, 32, 3)}`),
      generatedIcon("lightning-weather", "雷电", "#eab308", ["lightning", "weather"], `${gPath("M20 30h14l-6 20 18-28H32l6-12z")}${gPath("M16 18h10")}${gPath("M42 46h8")}`),
      generatedIcon("temperature", "温度", "#dc2626", ["temperature"], `${gPath("M28 14a4 4 0 0 1 8 0v23a10 10 0 1 1-8 0z")}${gLine(32, 20, 32, 42)}${gCircle(32, 46, 4)}`),
      generatedIcon("humidity", "湿度", "#06b6d4", ["humidity"], `${gPath("M32 10c12 14 18 24 18 32a18 18 0 0 1-36 0c0-8 6-18 18-32z")}${gPath("M24 42c2 5 10 7 16 2")}`),
      generatedIcon("dust", "粉尘", "#a16207", ["dust", "environment"], `${gCircle(18, 24, 3)}${gCircle(30, 20, 2)}${gCircle(44, 26, 3)}${gCircle(24, 38, 2)}${gCircle(40, 42, 2)}${gPath("M12 50h40")}`),
      generatedIcon("carbon-emission", "碳排放", "#475569", ["carbon", "emission"], `${gPath("M18 42h28a8 8 0 0 0 0-16 13 13 0 0 0-25-3A9 9 0 0 0 18 42z")}${gText("CO₂", 33, 34, 10)}`),
      generatedIcon("eco-leaf", "绿色环保", "#16a34a", ["eco", "leaf"], `${gPath("M14 48C16 28 30 16 52 12c-2 22-14 36-38 36z")}${gPath("M16 46c10-10 20-18 32-28")}`),
      generatedIcon("water-quality", "水质", "#0284c7", ["water", "quality"], `${gPath("M32 10c11 13 16 22 16 30a16 16 0 0 1-32 0c0-8 5-17 16-30z")}${gPath("M24 42h16M26 34h12")}`),
      generatedIcon("noise-monitor", "噪声监测", "#7c3aed", ["noise", "monitor"], `${gPath("M18 38h-6V26h6l12-10v32z")}${gPath("M36 24c3 4 3 12 0 16M42 18c6 8 6 20 0 28")}`),
    ]),
    generatedCategory("business-operation", "运营管理", "看板、报表、成本、合同、日程、任务、审批、库存等运营类图标。", [
      generatedIcon("dashboard", "运营看板", "#2563eb", ["dashboard"], `${gRect(12, 14, 40, 36, 4)}${gPath("M20 40a12 12 0 0 1 24 0")}${gLine(32, 40, 40, 28)}${gLine(20, 22, 28, 22)}${gLine(36, 22, 44, 22)}`),
      generatedIcon("report-doc", "统计报表", "#475569", ["report", "document"], `${gPath("M18 10h22l8 8v36H18z")}${gPath("M40 10v10h8")}${gPath("M24 44V30M32 44V24M40 44V34")}`),
      generatedIcon("cost", "成本", "#16a34a", ["cost", "money"], `${gCircle(32, 32, 18)}${gText("￥", 32, 31, 18)}${gPath("M22 48h20")}`),
      generatedIcon("contract", "合同", "#334155", ["contract"], `${gPath("M18 10h28v44H18z")}${gLine(24, 22, 40, 22)}${gLine(24, 30, 40, 30)}${gLine(24, 38, 34, 38)}${gPath("M38 46l4 4 8-10")}`),
      generatedIcon("schedule", "日程", "#0ea5e9", ["calendar", "schedule"], `${gRect(14, 16, 36, 34, 3)}${gLine(14, 26, 50, 26)}${gLine(24, 10, 24, 20)}${gLine(40, 10, 40, 20)}${gCircle(26, 36, 2)}${gCircle(38, 36, 2)}`),
      generatedIcon("task-list", "任务清单", "#7c3aed", ["task", "list"], `${gRect(14, 12, 36, 40, 3)}${gPath("M22 24l3 3 6-7")}${gLine(34, 25, 44, 25)}${gPath("M22 38l3 3 6-7")}${gLine(34, 39, 44, 39)}`),
      generatedIcon("approval", "审批", "#16a34a", ["approval"], `${gRect(14, 14, 36, 36, 4)}${gPath("M22 34l7 7 15-18")}${gCircle(44, 20, 4)}`),
      generatedIcon("inventory", "库存", "#a16207", ["inventory"], `${gPath("M14 22l18-10 18 10-18 10z")}${gPath("M14 22v20l18 10 18-10V22")}${gLine(32, 32, 32, 52)}`),
      generatedIcon("map-operation", "运维地图", "#0891b2", ["map", "operation"], `${gPath("M12 16l14-4 12 4 14-4v36l-14 4-12-4-14 4z")}${gLine(26, 12, 26, 48)}${gLine(38, 16, 38, 52)}${gCircle(32, 32, 4)}`),
      generatedIcon("team-users", "班组人员", "#4f46e5", ["team", "users"], `${gCircle(24, 24, 5)}${gCircle(40, 24, 5)}${gCircle(32, 20, 5)}${gPath("M14 50c3-10 17-10 20 0M30 50c3-10 17-10 20 0")}`),
      generatedIcon("ticket-warning", "工单告警", "#f59e0b", ["ticket", "warning"], `${gPath("M12 22h40v10a4 4 0 0 0 0 8v10H12V40a4 4 0 0 0 0-8z")}${gLine(32, 28, 32, 38)}${gCircle(32, 44, 1.5, 'fill="currentColor" stroke="none"')}`),
      generatedIcon("kpi-target", "指标目标", "#dc2626", ["kpi", "target"], `${gCircle(32, 32, 20)}${gCircle(32, 32, 12)}${gCircle(32, 32, 4)}${gLine(42, 22, 52, 12)}${gPath("M52 12h-8M52 12v8")}`),
    ]),
    generatedCategory("diagram-symbols", "图形符号扩展", "常用线框、徽章、方向、注释、分组和图层类符号。", [
      generatedIcon("layer-stack-symbol", "图层堆叠", "#2563eb", ["layer", "stack"], `${gPath("M32 12l22 12-22 12-22-12z")}${gPath("M12 34l20 10 20-10")}${gPath("M12 44l20 10 20-10")}`),
      generatedIcon("group-symbol", "组合", "#64748b", ["group"], `${gRect(12, 12, 16, 16, 2, generatedThinAttrs)}${gRect(36, 12, 16, 16, 2, generatedThinAttrs)}${gRect(12, 36, 16, 16, 2, generatedThinAttrs)}${gRect(36, 36, 16, 16, 2, generatedThinAttrs)}${gPath("M28 20h8M20 28v8M44 28v8M28 44h8", generatedThinAttrs)}`),
      generatedIcon("annotation-pin", "标注图钉", "#f59e0b", ["annotation", "pin"], `${gPath("M22 12h20l-4 14 8 8H18l8-8z")}${gLine(32, 34, 32, 54)}`),
      generatedIcon("direction-compass", "方向罗盘", "#0891b2", ["direction", "compass"], `${gCircle(32, 32, 20)}${gPath("M40 16l-6 20-18 12 6-20z")}${gCircle(32, 32, 3)}`),
      generatedIcon("selection-box", "选择框", "#2563eb", ["selection"], `${gRect(14, 14, 36, 36, 2, 'fill="none" stroke="currentColor" stroke-width="2.4" stroke-dasharray="5 4"')}${gRect(10, 10, 8, 8, 1)}${gRect(46, 46, 8, 8, 1)}`),
      generatedIcon("resize-corner", "尺寸调整", "#7c3aed", ["resize"], `${gRect(14, 14, 36, 36, 2)}${gPath("M34 44h10V34M28 36l8-8M34 28h2v2")}`),
      generatedIcon("rotate-symbol", "旋转", "#0f766e", ["rotate"], `${gPath("M44 22a16 16 0 1 0 2 18")}${gPath("M44 12v10H34")}${gLine(32, 32, 42, 42)}`),
      generatedIcon("polyline-symbol", "多段线", "#334155", ["polyline", "line"], `${gPath("M10 18h18v16h18v16")}${gCircle(10, 18, 3)}${gCircle(28, 18, 3)}${gCircle(28, 34, 3)}${gCircle(46, 34, 3)}${gCircle(46, 50, 3)}`),
      generatedIcon("curve-symbol", "曲线", "#0ea5e9", ["curve"], `${gPath("M10 46c8-34 18 20 28-10 5-14 10-16 16-10")}${gCircle(10, 46, 3)}${gCircle(54, 26, 3)}`),
      generatedIcon("polygon-symbol", "多边形", "#ea580c", ["polygon"], `${gPath("M18 18l22-6 14 18-10 22H20L10 34z")}${gCircle(18, 18, 2)}${gCircle(40, 12, 2)}${gCircle(54, 30, 2)}${gCircle(44, 52, 2)}${gCircle(20, 52, 2)}${gCircle(10, 34, 2)}`),
      generatedIcon("grid-symbol", "网格", "#475569", ["grid"], `${gRect(12, 12, 40, 40, 2)}${gLine(25, 12, 25, 52)}${gLine(39, 12, 39, 52)}${gLine(12, 25, 52, 25)}${gLine(12, 39, 52, 39)}`),
      generatedIcon("anchor-point", "锚点", "#dc2626", ["anchor", "point"], `${gCircle(32, 32, 5)}${gLine(32, 10, 32, 27)}${gLine(32, 37, 32, 54)}${gLine(10, 32, 27, 32)}${gLine(37, 32, 54, 32)}`),
    ]),
  ];
}

iconCategories.push(...buildAdditionalDocerCompatibleCategories());

function buildMoreDocerCompatibleCategories() {
  return [
    generatedCategory("power-market-carbon", "电力市场与碳管理", "电价、交易、碳排、绿证、收益、结算和能效管理类图标。", [
      generatedIcon("electricity-price", "电价", "#16a34a", ["price", "electricity", "market"], `${gCircle(32, 32, 18)}${gText("￥", 28, 31, 16)}${gPath("M37 20v24M32 28h10M32 36h10")}`),
      generatedIcon("market-trading", "市场交易", "#2563eb", ["market", "trading"], `${gPath("M12 42h40")}${gPath("M18 42V26h8v16M30 42V18h8v24M42 42V30h8v12")}${gPath("M16 18l10-6 12 8 10-8")}`),
      generatedIcon("carbon-credit", "碳配额", "#0f766e", ["carbon", "credit"], `${gCircle(32, 32, 20)}${gText("CO₂", 32, 27, 10)}${gPath("M20 40c8-8 16-8 24 0")}${gPath("M24 46h16")}`),
      generatedIcon("green-certificate", "绿证", "#16a34a", ["green", "certificate"], `${gPath("M18 10h28v44H18z")}${gPath("M24 34c6-12 16-14 22-14-1 12-9 20-22 20z")}${gPath("M24 40c5-5 10-9 18-16")}`),
      generatedIcon("settlement-bill", "结算单", "#475569", ["settlement", "bill"], `${gPath("M18 10h28v44H18z")}${gPath("M24 22h16M24 30h16M24 38h10")}${gText("￥", 39, 43, 12)}`),
      generatedIcon("profit-analysis", "收益分析", "#0891b2", ["profit", "analysis"], `${gRect(12, 14, 40, 36, 4)}${gPath("M20 40l8-8 7 5 10-14")}${gPath("M40 23h5v5")}${gText("%", 25, 25, 8)}`),
      generatedIcon("energy-efficiency", "能效", "#84cc16", ["energy", "efficiency"], `${gCircle(32, 32, 20)}${gPath("M32 14l-8 20h8l-4 16 14-24h-8z")}${gPath("M18 44c8 6 20 6 28 0")}`),
      generatedIcon("demand-response", "需求响应", "#7c3aed", ["demand", "response"], `${gRect(14, 18, 36, 28, 4)}${gPath("M22 36c4-14 8-14 12 0s8 14 12 0")}${gPath("M26 12v6M38 12v6M32 46v8")}`),
      generatedIcon("load-forecast", "负荷预测", "#0284c7", ["load", "forecast"], `${gPath("M12 50h40M12 50V14")}${gPath("M18 42c8-20 14 10 22-10 3-8 7-10 10-12")}${gPath("M42 20h8v8")}`),
      generatedIcon("renewable-quota", "新能源配额", "#f59e0b", ["renewable", "quota"], `${gCircle(24, 28, 8)}${gPath("M24 8v8M24 40v8M4 28h8M36 28h8")}${gPath("M42 18h10v28H42z")}${gText("%", 47, 32, 10)}`),
      generatedIcon("contract-energy", "购售电合同", "#334155", ["contract", "energy"], `${gPath("M18 10h28v44H18z")}${gPath("M24 22h16M24 30h16")}${gPath("M26 46l4-10h-6l8-14-2 10h6z")}`),
      generatedIcon("carbon-meter", "碳计量", "#0f766e", ["carbon", "meter"], `${gCircle(32, 34, 18)}${gPath("M20 36a12 12 0 0 1 24 0")}${gPath("M32 34l9-9")}${gText("C", 32, 47, 9)}`),
    ]),
    generatedCategory("safety-fire", "安全消防", "火灾、烟感、喷淋、急停、防护、风险和应急疏散类图标。", [
      generatedIcon("fire-alarm", "火灾告警", "#dc2626", ["fire", "alarm"], `${gPath("M32 10l22 40H10z")}${gPath("M30 42c-4-6 2-9 4-16 4 7 10 10 4 16")}${gCircle(32, 48, 1.8, 'fill="currentColor" stroke="none"')}`),
      generatedIcon("smoke-detector", "烟感", "#64748b", ["smoke", "detector"], `${gRect(18, 18, 28, 10, 5)}${gPath("M24 34c-3 4 3 6 0 10M32 34c-3 4 3 6 0 10M40 34c-3 4 3 6 0 10")}${gCircle(32, 23, 2)}`),
      generatedIcon("sprinkler", "喷淋", "#0284c7", ["sprinkler", "fire"], `${gPath("M24 14h16v8H24z")}${gLine(32, 22, 32, 32)}${gPath("M20 36l-6 8M28 38l-2 10M36 38l2 10M44 36l6 8")}`),
      generatedIcon("emergency-stop", "急停按钮", "#dc2626", ["emergency", "stop"], `${gCircle(32, 32, 20)}${gRect(22, 22, 20, 20, 3)}${gText("STOP", 32, 33, 8)}`),
      generatedIcon("protective-helmet", "安全帽", "#f59e0b", ["helmet", "safety"], `${gPath("M14 36a18 18 0 0 1 36 0")}${gPath("M12 36h40v8H12z")}${gPath("M28 18v18M36 18v18")}`),
      generatedIcon("warning-risk", "风险警示", "#eab308", ["warning", "risk"], `${gPath("M32 10l24 42H8z")}${gLine(32, 24, 32, 38)}${gCircle(32, 45, 1.8, 'fill="currentColor" stroke="none"')}`),
      generatedIcon("evacuation-route", "疏散路线", "#16a34a", ["evacuation", "route"], `${gRect(12, 14, 40, 36, 3)}${gPath("M22 42h18l-5-5M40 42l-5 5")}${gCircle(27, 24, 3)}${gPath("M28 28l-5 8M28 28l8 4")}`),
      generatedIcon("first-aid", "急救", "#dc2626", ["first-aid", "safety"], `${gRect(14, 18, 36, 28, 4)}${gLine(32, 26, 32, 40)}${gLine(25, 33, 39, 33)}${gPath("M24 18v-6h16v6")}`),
      generatedIcon("gas-leak", "气体泄漏", "#ea580c", ["gas", "leak"], `${gRect(18, 24, 18, 24, 4)}${gPath("M36 32h8c6 0 6 8 0 8h-4")}${gPath("M46 18c-4 3-4 6 0 9M52 16c-5 5-5 10 0 15")}`),
      generatedIcon("access-control-safety", "门禁安全", "#4f46e5", ["access", "control"], `${gRect(18, 14, 28, 40, 3)}${gCircle(38, 34, 2)}${gPath("M24 24h10v8H24z")}${gPath("M28 24v-4a5 5 0 0 1 10 0v4")}`),
      generatedIcon("shield-person", "人员防护", "#2563eb", ["shield", "person"], `${gPath("M32 10l18 8v14c0 12-7 19-18 22-11-3-18-10-18-22V18z")}${gCircle(32, 28, 4)}${gPath("M24 42c2-7 14-7 16 0")}`),
      generatedIcon("inspection-check", "安全巡检", "#0f766e", ["inspection", "check"], `${gRect(16, 12, 32, 40, 3)}${gPath("M24 30l5 5 11-13")}${gLine(24, 42, 40, 42)}${gPath("M26 12h12l2 6H24z")}`),
    ]),
    generatedCategory("maintenance-tools", "检修工具", "扳手、螺丝刀、工具箱、校验、备件、润滑、清洁和工单处理图标。", [
      generatedIcon("wrench-tool", "扳手", "#475569", ["wrench", "tool"], `${gPath("M42 12a10 10 0 0 0-12 12L14 40l10 10 16-16a10 10 0 0 0 12-12l-8 8-6-6z")}`),
      generatedIcon("screwdriver-tool", "螺丝刀", "#64748b", ["screwdriver", "tool"], `${gPath("M42 10l12 12-8 8-12-12z")}${gPath("M34 18L12 40v12h12l22-22")}`),
      generatedIcon("toolbox", "工具箱", "#ea580c", ["toolbox"], `${gRect(12, 24, 40, 26, 3)}${gPath("M24 24v-8h16v8M12 34h40")}${gRect(28, 31, 8, 6, 1)}`),
      generatedIcon("calibration", "校验", "#2563eb", ["calibration"], `${gCircle(32, 32, 18)}${gPath("M20 34a12 12 0 0 1 24 0")}${gPath("M32 32l10-8")}${gPath("M24 46h16")}`),
      generatedIcon("spare-parts", "备品备件", "#0f766e", ["spare", "parts"], `${gPath("M18 20l14-8 14 8v24l-14 8-14-8z")}${gPath("M18 20l14 8 14-8M32 28v24")}${gCircle(32, 32, 4)}`),
      generatedIcon("lubrication", "润滑", "#0284c7", ["lubrication"], `${gPath("M26 12h12v12l8 20a8 8 0 0 1-8 10H26a8 8 0 0 1-8-10l8-20z")}${gPath("M24 42h16")}${gPath("M32 30c5 6 8 10 8 14a8 8 0 0 1-16 0c0-4 3-8 8-14z")}`),
      generatedIcon("cleaning", "清洁", "#06b6d4", ["cleaning"], `${gPath("M18 44h28l-4 10H22z")}${gPath("M28 44V18h8v26")}${gPath("M24 18h16")}${gPath("M16 50h32")}`),
      generatedIcon("work-order", "检修工单", "#334155", ["work-order"], `${gRect(16, 12, 32, 40, 3)}${gPath("M24 24h16M24 32h16M24 40h10")}${gPath("M36 48l4 4 8-10")}`),
      generatedIcon("maintenance-plan", "检修计划", "#7c3aed", ["maintenance", "plan"], `${gRect(14, 16, 36, 34, 3)}${gLine(14, 26, 50, 26)}${gPath("M24 10v10M40 10v10")}${gPath("M24 38l5 5 11-12")}`),
      generatedIcon("fault-repair", "故障修复", "#dc2626", ["fault", "repair"], `${gCircle(32, 32, 18)}${gPath("M24 24l16 16M40 24L24 40")}${gPath("M16 48l8-8M48 16l-8 8")}`),
      generatedIcon("bearing", "轴承", "#64748b", ["bearing"], `${gCircle(32, 32, 20)}${gCircle(32, 32, 8)}${gCircle(32, 16, 3)}${gCircle(32, 48, 3)}${gCircle(16, 32, 3)}${gCircle(48, 32, 3)}`),
      generatedIcon("torque", "力矩", "#f59e0b", ["torque"], `${gCircle(32, 32, 16)}${gPath("M32 16v16l12 6")}${gPath("M16 32a16 16 0 0 1 28-10")}${gPath("M44 14v8h-8")}`),
    ]),
    generatedCategory("sensors-instruments", "传感仪表", "压力、流量、液位、振动、温湿度、气体、红外和电能质量仪表。", [
      generatedIcon("pressure-gauge", "压力表", "#2563eb", ["pressure", "gauge"], `${gCircle(32, 34, 18)}${gPath("M20 36a12 12 0 0 1 24 0")}${gPath("M32 34l8-8")}${gText("P", 32, 48, 9)}`),
      generatedIcon("flow-meter", "流量计", "#0284c7", ["flow", "meter"], `${gRect(12, 24, 40, 16, 8)}${gCircle(32, 32, 8)}${gPath("M28 32h8M34 28l4 4-4 4")}`),
      generatedIcon("level-meter", "液位计", "#06b6d4", ["level", "meter"], `${gRect(24, 12, 16, 40, 8)}${gPath("M24 34h16M24 42h16")}${gPath("M44 16v32M48 20v24")}`),
      generatedIcon("vibration-sensor", "振动传感器", "#7c3aed", ["vibration", "sensor"], `${gCircle(32, 32, 8)}${gPath("M16 22c-5 6-5 14 0 20M48 22c5 6 5 14 0 20M22 18c-4 8-4 20 0 28M42 18c4 8 4 20 0 28")}`),
      generatedIcon("thermal-sensor", "温度传感器", "#dc2626", ["thermal", "sensor"], `${gPath("M28 14a4 4 0 0 1 8 0v23a10 10 0 1 1-8 0z")}${gLine(32, 20, 32, 42)}${gCircle(32, 46, 4)}`),
      generatedIcon("humidity-sensor", "湿度传感器", "#0891b2", ["humidity", "sensor"], `${gPath("M32 10c10 12 16 21 16 30a16 16 0 0 1-32 0c0-9 6-18 16-30z")}${gPath("M24 42c3 4 13 4 16 0")}`),
      generatedIcon("gas-sensor", "气体传感器", "#ea580c", ["gas", "sensor"], `${gRect(18, 20, 28, 28, 4)}${gCircle(27, 34, 3)}${gCircle(37, 30, 2)}${gCircle(38, 40, 2)}${gPath("M24 14h16v6")}`),
      generatedIcon("infrared-camera", "红外测温", "#be123c", ["infrared", "camera"], `${gRect(12, 22, 28, 18, 3)}${gPath("M40 28l10-6v18l-10-6z")}${gCircle(26, 31, 5)}${gPath("M20 48c8-6 16-6 24 0")}`),
      generatedIcon("power-quality", "电能质量", "#4f46e5", ["power", "quality"], `${gRect(12, 16, 40, 32, 4)}${gPath("M18 34c4-14 8-14 12 0s8 14 12 0")}${gPath("M42 22l-4 10h6l-8 12 2-10h-6z")}`),
      generatedIcon("smart-meter", "智能电表", "#0f766e", ["smart", "meter"], `${gRect(18, 12, 28, 40, 4)}${gCircle(32, 30, 10)}${gPath("M27 31l5-5 5 5")}${gText("kWh", 32, 44, 8)}`),
      generatedIcon("weather-station", "气象站", "#0ea5e9", ["weather", "station"], `${gLine(32, 20, 32, 54)}${gPath("M20 54h24")}${gCircle(32, 16, 5)}${gPath("M16 32h32M42 26l6 6-6 6")}`),
      generatedIcon("signal-analyzer", "信号分析仪", "#334155", ["signal", "analyzer"], `${gRect(12, 16, 40, 32, 4)}${gPath("M20 36h6l4-10 6 18 4-8h6")}${gCircle(22, 24, 2)}${gCircle(42, 24, 2)}`),
    ]),
    generatedCategory("water-wastewater", "水务环保", "取水、净水、污水、沉淀、加药、过滤、排放和水泵站图标。", [
      generatedIcon("water-intake", "取水口", "#0284c7", ["water", "intake"], `${gPath("M12 46c5-4 10-4 15 0s10 4 15 0 5-4 10 0")}${gPath("M12 54c5-4 10-4 15 0s10 4 15 0 5-4 10 0")}${gPath("M32 10v28M24 30l8 8 8-8")}`),
      generatedIcon("water-treatment", "净水处理", "#06b6d4", ["water", "treatment"], `${gRect(14, 18, 36, 28, 6)}${gPath("M22 30h20M22 38h20")}${gPath("M32 10c5 6 8 10 8 15a8 8 0 0 1-16 0c0-5 3-9 8-15z")}`),
      generatedIcon("wastewater", "污水处理", "#64748b", ["wastewater"], `${gRect(12, 24, 40, 22, 4)}${gPath("M16 34c5-4 10-4 15 0s10 4 17 0")}${gCircle(24, 40, 2)}${gCircle(38, 38, 2)}${gLine(20, 46, 20, 54)}${gLine(44, 46, 44, 54)}`),
      generatedIcon("sedimentation", "沉淀池", "#475569", ["sedimentation"], `${gRect(12, 20, 40, 28, 4)}${gPath("M18 32h28M18 40h28")}${gPath("M24 26l8 16 8-16")}`),
      generatedIcon("chemical-dosing", "加药装置", "#7c3aed", ["chemical", "dosing"], `${gRect(18, 16, 20, 34, 4)}${gPath("M24 16v-6h8v6")}${gLine(38, 34, 52, 34)}${gPath("M44 28v12")}${gText("+", 28, 34, 16)}`),
      generatedIcon("filter-unit", "过滤器", "#0f766e", ["filter"], `${gPath("M16 14h32L36 32v16l-8 6V32z")}${gLine(22, 22, 42, 22)}${gLine(25, 28, 39, 28)}`),
      generatedIcon("sludge-tank", "污泥池", "#a16207", ["sludge", "tank"], `${gRect(16, 18, 32, 32, 10)}${gPath("M22 36c4-3 8-3 12 0s8 3 12 0")}${gCircle(26, 42, 2)}${gCircle(38, 43, 2)}`),
      generatedIcon("water-pump-station", "泵站", "#2563eb", ["pump", "station"], `${gPath("M12 26l20-14 20 14v26H12z")}${gCircle(32, 38, 8)}${gLine(18, 38, 24, 38)}${gLine(40, 38, 46, 38)}`),
      generatedIcon("pipe-valve", "管道阀门", "#334155", ["pipe", "valve"], `${gLine(8, 32, 24, 32)}${gLine(40, 32, 56, 32)}${gPath("M24 22l16 20M40 22L24 42")}${gLine(32, 22, 32, 12)}${gLine(24, 12, 40, 12)}`),
      generatedIcon("outfall", "排放口", "#0284c7", ["outfall"], `${gRect(12, 24, 26, 16, 3)}${gLine(38, 32, 54, 32)}${gPath("M18 48c5-4 10-4 15 0s10 4 15 0")}${gPath("M18 54c5-4 10-4 15 0s10 4 15 0")}`),
      generatedIcon("reclaimed-water", "再生水", "#16a34a", ["reclaimed", "water"], `${gPath("M32 10c10 12 16 21 16 30a16 16 0 0 1-32 0c0-9 6-18 16-30z")}${gPath("M25 38a8 8 0 0 1 14-5")}${gPath("M39 33h-6v-6")}`),
      generatedIcon("water-network", "水网", "#0ea5e9", ["water", "network"], `${gCircle(16, 22, 4)}${gCircle(48, 22, 4)}${gCircle(32, 42, 4)}${gLine(20, 24, 29, 39)}${gLine(44, 24, 35, 39)}${gLine(16, 26, 16, 50)}${gLine(48, 26, 48, 50)}`),
    ]),
    generatedCategory("oil-gas-chemical", "油气化工", "油罐、天然气、压缩机、反应釜、换热、管廊、火炬和化学品图标。", [
      generatedIcon("oil-tank", "油罐", "#64748b", ["oil", "tank"], `${gRect(18, 14, 28, 38, 12)}${gPath("M24 22h16M24 34h16M24 46h16")}${gLine(24, 52, 24, 56)}${gLine(40, 52, 40, 56)}`),
      generatedIcon("gas-pipeline", "天然气管线", "#f59e0b", ["gas", "pipeline"], `${gLine(8, 32, 56, 32)}${gLine(20, 24, 20, 40)}${gLine(44, 24, 44, 40)}${gPath("M28 24c-3 5 4 7 1 12M36 24c-3 5 4 7 1 12")}`),
      generatedIcon("chemical-reactor", "反应釜", "#7c3aed", ["reactor", "chemical"], `${gRect(20, 16, 24, 34, 8)}${gLine(32, 10, 32, 16)}${gLine(26, 10, 38, 10)}${gPath("M24 34h16M28 24l8 20M36 24l-8 20")}`),
      generatedIcon("distillation-column", "精馏塔", "#475569", ["distillation", "column"], `${gRect(26, 8, 12, 48, 6)}${gLine(20, 18, 44, 18)}${gLine(20, 30, 44, 30)}${gLine(20, 42, 44, 42)}${gLine(38, 14, 52, 14)}${gLine(12, 50, 26, 50)}`),
      generatedIcon("flare-stack", "火炬", "#dc2626", ["flare"], `${gLine(32, 24, 32, 56)}${gLine(24, 56, 40, 56)}${gPath("M28 24c-4-6 2-10 4-16 4 6 10 10 4 16")}${gPath("M24 34h16")}`),
      generatedIcon("heat-exchanger-chemical", "化工换热器", "#ea580c", ["heat-exchanger", "chemical"], `${gRect(14, 20, 36, 24, 12)}${gLine(8, 32, 14, 32)}${gLine(50, 32, 56, 32)}${gPath("M24 22c-7 8 7 12 0 20M40 22c-7 8 7 12 0 20")}`),
      generatedIcon("chemical-storage", "化学品储罐", "#0891b2", ["chemical", "storage"], `${gRect(18, 16, 28, 34, 8)}${gText("CHEM", 32, 33, 7)}${gPath("M24 50v6M40 50v6M24 16v-6h16v6")}`),
      generatedIcon("pipe-rack", "管廊", "#334155", ["pipe", "rack"], `${gLine(12, 20, 52, 20)}${gLine(12, 30, 52, 30)}${gLine(12, 40, 52, 40)}${gLine(18, 20, 18, 54)}${gLine(46, 20, 46, 54)}${gLine(14, 54, 50, 54)}`),
      generatedIcon("gas-compressor-skid", "压缩机撬", "#0f766e", ["compressor", "skid"], `${gRect(12, 38, 40, 10, 2)}${gCircle(26, 30, 10)}${gRect(36, 24, 14, 12, 2)}${gLine(8, 30, 16, 30)}${gLine(50, 30, 56, 30)}`),
      generatedIcon("sampling-point", "采样点", "#4f46e5", ["sampling"], `${gCircle(32, 32, 6)}${gLine(32, 12, 32, 26)}${gLine(32, 38, 32, 52)}${gPath("M20 20l24 24M44 20L20 44")}`),
      generatedIcon("hazardous-material", "危险化学品", "#eab308", ["hazard", "chemical"], `${gPath("M32 10l24 42H8z")}${gText("!", 32, 38, 20)}${gPath("M22 48h20")}`),
      generatedIcon("loading-arm", "装车鹤管", "#64748b", ["loading", "arm"], `${gLine(16, 52, 16, 18)}${gLine(16, 18, 42, 18)}${gLine(42, 18, 42, 36)}${gPath("M42 36l8 8")}${gCircle(16, 18, 4)}${gLine(10, 52, 22, 52)}`),
    ]),
    generatedCategory("smart-city", "智慧城市", "路灯、摄像头、停车、垃圾、消防栓、井盖、基站和城市感知图标。", [
      generatedIcon("smart-streetlight", "智慧路灯", "#f59e0b", ["streetlight", "smart"], `${gLine(28, 18, 28, 54)}${gPath("M28 18h18l6 6H34z")}${gPath("M40 28c-5 5-13 5-18 0")}${gCircle(28, 14, 4)}`),
      generatedIcon("city-camera", "城市摄像头", "#64748b", ["camera", "city"], `${gRect(12, 22, 28, 16, 3)}${gPath("M40 27l10-5v16l-10-5z")}${gLine(26, 38, 26, 52)}${gLine(18, 52, 34, 52)}`),
      generatedIcon("smart-parking", "智慧停车", "#2563eb", ["parking", "smart"], `${gRect(14, 12, 36, 40, 4)}${gText("P", 30, 31, 20)}${gPath("M40 42l4 4 8-10")}`),
      generatedIcon("trash-bin", "垃圾桶", "#16a34a", ["trash", "bin"], `${gPath("M20 22h24l-3 32H23z")}${gLine(18, 22, 46, 22)}${gLine(26, 14, 38, 14)}${gLine(28, 30, 28, 46)}${gLine(36, 30, 36, 46)}`),
      generatedIcon("fire-hydrant", "消防栓", "#dc2626", ["fire", "hydrant"], `${gRect(24, 20, 16, 30, 4)}${gPath("M28 20v-8h8v8")}${gLine(16, 30, 24, 30)}${gLine(40, 30, 48, 30)}${gLine(20, 54, 44, 54)}`),
      generatedIcon("manhole-cover", "井盖", "#475569", ["manhole"], `${gCircle(32, 34, 18)}${gCircle(32, 34, 10)}${gPath("M20 34h24M32 22v24")}`),
      generatedIcon("base-station", "通信基站", "#0891b2", ["base-station"], `${gLine(32, 22, 32, 56)}${gPath("M24 56h16")}${gPath("M24 20a10 10 0 0 1 16 0M18 14a18 18 0 0 1 28 0")}${gCircle(32, 22, 3)}`),
      generatedIcon("traffic-light", "交通信号灯", "#334155", ["traffic", "light"], `${gRect(24, 10, 16, 36, 6)}${gCircle(32, 19, 3, 'fill="currentColor" stroke="none"')}${gCircle(32, 28, 3)}${gCircle(32, 37, 3)}${gLine(32, 46, 32, 56)}`),
      generatedIcon("city-sensor", "城市感知", "#7c3aed", ["city", "sensor"], `${gCircle(32, 32, 7)}${gPath("M16 32a16 16 0 0 1 32 0M10 32a22 22 0 0 1 44 0")}${gPath("M20 48h24")}`),
      generatedIcon("public-wifi", "公共WiFi", "#0ea5e9", ["wifi", "public"], `${gPath("M14 26a26 26 0 0 1 36 0M22 34a14 14 0 0 1 20 0M29 42a5 5 0 0 1 6 0")}${gCircle(32, 49, 2, 'fill="currentColor" stroke="none"')}`),
      generatedIcon("charging-city", "城市充电", "#16a34a", ["charging", "city"], `${gRect(18, 12, 20, 40, 4)}${gPath("M24 22h8v10h-8z")}${gPath("M38 24h6l4 6v14c0 5-6 5-6 0V34")}${gPath("M28 36l-4 8h6l-4 8")}`),
      generatedIcon("city-dashboard", "城市看板", "#4f46e5", ["city", "dashboard"], `${gRect(12, 14, 40, 30, 4)}${gPath("M20 36V24M30 36V20M40 36V28")}${gLine(24, 52, 40, 52)}${gLine(32, 44, 32, 52)}`),
    ]),
    generatedCategory("ai-digital", "AI与数字化", "AI、算法、模型、数据流、数字孪生、边缘计算、API和自动化编排图标。", [
      generatedIcon("ai-chip", "AI芯片", "#7c3aed", ["ai", "chip"], `${gRect(18, 18, 28, 28, 4)}${gText("AI", 32, 32, 13)}${gPath("M10 24h8M10 32h8M10 40h8M46 24h8M46 32h8M46 40h8M24 10v8M32 10v8M40 10v8M24 46v8M32 46v8M40 46v8")}`),
      generatedIcon("algorithm", "算法", "#2563eb", ["algorithm"], `${gCircle(18, 18, 5)}${gCircle(46, 18, 5)}${gCircle(32, 46, 5)}${gLine(23, 18, 41, 18)}${gLine(20, 22, 30, 42)}${gLine(44, 22, 34, 42)}`),
      generatedIcon("model-training", "模型训练", "#0f766e", ["model", "training"], `${gRect(12, 14, 40, 36, 4)}${gPath("M22 38c4-12 8-12 12 0s8 12 12 0")}${gPath("M24 24h16M32 20v8")}`),
      generatedIcon("data-flow", "数据流", "#0891b2", ["data", "flow"], `${gCircle(16, 32, 5)}${gCircle(48, 20, 5)}${gCircle(48, 44, 5)}${gPath("M21 30l22-8M21 34l22 8")}${gPath("M38 18l5 2-3 5M38 46l5-2-3-5")}`),
      generatedIcon("digital-twin", "数字孪生", "#4f46e5", ["digital", "twin"], `${gRect(12, 18, 18, 28, 3)}${gRect(34, 18, 18, 28, 3)}${gPath("M30 28h4M30 36h4")}${gText("A", 21, 32, 10)}${gText("B", 43, 32, 10)}`),
      generatedIcon("edge-computing", "边缘计算", "#64748b", ["edge", "computing"], `${gRect(14, 18, 36, 28, 4)}${gText("EDGE", 32, 32, 8)}${gCircle(16, 52, 3)}${gCircle(32, 52, 3)}${gCircle(48, 52, 3)}${gLine(16, 46, 16, 49)}${gLine(32, 46, 32, 49)}${gLine(48, 46, 48, 49)}`),
      generatedIcon("api-gateway", "API网关", "#334155", ["api", "gateway"], `${gRect(12, 20, 40, 24, 4)}${gText("API", 32, 32, 10)}${gLine(4, 32, 12, 32)}${gLine(52, 32, 60, 32)}${gCircle(8, 32, 2)}${gCircle(56, 32, 2)}`),
      generatedIcon("automation-orchestration", "自动化编排", "#ea580c", ["automation", "orchestration"], `${gRect(12, 14, 14, 14, 2)}${gRect(38, 14, 14, 14, 2)}${gRect(25, 38, 14, 14, 2)}${gPath("M26 21h12M19 28l11 10M45 28L36 38")}`),
      generatedIcon("knowledge-graph", "知识图谱", "#0ea5e9", ["knowledge", "graph"], `${gCircle(16, 20, 4)}${gCircle(46, 18, 4)}${gCircle(32, 34, 4)}${gCircle(18, 48, 4)}${gCircle(50, 48, 4)}${gLine(20, 21, 42, 19)}${gLine(18, 23, 30, 31)}${gLine(34, 36, 47, 46)}${gLine(30, 36, 21, 46)}`),
      generatedIcon("predictive-maintenance", "预测性维护", "#dc2626", ["predictive", "maintenance"], `${gCircle(26, 32, 10)}${gPath("M26 22v10l8 4")}${gPath("M40 18l10-6v14z")}${gPath("M40 46l10 6V38z")}${gPath("M14 50l8-8")}`),
      generatedIcon("data-lake", "数据湖", "#0284c7", ["data", "lake"], `${gPath("M12 40c6-5 12-5 18 0s12 5 22 0")}${gPath("M12 48c6-5 12-5 18 0s12 5 22 0")}${gPath("M22 20c0-5 20-5 20 0v14c0 5-20 5-20 0z")}${gPath("M22 20c0 5 20 5 20 0")}`),
      generatedIcon("cloud-ai", "云端AI", "#2563eb", ["cloud", "ai"], `${gPath("M18 42h28a8 8 0 0 0 0-16 14 14 0 0 0-27-4A10 10 0 0 0 18 42z")}${gText("AI", 34, 33, 11)}`),
    ]),
  ];
}

iconCategories.push(...buildMoreDocerCompatibleCategories());

function compactDocerSymbol(label, variant = 0) {
  const text = gText(label, 32, 33, label.length > 3 ? 7 : 9);
  const index = variant % 6;
  if (index === 0) {
    return `${gPath("M12 28l20-14 20 14v24H12z")}${gRect(22, 34, 20, 18, 2)}${text}`;
  }
  if (index === 1) {
    return `${gRect(14, 16, 36, 32, 5)}${gPath("M22 42h20")}${gCircle(24, 26, 3)}${gCircle(40, 26, 3)}${text}`;
  }
  if (index === 2) {
    return `${gCircle(32, 32, 20)}${gPath("M20 38a13 13 0 0 1 24 0")}${gPath("M32 32l10-8")}${text}`;
  }
  if (index === 3) {
    return `${gRect(16, 14, 32, 38, 4)}${gPath("M24 22h16M24 42h16")}${gPath("M32 14v38")}${text}`;
  }
  if (index === 4) {
    return `${gCircle(16, 24, 5)}${gCircle(48, 24, 5)}${gCircle(32, 46, 5)}${gPath("M21 26l8 16M43 26l-8 16M21 24h22")}${text}`;
  }
  return `${gPath("M10 34h44")}${gPath("M44 24l10 10-10 10")}${gRect(16, 18, 24, 24, 4)}${text}`;
}

function compactDocerCategory(id, label, description, color, items) {
  return generatedCategory(
    id,
    label,
    description,
    items.map((item, index) =>
      generatedIcon(item[0], item[1], color, item.slice(2), compactDocerSymbol(item[3] || item[1].slice(0, 2), index)),
    ),
  );
}

function buildExpandedDocerCompatibleCategories() {
  return [
    compactDocerCategory("rail-transit-energy", "轨道交通能源", "牵引站、接触网、车辆、站台、再生制动和轨交控制类图标。", "#2563eb", [
      ["traction-substation", "牵引变电所", "rail", "traction", "牵引"],
      ["overhead-catenary", "接触网", "rail", "catenary", "接触"],
      ["third-rail", "第三轨", "rail", "power", "三轨"],
      ["metro-train", "地铁车辆", "metro", "train", "地铁"],
      ["rail-signal", "轨交信号", "signal", "rail", "信号"],
      ["rail-switch", "轨道道岔", "switch", "rail", "道岔"],
      ["platform-screen-door", "屏蔽门", "platform", "door", "屏门"],
      ["traction-transformer", "牵引变压器", "transformer", "traction", "牵变"],
      ["regenerative-braking", "再生制动", "brake", "energy", "再生"],
      ["depot-charger", "车辆段充电", "depot", "charger", "段充"],
      ["rail-control-center", "轨交控制中心", "control", "center", "轨控"],
      ["tunnel-ventilation", "隧道通风", "tunnel", "ventilation", "通风"],
    ]),
    compactDocerCategory("port-logistics", "港口与物流", "岸电、岸桥、堆场、冷链、装卸、仓储和物流通关类图标。", "#0f766e", [
      ["quay-crane", "岸桥", "port", "crane", "岸桥"],
      ["container-yard", "集装箱堆场", "container", "yard", "堆场"],
      ["reefer-container", "冷藏箱", "reefer", "container", "冷箱"],
      ["shore-power", "岸电", "shore", "power", "岸电"],
      ["cargo-ship", "货船", "ship", "cargo", "货船"],
      ["port-conveyor", "港口输送机", "conveyor", "port", "输送"],
      ["bulk-silo", "散货筒仓", "bulk", "silo", "筒仓"],
      ["weighbridge", "地磅", "weighbridge", "logistics", "地磅"],
      ["forklift", "叉车", "forklift", "logistics", "叉车"],
      ["logistics-warehouse", "物流仓", "warehouse", "logistics", "物流"],
      ["cold-chain", "冷链", "cold-chain", "logistics", "冷链"],
      ["customs-gate", "通关闸口", "customs", "gate", "闸口"],
    ]),
    compactDocerCategory("building-hvac", "建筑暖通", "冷机、空调箱、风机盘管、冷热水环路、VAV 和楼宇能源管理图标。", "#0284c7", [
      ["chiller", "冷水机组", "chiller", "hvac", "冷机"],
      ["air-handler", "空调箱", "ahu", "hvac", "空调"],
      ["fan-coil", "风机盘管", "fan-coil", "hvac", "盘管"],
      ["cooling-water-pump", "冷却水泵", "pump", "hvac", "冷泵"],
      ["chilled-water-loop", "冷冻水环路", "loop", "water", "冷环"],
      ["boiler-room", "锅炉房", "boiler", "building", "锅炉"],
      ["heat-meter-building", "楼宇热表", "heat", "meter", "热表"],
      ["vav-box", "VAV末端", "vav", "hvac", "VAV"],
      ["air-filter", "空气过滤器", "filter", "air", "过滤"],
      ["rooftop-unit", "屋顶机组", "rooftop", "unit", "屋顶"],
      ["indoor-sensor", "室内传感器", "sensor", "indoor", "室感"],
      ["building-energy-manager", "楼宇能管", "energy", "manager", "能管"],
    ]),
    compactDocerCategory("agriculture-rural-energy", "农业与乡村能源", "温室、灌溉、粮仓、沼气、生物质、农光互补和乡村微网图标。", "#16a34a", [
      ["greenhouse", "温室大棚", "greenhouse", "farm", "温室"],
      ["irrigation-pump", "灌溉泵", "irrigation", "pump", "灌溉"],
      ["grain-silo", "粮仓", "grain", "silo", "粮仓"],
      ["biogas-digester", "沼气池", "biogas", "digester", "沼气"],
      ["biomass-boiler", "生物质锅炉", "biomass", "boiler", "生物"],
      ["rural-microgrid", "乡村微网", "rural", "microgrid", "微网"],
      ["farm-solar", "农光互补", "solar", "farm", "农光"],
      ["aquaculture-aerator", "水产增氧", "aquaculture", "aerator", "增氧"],
      ["cold-storage-farm", "农产品冷库", "cold-storage", "farm", "冷库"],
      ["agricultural-drone", "农业无人机", "drone", "farm", "无人"],
      ["soil-sensor", "土壤传感器", "soil", "sensor", "土壤"],
      ["livestock-barn", "养殖棚舍", "livestock", "barn", "棚舍"],
    ]),
    compactDocerCategory("communication-power", "通信电源", "通信站址、电源柜、整流、后备电池、光纤节点、微波链路和站点监控图标。", "#4f46e5", [
      ["telecom-site", "通信站址", "telecom", "site", "站址"],
      ["base-station-battery", "基站电池", "battery", "base-station", "电池"],
      ["tower-power", "塔站电源", "tower", "power", "塔电"],
      ["rectifier-cabinet", "整流电源柜", "rectifier", "cabinet", "整流"],
      ["fiber-node", "光纤节点", "fiber", "node", "光纤"],
      ["optical-terminal", "光网络终端", "optical", "terminal", "光端"],
      ["microwave-link", "微波链路", "microwave", "link", "微波"],
      ["ups-cabinet", "UPS机柜", "ups", "cabinet", "UPS"],
      ["dc-power-system", "直流电源系统", "dc", "power", "DC"],
      ["remote-radio-unit", "RRU射频单元", "rru", "radio", "RRU"],
      ["cabinet-cooling", "机柜散热", "cooling", "cabinet", "散热"],
      ["site-monitoring", "站点监控", "monitoring", "site", "监控"],
    ]),
    compactDocerCategory("energy-finance-assets", "能源资产金融", "资产台账、合同价格、绿证、结算、补贴、投资收益和风险管理图标。", "#7c3aed", [
      ["asset-ledger", "资产台账", "asset", "ledger", "资产"],
      ["contract-price", "合同价格", "contract", "price", "合同"],
      ["carbon-credit-asset", "碳信用", "carbon", "credit", "碳信"],
      ["green-certificate-asset", "绿证", "green", "certificate", "绿证"],
      ["settlement-bill", "结算单", "settlement", "bill", "结算"],
      ["invoice-energy", "能源发票", "invoice", "energy", "发票"],
      ["investment-return", "投资收益", "investment", "return", "收益"],
      ["risk-control-finance", "风控", "risk", "control", "风控"],
      ["asset-portfolio", "资产组合", "portfolio", "asset", "组合"],
      ["meter-settlement", "计量结算", "meter", "settlement", "计结"],
      ["tariff-step", "阶梯电价", "tariff", "step", "阶梯"],
      ["subsidy", "补贴", "subsidy", "finance", "补贴"],
    ]),
    compactDocerCategory("lab-testing", "实验检测", "测试台、示波器、分析仪、绝缘测试、继保测试和实验报告图标。", "#be123c", [
      ["test-bench", "测试台", "test", "bench", "测试"],
      ["oscilloscope", "示波器", "oscilloscope", "instrument", "示波"],
      ["spectrum-analyzer", "频谱分析仪", "spectrum", "analyzer", "频谱"],
      ["power-analyzer", "功率分析仪", "power", "analyzer", "功率"],
      ["insulation-tester", "绝缘测试仪", "insulation", "tester", "绝缘"],
      ["relay-tester", "继保测试仪", "relay", "tester", "继保"],
      ["calibration-source", "校准源", "calibration", "source", "校准"],
      ["environmental-chamber", "环境试验箱", "chamber", "environment", "环境"],
      ["sample-bottle", "样品瓶", "sample", "bottle", "样品"],
      ["microscope-lab", "显微镜", "microscope", "lab", "显微"],
      ["lab-report", "实验报告", "report", "lab", "报告"],
      ["test-pass", "检测合格", "test", "pass", "合格"],
    ]),
    compactDocerCategory("emergency-resilience", "应急韧性", "应急电源、移动变电站、抢修、防汛、指挥、备供和黑启动图标。", "#dc2626", [
      ["emergency-generator", "应急发电机", "emergency", "generator", "应发"],
      ["mobile-substation", "移动变电站", "mobile", "substation", "移站"],
      ["repair-vehicle", "抢修车", "repair", "vehicle", "抢修"],
      ["flood-barrier", "防汛挡板", "flood", "barrier", "防汛"],
      ["command-post", "应急指挥点", "command", "post", "指挥"],
      ["satellite-phone", "卫星电话", "satellite", "phone", "卫星"],
      ["emergency-light", "应急照明", "emergency", "light", "照明"],
      ["fire-pump-emergency", "消防泵", "fire", "pump", "消防"],
      ["rescue-team", "抢险队伍", "rescue", "team", "抢险"],
      ["outage-map", "停电地图", "outage", "map", "停电"],
      ["backup-supply", "备用供电", "backup", "supply", "备供"],
      ["black-start", "黑启动", "black-start", "grid", "黑启"],
    ]),
  ];
}

iconCategories.push(...buildExpandedDocerCompatibleCategories());

function buildDeepenedDocerCompatibleCategories() {
  return [
    compactDocerCategory("mining-metallurgy", "矿山冶金", "矿井、破碎、输送、球磨、烧结、高炉、电炉、连铸和尾矿库图标。", "#64748b", [
      ["mine-shaft", "矿井井筒", "mine", "shaft", "矿井"],
      ["ore-crusher", "矿石破碎", "ore", "crusher", "破碎"],
      ["belt-conveyor-mining", "矿山皮带", "belt", "conveyor", "皮带"],
      ["ball-mill", "球磨机", "mill", "mining", "球磨"],
      ["flotation-cell", "浮选槽", "flotation", "cell", "浮选"],
      ["sintering-machine", "烧结机", "sintering", "metallurgy", "烧结"],
      ["blast-furnace", "高炉", "furnace", "metallurgy", "高炉"],
      ["electric-arc-furnace", "电弧炉", "arc", "furnace", "电炉"],
      ["continuous-caster", "连铸机", "caster", "steel", "连铸"],
      ["rolling-mill", "轧机", "rolling", "mill", "轧机"],
      ["tailings-pond", "尾矿库", "tailings", "pond", "尾矿"],
      ["dedusting-station", "除尘站", "dust", "station", "除尘"],
    ]),
    compactDocerCategory("marine-offshore-energy", "海洋与海上能源", "海上风电、海缆、升压站、平台、浮式基础、潮汐和海水制氢图标。", "#0284c7", [
      ["offshore-wind", "海上风电", "offshore", "wind", "海风"],
      ["subsea-cable", "海底电缆", "subsea", "cable", "海缆"],
      ["offshore-substation", "海上升压站", "offshore", "substation", "升压"],
      ["jacket-foundation", "导管架基础", "jacket", "foundation", "导管"],
      ["floating-foundation", "浮式基础", "floating", "foundation", "浮式"],
      ["tidal-generator", "潮汐发电", "tidal", "generator", "潮汐"],
      ["wave-energy", "波浪能", "wave", "energy", "波浪"],
      ["offshore-platform", "海工平台", "platform", "offshore", "平台"],
      ["marine-battery", "船舶电池", "marine", "battery", "船电"],
      ["shore-hydrogen", "海水制氢", "hydrogen", "offshore", "制氢"],
      ["navigation-buoy", "航标浮标", "buoy", "navigation", "浮标"],
      ["subsea-sensor", "海底传感器", "subsea", "sensor", "海感"],
    ]),
    compactDocerCategory("advanced-renewables", "新能源扩展", "跟踪支架、汇流箱、组串逆变、储能舱、氢储能和新能源预测图标。", "#16a34a", [
      ["solar-tracker", "光伏跟踪支架", "solar", "tracker", "跟踪"],
      ["pv-combiner-box", "光伏汇流箱", "pv", "combiner", "汇流"],
      ["string-inverter", "组串逆变器", "string", "inverter", "组串"],
      ["central-inverter", "集中逆变器", "central", "inverter", "集中"],
      ["wind-yaw-system", "风机偏航", "wind", "yaw", "偏航"],
      ["wind-pitch-system", "风机变桨", "wind", "pitch", "变桨"],
      ["battery-container", "储能舱", "battery", "container", "储舱"],
      ["pcs-cabinet", "PCS柜", "pcs", "cabinet", "PCS"],
      ["bms-controller", "BMS控制器", "bms", "controller", "BMS"],
      ["ems-controller", "EMS控制器", "ems", "controller", "EMS"],
      ["renewable-forecast", "新能源预测", "forecast", "renewable", "预测"],
      ["hybrid-renewable", "风光储一体", "hybrid", "renewable", "风光"],
    ]),
    compactDocerCategory("digital-operations", "数字运维", "工单、巡检、缺陷、告警压缩、知识库、移动作业和远程专家图标。", "#4f46e5", [
      ["mobile-work-order", "移动工单", "mobile", "work-order", "工单"],
      ["inspection-route-digital", "巡检路线", "inspection", "route", "巡检"],
      ["defect-library", "缺陷库", "defect", "library", "缺陷"],
      ["alarm-compression", "告警压缩", "alarm", "compression", "告警"],
      ["knowledge-base", "知识库", "knowledge", "base", "知识"],
      ["remote-expert", "远程专家", "remote", "expert", "专家"],
      ["ar-maintenance", "AR检修", "ar", "maintenance", "AR"],
      ["asset-tag", "资产标签", "asset", "tag", "标签"],
      ["iot-diagnosis", "IoT诊断", "iot", "diagnosis", "诊断"],
      ["root-cause", "根因分析", "root-cause", "analysis", "根因"],
      ["digital-ticket", "电子票据", "ticket", "digital", "票据"],
      ["operation-score", "运维评分", "operation", "score", "评分"],
    ]),
    compactDocerCategory("data-governance", "数据治理", "数据目录、血缘、质量、主数据、脱敏、权限、审计和归档图标。", "#0f766e", [
      ["data-catalog", "数据目录", "data", "catalog", "目录"],
      ["data-lineage", "数据血缘", "data", "lineage", "血缘"],
      ["data-quality", "数据质量", "data", "quality", "质量"],
      ["master-data", "主数据", "master", "data", "主数"],
      ["data-desensitization", "数据脱敏", "data", "masking", "脱敏"],
      ["data-permission", "数据权限", "data", "permission", "权限"],
      ["data-audit", "数据审计", "data", "audit", "审计"],
      ["data-archive", "数据归档", "data", "archive", "归档"],
      ["metadata", "元数据", "metadata", "data", "元数"],
      ["data-standard", "数据标准", "standard", "data", "标准"],
      ["data-service", "数据服务", "service", "data", "服务"],
      ["data-security", "数据安全", "security", "data", "安全"],
    ]),
    compactDocerCategory("residential-commercial-energy", "民商用能源", "户用光伏、家庭储能、充电车位、商超冷链、园区能耗和楼宇账单图标。", "#f59e0b", [
      ["home-solar", "户用光伏", "home", "solar", "户光"],
      ["home-battery", "家庭储能", "home", "battery", "家储"],
      ["ev-parking-space", "充电车位", "ev", "parking", "车位"],
      ["shop-energy", "商铺用能", "shop", "energy", "商铺"],
      ["supermarket-cold-chain", "商超冷链", "cold-chain", "retail", "冷链"],
      ["campus-energy", "园区能耗", "campus", "energy", "园区"],
      ["building-bill", "楼宇账单", "building", "bill", "账单"],
      ["smart-home-meter", "智能家表", "home", "meter", "家表"],
      ["heat-pump-home", "户用热泵", "heat-pump", "home", "热泵"],
      ["commercial-kitchen", "商用厨房", "kitchen", "commercial", "厨房"],
      ["mall-dashboard", "商场能效看板", "mall", "dashboard", "商场"],
      ["tenant-metering", "租户分表", "tenant", "meter", "分表"],
    ]),
    compactDocerCategory("power-electronics-control", "电力电子控制", "门极驱动、PWM、滤波、直流母线、软启动、SVG/APF 和保护控制图标。", "#7c3aed", [
      ["gate-driver", "门极驱动", "gate", "driver", "门极"],
      ["pwm-control", "PWM控制", "pwm", "control", "PWM"],
      ["dc-bus", "直流母线", "dc", "bus", "DC"],
      ["lcl-filter", "LCL滤波", "lcl", "filter", "LCL"],
      ["soft-starter", "软启动器", "soft", "starter", "软启"],
      ["static-var-generator", "SVG无功补偿", "svg", "reactive", "SVG"],
      ["active-power-filter", "APF有源滤波", "apf", "filter", "APF"],
      ["harmonic-monitor", "谐波监测", "harmonic", "monitor", "谐波"],
      ["dc-breaker", "直流断路器", "dc", "breaker", "直断"],
      ["precharge-circuit", "预充电回路", "precharge", "circuit", "预充"],
      ["isolation-monitor", "绝缘监测", "isolation", "monitor", "绝监"],
      ["modulation-controller", "调制控制器", "modulation", "controller", "调制"],
    ]),
    compactDocerCategory("compliance-risk", "合规与风险", "许可证、审计、策略、权限、加密、隐私、风险矩阵和整改闭环图标。", "#dc2626", [
      ["license-certificate", "许可证书", "license", "certificate", "证书"],
      ["audit-trail", "审计轨迹", "audit", "trail", "审计"],
      ["policy-rule", "策略规则", "policy", "rule", "策略"],
      ["permission-role", "权限角色", "permission", "role", "角色"],
      ["encryption-key", "加密密钥", "encryption", "key", "密钥"],
      ["privacy-data", "隐私数据", "privacy", "data", "隐私"],
      ["risk-matrix", "风险矩阵", "risk", "matrix", "矩阵"],
      ["control-measure", "控制措施", "control", "measure", "控制"],
      ["rectification-loop", "整改闭环", "rectification", "loop", "闭环"],
      ["compliance-report", "合规报告", "compliance", "report", "报告"],
      ["approval-flow", "审批流程", "approval", "flow", "审批"],
      ["evidence-package", "证据包", "evidence", "package", "证据"],
    ]),
  ];
}

iconCategories.push(...buildDeepenedDocerCompatibleCategories());

function buildCampusDocerCompatibleCategories() {
  return [
    compactDocerCategory("campus-energy-management", "校园能源管理", "校园微网、楼宇分项、宿舍负荷、教室照明、冷热站和校园充电图标。", "#2563eb", [
      ["campus-microgrid", "校园微网", "campus", "microgrid", "校网"],
      ["teaching-building-energy", "教学楼能耗", "teaching", "building", "教学"],
      ["dormitory-load", "宿舍负荷", "dormitory", "load", "宿舍"],
      ["classroom-lighting", "教室照明", "classroom", "lighting", "照明"],
      ["library-energy", "图书馆能耗", "library", "energy", "图书"],
      ["campus-central-plant", "校园冷热站", "central-plant", "campus", "冷热"],
      ["campus-ev-charger", "校园充电桩", "campus", "charger", "充电"],
      ["campus-carbon", "校园碳排", "campus", "carbon", "碳排"],
      ["smart-classroom", "智慧教室", "classroom", "smart", "智教"],
      ["campus-water-meter", "校园水表", "water", "meter", "水表"],
      ["campus-heat-meter", "校园热表", "heat", "meter", "热表"],
      ["campus-energy-dashboard", "校园能源看板", "dashboard", "campus", "看板"],
    ]),
    compactDocerCategory("research-lab-facility", "科研实验设施", "实验楼、通风柜、气瓶、危化品柜、实验排风、洁净室和实验电源图标。", "#7c3aed", [
      ["research-building", "科研楼", "research", "building", "科研"],
      ["fume-hood", "通风柜", "fume", "hood", "通风"],
      ["gas-cylinder", "气瓶", "gas", "cylinder", "气瓶"],
      ["chemical-cabinet", "危化品柜", "chemical", "cabinet", "危化"],
      ["lab-exhaust", "实验排风", "lab", "exhaust", "排风"],
      ["clean-room", "洁净室", "clean-room", "lab", "洁净"],
      ["lab-ups", "实验UPS", "ups", "lab", "UPS"],
      ["precision-aircon", "精密空调", "precision", "aircon", "精空"],
      ["lab-power-panel", "实验配电箱", "power", "panel", "配电"],
      ["pure-water-system", "纯水系统", "pure-water", "lab", "纯水"],
      ["lab-waste", "实验废液", "waste", "lab", "废液"],
      ["instrument-platform", "仪器平台", "instrument", "platform", "仪器"],
    ]),
    compactDocerCategory("public-service-facilities", "公共服务设施", "医院、学校、图书馆、体育馆、食堂、停车、公共厕所和市政服务图标。", "#0f766e", [
      ["hospital-facility", "医院设施", "hospital", "facility", "医院"],
      ["school-facility", "学校设施", "school", "facility", "学校"],
      ["library-facility", "图书馆设施", "library", "facility", "图馆"],
      ["gymnasium", "体育馆", "gymnasium", "facility", "体育"],
      ["canteen", "食堂", "canteen", "facility", "食堂"],
      ["public-parking", "公共停车", "parking", "public", "停车"],
      ["public-toilet", "公共厕所", "toilet", "public", "公厕"],
      ["service-hall", "服务大厅", "service", "hall", "大厅"],
      ["public-elevator", "公共电梯", "elevator", "public", "电梯"],
      ["municipal-water", "市政供水", "municipal", "water", "供水"],
      ["municipal-heating", "市政供热", "municipal", "heat", "供热"],
      ["public-shelter", "公共避难点", "shelter", "public", "避难"],
    ]),
    compactDocerCategory("teaching-training", "教学培训", "课程、考试、实训台、仿真、课件、在线学习、证书和实验教学图标。", "#f59e0b", [
      ["course", "课程", "course", "teaching", "课程"],
      ["exam", "考试", "exam", "teaching", "考试"],
      ["training-bench", "实训台", "training", "bench", "实训"],
      ["simulation", "仿真", "simulation", "teaching", "仿真"],
      ["courseware", "课件", "courseware", "slide", "课件"],
      ["online-learning", "在线学习", "online", "learning", "在线"],
      ["certificate-training", "培训证书", "certificate", "training", "证书"],
      ["experiment-teaching", "实验教学", "experiment", "teaching", "实验"],
      ["student-group", "学生分组", "student", "group", "分组"],
      ["teacher-console", "教师控制台", "teacher", "console", "教师"],
      ["virtual-lab", "虚拟实验室", "virtual", "lab", "虚拟"],
      ["knowledge-map", "知识地图", "knowledge", "map", "知识"],
    ]),
    compactDocerCategory("utility-metering-billing", "计量计费", "电水气热分表、预付费、账单、结算、费用分摊和异常用量图标。", "#16a34a", [
      ["electric-submeter", "电分表", "electric", "submeter", "电表"],
      ["water-submeter", "水分表", "water", "submeter", "水表"],
      ["gas-submeter", "气分表", "gas", "submeter", "气表"],
      ["heat-submeter", "热分表", "heat", "submeter", "热表"],
      ["prepaid-meter", "预付费表", "prepaid", "meter", "预付"],
      ["utility-bill", "公用事业账单", "bill", "utility", "账单"],
      ["cost-allocation", "费用分摊", "cost", "allocation", "分摊"],
      ["usage-anomaly", "异常用量", "usage", "anomaly", "异常"],
      ["meter-reading", "抄表", "meter", "reading", "抄表"],
      ["settlement-cycle", "结算周期", "settlement", "cycle", "周期"],
      ["tariff-plan", "费率方案", "tariff", "plan", "费率"],
      ["billing-audit", "计费审计", "billing", "audit", "审计"],
    ]),
    compactDocerCategory("low-carbon-campus", "低碳校园", "碳核算、绿电、碳汇、减排项目、能效诊断、低碳活动和碳中和路径图标。", "#059669", [
      ["carbon-accounting-campus", "校园碳核算", "carbon", "accounting", "核算"],
      ["green-power-campus", "校园绿电", "green", "power", "绿电"],
      ["carbon-sink-campus", "校园碳汇", "carbon", "sink", "碳汇"],
      ["emission-reduction-project", "减排项目", "emission", "reduction", "减排"],
      ["energy-efficiency-diagnosis", "能效诊断", "efficiency", "diagnosis", "诊断"],
      ["low-carbon-activity", "低碳活动", "low-carbon", "activity", "活动"],
      ["carbon-neutral-roadmap", "碳中和路径", "carbon-neutral", "roadmap", "路径"],
      ["green-certificate-campus", "校园绿证", "certificate", "green", "绿证"],
      ["carbon-budget", "碳预算", "carbon", "budget", "预算"],
      ["carbon-offset", "碳抵消", "carbon", "offset", "抵消"],
      ["low-carbon-score", "低碳评分", "score", "low-carbon", "评分"],
      ["sustainability-report", "可持续报告", "sustainability", "report", "报告"],
    ]),
  ];
}

iconCategories.push(...buildCampusDocerCompatibleCategories());

function buildEnergyApplicationDocerCategories() {
  return [
    compactDocerCategory("power-grid-protection", "电力与保护控制", "变电、配电、继电保护、馈线自动化、电能质量和电网控制图标。", "#2563eb", [
      ["substation-bay", "变电间隔", "substation", "bay", "间隔"],
      ["distribution-feeder", "配电馈线", "distribution", "feeder", "馈线"],
      ["recloser", "重合器", "recloser", "protection", "重合"],
      ["sectionalizer", "分段器", "sectionalizer", "switch", "分段"],
      ["feeder-terminal-unit", "馈线终端FTU", "ftu", "terminal", "FTU"],
      ["distribution-terminal-unit", "配电终端DTU", "dtu", "terminal", "DTU"],
      ["relay-panel", "保护屏柜", "relay", "panel", "保护"],
      ["fault-indicator", "故障指示器", "fault", "indicator", "故指"],
      ["power-quality-monitor", "电能质量监测", "quality", "monitor", "质监"],
      ["phasor-measurement-unit", "PMU相量测量", "pmu", "measurement", "PMU"],
      ["tap-changer", "有载调压", "tap", "changer", "调压"],
      ["reactive-compensation", "无功补偿", "reactive", "compensation", "无功"],
    ]),
    compactDocerCategory("generation-link", "发电环节", "发电机组、励磁、调速、厂用电、并网点、AGC、AVC、机组监控和发电侧计量图标。", "#f97316", [
      ["generator-set", "发电机组", "generator", "set", "机组"],
      ["synchronous-generator", "同步发电机", "synchronous", "generator", "同步"],
      ["generator-terminal", "发电机出口", "generator", "terminal", "出口"],
      ["step-up-transformer", "升压变压器", "step-up", "transformer", "升压"],
      ["unit-auxiliary-power", "厂用电系统", "auxiliary", "power", "厂用"],
      ["excitation-cabinet", "励磁柜", "excitation", "cabinet", "励磁"],
      ["governor-cabinet", "调速柜", "governor", "cabinet", "调速"],
      ["unit-control-panel", "机组控制屏", "unit", "control", "控制"],
      ["grid-connection-point", "并网点", "grid", "connection", "并网"],
      ["agc-controller", "AGC控制", "agc", "control", "AGC"],
      ["avc-controller", "AVC控制", "avc", "control", "AVC"],
      ["generation-metering", "发电计量", "generation", "metering", "计量"],
    ]),
    compactDocerCategory("transmission-link", "输电环节", "输电线路、铁塔、导线、绝缘子、避雷器、OPGW、线路保护、巡检和高压直流图标。", "#1d4ed8", [
      ["transmission-tower", "输电铁塔", "transmission", "tower", "铁塔"],
      ["overhead-line", "架空线路", "overhead", "line", "架空"],
      ["conductor-bundle", "分裂导线", "conductor", "bundle", "导线"],
      ["insulator-string", "绝缘子串", "insulator", "string", "绝缘"],
      ["line-surge-arrester", "线路避雷器", "surge", "arrester", "避雷"],
      ["opgw-fiber", "OPGW光缆", "opgw", "fiber", "OPGW"],
      ["line-distance-protection", "线路距离保护", "distance", "protection", "距离"],
      ["line-differential-protection", "线路差动保护", "differential", "protection", "差动"],
      ["series-compensation-bank", "串联补偿", "series", "compensation", "串补"],
      ["tower-grounding", "杆塔接地", "tower", "grounding", "接地"],
      ["line-patrol-drone", "线路巡检无人机", "patrol", "drone", "巡检"],
      ["hvdc-pole", "直流输电极", "hvdc", "pole", "直流"],
    ]),
    compactDocerCategory("substation-link", "变电环节", "主变、母线、断路器、隔离开关、接地刀闸、互感器、避雷器、间隔和站控层图标。", "#4338ca", [
      ["main-transformer", "主变压器", "main", "transformer", "主变"],
      ["busbar-section", "母线分段", "busbar", "section", "母线"],
      ["circuit-breaker-bay", "断路器间隔", "breaker", "bay", "断路"],
      ["disconnect-switch-bay", "隔离开关间隔", "disconnect", "bay", "隔离"],
      ["grounding-switch-bay", "接地刀闸间隔", "grounding", "switch", "接地"],
      ["current-transformer", "电流互感器CT", "current", "transformer", "CT"],
      ["voltage-transformer", "电压互感器PT", "voltage", "transformer", "PT"],
      ["substation-surge-arrester", "站内避雷器", "surge", "arrester", "避雷"],
      ["relay-protection-room", "继保室", "relay", "room", "继保"],
      ["station-control-layer", "站控层", "station", "control", "站控"],
      ["bay-control-unit", "间隔层BCU", "bay", "control", "BCU"],
      ["substation-dc-system", "站用直流系统", "dc", "system", "直流"],
    ]),
    compactDocerCategory("distribution-link", "配电环节", "环网柜、开闭所、箱变、柱上开关、配变、分支箱、电缆分接箱、台区和配网自动化图标。", "#0f766e", [
      ["ring-main-unit", "环网柜", "ring", "unit", "环网"],
      ["switching-station", "开闭所", "switching", "station", "开闭"],
      ["package-substation", "箱式变电站", "package", "substation", "箱变"],
      ["pole-mounted-switch", "柱上开关", "pole", "switch", "柱开"],
      ["distribution-transformer", "配电变压器", "distribution", "transformer", "配变"],
      ["cable-branch-box", "电缆分支箱", "cable", "branch", "分支"],
      ["feeder-automation", "馈线自动化", "feeder", "automation", "馈自"],
      ["distribution-area", "供电台区", "distribution", "area", "台区"],
      ["low-voltage-cabinet", "低压柜", "low-voltage", "cabinet", "低压"],
      ["reactive-power-box", "无功补偿箱", "reactive", "box", "补偿"],
      ["smart-distribution-terminal", "智能配电终端", "smart", "terminal", "终端"],
      ["fault-location-terminal", "故障定位终端", "fault", "location", "定位"],
    ]),
    compactDocerCategory("consumption-link", "用电环节", "用户变、进线柜、负荷、计量、充电桩、楼宇、工厂、需求响应和能效管理图标。", "#7c3aed", [
      ["customer-substation", "用户变电站", "customer", "substation", "用户"],
      ["incoming-cabinet", "进线柜", "incoming", "cabinet", "进线"],
      ["load-center", "负荷中心", "load", "center", "负荷"],
      ["smart-meter", "智能电表", "smart", "meter", "电表"],
      ["metering-box", "计量箱", "metering", "box", "计量"],
      ["ev-charging-pile", "充电桩", "ev", "charging", "充电"],
      ["building-load", "楼宇负荷", "building", "load", "楼宇"],
      ["industrial-load", "工业负荷", "industrial", "load", "工业"],
      ["residential-load", "居民负荷", "residential", "load", "居民"],
      ["demand-response", "需求响应", "demand", "response", "需求"],
      ["energy-efficiency-management", "能效管理", "efficiency", "management", "能效"],
      ["load-forecast", "负荷预测", "load", "forecast", "预测"],
    ]),
    compactDocerCategory("wind-power-scene", "风电场景", "风机、叶片、塔筒、偏航、变桨、集电线路、测风塔和风电场控制图标。", "#0ea5e9", [
      ["wind-turbine-unit", "风电机组", "wind", "turbine", "风机"],
      ["wind-blade", "风机叶片", "blade", "wind", "叶片"],
      ["wind-tower", "风机塔筒", "tower", "wind", "塔筒"],
      ["wind-nacelle", "机舱", "nacelle", "wind", "机舱"],
      ["wind-yaw-drive", "偏航驱动", "yaw", "wind", "偏航"],
      ["wind-pitch-drive", "变桨驱动", "pitch", "wind", "变桨"],
      ["wind-gearbox", "齿轮箱", "gearbox", "wind", "齿箱"],
      ["wind-generator-unit", "风机发电机", "generator", "wind", "发电"],
      ["wind-converter", "风机变流器", "converter", "wind", "变流"],
      ["wind-collector-line", "集电线路", "collector", "wind", "集电"],
      ["met-mast", "测风塔", "met-mast", "wind", "测风"],
      ["wind-farm-controller", "风电场控制器", "controller", "wind", "场控"],
    ]),
    compactDocerCategory("hydro-power-scene", "水电场景", "大坝、进水口、压力钢管、水轮机、调速器、励磁、尾水和抽蓄图标。", "#0284c7", [
      ["hydro-dam", "水电大坝", "dam", "hydro", "大坝"],
      ["hydro-intake-gate", "进水闸门", "intake", "gate", "进水"],
      ["penstock", "压力钢管", "penstock", "hydro", "钢管"],
      ["hydraulic-turbine", "水轮机", "turbine", "hydro", "水轮"],
      ["hydro-generator-unit", "水轮发电机", "generator", "hydro", "水发"],
      ["hydro-governor", "水轮机调速器", "governor", "hydro", "调速"],
      ["excitation-system", "励磁系统", "excitation", "hydro", "励磁"],
      ["spillway", "溢洪道", "spillway", "hydro", "溢洪"],
      ["tailrace", "尾水渠", "tailrace", "hydro", "尾水"],
      ["reservoir", "水库", "reservoir", "hydro", "水库"],
      ["pumped-storage", "抽水蓄能", "pumped-storage", "hydro", "抽蓄"],
      ["hydro-control-room", "水电控制室", "control", "hydro", "水控"],
    ]),
    compactDocerCategory("thermal-power-scene", "火电场景", "锅炉、汽轮机、发电机、冷凝器、给水泵、煤磨、脱硫脱硝和烟囱图标。", "#dc2626", [
      ["coal-boiler", "燃煤锅炉", "boiler", "thermal", "锅炉"],
      ["steam-turbine", "汽轮机", "steam", "turbine", "汽机"],
      ["thermal-generator-unit", "汽轮发电机", "generator", "thermal", "发电"],
      ["condenser", "凝汽器", "condenser", "thermal", "凝汽"],
      ["feedwater-pump", "给水泵", "feedwater", "pump", "给泵"],
      ["coal-mill", "磨煤机", "coal", "mill", "煤磨"],
      ["air-preheater", "空预器", "air-preheater", "thermal", "空预"],
      ["electrostatic-precipitator", "电除尘", "precipitator", "dust", "除尘"],
      ["desulfurization", "脱硫装置", "desulfurization", "thermal", "脱硫"],
      ["denitration", "脱硝装置", "denitration", "thermal", "脱硝"],
      ["chimney-stack", "烟囱", "chimney", "thermal", "烟囱"],
      ["chp-extraction", "热电联产抽汽", "chp", "steam", "抽汽"],
    ]),
    compactDocerCategory("solar-pv-scene", "光伏场景", "组件、组串、汇流箱、逆变器、跟踪支架、辐照传感器和光伏电站图标。", "#f59e0b", [
      ["pv-module", "光伏组件", "pv", "module", "组件"],
      ["pv-string", "光伏组串", "pv", "string", "组串"],
      ["pv-combiner", "光伏汇流箱", "pv", "combiner", "汇流"],
      ["pv-dc-cable", "直流电缆", "dc", "cable", "DC缆"],
      ["mppt-controller", "MPPT控制器", "mppt", "controller", "MPPT"],
      ["string-pv-inverter", "组串逆变器", "inverter", "pv", "逆变"],
      ["central-pv-inverter", "集中逆变器", "central", "inverter", "集中"],
      ["pv-tracker", "跟踪支架", "tracker", "pv", "跟踪"],
      ["irradiance-sensor", "辐照传感器", "irradiance", "sensor", "辐照"],
      ["pv-cleaning-robot", "清扫机器人", "cleaning", "robot", "清扫"],
      ["pv-fault-diagnosis", "组件故障诊断", "fault", "pv", "故障"],
      ["pv-plant", "光伏电站", "plant", "pv", "光伏"],
    ]),
    compactDocerCategory("hydrogen-energy-scene", "氢能场景", "电解槽、整流电源、压缩、纯化、干燥、储氢、加氢和燃料电池图标。", "#06b6d4", [
      ["alkaline-electrolyzer", "碱性电解槽", "alkaline", "electrolyzer", "碱槽"],
      ["pem-electrolyzer", "PEM电解槽", "pem", "electrolyzer", "PEM"],
      ["electrolyzer-stack", "电解槽堆", "stack", "hydrogen", "槽堆"],
      ["hydrogen-rectifier", "制氢整流电源", "rectifier", "hydrogen", "整流"],
      ["hydrogen-purifier", "氢气纯化", "purifier", "hydrogen", "纯化"],
      ["hydrogen-dryer", "氢气干燥", "dryer", "hydrogen", "干燥"],
      ["hydrogen-buffer-tank", "缓冲罐", "buffer", "hydrogen", "缓冲"],
      ["hydrogen-compressor-skid", "压缩机撬", "compressor", "hydrogen", "压缩"],
      ["hydrogen-storage-bank", "储氢瓶组", "storage", "hydrogen", "瓶组"],
      ["hydrogen-dispenser", "加氢机", "dispenser", "hydrogen", "加氢"],
      ["fuel-cell-stack", "燃料电池堆", "fuel-cell", "stack", "燃电"],
      ["hydrogen-leak-sensor", "氢泄漏传感器", "leak", "sensor", "泄漏"],
    ]),
    compactDocerCategory("energy-storage-scene", "储能场景", "电池舱、电池架、PCS、BMS、EMS、热管理、消防、SOC、飞轮和压缩空气储能图标。", "#16a34a", [
      ["bess-container", "电池储能舱", "bess", "container", "储舱"],
      ["battery-rack", "电池架", "battery", "rack", "电池"],
      ["battery-module", "电池模组", "battery", "module", "模组"],
      ["pcs-unit", "PCS变流器", "pcs", "converter", "PCS"],
      ["bms-unit", "BMS单元", "bms", "battery", "BMS"],
      ["ems-unit", "EMS能量管理", "ems", "energy", "EMS"],
      ["storage-transformer", "储能升压变", "transformer", "storage", "升压"],
      ["storage-thermal-management", "储能热管理", "thermal", "storage", "热管"],
      ["storage-fire-protection", "储能消防", "fire", "storage", "消防"],
      ["state-of-charge", "SOC状态", "soc", "battery", "SOC"],
      ["flywheel-storage-unit", "飞轮储能单元", "flywheel", "storage", "飞轮"],
      ["compressed-air-storage-unit", "压缩空气储能", "compressed-air", "storage", "压空"],
    ]),
    compactDocerCategory("wind-power-advanced", "风电细分设备", "海上风电、升压站、集电海缆、偏航变桨、覆冰、振动、尾流和功率曲线图标。", "#0284c7", [
      ["offshore-wind-turbine", "海上风机", "offshore", "wind", "海风"],
      ["wind-farm-substation", "风电升压站", "wind", "substation", "升压"],
      ["wind-collector-cable", "集电电缆", "collector", "cable", "集缆"],
      ["submarine-export-cable", "送出海缆", "submarine", "cable", "海缆"],
      ["blade-icing-sensor", "叶片覆冰传感器", "blade", "icing", "覆冰"],
      ["tower-vibration-sensor", "塔筒振动监测", "tower", "vibration", "振动"],
      ["nacelle-control-cabinet", "机舱控制柜", "nacelle", "cabinet", "机控"],
      ["pitch-backup-battery", "变桨备用电池", "pitch", "battery", "桨电"],
      ["yaw-bearing-monitor", "偏航轴承监测", "yaw", "bearing", "轴承"],
      ["wind-power-forecast", "风功率预测", "wind", "forecast", "预测"],
      ["wake-control", "尾流控制", "wake", "control", "尾流"],
      ["power-curve-analysis", "功率曲线分析", "power", "curve", "曲线"],
    ]),
    compactDocerCategory("solar-pv-advanced", "光伏细分设备", "双面组件、优化器、组串监测、直流拉弧、PID、跟踪控制、清洗和汇流监测图标。", "#f59e0b", [
      ["bifacial-pv-module", "双面光伏组件", "bifacial", "pv", "双面"],
      ["pv-optimizer", "组件优化器", "optimizer", "pv", "优化"],
      ["string-monitoring-unit", "组串监测单元", "string", "monitor", "监测"],
      ["dc-arc-fault-detector", "直流拉弧检测", "arc", "fault", "拉弧"],
      ["anti-pid-device", "抗PID装置", "anti-pid", "pv", "PID"],
      ["tracker-controller", "跟踪控制器", "tracker", "controller", "跟控"],
      ["pv-weather-station", "光伏气象站", "weather", "pv", "气象"],
      ["soiling-sensor", "积灰传感器", "soiling", "sensor", "积灰"],
      ["iv-curve-tester", "IV曲线测试", "iv", "curve", "IV"],
      ["pv-combiner-monitor", "汇流监测", "combiner", "monitor", "汇监"],
      ["pv-cleaning-schedule", "清洗计划", "cleaning", "schedule", "清洗"],
      ["pv-plant-pr", "光伏PR效率", "performance", "ratio", "PR"],
    ]),
    compactDocerCategory("hydrogen-process-advanced", "氢能工艺设备", "制氢、纯化、压缩、储运、加氢、燃料电池、氢安全和氢能控制图标。", "#0891b2", [
      ["electrolyzer-power-supply", "电解槽电源", "electrolyzer", "power", "电源"],
      ["hydrogen-water-treatment", "制氢水处理", "water", "hydrogen", "水处"],
      ["hydrogen-gas-liquid-separator", "气液分离器", "separator", "hydrogen", "气液"],
      ["hydrogen-oxygen-separator", "氢氧分离", "oxygen", "separator", "氢氧"],
      ["hydrogen-cooling-loop", "制氢冷却回路", "cooling", "hydrogen", "冷却"],
      ["hydrogen-pressure-regulator", "氢气调压", "pressure", "regulator", "调压"],
      ["hydrogen-tube-trailer", "长管拖车", "tube", "trailer", "拖车"],
      ["liquid-hydrogen-tank", "液氢储罐", "liquid", "hydrogen", "液氢"],
      ["hydrogen-refueling-station", "加氢站", "refueling", "hydrogen", "加氢"],
      ["fuel-cell-inverter", "燃料电池逆变", "fuel-cell", "inverter", "逆变"],
      ["hydrogen-safety-shutdown", "氢安全切断", "safety", "shutdown", "切断"],
      ["hydrogen-energy-management", "氢能管理", "hydrogen", "management", "氢管"],
    ]),
    compactDocerCategory("storage-advanced-scene", "储能细分设备", "电芯、簇、预制舱、均衡、绝缘监测、消防排风、液冷、SOC/SOH和充放电策略图标。", "#22c55e", [
      ["battery-cell", "电芯", "battery", "cell", "电芯"],
      ["battery-cluster", "电池簇", "battery", "cluster", "电簇"],
      ["battery-container-hvac", "储能舱空调", "container", "hvac", "空调"],
      ["battery-liquid-cooling", "电池液冷", "liquid", "cooling", "液冷"],
      ["battery-equalization", "电池均衡", "battery", "balance", "均衡"],
      ["insulation-monitoring-device", "绝缘监测", "insulation", "monitor", "绝缘"],
      ["storage-smoke-detector", "烟感探测", "smoke", "detector", "烟感"],
      ["storage-exhaust-fan", "排风系统", "exhaust", "fan", "排风"],
      ["battery-soh", "SOH健康度", "soh", "battery", "SOH"],
      ["charge-discharge-strategy", "充放电策略", "charge", "strategy", "策略"],
      ["black-start-storage", "黑启动储能", "black-start", "storage", "黑启"],
      ["virtual-power-plant-storage", "虚拟电厂储能", "vpp", "storage", "VPP"],
    ]),
    compactDocerCategory("power-electronics-scene", "电力电子设备", "整流、逆变、变流、SVG、STATCOM、MMC、柔直、DC/DC和电能质量治理图标。", "#6366f1", [
      ["rectifier-bridge", "整流桥", "rectifier", "bridge", "整流"],
      ["inverter-bridge", "逆变桥", "inverter", "bridge", "逆变"],
      ["dc-dc-converter", "DC/DC变换器", "dc-dc", "converter", "DCDC"],
      ["ac-dc-converter", "AC/DC变流器", "ac-dc", "converter", "ACDC"],
      ["dc-ac-converter", "DC/AC变流器", "dc-ac", "converter", "DCAC"],
      ["ac-ac-converter", "AC/AC变流器", "ac-ac", "converter", "ACAC"],
      ["svg-compensator", "SVG无功补偿", "svg", "compensator", "SVG"],
      ["statcom-device", "STATCOM装置", "statcom", "device", "STAT"],
      ["mmc-valve", "MMC阀组", "mmc", "valve", "MMC"],
      ["flexible-dc-station", "柔性直流站", "flexible", "dc", "柔直"],
      ["active-power-filter", "有源滤波器APF", "active", "filter", "APF"],
      ["solid-state-transformer", "固态变压器", "solid-state", "transformer", "固变"],
    ]),
    compactDocerCategory("cooling-energy-scene", "供冷与冷源", "冷站、冷机、冷冻水、冷却水、冷却塔、冰蓄冷、冷量表和冷负荷图标。", "#0ea5e9", [
      ["cooling-station", "供冷站", "cooling", "station", "冷站"],
      ["electric-chiller", "电制冷机", "electric", "chiller", "电冷"],
      ["absorption-chiller", "吸收式制冷机", "absorption", "chiller", "吸冷"],
      ["chilled-water-pump", "冷冻水泵", "chilled", "pump", "冷泵"],
      ["cooling-water-pump", "冷却水泵", "cooling", "pump", "却泵"],
      ["cooling-tower", "冷却塔", "cooling", "tower", "冷塔"],
      ["ice-storage-tank", "冰蓄冷罐", "ice", "storage", "冰蓄"],
      ["cold-thermal-storage", "冷蓄能", "cold", "storage", "冷蓄"],
      ["cooling-meter", "冷量表", "cooling", "meter", "冷表"],
      ["air-handling-unit", "组合式空调AHU", "ahu", "cooling", "AHU"],
      ["fan-coil-unit", "风机盘管FCU", "fcu", "cooling", "FCU"],
      ["cooling-load", "冷负荷", "cooling", "load", "冷荷"],
    ]),
    compactDocerCategory("gas-energy-scene", "燃气与气网", "燃气门站、调压、计量、管线、压缩、储气、燃机、燃气锅炉和气体检测图标。", "#64748b", [
      ["gas-gate-station", "燃气门站", "gas", "gate", "门站"],
      ["gas-regulator-station", "燃气调压站", "gas", "regulator", "调压"],
      ["gas-metering-station", "燃气计量站", "gas", "metering", "计量"],
      ["gas-pipeline", "燃气管线", "gas", "pipeline", "气管"],
      ["gas-compressor", "燃气压缩机", "gas", "compressor", "压缩"],
      ["gas-storage-tank", "储气罐", "gas", "storage", "储气"],
      ["lng-tank", "LNG储罐", "lng", "tank", "LNG"],
      ["cng-station", "CNG站", "cng", "station", "CNG"],
      ["gas-turbine", "燃气轮机", "gas", "turbine", "燃机"],
      ["gas-boiler", "燃气锅炉", "gas", "boiler", "气炉"],
      ["gas-leak-detector", "燃气泄漏检测", "gas", "leak", "泄漏"],
      ["gas-shutoff-valve", "燃气切断阀", "gas", "valve", "切阀"],
    ]),
    compactDocerCategory("integrated-energy-scene", "冷热电气综合能源", "能源站、冷热电联供、电制冷、电锅炉、热泵、燃气、储能、多能流和能量枢纽图标。", "#0f766e", [
      ["integrated-energy-station", "综合能源站", "integrated", "energy", "能源"],
      ["cchp-system", "冷热电联供CCHP", "cchp", "system", "CCHP"],
      ["energy-hub", "能量枢纽", "energy", "hub", "枢纽"],
      ["multi-energy-flow", "多能流", "multi-energy", "flow", "能流"],
      ["electric-to-heat", "电转热", "electric", "heat", "电热"],
      ["electric-to-cold", "电转冷", "electric", "cold", "电冷"],
      ["gas-to-power", "气转电", "gas", "power", "气电"],
      ["waste-heat-recovery", "余热回收", "waste-heat", "recovery", "余热"],
      ["heat-pump-system", "热泵系统", "heat-pump", "system", "热泵"],
      ["thermal-electric-storage", "热电储耦合", "thermal", "storage", "热储"],
      ["integrated-energy-ems", "综合能源EMS", "integrated", "ems", "EMS"],
      ["carbon-energy-dispatch", "碳能协同调度", "carbon", "dispatch", "碳调"],
    ]),
    compactDocerCategory("heating-network-scene", "供热场景", "热源、换热站、循环泵、板换、蓄热罐、热网、阀室、热表和热泵图标。", "#ea580c", [
      ["heat-source-station", "热源站", "heat-source", "heating", "热源"],
      ["heat-exchange-station", "换热站", "heat-exchange", "station", "换热"],
      ["district-heating-network", "供热管网", "district-heating", "network", "热网"],
      ["heating-circulation-pump", "循环泵", "circulation", "pump", "循环"],
      ["plate-heat-exchanger", "板式换热器", "plate", "heat-exchanger", "板换"],
      ["hot-water-tank", "热水罐", "hot-water", "tank", "热罐"],
      ["valve-chamber", "阀门井室", "valve", "chamber", "阀室"],
      ["radiator-terminal", "散热器末端", "radiator", "terminal", "散热"],
      ["floor-heating", "地暖", "floor-heating", "heating", "地暖"],
      ["heat-meter", "热量表", "heat", "meter", "热表"],
      ["air-source-heat-pump", "空气源热泵", "air-source", "heat-pump", "空源"],
      ["thermal-storage-tank", "蓄热罐", "thermal-storage", "tank", "蓄热"],
    ]),
    compactDocerCategory("meteorology-scada-scene", "气象监测场景", "气象站、测风、辐照、温湿度、雨量、气压、雪深、能见度和预报图标。", "#0ea5e9", [
      ["meteorological-station", "气象站", "meteorological", "station", "气象"],
      ["anemometer", "风速仪", "anemometer", "weather", "风速"],
      ["wind-vane", "风向标", "wind-vane", "weather", "风向"],
      ["pyranometer", "总辐照仪", "pyranometer", "solar", "辐照"],
      ["temperature-humidity-sensor", "温湿度传感器", "temperature", "humidity", "温湿"],
      ["rain-gauge", "雨量计", "rain", "gauge", "雨量"],
      ["barometer", "气压计", "barometer", "weather", "气压"],
      ["snow-depth-sensor", "雪深传感器", "snow", "sensor", "雪深"],
      ["visibility-meter", "能见度仪", "visibility", "weather", "能见"],
      ["lightning-detector", "雷电探测", "lightning", "detector", "雷电"],
      ["weather-forecast", "气象预测", "forecast", "weather", "预测"],
      ["icing-warning", "覆冰预警", "icing", "warning", "覆冰"],
    ]),
    compactDocerCategory("communication-control-scene", "通信控制场景", "SCADA、RTU、PLC、IED、网关、交换机、5G、光纤、遥测遥信和控制中心图标。", "#4f46e5", [
      ["scada-system", "SCADA系统", "scada", "control", "SCADA"],
      ["rtu-control-unit", "RTU控制单元", "rtu", "control", "RTU"],
      ["plc-control-unit", "PLC控制单元", "plc", "control", "PLC"],
      ["ied-protection-unit", "IED保护单元", "ied", "protection", "IED"],
      ["industrial-gateway", "工业网关", "gateway", "industrial", "网关"],
      ["ethernet-switch", "工业交换机", "ethernet", "switch", "交换"],
      ["fiber-optic-ring", "光纤环网", "fiber", "ring", "光环"],
      ["fiveg-router", "5G路由器", "5g", "router", "5G"],
      ["telemetry", "遥测", "telemetry", "control", "遥测"],
      ["remote-signaling", "遥信", "signaling", "control", "遥信"],
      ["remote-control", "遥控", "remote", "control", "遥控"],
      ["dispatch-control-center", "调度控制中心", "dispatch", "control", "调度"],
    ]),
  ];
}

iconCategories.push(...buildEnergyApplicationDocerCategories());

const sourceAudit = {
  checkedAt: new Date().toISOString(),
  docerSourcesChecked: [
    {
      url: "https://docer.wps.cn/?redirect-from=wwwdocer#/home",
      result: "public page reachable; page loads icon marketplace resources from WPS CDN",
    },
    {
      url: "https://docer-api.wps.cn/proxy/icon/icon/v4/tags_rec",
      result: "anonymous API returned icon tag names, including 免费",
    },
    {
      url: "https://docer-api.wps.cn/proxy/icon/icon/v5/info?id=21601071",
      result:
        "anonymous API exposed a sample SVG storage_url, but the item carried privilege_name=docer_icon",
    },
    {
      url: "https://docer-api.wps.cn/proxy/icon/icon/v4/mbs?collection_mb_id=21601298",
      result: "sample collection returned free_count=0 and vip_count=12",
    },
    {
      url: "https://www.wps.cn/privacy/clean_docer/",
      result:
        "WPS Docer service agreement states that digital works' intellectual property is not transferred to users and out-of-scope usage requires written authorization from the rights holder.",
    },
  ],
  decision:
    "No rights-unclear Docer SVG asset is copied into this repository. Generated SVG files are original project assets; actual Docer assets may be copied only when metadata or authorization explicitly allows repository redistribution.",
};

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderSvg(icon, category) {
  const title = escapeXml(icon.name);
  const description = escapeXml(`${category.label} - ${icon.tags.join(", ")}`);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" color="${icon.color}" role="img" aria-labelledby="${icon.id}-title ${icon.id}-desc">
  <title id="${icon.id}-title">${title}</title>
  <desc id="${icon.id}-desc">${description}</desc>
  <g>
${icon.body.trim()}
  </g>
</svg>
`;
}

function renderReadme(totalIcons) {
  return `# Docer Free Compatible Icon Library

This directory contains editable SVG icons generated for the graph modeling platform.

Important source note:

- The Docer/WPS icon marketplace was checked before generation.
- Public anonymous endpoints exposed icon tags and some SVG storage URLs.
- The probed SVG sample belonged to the \`docer_icon\` privilege set, and the sample collection reported \`free_count=0\`.
- To avoid copying assets without verified reuse rights, the SVG files in this directory are original project assets, not copied Docer files.

Generated output:

- Total icons: ${totalIcons}
- SVG format: standalone \`viewBox="0 0 64 64"\`
- Styling: editable paths using \`currentColor\` and a default \`color\` on the root SVG
- External dependencies: none
- Scripts or remote image references: none
- Search: \`search-index.json\` provides a flat searchable index; \`index.html\` provides browser-side keyword/category filtering.

Categories:

${iconCategories.map((category) => `- \`${category.id}\`: ${category.label}`).join("\n")}

Rebuild:

\`\`\`bash
node scripts/generate-docer-compatible-icons.mjs
\`\`\`
`;
}

function renderPreviewHtml(manifest) {
  const categoryOptions = manifest.categories
    .map((category) => `<option value="${escapeXml(category.id)}">${escapeXml(category.label)}</option>`)
    .join("");
  const cards = manifest.categories
    .map(
      (category) => `
      <section>
        <h2>${escapeXml(category.label)} <span>${escapeXml(category.id)}</span></h2>
        <p>${escapeXml(category.description)}</p>
        <div class="grid">
          ${category.icons
            .map(
              (icon) => `
              <article
                data-category="${escapeXml(category.id)}"
                data-search="${escapeXml(`${icon.name} ${icon.id} ${icon.tags.join(" ")} ${category.id} ${category.label}`.toLowerCase())}">
                <img src="./${escapeXml(icon.file)}" alt="${escapeXml(icon.name)}" />
                <strong>${escapeXml(icon.name)}</strong>
                <code>${escapeXml(icon.id)}</code>
              </article>`,
            )
            .join("")}
        </div>
      </section>`,
    )
    .join("");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeXml(manifest.label)}</title>
  <style>
    :root {
      color: #111827;
      background: #f8fafc;
      font-family: Arial, "Microsoft YaHei", sans-serif;
    }
    body {
      margin: 0;
      padding: 28px;
    }
    header {
      max-width: 1120px;
      margin: 0 auto 24px;
    }
    .toolbar {
      display: grid;
      grid-template-columns: minmax(240px, 1fr) minmax(160px, 220px);
      gap: 10px;
      margin-top: 16px;
      align-items: center;
    }
    input,
    select {
      height: 36px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      background: #fff;
      color: #111827;
      padding: 0 10px;
      font: inherit;
      box-sizing: border-box;
    }
    .result-count {
      margin-top: 10px;
      color: #475569;
      font-size: 13px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 26px;
      line-height: 1.25;
    }
    header p,
    section p {
      margin: 0;
      color: #64748b;
      line-height: 1.6;
    }
    section {
      max-width: 1120px;
      margin: 0 auto 28px;
    }
    h2 {
      margin: 0 0 8px;
      font-size: 20px;
      line-height: 1.3;
    }
    h2 span {
      color: #64748b;
      font-size: 13px;
      font-weight: 400;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(132px, 1fr));
      gap: 12px;
      margin-top: 12px;
    }
    article {
      min-height: 132px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #fff;
      display: grid;
      place-items: center;
      padding: 12px;
      text-align: center;
      box-sizing: border-box;
    }
    img {
      width: 56px;
      height: 56px;
      object-fit: contain;
      margin-bottom: 8px;
    }
    strong {
      display: block;
      font-size: 13px;
      line-height: 1.35;
    }
    code {
      display: block;
      margin-top: 4px;
      color: #64748b;
      font-size: 11px;
      word-break: break-word;
    }
    article[hidden],
    section[hidden] {
      display: none;
    }
    @media (max-width: 720px) {
      .toolbar {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>${escapeXml(manifest.label)}</h1>
    <p>共 ${manifest.totalIcons} 个原创 SVG 图标。未复制稻壳受权益限制的素材，来源核验记录见 source-audit.json。</p>
    <div class="toolbar" role="search">
      <input id="searchInput" type="search" placeholder="搜索名称、标签、分类，例如 电机 / flow / 图层" autocomplete="off" />
      <select id="categoryFilter" aria-label="分类筛选">
        <option value="">全部分类</option>
        ${categoryOptions}
      </select>
    </div>
    <div id="resultCount" class="result-count"></div>
  </header>
  ${cards}
  <script>
    const cards = Array.from(document.querySelectorAll("article"));
    const sections = Array.from(document.querySelectorAll("section"));
    const searchInput = document.getElementById("searchInput");
    const categoryFilter = document.getElementById("categoryFilter");
    const resultCount = document.getElementById("resultCount");

    function normalize(value) {
      return String(value || "").trim().toLowerCase();
    }

    function filterCards() {
      const keyword = normalize(searchInput.value);
      const category = categoryFilter.value;
      let visible = 0;
      for (const card of cards) {
        const show =
          (!keyword || card.dataset.search.includes(keyword)) &&
          (!category || card.dataset.category === category);
        card.hidden = !show;
        if (show) visible += 1;
      }
      for (const section of sections) {
        section.hidden = !Array.from(section.querySelectorAll("article")).some((card) => !card.hidden);
      }
      resultCount.textContent = "当前显示 " + visible + " / " + cards.length + " 个图标";
    }

    searchInput.addEventListener("input", filterCards);
    categoryFilter.addEventListener("change", filterCards);
    filterCards();
  </script>
</body>
</html>
`;
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

const manifest = {
  name: "docer-free-compatible",
  label: "稻壳免费图库兼容图标库",
  generatedAt: sourceAudit.checkedAt,
  sourcePolicy:
    "原创生成，未复制稻壳受权益限制的 SVG；稻壳接口核验记录见 source-audit.json。",
  root: "/icon-library/docer-free-compatible",
  categories: [],
};

for (const category of iconCategories) {
  const categoryDir = path.join(outputDir, category.id);
  await mkdir(categoryDir, { recursive: true });

  const manifestCategory = {
    id: category.id,
    label: category.label,
    description: category.description,
    icons: [],
  };

  for (const icon of category.icons) {
    const fileName = `${icon.id}.svg`;
    const filePath = path.join(categoryDir, fileName);
    await writeFile(filePath, renderSvg(icon, category), "utf8");
    manifestCategory.icons.push({
      id: icon.id,
      name: icon.name,
      file: `${category.id}/${fileName}`,
      color: icon.color,
      tags: icon.tags,
      source: "original-generated",
    });
  }

  manifest.categories.push(manifestCategory);
}

const totalIcons = manifest.categories.reduce((sum, category) => sum + category.icons.length, 0);
manifest.totalIcons = totalIcons;

const searchIndex = manifest.categories.flatMap((category) =>
  category.icons.map((icon) => ({
    id: icon.id,
    name: icon.name,
    file: icon.file,
    categoryId: category.id,
    categoryLabel: category.label,
    sourceId: "original-generated",
    sourceLabel: "Original generated",
    sourceName: icon.id,
    sourcePackage: "",
    license: "original-generated",
    keywords: [icon.name, icon.id, ...(icon.tags || []), category.id, category.label],
  })),
);

await writeFile(path.join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
await writeFile(path.join(outputDir, "search-index.json"), `${JSON.stringify(searchIndex, null, 2)}\n`, "utf8");
await writeFile(path.join(outputDir, "source-audit.json"), `${JSON.stringify(sourceAudit, null, 2)}\n`, "utf8");
await writeFile(path.join(outputDir, "README.md"), renderReadme(totalIcons), "utf8");
await writeFile(path.join(outputDir, "index.html"), renderPreviewHtml(manifest), "utf8");

console.log(`Generated ${totalIcons} SVG icons in ${path.relative(rootDir, outputDir)}`);
