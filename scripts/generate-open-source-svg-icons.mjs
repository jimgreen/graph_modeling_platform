import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(rootDir, "data", "icon-library", "open-source-svg");
const tempDir = path.join(rootDir, "tmp", "open-source-svg-icons");
const sourcePackDir = path.join(tempDir, "pack");
const sourceExtractDir = path.join(tempDir, "extract");
const maxIconsPerSourceCategory = 16;

const sources = [
  {
    id: "lucide",
    label: "Lucide",
    packageSpec: "lucide-static@1.21.0",
    packageName: "lucide-static",
    license: "ISC",
    repository: "https://github.com/lucide-icons/lucide",
    iconDir: ["icons"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg"),
  },
  {
    id: "tabler",
    label: "Tabler Icons",
    packageSpec: "@tabler/icons@3.44.0",
    packageName: "@tabler/icons",
    license: "MIT",
    repository: "https://github.com/tabler/tabler-icons",
    iconDir: ["icons", "outline"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg"),
  },
  {
    id: "bootstrap",
    label: "Bootstrap Icons",
    packageSpec: "bootstrap-icons@1.13.1",
    packageName: "bootstrap-icons",
    license: "MIT",
    repository: "https://github.com/twbs/icons",
    iconDir: ["icons"],
    fileFilter: (name) => name.endsWith(".svg") && !name.endsWith("-fill.svg"),
    iconName: (name) => path.basename(name, ".svg"),
  },
  {
    id: "phosphor",
    label: "Phosphor Icons",
    packageSpec: "@phosphor-icons/core@2.1.1",
    packageName: "@phosphor-icons/core",
    license: "MIT",
    repository: "https://github.com/phosphor-icons/core",
    iconDir: ["assets", "regular"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg"),
  },
  {
    id: "primer-octicons",
    label: "Primer Octicons",
    packageSpec: "@primer/octicons@19.28.1",
    packageName: "@primer/octicons",
    license: "MIT",
    repository: "https://github.com/primer/octicons",
    iconDir: ["build", "svg"],
    fileFilter: (name) => name.endsWith("-24.svg"),
    iconName: (name) => path.basename(name, "-24.svg"),
  },
  {
    id: "material-symbols",
    label: "Material Symbols",
    packageSpec: "@material-symbols/svg-400@0.45.2",
    packageName: "@material-symbols/svg-400",
    license: "Apache-2.0",
    repository: "https://github.com/google/material-design-icons",
    iconDir: ["outlined"],
    fileFilter: (name) => name.endsWith(".svg") && !name.endsWith("-fill.svg"),
    iconName: (name) => path.basename(name, ".svg"),
  },
  {
    id: "feather",
    label: "Feather Icons",
    packageSpec: "feather-icons@4.29.2",
    packageName: "feather-icons",
    license: "MIT",
    repository: "https://github.com/feathericons/feather",
    iconDir: ["dist", "icons"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg"),
  },
  {
    id: "iconoir",
    label: "Iconoir",
    packageSpec: "iconoir@7.11.1",
    packageName: "iconoir",
    license: "MIT",
    repository: "https://github.com/iconoir-icons/iconoir",
    iconDir: ["icons", "regular"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg"),
  },
  {
    id: "remixicon",
    label: "Remix Icon",
    packageSpec: "remixicon@4.9.1",
    packageName: "remixicon",
    license: "Apache-2.0",
    repository: "https://github.com/Remix-Design/RemixIcon",
    iconDir: ["icons"],
    fileFilter: (name) => name.endsWith("-line.svg"),
    iconName: (name) => path.basename(name, "-line.svg"),
    licenseFile: "License",
  },
  {
    id: "eva-icons",
    label: "Eva Icons",
    packageSpec: "eva-icons@1.1.3",
    packageName: "eva-icons",
    license: "MIT",
    repository: "https://github.com/akveo/eva-icons",
    iconDir: ["outline", "svg"],
    fileFilter: (name) => name.endsWith("-outline.svg"),
    iconName: (name) => path.basename(name, "-outline.svg"),
  },
  {
    id: "ionicons",
    label: "Ionicons",
    packageSpec: "ionicons@8.0.13",
    packageName: "ionicons",
    license: "MIT",
    repository: "https://github.com/ionic-team/ionicons",
    iconDir: ["dist", "collection", "components", "icon", "svg"],
    fileFilter: (name) => name.endsWith("-outline.svg"),
    iconName: (name) => path.basename(name, "-outline.svg"),
  },
  {
    id: "ant-design-icons",
    label: "Ant Design Icons",
    packageSpec: "@ant-design/icons-svg@4.4.2",
    packageName: "@ant-design/icons-svg",
    license: "MIT",
    repository: "https://github.com/ant-design/ant-design-icons",
    iconDir: ["inline-namespaced-svg", "outlined"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg"),
  },
  {
    id: "material-design-icons",
    label: "Material Design Icons",
    packageSpec: "@mdi/svg@7.4.47",
    packageName: "@mdi/svg",
    license: "Apache-2.0",
    repository: "https://github.com/Templarian/MaterialDesign-SVG",
    iconDir: ["svg"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg"),
  },
  {
    id: "coreui",
    label: "CoreUI Icons",
    packageSpec: "@coreui/icons@3.1.0",
    packageName: "@coreui/icons",
    license: "MIT",
    repository: "https://github.com/coreui/coreui-icons",
    iconDir: ["svg", "free"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg").replace(/^cil-/, ""),
  },
  {
    id: "fluent-system",
    label: "Fluent UI System Icons",
    packageSpec: "@fluentui/svg-icons@1.1.330",
    packageName: "@fluentui/svg-icons",
    license: "MIT",
    repository: "https://github.com/microsoft/fluentui-system-icons",
    iconDir: ["icons"],
    fileFilter: (name) => name.endsWith("_24_regular.svg"),
    iconName: (name) => path.basename(name, "_24_regular.svg").replaceAll("_", "-"),
  },
  {
    id: "carbon",
    label: "Carbon Icons",
    packageSpec: "@carbon/icons@11.82.0",
    packageName: "@carbon/icons",
    license: "Apache-2.0",
    repository: "https://github.com/carbon-design-system/carbon",
    iconDir: ["svg", "32"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg").replaceAll("--", "-"),
  },
  {
    id: "teenyicons",
    label: "Teenyicons",
    packageSpec: "teenyicons@0.4.1",
    packageName: "teenyicons",
    license: "MIT",
    repository: "https://github.com/teenyicons/teenyicons",
    iconDir: ["outline"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg"),
  },
  {
    id: "jam-icons",
    label: "Jam Icons",
    packageSpec: "jam-icons@2.0.0",
    packageName: "jam-icons",
    license: "MIT",
    repository: "https://github.com/michaelampr/jam",
    iconDir: ["svg"],
    fileFilter: (name) => name.endsWith(".svg") && !name.endsWith("-f.svg"),
    iconName: (name) => path.basename(name, ".svg"),
  },
  {
    id: "bytesize",
    label: "Bytesize Icons",
    packageSpec: "bytesize-icons@1.4.0",
    packageName: "bytesize-icons",
    license: "MIT",
    repository: "https://github.com/danklammer/bytesize-icons",
    iconDir: ["dist", "icons"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg"),
    licenseFile: "LICENSE.md",
  },
  {
    id: "simple-line-icons",
    label: "Simple Line Icons",
    packageSpec: "simple-line-icons@2.5.5",
    packageName: "simple-line-icons",
    license: "MIT",
    repository: "https://github.com/thesabbir/simple-line-icons",
    iconDir: ["src", "svgs"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg"),
    licenseFile: "LICENSE.md",
  },
  {
    id: "line-md",
    label: "Line MD",
    packageSpec: "line-md@3.0.5",
    packageName: "line-md",
    license: "MIT",
    repository: "https://github.com/cyberalien/line-md",
    iconDir: ["svg"],
    fileFilter: (name) =>
      name.endsWith(".svg") && !name.includes("-loop") && !name.includes("-twotone"),
    iconName: (name) => path.basename(name, ".svg"),
    licenseFile: "license.txt",
  },
  {
    id: "heroicons",
    label: "Heroicons",
    packageSpec: "heroicons@2.2.0",
    packageName: "heroicons",
    license: "MIT",
    repository: "https://github.com/tailwindlabs/heroicons",
    iconDir: ["24", "outline"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg"),
  },
  {
    id: "flowbite",
    label: "Flowbite Icons",
    packageSpec: "flowbite-icons@1.5.0",
    packageName: "flowbite-icons",
    license: "MIT",
    repository: "https://github.com/themesberg/flowbite-icons",
    iconDir: ["src", "outline"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg"),
  },
  {
    id: "mono-icons",
    label: "Mono Icons",
    packageSpec: "mono-icons@1.3.1",
    packageName: "mono-icons",
    license: "MIT",
    repository: "https://github.com/mono-company/mono-icons",
    iconDir: ["svg"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg"),
  },
  {
    id: "majesticons",
    label: "Majesticons",
    packageSpec: "majesticons@2.1.2",
    packageName: "majesticons",
    license: "MIT",
    repository: "https://github.com/halfmage/majesticons",
    iconDir: ["line"],
    fileFilter: (name) => name.endsWith("-line.svg"),
    iconName: (name) => path.basename(name, "-line.svg"),
  },
  {
    id: "zondicons",
    label: "Zondicons",
    packageSpec: "zondicons@1.2.0",
    packageName: "zondicons",
    license: "CC-BY-4.0",
    repository: "https://www.zondicons.com/",
    iconDir: [],
    fileFilter: (name) => name.endsWith(".svg") && !name.endsWith("-solid.svg"),
    iconName: (name) => path.basename(name, ".svg").replace(/-outline$/, ""),
  },
  {
    id: "boxicons",
    label: "Boxicons",
    packageSpec: "boxicons@2.1.4",
    packageName: "boxicons",
    license: "(CC-BY-4.0 OR OFL-1.1 OR MIT)",
    repository: "https://github.com/atisawd/boxicons",
    iconDir: ["svg", "regular"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg").replace(/^bx-/, ""),
  },
  {
    id: "fontawesome-solid",
    label: "Font Awesome Free Solid",
    packageSpec: "@fortawesome/fontawesome-free@7.2.0",
    packageName: "@fortawesome/fontawesome-free",
    license: "(CC-BY-4.0 AND OFL-1.1 AND MIT)",
    repository: "https://github.com/FortAwesome/Font-Awesome",
    iconDir: ["svgs", "solid"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg"),
    licenseFile: "LICENSE.txt",
  },
  {
    id: "fontawesome-regular",
    label: "Font Awesome Free Regular",
    packageSpec: "@fortawesome/fontawesome-free@7.2.0",
    packageName: "@fortawesome/fontawesome-free",
    license: "(CC-BY-4.0 AND OFL-1.1 AND MIT)",
    repository: "https://github.com/FortAwesome/Font-Awesome",
    iconDir: ["svgs", "regular"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg"),
    licenseFile: "LICENSE.txt",
  },
  {
    id: "eos-icons",
    label: "EOS Icons",
    packageSpec: "eos-icons@5.4.0",
    packageName: "eos-icons",
    license: "MIT",
    repository: "https://gitlab.com/SUSE-UIUX/eos-icons",
    iconDir: ["svg-outlined", "material"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg").replaceAll("_", "-"),
  },
  {
    id: "pixelarticons",
    label: "Pixelarticons",
    packageSpec: "pixelarticons@2.1.2",
    packageName: "pixelarticons",
    license: "MIT",
    repository: "https://github.com/halfmage/pixelarticons",
    iconDir: ["svg"],
    fileFilter: (name) => name.endsWith(".svg") && !name.endsWith("-sharp.svg"),
    iconName: (name) => path.basename(name, ".svg"),
  },
  {
    id: "evil-icons",
    label: "Evil Icons",
    packageSpec: "evil-icons@1.10.1",
    packageName: "evil-icons",
    license: "MIT",
    repository: "https://github.com/outpunk/evil-icons",
    iconDir: ["assets", "icons"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg").replace(/^ei-/, ""),
    licenseFile: "LICENSE.txt",
  },
  {
    id: "maki",
    label: "Mapbox Maki",
    packageSpec: "@mapbox/maki@8.2.0",
    packageName: "@mapbox/maki",
    license: "CC0-1.0",
    repository: "https://github.com/mapbox/maki",
    iconDir: ["icons"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg"),
    licenseFile: "LICENSE.txt",
  },
  {
    id: "vaadin",
    label: "Vaadin Icons",
    packageSpec: "@vaadin/icons@25.1.4",
    packageName: "@vaadin/icons",
    license: "Apache-2.0",
    repository: "https://github.com/vaadin/web-components",
    iconDir: ["assets", "svg"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg"),
  },
  {
    id: "gravity-ui",
    label: "Gravity UI Icons",
    packageSpec: "@gravity-ui/icons@2.18.0",
    packageName: "@gravity-ui/icons",
    license: "MIT",
    repository: "https://github.com/gravity-ui/icons",
    iconDir: ["svgs"],
    fileFilter: (name) => name.endsWith(".svg") && !name.endsWith("-fill.svg"),
    iconName: (name) => path.basename(name, ".svg"),
  },
  {
    id: "humbleicons",
    label: "Humbleicons",
    packageSpec: "humbleicons@1.21.0",
    packageName: "humbleicons",
    license: "MIT",
    repository: "https://github.com/zraly/humbleicons",
    iconDir: ["icons"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg"),
    licenseFile: "license",
  },
  {
    id: "vscode-codicons",
    label: "VS Code Codicons",
    packageSpec: "@vscode/codicons@0.0.45",
    packageName: "@vscode/codicons",
    license: "CC-BY-4.0",
    repository: "https://github.com/microsoft/vscode-codicons",
    iconDir: ["src", "icons"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg"),
  },
  {
    id: "carbon-pictograms",
    label: "Carbon Pictograms",
    packageSpec: "@carbon/pictograms@12.78.0",
    packageName: "@carbon/pictograms",
    license: "Apache-2.0",
    repository: "https://github.com/carbon-design-system/carbon",
    iconDir: ["svg"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg").replaceAll("--", "-"),
  },
  {
    id: "open-iconic",
    label: "Open Iconic",
    packageSpec: "open-iconic@1.1.1",
    packageName: "open-iconic",
    license: "MIT",
    repository: "https://github.com/iconic/open-iconic",
    iconDir: ["svg"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg"),
    licenseFile: "ICON-LICENSE",
    packageLicensePattern: /\bMIT\b/i,
  },
  {
    id: "healthicons",
    label: "Healthicons",
    packageSpec: "healthicons@2.0.0",
    packageName: "healthicons",
    license: "MIT",
    repository: "https://github.com/resolvetosavelives/healthicons",
    iconDir: ["public", "icons", "svg", "outline"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg"),
  },
  {
    id: "entypo",
    label: "Entypo",
    packageSpec: "entypo@2.2.1",
    packageName: "entypo",
    license: "ISC",
    repository: "https://github.com/hypermodules/entypo",
    iconDir: ["src", "Entypo"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg"),
    licenseFile: "LICENSE.md",
  },
  {
    id: "grommet",
    label: "Grommet Icons",
    packageSpec: "grommet-icons@4.14.0",
    packageName: "grommet-icons",
    license: "Apache-2.0",
    repository: "https://github.com/grommet/grommet-icons",
    iconDir: ["img"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg"),
  },
  {
    id: "sargam",
    label: "Sargam Icons",
    packageSpec: "sargam-icons@1.6.7",
    packageName: "sargam-icons",
    license: "MIT",
    repository: "https://github.com/planetabhi/sargam-icons",
    iconDir: ["Icons", "Line"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) =>
      path
        .basename(name, ".svg")
        .replace(/^si[_-]/i, "")
        .replaceAll("_", "-")
        .toLowerCase(),
  },
  {
    id: "ikonate",
    label: "Ikonate",
    packageSpec: "ikonate@1.1.1",
    packageName: "ikonate",
    license: "MIT",
    repository: "https://github.com/eucalyptuss/ikonate",
    iconDir: ["icons"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg"),
  },
  {
    id: "uiw",
    label: "UIW Icons",
    packageSpec: "@uiw/icons@2.6.10",
    packageName: "@uiw/icons",
    license: "MIT",
    repository: "https://github.com/uiwjs/icons",
    iconDir: ["icon"],
    fileFilter: (name) => name.endsWith(".svg") && name !== "CONTRIBUTORS.svg",
    iconName: (name) => path.basename(name, ".svg"),
  },
  {
    id: "mynaui",
    label: "Mynaui Icons",
    packageSpec: "@mynaui/icons@0.4.3",
    packageName: "@mynaui/icons",
    license: "MIT",
    repository: "https://github.com/praveenjuge/mynaui-icons",
    iconDir: ["icons"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg"),
  },
  {
    id: "patternfly",
    label: "PatternFly Icons",
    packageSpec: "@patternfly/icons@1.0.3",
    packageName: "@patternfly/icons",
    license: "MIT",
    repository: "https://github.com/patternfly/patternfly-icons",
    iconDir: ["patternfly"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg"),
  },
  {
    id: "flag-icons",
    label: "Flag Icons",
    packageSpec: "flag-icons@7.5.0",
    packageName: "flag-icons",
    license: "MIT",
    repository: "https://github.com/lipis/flag-icons",
    iconDir: ["flags", "4x3"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg").toLowerCase(),
    forceCategoryId: "flags-regions",
    maxIconsPerCategory: 320,
    disableFamilyLimit: true,
  },
  {
    id: "govicons",
    label: "Gov Icons",
    packageSpec: "govicons@1.6.0",
    packageName: "govicons",
    license: "(OFL-1.1 AND MIT)",
    repository: "https://github.com/540co/govicons",
    iconDir: ["raw-svg"],
    fileFilter: (name) => name.endsWith(".svg") && !name.startsWith("logo-"),
    iconName: (name) => path.basename(name, ".svg"),
    licenseFile: "LICENSE.md",
  },
  {
    id: "zendesk-garden",
    label: "Zendesk Garden Icons",
    packageSpec: "@zendeskgarden/svg-icons@8.4.0",
    packageName: "@zendeskgarden/svg-icons",
    license: "Apache-2.0",
    repository: "https://github.com/zendeskgarden/svg-icons",
    iconDir: ["src", "16"],
    fileFilter: (name) => name.endsWith("-stroke.svg"),
    iconName: (name) => path.basename(name, "-stroke.svg"),
    licenseFile: "LICENSE.md",
  },
  {
    id: "map-icons",
    label: "Map Icons",
    packageSpec: "map-icons@3.0.3",
    packageName: "map-icons",
    license: "ISC",
    repository: "https://github.com/scottdejonge/Map-Icons",
    iconDir: ["src", "icons"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) => path.basename(name, ".svg"),
  },
  {
    id: "adobe-spectrum",
    label: "Adobe Spectrum CSS Icons",
    packageSpec: "@adobe/spectrum-css@3.0.0",
    packageName: "@adobe/spectrum-css",
    license: "Apache-2.0",
    repository: "https://github.com/adobe/spectrum-css",
    iconDir: ["icons", "medium"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) =>
      path
        .basename(name, ".svg")
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
        .toLowerCase(),
  },
  {
    id: "weather-underground",
    label: "Weather Underground Icons",
    packageSpec: "weather-underground-icons@1.0.0",
    packageName: "weather-underground-icons",
    license: "(MIT OR GPL-3.0)",
    repository: "https://github.com/manifestinteractive/weather-underground-icons",
    iconDir: ["dist", "icons", "black", "svg"],
    fileFilter: (name) => name.endsWith(".svg"),
    iconName: (name) =>
      path
        .basename(name, ".svg")
        .replace(/^chance/, "chance-")
        .replace(/^mostly/, "mostly-")
        .replace(/^partly/, "partly-")
        .replace("tstorms", "thunderstorms"),
  },
];

const activeSources = sources.filter((source) => source.id !== "fluent-system");

const categories = [
  {
    id: "ui-commands",
    label: "通用命令",
    description: "新增、删除、复制、粘贴、保存、导入导出、撤销重做等常用操作。",
    patterns: [
      "add",
      "plus",
      "minus",
      "subtract",
      "remove",
      "delete",
      "trash",
      "close",
      "dismiss",
      "cancel",
      "check",
      "edit",
      "pencil",
      "copy",
      "cut",
      "clipboard",
      "paste",
      "save",
      "download",
      "upload",
      "import",
      "export",
      "print",
      "share",
      "undo",
      "redo",
      "refresh",
      "sync",
    ],
  },
  {
    id: "canvas-tools",
    label: "画布工具",
    description: "选择、移动、旋转、缩放、裁剪、对齐、网格、图层、绘制等画布操作。",
    patterns: [
      "cursor",
      "pointer",
      "mouse",
      "move",
      "drag",
      "pan",
      "rotate",
      "resize",
      "scale",
      "zoom",
      "select",
      "selection",
      "align",
      "distribute",
      "crop",
      "transform",
      "grid",
      "layout",
      "ruler",
      "vector",
      "shape",
      "pen",
      "draw",
      "brush",
      "bucket",
      "layers",
      "stack",
    ],
  },
  {
    id: "files-documents",
    label: "文件文档",
    description: "文件、文件夹、PDF、压缩包、归档、图片文档、表格文档等资源。",
    patterns: [
      "file",
      "document",
      "doc",
      "folder",
      "archive",
      "zip",
      "pdf",
      "word",
      "excel",
      "powerpoint",
      "presentation",
      "sheet",
      "page",
      "book",
      "notebook",
      "note",
      "text",
    ],
  },
  {
    id: "data-charts",
    label: "数据图表",
    description: "表格、数据库、曲线、柱状图、饼图、统计分析和计算类图标。",
    patterns: [
      "chart",
      "graph",
      "analytics",
      "database",
      "data",
      "table",
      "calculator",
      "function",
      "sigma",
      "trend",
      "histogram",
      "pie",
      "bar",
      "scatter",
      "line",
      "dashboard",
      "gauge",
      "meter",
    ],
  },
  {
    id: "status-alerts",
    label: "状态告警",
    description: "成功、失败、警告、信息、锁定、权限、安全和异常状态。",
    patterns: [
      "alert",
      "warning",
      "info",
      "check",
      "success",
      "error",
      "circle-x",
      "x-circle",
      "shield",
      "lock",
      "unlock",
      "key",
      "bug",
      "ban",
      "flag",
      "bell",
      "notification",
      "exclamation",
      "question",
    ],
  },
  {
    id: "communication",
    label: "协作通信",
    description: "用户、组织、邮件、消息、电话、会议、云、链接、附件和网络通信。",
    patterns: [
      "user",
      "users",
      "person",
      "people",
      "mail",
      "email",
      "message",
      "chat",
      "phone",
      "call",
      "video",
      "meeting",
      "link",
      "attach",
      "paperclip",
      "cloud",
      "wifi",
      "network",
      "share",
      "send",
    ],
  },
  {
    id: "media-assets",
    label: "媒体素材",
    description: "图片、相机、视频、音频、麦克风、音量、颜色、画笔和调色板。",
    patterns: [
      "image",
      "photo",
      "picture",
      "camera",
      "video",
      "film",
      "media",
      "music",
      "audio",
      "mic",
      "microphone",
      "speaker",
      "volume",
      "palette",
      "color",
      "paint",
      "brush",
      "dropper",
    ],
  },
  {
    id: "developer-tools",
    label: "开发工具",
    description: "代码、终端、分支、提交、接口、服务、插件、命令行和调试工具。",
    patterns: [
      "code",
      "terminal",
      "console",
      "command",
      "git",
      "branch",
      "commit",
      "merge",
      "pull",
      "api",
      "webhook",
      "server",
      "cpu",
      "chip",
      "package",
      "plugin",
      "puzzle",
      "braces",
      "brackets",
      "bug",
    ],
  },
  {
    id: "energy-generic",
    label: "能源通用",
    description: "电池、电力、太阳、风、水、火、温度、插头、线缆和环保能源图标。",
    patterns: [
      "battery",
      "bolt",
      "flash",
      "zap",
      "lightning",
      "solar",
      "sun",
      "wind",
      "water",
      "droplet",
      "flame",
      "fire",
      "temperature",
      "thermometer",
      "heat",
      "power",
      "plug",
      "cable",
      "gas",
      "oil",
      "leaf",
      "tree",
      "recycle",
      "eco",
    ],
  },
  {
    id: "weather-environment",
    label: "气象环境",
    description: "天气、日照、云雨、雪雾、雷暴、风、湿度、空气和环境监测类图标。",
    patterns: [
      "weather",
      "cloud",
      "cloudy",
      "rain",
      "drizzle",
      "snow",
      "flurries",
      "sleet",
      "hail",
      "fog",
      "hazy",
      "storm",
      "thunderstorm",
      "thunderstorms",
      "sunny",
      "sun",
      "moon",
      "humidity",
      "wind",
      "air",
      "dust",
      "environment",
      "eco",
      "leaf",
    ],
    denyPatterns: [
      /air[-_ ]?(balloon|horn|traffic)/i,
      /balloon[-_ ]?hot[-_ ]?air/i,
      /hot[-_ ]?air[-_ ]?balloon/i,
      /snow(boarding|mobile|shoeing)/i,
      /t[-_ ]?shirt[-_ ]?air/i,
    ],
  },
  {
    id: "power-grid-electrical",
    label: "电力电网",
    description: "电网、输配电、变电、开关、线缆、插头、回路、电压和电气控制类图标。",
    patterns: [
      "power",
      "electric",
      "electrical",
      "electricity",
      "grid",
      "transmission",
      "distribution",
      "substation",
      "transformer",
      "tower",
      "pole",
      "cable",
      "wire",
      "plug",
      "outlet",
      "socket",
      "switch",
      "circuit",
      "breaker",
      "fuse",
      "voltage",
      "bolt",
      "flash",
      "zap",
      "lightning",
    ],
    denyPatterns: [
      /^arrow[-_ ]/i,
      /^nintendo[-_ ]?switch$/i,
      /auto[-_ ]?transmission/i,
      /eiffel[-_ ]?tower/i,
      /(beijing|berlin|dallas|osaka|paris|shanghai|stuttgart)[-_ ].*tower/i,
      /(broadcast|cell|communications|computer|control|desktop|radio|signal)[-_ ]tower/i,
      /tower[-_ ](beach|broadcast|cell|control|no[-_ ]?access|observation)/i,
      /observation[-_ ]tower/i,
      /(bus|truck|razor)[-_ ]electric/i,
      /(electric[-_ ])?(bike|moped|rickshaw|scooter)/i,
      /brain[-_ ]electricity/i,
      /city[-_ ]?switch/i,
      /dance[-_ ]?pole/i,
      /domain[-_ ]?switch/i,
      /letter[-_ ]?switch/i,
      /sign[-_ ]?pole/i,
      /frost[-_ ]?tower/i,
      /switch[-_ ]?(access|account|left|vertical)/i,
      /transmission[-_ ]?lte/i,
    ],
  },
  {
    id: "generation-link",
    label: "发电环节",
    description: "发电、电厂、发电机、燃料、水务、日照、机组监控、并网和发电计量类图标。",
    patterns: [
      "generation",
      "generator",
      "power",
      "plant",
      "factory",
      "energy",
      "electric",
      "flash",
      "bolt",
      "zap",
      "lightning",
      "turbine",
      "solar",
      "wind",
      "hydro",
      "water",
      "fuel",
      "gas",
      "coal",
      "steam",
      "gauge",
      "meter",
      "monitor",
    ],
    denyPatterns: [/[-_ ]arrow[-_ ]/i, /blood[-_ ]?pressure/i],
  },
  {
    id: "transmission-link",
    label: "输电环节",
    description: "输电线路、铁塔、导线、杆塔、绝缘、避雷、通道、巡检和高压直流类图标。",
    patterns: [
      "transmission",
      "tower",
      "line",
      "wire",
      "cable",
      "conductor",
      "pole",
      "grid",
      "network",
      "insulator",
      "ground",
      "lightning",
      "bolt",
      "flash",
      "drone",
      "patrol",
      "sync",
      "branch",
      "hvdc",
    ],
    denyPatterns: [
      /road/i,
      /location[-_ ]?heart/i,
      /location[-_ ]?marina/i,
      /drone[-_ ]?delivery/i,
      /(beijing|berlin|dallas|osaka|paris|shanghai|stuttgart)[-_ ].*tower/i,
      /source[-_ ]?branch/i,
      /auto[-_ ]?transmission/i,
      /frost[-_ ]?tower/i,
      /(broadcast|cell|communications|computer|control|desktop|radio|signal)[-_ ]tower/i,
      /tower[-_ ](broadcast|cell|control)/i,
      /transmission[-_ ]?lte/i,
    ],
  },
  {
    id: "substation-link",
    label: "变电环节",
    description: "变电站、变压器、母线、断路器、隔离开关、互感器、保护屏柜和站控设备类图标。",
    patterns: [
      "substation",
      "transformer",
      "busbar",
      "breaker",
      "switch",
      "disconnect",
      "grounding",
      "relay",
      "protection",
      "panel",
      "cabinet",
      "grid",
      "voltage",
      "current",
      "meter",
      "gauge",
      "shield",
      "control",
      "settings",
      "flash",
      "plug",
    ],
    denyPatterns: [
      /^keyboard[-_ ]/i,
      /account[-_ ]?settings/i,
      /airplane[-_ ]?settings/i,
      /air[-_ ]?traffic[-_ ]?control/i,
      /devops/i,
      /fraud/i,
      /kubernetes/i,
      /movie[-_ ].*settings/i,
      /^nintendo[-_ ]?switch$/i,
      /panel[-_ ]?(bottom|left|right|top)/i,
      /panel[-_ ]?(expansion|open)/i,
      /pest[-_ ]?control/i,
      /settings/i,
      /settings[-_ ]?voice/i,
      /side[-_ ]?panel/i,
      /source[-_ ]?control/i,
      /switch[-_ ]?(access|account|left)/i,
    ],
  },
  {
    id: "distribution-link",
    label: "配电环节",
    description: "配电网、馈线、环网柜、箱变、分支箱、台区、低压柜、自动化终端和故障定位类图标。",
    patterns: [
      "distribution",
      "feeder",
      "branch",
      "box",
      "cabinet",
      "switch",
      "terminal",
      "automation",
      "network",
      "flowchart",
      "topology",
      "plug",
      "cable",
      "transformer",
      "low-voltage",
      "voltage",
      "fault",
      "location",
      "wrench",
      "tool",
      "home",
      "building",
    ],
    denyPatterns: [
      /^arrow[-_ ]/i,
      /[-_ ]arrow[-_ ]/i,
      /^chevron[-_ ]/i,
      /^keyboard[-_ ]/i,
      /home[-_ ]?repair[-_ ]?service/i,
      /medicine[-_ ]?box/i,
      /bounding[-_ ]?box/i,
      /heart[-_ ]?box/i,
      /box\d*[-_ ]?heart/i,
    ],
  },
  {
    id: "consumption-link",
    label: "用电环节",
    description: "用户侧、负荷、电表、楼宇、工厂、居民、充电桩、需求响应、能效和用电监测类图标。",
    patterns: [
      "consumption",
      "consumer",
      "customer",
      "load",
      "meter",
      "gauge",
      "home",
      "house",
      "building",
      "factory",
      "industrial",
      "residential",
      "plug",
      "socket",
      "outlet",
      "charging",
      "charger",
      "ev",
      "vehicle",
      "light",
      "bulb",
      "efficiency",
      "dashboard",
      "monitor",
    ],
    denyPatterns: [/f1[-_ ]?pit/i, /food[-_ ]?journey/i, /financial[-_ ]?customer/i, /sign[-_ ]?stop/i],
  },
  {
    id: "renewable-generation",
    label: "风光水发电",
    description: "风电、光伏、水电、可再生能源、电站、组件、叶片、水资源和清洁能源类图标。",
    patterns: [
      "wind",
      "turbine",
      "blade",
      "solar",
      "sun",
      "sunny",
      "photovoltaic",
      "pv",
      "panel",
      "hydro",
      "water",
      "dam",
      "wave",
      "droplet",
      "renewable",
      "green",
      "eco",
      "energy",
      "plant",
      "leaf",
      "tree",
    ],
  },
  {
    id: "thermal-heating",
    label: "火电供热",
    description: "火电、燃气、锅炉、蒸汽、热力、管网、阀门、泵、温度和供热设施类图标。",
    patterns: [
      "fire",
      "flame",
      "thermal",
      "heat",
      "heating",
      "hot",
      "boiler",
      "steam",
      "temperature",
      "thermometer",
      "radiator",
      "pipe",
      "pipeline",
      "pump",
      "valve",
      "furnace",
      "gas",
      "oil",
      "fuel",
      "factory",
      "plant",
      "chimney",
    ],
    denyPatterns: [
      /hot[-_ ]?dog/i,
      /food[-_ ]?hot[-_ ]?dog/i,
      /cup[-_ ]?hot/i,
      /bowl[-_ ]?hot/i,
      /build[-_ ]?and[-_ ]?deploy[-_ ]?pipeline/i,
      /devops/i,
      /cicd/i,
    ],
  },
  {
    id: "hydrogen-storage",
    label: "氢能储能",
    description: "氢能、电池、储能、充放电、燃料、储罐、容器、气体、能量管理和备用电源类图标。",
    patterns: [
      "hydrogen",
      "fuel",
      "battery",
      "batteries",
      "charge",
      "charging",
      "charger",
      "storage",
      "tank",
      "cylinder",
      "container",
      "gas",
      "power",
      "energy",
      "backup",
      "plug",
      "flash",
      "bolt",
      "zap",
    ],
    denyPatterns: [
      /blood[-_ ]?cells?/i,
      /block[-_ ]?storage/i,
      /cancer/i,
      /cell[-_ ]?signal/i,
      /container[-_ ]?microservices/i,
      /deploying[-_ ]?containers/i,
      /diving/i,
      /flash[-_ ]?storage/i,
      /hyper[-_ ]?protect[-_ ]?containers/i,
      /ibm[-_ ].*(containers?|storage)/i,
      /managing[-_ ]?containers/i,
      /object[-_ ]?storage/i,
      /offline[-_ ]?storage/i,
      /storage[-_ ]?(domain|pool|product|request|systems)/i,
      /virtual[-_ ]?storage/i,
      /scuba/i,
      /sd[-_ ]?storage/i,
      /shirt[-_ ]?tank/i,
      /tape[-_ ]?storage/i,
    ],
  },
  {
    id: "new-energy-equipment",
    label: "新能源设备",
    description: "风电、光伏、氢能、储能、新能源场站、并网、预测、监测和能量管理类图标。",
    patterns: [
      "renewable",
      "new-energy",
      "wind",
      "turbine",
      "blade",
      "solar",
      "sun",
      "sunny",
      "photovoltaic",
      "pv",
      "panel",
      "hydrogen",
      "fuel-cell",
      "fuel",
      "battery",
      "storage",
      "charge",
      "charging",
      "power",
      "plant",
      "forecast",
      "monitor",
      "dashboard",
      "green",
      "eco",
    ],
    denyPatterns: [
      /block[-_ ]?storage/i,
      /flash[-_ ]?storage/i,
      /ibm[-_ ].*storage/i,
      /object[-_ ]?storage/i,
      /offline[-_ ]?storage/i,
      /sd[-_ ]?storage/i,
      /storage[-_ ]?(domain|pool|product|request|systems)/i,
      /tape[-_ ]?storage/i,
      /virtual[-_ ]?storage/i,
    ],
  },
  {
    id: "power-electronics",
    label: "电力电子",
    description: "整流、逆变、变流、DC/DC、AC/DC、滤波、补偿、柔直、并网和功率控制类图标。",
    patterns: [
      "electronics",
      "converter",
      "inverter",
      "rectifier",
      "dc",
      "ac",
      "power",
      "switch",
      "circuit",
      "chip",
      "cpu",
      "controller",
      "control",
      "settings",
      "filter",
      "compensation",
      "voltage",
      "current",
      "wave",
      "pulse",
      "plug",
      "flash",
      "bolt",
      "zap",
    ],
    denyPatterns: [
      /^filter($|[-_ ])/i,
      /^filters?$/i,
      /(form|global|list)[-_ ]?filters?/i,
      /washington[-_ ]?dc/i,
      /(account|airplane|calendar|keyboard|movie)[-_ ].*(filter|settings)/i,
      /ac[-_ ]?unit/i,
      /air[-_ ]?traffic[-_ ]?control/i,
      /bed[-_ ]?pulse/i,
      /electronics[-_ ]?store/i,
      /game[-_ ]?controller/i,
      /handheld[-_ ]?controller/i,
      /heart[-_ ]?pulse/i,
      /missing[-_ ]?controller/i,
      /pulse[-_ ]?oximeter/i,
      /^dc$/i,
      /settings[-_ ]?(power|voice)/i,
      /power[-_ ]?settings/i,
      /stadia[-_ ]?controller/i,
      /^controller$/i,
      /controller[-_ ]?(classic|fast|gen|next|off|paus|play|record|retro|stop)/i,
    ],
  },
  {
    id: "cooling-heating-energy",
    label: "冷热能源",
    description: "供冷、供热、冷热源、冷机、热泵、冷却塔、水泵、温度、冷热负荷和冷热计量类图标。",
    patterns: [
      "cooling",
      "cool",
      "cold",
      "snow",
      "snowflake",
      "ice",
      "chiller",
      "heating",
      "heat",
      "hot",
      "thermal",
      "temperature",
      "thermometer",
      "pump",
      "water",
      "tower",
      "pipe",
      "pipeline",
      "valve",
      "radiator",
      "fan",
      "meter",
      "gauge",
      "load",
    ],
    denyPatterns: [/ice[-_ ]?cream/i],
  },
  {
    id: "gas-energy",
    label: "燃气能源",
    description: "燃气、气网、燃机、燃气锅炉、调压、计量、储气、管线、泄漏检测和气体安全类图标。",
    patterns: [
      "gas",
      "fuel",
      "lng",
      "cng",
      "pipeline",
      "pipe",
      "valve",
      "regulator",
      "pressure",
      "meter",
      "gauge",
      "tank",
      "storage",
      "compressor",
      "turbine",
      "boiler",
      "flame",
      "fire",
      "leak",
      "hazard",
      "safety",
      "shield",
      "warning",
    ],
    denyPatterns: [/blood[-_ ]?pressure/i, /diving/i, /scuba/i, /shirt[-_ ]?tank/i],
  },
  {
    id: "integrated-energy",
    label: "综合能源",
    description: "冷、热、电、气多能互补，综合能源站、能量枢纽、CCHP、多能流、碳能协同和能源调度类图标。",
    patterns: [
      "integrated",
      "multi-energy",
      "energy",
      "hub",
      "cchp",
      "power",
      "electric",
      "gas",
      "heat",
      "thermal",
      "cooling",
      "cold",
      "water",
      "battery",
      "storage",
      "flow",
      "sync",
      "exchange",
      "dispatch",
      "dashboard",
      "monitor",
      "carbon",
      "eco",
      "plant",
    ],
    denyPatterns: [
      /currency[-_ ]?exchange/i,
      /cash[-_ ]?flow/i,
      /contractual[-_ ]?flow/i,
      /carbon[-_ ]?for[-_ ]?ibm/i,
      /db2[-_ ]?genius/i,
      /player[-_ ]?flow/i,
      /traffic[-_ ]?flow/i,
      /money[-_ ]?exchange/i,
      /exchange[-_ ]?(cny|funds)/i,
    ],
  },
  {
    id: "communication-control",
    label: "通信与控制",
    description: "通信、网络、信号、网关、路由、无线、卫星、控制台、监控、芯片和自动化控制类图标。",
    patterns: [
      "communication",
      "network",
      "wifi",
      "signal",
      "antenna",
      "radio",
      "router",
      "gateway",
      "switch",
      "ethernet",
      "connection",
      "bluetooth",
      "satellite",
      "control",
      "controller",
      "settings",
      "dashboard",
      "monitor",
      "console",
      "terminal",
      "server",
      "database",
      "cpu",
      "chip",
      "automation",
    ],
  },
  {
    id: "industry-facilities",
    label: "工业设施",
    description: "工业、制造、厂站、生产、仓储、农业、矿山和基础设施类图标。",
    patterns: [
      "industry",
      "industrial",
      "factory",
      "manufacturing",
      "production",
      "plant",
      "facility",
      "facilities",
      "warehouse",
      "mine",
      "mining",
      "agriculture",
      "farm",
      "crop",
      "silo",
      "tower",
      "infrastructure",
      "construction",
      "crane",
      "pipe",
      "pipeline",
      "pump",
      "valve",
    ],
  },
  {
    id: "cloud-infrastructure",
    label: "云与基础设施",
    description: "云、服务器、数据中心、存储、计算、网络、安全、AI 和运维基础设施图标。",
    patterns: [
      "cloud",
      "server",
      "servers",
      "data-center",
      "datacenter",
      "storage",
      "compute",
      "computing",
      "container",
      "cluster",
      "network",
      "gateway",
      "router",
      "firewall",
      "security",
      "database",
      "backup",
      "deploy",
      "deployment",
      "ai",
      "ml",
      "machine-learning",
      "automation",
      "monitoring",
      "service",
    ],
  },
  {
    id: "health-safety",
    label: "医疗安全",
    description: "医疗、健康、急救、防护、风险、公共安全和应急处置图标。",
    patterns: [
      "health",
      "medical",
      "medicine",
      "hospital",
      "clinic",
      "doctor",
      "nurse",
      "patient",
      "care",
      "first-aid",
      "aid",
      "ambulance",
      "emergency",
      "syringe",
      "vaccine",
      "pill",
      "pharmacy",
      "blood",
      "heart",
      "lungs",
      "mask",
      "virus",
      "hazard",
      "safety",
      "protection",
      "aed",
      "defibrillator",
    ],
    denyPatterns: [/airline/i, /hair[-_ ]?care/i],
  },
  {
    id: "business-finance",
    label: "业务金融",
    description: "资金、支付、票据、合同、购物、库存、目标、奖励和经营管理类图标。",
    patterns: [
      "money",
      "cash",
      "coin",
      "coins",
      "wallet",
      "payment",
      "credit",
      "card",
      "bank",
      "receipt",
      "invoice",
      "bill",
      "contract",
      "cart",
      "basket",
      "shopping",
      "store",
      "briefcase",
      "business",
      "target",
      "trophy",
      "reward",
      "portfolio",
      "box",
      "inventory",
    ],
  },
  {
    id: "education-research",
    label: "教育科研",
    description: "图书、学校、课程、实验、公式、白板、毕业、科研和知识表达图标。",
    patterns: [
      "book",
      "notebook",
      "library",
      "school",
      "student",
      "teacher",
      "graduation",
      "education",
      "learn",
      "learning",
      "research",
      "science",
      "lab",
      "beaker",
      "flask",
      "microscope",
      "experiment",
      "formula",
      "math",
      "whiteboard",
      "presentation",
      "slide",
      "certificate",
      "award",
    ],
  },
  {
    id: "flags-regions",
    label: "国家地区旗帜",
    description: "国家、地区、国际组织和区域旗帜 SVG，用于地图、区域、项目归属和国际化展示。",
    patterns: ["flag", "flags", "country", "region", "regions", "world", "global", "international"],
    denyPatterns: [
      /mailbox/i,
      /cross[-_ ]country/i,
      /diving[-_ ]scuba/i,
      /flight[-_ ]international/i,
      /world[-_ ]trade/i,
      /cics/i,
      /global[-_ ](markets|partner|loan|pandemic)/i,
      /global[-_ ](currency|filters|strategy)/i,
      /soil[-_ ]moisture[-_ ]global/i,
    ],
  },
  {
    id: "office-productivity",
    label: "办公效率",
    description: "日历、时间、任务、列表、书签、标签、笔记、简报和办公流程。",
    patterns: [
      "calendar",
      "clock",
      "time",
      "history",
      "task",
      "todo",
      "list",
      "bookmark",
      "tag",
      "label",
      "briefcase",
      "address",
      "badge",
      "inbox",
      "tray",
      "pin",
      "star",
      "home",
      "office",
    ],
  },
  {
    id: "maps-places",
    label: "地图地点",
    description: "地图、定位、建筑、道路、桥梁、园区、医院、学校和公共设施图标。",
    patterns: [
      "map",
      "maps",
      "marker",
      "pin",
      "location",
      "navigation",
      "route",
      "directions",
      "place",
      "places",
      "building",
      "buildings",
      "home",
      "house",
      "office",
      "factory",
      "warehouse",
      "hospital",
      "clinic",
      "school",
      "library",
      "bank",
      "bridge",
      "road",
      "street",
      "park",
      "parking",
      "tower",
      "landmark",
      "store",
      "shop",
      "hotel",
      "airport",
      "port",
      "harbor",
    ],
  },
  {
    id: "transport-facilities",
    label: "交通设施",
    description: "车辆、公交、轨道、航空、船舶、充电、燃料和交通服务设施图标。",
    patterns: [
      "car",
      "cars",
      "bus",
      "train",
      "tram",
      "subway",
      "metro",
      "rail",
      "railway",
      "truck",
      "taxi",
      "bicycle",
      "bike",
      "motorcycle",
      "scooter",
      "ev",
      "charging",
      "charger",
      "fuel",
      "gas-station",
      "gas",
      "parking",
      "traffic",
      "road",
      "route",
      "airport",
      "airplane",
      "plane",
      "helicopter",
      "ferry",
      "ship",
      "boat",
      "aerialway",
      "barrier",
    ],
    denyPatterns: [/paper[-_ ]?plane/i],
  },
];

const deniedNamePattern =
  /(^|[-_])(500px|brand|logo|adidas|adobe|airbnb|alibaba|alipay|aliwangwang|aliyun|amazon|amex|android|angular|ansible|ant|ant-design|appstore|apple|archlinux|aruba|azure|baidu|behance|bitcoin|chrome|codepen|css3|debian|dingding|discord|docker|dribbble|dropbox|drupal|edge|facebook|fedora|figma|firefox|github|gitlab|google|html5|instagram|linkedin|linux|mastodon|medium|microsoft|npm|openshift|paypal|pinterest|react|reddit|redhat|shopify|skype|slack|snapchat|spotify|stack-overflow|telegram|tiktok|trello|twitch|twitter|ubuntu|uber|vimeo|visa|vue|whatsapp|windows|wordpress|xbox|yahoo|youtube)([-_]|$)/i;

function quoteWindowsArg(value) {
  const text = String(value);
  if (!/[ \t"&|<>^]/.test(text)) {
    return text;
  }
  return `"${text.replaceAll('"', '\\"')}"`;
}

function run(command, args) {
  const commandArgs =
    process.platform === "win32"
      ? ["/d", "/s", "/c", [command, ...args].map(quoteWindowsArg).join(" ")]
      : args;
  const result = spawnSync(process.platform === "win32" ? "cmd.exe" : command, commandArgs, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed\nerror:\n${result.error?.message || ""}\nstdout:\n${result.stdout || ""}\nstderr:\n${result.stderr || ""}`,
    );
  }
  return result.stdout.trim();
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function listFiles(dir) {
  const entries = await import("node:fs/promises").then((fs) => fs.readdir(dir, { withFileTypes: true }));
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(entryPath)));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files;
}

function nameTokens(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/([a-z])(\d)/g, "$1-$2")
    .replace(/(\d)([a-z])/g, "$1-$2")
    .replace(/[_\s]+/g, "-")
    .split(/-+/)
    .filter(Boolean);
}

const safeCompoundTokenMatchers = new Map([
  ["bolt", /^(bolt|thunderbolt)$/],
  ["cloud", /^cloud(s|y|ed)?$/],
  ["eco", /^eco(system)?$/],
  ["file", /^file(s)?$/],
  ["heat", /^(heat|heated|heating)$/],
  ["ice", /^(ice|icing)$/],
  ["image", /^image(s)?$/],
  ["leaf", /^(leaf|leaves)$/],
  ["meter", /^(meter|meters|speedometer)$/],
  ["phone", /^(phone|telephone|smartphone)$/],
  ["print", /^(print|printer)$/],
  ["rain", /^rain(y|drop)?$/],
  ["snow", /^snow(\d+|flake|plow|mobile|shoeing|boarding|density|heavy)?$/],
  ["sun", /^(sun|sunny|sunrise|sunset)$/],
  ["water", /^(water|waterfall)$/],
  ["wind", /^(wind|windy)$/],
]);

function tokenMatchesPattern(tokens, pattern) {
  const patternTokens = nameTokens(pattern);
  if (patternTokens.length === 0) {
    return false;
  }
  if (patternTokens.length > 1) {
    return tokens.some((_, index) =>
      patternTokens.every((patternToken, offset) => tokens[index + offset] === patternToken),
    );
  }

  const patternToken = patternTokens[0];
  const matcher = safeCompoundTokenMatchers.get(patternToken);
  return tokens.some((token) => {
    if (token === patternToken || token === `${patternToken}s` || `${token}s` === patternToken) {
      return true;
    }
    return matcher ? matcher.test(token) : false;
  });
}

function categoryMatchScore(name, patterns) {
  const tokens = nameTokens(name);
  let score = 0;
  for (const pattern of patterns) {
    if (tokenMatchesPattern(tokens, pattern)) {
      score += nameTokens(pattern).length > 1 ? 6 : 4;
    }
  }
  return score;
}

function categoryRejectsName(name, patterns = []) {
  if (!patterns.length) {
    return false;
  }

  const rawName = String(name || "").toLowerCase();
  const normalizedName = rawName.replace(/[_\s]+/g, "-");
  const tokens = nameTokens(name);
  return patterns.some((pattern) => {
    if (pattern instanceof RegExp) {
      pattern.lastIndex = 0;
      if (pattern.test(rawName)) {
        return true;
      }
      pattern.lastIndex = 0;
      return pattern.test(normalizedName);
    }
    return tokenMatchesPattern(tokens, pattern);
  });
}

function classifyIcon(name) {
  let best = null;
  for (const category of categories) {
    if (categoryRejectsName(name, category.denyPatterns)) {
      continue;
    }
    const score = categoryMatchScore(name, category.patterns);
    if (score > 0 && (!best || score > best.score)) {
      best = { category, score };
    }
  }
  return best;
}

function iconComplexity(name) {
  return name.split(/[-_\s]+/).filter(Boolean).length;
}

function iconFamily(name) {
  const tokens = name
    .toLowerCase()
    .split(/[-_\s]+/)
    .filter((token) => token && !/^\d+$/.test(token) && !["fill", "filled", "regular", "outline"].includes(token));
  return tokens[0] || name.toLowerCase();
}

const ignoredSemanticTokens = new Set([
  "alt",
  "big",
  "bold",
  "circle",
  "duotone",
  "filled",
  "fill",
  "light",
  "line",
  "linear",
  "o",
  "outline",
  "outlined",
  "rect",
  "rectangle",
  "regular",
  "round",
  "rounded",
  "sharp",
  "small",
  "solid",
  "square",
  "thin",
  "tone",
  "two",
]);

const semanticTokenAliases = new Map([
  ["add", "plus"],
  ["checkmark", "check"],
  ["checked", "check"],
  ["cancel", "close"],
  ["dismiss", "close"],
  ["multiply", "close"],
  ["times", "close"],
  ["x", "close"],
  ["xmark", "close"],
  ["remove", "minus"],
  ["subtract", "minus"],
  ["trash", "delete"],
  ["bin", "delete"],
  ["pencil", "edit"],
  ["printer", "print"],
  ["redoalt", "redo"],
  ["undoalt", "undo"],
]);

function semanticIconKey(name) {
  const normalized = String(name || "")
    .toLowerCase()
    .replace(/checkmark\d*/g, "check")
    .replace(/\b(\d+k|\d+)\b/g, " ");
  const tokens = normalized
    .split(/[-_\s]+/)
    .map((token) => semanticTokenAliases.get(token) || token)
    .filter((token) => token && !ignoredSemanticTokens.has(token) && !/^\d+$/.test(token) && !/^\d+k$/.test(token));
  return [...new Set(tokens)].sort((a, b) => a.localeCompare(b, "en")).join("-");
}

function isUsableSvg(svg) {
  const text = String(svg || "").trim();
  return text !== "undefined" && /<svg\b/i.test(text) && /<\/svg>/i.test(text);
}

function duplicateSvgKey(svg) {
  return String(svg || "")
    .replace(/<\?xml[^>]*>\s*/gi, "")
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>\s*/gi, "")
    .replace(/<desc\b[^>]*>[\s\S]*?<\/desc>\s*/gi, "")
    .replace(/<text\b[^>]*>[\s\S]*?<\/text>\s*/gi, "")
    .replace(/\bid="[^"]*"/gi, "")
    .replace(/\baria-labelledby="[^"]*"/gi, "")
    .replace(/\bcolor="[^"]*"/gi, "")
    .replace(/#[0-9a-f]{3,8}/gi, "#color")
    .replace(/\bcurrentcolor\b/gi, "currentColor")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSvg(svg, icon) {
  const title = escapeXml(icon.name);
  const description = escapeXml(
    `${icon.categoryLabel} - ${icon.sourceLabel} - ${icon.sourceName} - ${icon.license}`,
  );
  const withoutXml = svg
    .replace(/<\?xml[^>]*>\s*/i, "")
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>\s*/gi, "")
    .replace(/<desc\b[^>]*>[\s\S]*?<\/desc>\s*/gi, "");
  const withColor = withoutXml
    .replace(/\bcurrentcolor\b/g, "currentColor")
    .replace(/<path\b(?![^>]*\s(?:fill|stroke)=)([^>]*)>/gi, '<path fill="currentColor"$1>')
    .replace(/<circle\b(?![^>]*\s(?:fill|stroke)=)([^>]*)>/gi, '<circle fill="currentColor"$1>')
    .replace(/<rect\b(?![^>]*\s(?:fill|stroke)=)([^>]*)>/gi, '<rect fill="currentColor"$1>')
    .replace(/<polygon\b(?![^>]*\s(?:fill|stroke)=)([^>]*)>/gi, '<polygon fill="currentColor"$1>')
    .replace(/<ellipse\b(?![^>]*\s(?:fill|stroke)=)([^>]*)>/gi, '<ellipse fill="currentColor"$1>');
  const withSvgAttrs = withColor.replace(/<svg\b([^>]*)>/i, (match, attrs) => {
    const cleanAttrs = attrs
      .replace(/\srole="[^"]*"/i, "")
      .replace(/\saria-labelledby="[^"]*"/i, "")
      .replace(/\scolor="[^"]*"/i, "");
    return `<svg${cleanAttrs} color="#2563eb" role="img" aria-labelledby="${icon.id}-title ${icon.id}-desc">`;
  });
  return withSvgAttrs.replace(
    /<svg\b([^>]*)>/i,
    `<svg$1>\n  <title id="${icon.id}-title">${title}</title>\n  <desc id="${icon.id}-desc">${description}</desc>`,
  );
}

function packageLicenseDeclarations(packageJson) {
  const declarations = [];
  if (packageJson.license) {
    declarations.push(String(packageJson.license));
  }
  if (Array.isArray(packageJson.licenses)) {
    for (const license of packageJson.licenses) {
      if (typeof license === "string") {
        declarations.push(license);
      } else if (license?.type) {
        declarations.push(String(license.type));
      }
    }
  }
  return declarations;
}

function packageLicenseMatches(packageJson, source) {
  const declarations = packageLicenseDeclarations(packageJson);
  if (source.packageLicensePattern) {
    return source.packageLicensePattern.test(declarations.join(" "));
  }
  return declarations.some((declaration) => {
    const normalizedDeclaration = declaration.toLowerCase();
    const normalizedExpected = source.license.toLowerCase();
    return normalizedDeclaration === normalizedExpected || normalizedDeclaration.includes(normalizedExpected);
  });
}

function renderReadme(manifest) {
  return `# Open Source SVG Icon Library

This directory contains a curated, categorized set of SVG icons from license-clear open source packages.

Output:

- Total icons: ${manifest.totalIcons}
- Source libraries: ${manifest.sources.length}
- Categories: ${manifest.categories.length}
- Search: \`search-index.json\` provides a flat searchable index; \`index.html\` provides browser-side keyword/category/source/license filtering.
- Styling: SVGs are normalized to use \`currentColor\` when the source shape does not specify fill or stroke.
- Excluded: obvious brand/logo icons are filtered out to avoid trademark confusion.

Sources:

${manifest.sources.map((source) => `- ${source.label}: \`${source.packageSpec}\`, ${source.license}`).join("\n")}

Categories:

${manifest.categories.map((category) => `- \`${category.id}\`: ${category.label} (${category.icons.length})`).join("\n")}

Rebuild:

\`\`\`bash
node scripts/generate-open-source-svg-icons.mjs
\`\`\`
`;
}

function renderPreviewHtml(manifest) {
  const sourceOptions = manifest.sources
    .map((source) => `<option value="${escapeXml(source.id)}">${escapeXml(source.label)}</option>`)
    .join("");
  const categoryOptions = manifest.categories
    .map((category) => `<option value="${escapeXml(category.id)}">${escapeXml(category.label)}</option>`)
    .join("");
  const licenseOptions = [...new Set(manifest.sources.map((source) => source.license))]
    .sort((a, b) => a.localeCompare(b))
    .map((license) => `<option value="${escapeXml(license)}">${escapeXml(license)}</option>`)
    .join("");
  const sections = manifest.categories
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
                data-source="${escapeXml(icon.sourceId)}"
                data-license="${escapeXml(icon.license)}"
                data-search="${escapeXml(`${icon.name} ${icon.sourceName} ${icon.sourceId} ${category.id} ${category.label}`.toLowerCase())}">
                <img src="./${escapeXml(icon.file)}" alt="${escapeXml(icon.name)}" />
                <strong>${escapeXml(icon.name)}</strong>
                <code>${escapeXml(icon.sourceId)} / ${escapeXml(icon.sourceName)}</code>
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
    header,
    section {
      max-width: 1180px;
      margin: 0 auto;
    }
    header {
      margin-bottom: 24px;
    }
    .toolbar {
      display: grid;
      grid-template-columns: minmax(220px, 1fr) repeat(3, minmax(150px, 190px));
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
    p {
      margin: 0;
      color: #64748b;
      line-height: 1.6;
    }
    section {
      margin-bottom: 28px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(138px, 1fr));
      gap: 12px;
      margin-top: 12px;
    }
    article {
      min-height: 136px;
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
      width: 48px;
      height: 48px;
      object-fit: contain;
      margin-bottom: 8px;
      color: #2563eb;
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
    mark {
      background: #dbeafe;
      color: inherit;
      border-radius: 3px;
      padding: 0 2px;
    }
    @media (max-width: 760px) {
      .toolbar {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <header>
    <h1>${escapeXml(manifest.label)}</h1>
    <p>共 ${manifest.totalIcons} 个开源 SVG 图标，来自 ${manifest.sources.length} 个许可明确的图标库。</p>
    <div class="toolbar" role="search">
      <input id="searchInput" type="search" placeholder="搜索名称、来源、分类，例如 save / battery / 图层" autocomplete="off" />
      <select id="categoryFilter" aria-label="分类筛选">
        <option value="">全部分类</option>
        ${categoryOptions}
      </select>
      <select id="sourceFilter" aria-label="来源筛选">
        <option value="">全部来源</option>
        ${sourceOptions}
      </select>
      <select id="licenseFilter" aria-label="许可筛选">
        <option value="">全部许可</option>
        ${licenseOptions}
      </select>
    </div>
    <div id="resultCount" class="result-count"></div>
  </header>
  ${sections}
  <script>
    const cards = Array.from(document.querySelectorAll("article"));
    const sections = Array.from(document.querySelectorAll("section"));
    const searchInput = document.getElementById("searchInput");
    const categoryFilter = document.getElementById("categoryFilter");
    const sourceFilter = document.getElementById("sourceFilter");
    const licenseFilter = document.getElementById("licenseFilter");
    const resultCount = document.getElementById("resultCount");

    function normalize(value) {
      return String(value || "").trim().toLowerCase();
    }

    function filterCards() {
      const keyword = normalize(searchInput.value);
      const category = categoryFilter.value;
      const source = sourceFilter.value;
      const license = licenseFilter.value;
      let visible = 0;

      for (const card of cards) {
        const matchesKeyword = !keyword || card.dataset.search.includes(keyword);
        const matchesCategory = !category || card.dataset.category === category;
        const matchesSource = !source || card.dataset.source === source;
        const matchesLicense = !license || card.dataset.license === license;
        const show = matchesKeyword && matchesCategory && matchesSource && matchesLicense;
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
    sourceFilter.addEventListener("change", filterCards);
    licenseFilter.addEventListener("change", filterCards);
    filterCards();
  </script>
</body>
</html>
`;
}

await rm(tempDir, { recursive: true, force: true });
await rm(outputDir, { recursive: true, force: true });
await mkdir(sourcePackDir, { recursive: true });
await mkdir(sourceExtractDir, { recursive: true });
await mkdir(outputDir, { recursive: true });

const manifest = {
  name: "open-source-svg",
  label: "开源 SVG 综合图标库",
  generatedAt: new Date().toISOString(),
  root: "/webgrp/icon-library/open-source-svg",
  sourcePolicy:
    "仅使用官方 npm 包中的开源 SVG；保留源库版本、许可和 LICENSE 文件；过滤明显品牌/logo 图标；同一分类内按语义键保留一个代表图标，避免重复展示。",
  maxIconsPerSourceCategory,
  sources: activeSources.map((source) => ({
    id: source.id,
    label: source.label,
    packageSpec: source.packageSpec,
    packageName: source.packageName,
    license: source.license,
    repository: source.repository,
  })),
  categories: categories.map((category) => ({
    id: category.id,
    label: category.label,
    description: category.description,
    icons: [],
  })),
};

const selectedSemanticKeysByCategory = new Map(categories.map((category) => [category.id, new Set()]));
const selectedSvgKeysByCategory = new Map(categories.map((category) => [category.id, new Set()]));
const selectedSvgKeysGlobal = new Set();

for (const source of activeSources) {
  const safePackageDir = slug(source.packageSpec);
  const packDir = path.join(sourcePackDir, safePackageDir);
  const extractDir = path.join(sourceExtractDir, safePackageDir);
  await mkdir(packDir, { recursive: true });
  await mkdir(extractDir, { recursive: true });

  const tarballOutput = run("npm", ["pack", source.packageSpec, "--pack-destination", packDir, "--silent"]);
  const tarballName = tarballOutput.split(/\r?\n/).filter(Boolean).at(-1);
  run("tar", ["-xzf", path.join(packDir, tarballName), "-C", extractDir]);

  const packageDir = path.join(extractDir, "package");
  const packageJson = JSON.parse(await readFile(path.join(packageDir, "package.json"), "utf8"));
  if (!packageLicenseMatches(packageJson, source)) {
    throw new Error(
      `Unexpected license for ${source.packageSpec}: expected ${source.license}, got ${packageLicenseDeclarations(packageJson).join(", ") || "none"}`,
    );
  }

  const licensePath = path.join(packageDir, source.licenseFile || "LICENSE");
  if (existsSync(licensePath)) {
    await writeFile(
      path.join(outputDir, `LICENSE-${source.id}.txt`),
      await readFile(licensePath, "utf8"),
      "utf8",
    );
  } else {
    await writeFile(
      path.join(outputDir, `LICENSE-${source.id}.txt`),
      `${source.label}\n\nPackage: ${source.packageSpec}\nRepository: ${source.repository}\nLicense declared by package.json: ${source.license}\n`,
      "utf8",
    );
  }

  const iconRoot = path.join(packageDir, ...source.iconDir);
  const files = (await listFiles(iconRoot))
    .filter((filePath) => source.fileFilter(path.basename(filePath)))
    .map((filePath) => ({
      filePath,
      sourceName: source.iconName(path.basename(filePath)),
    }))
    .filter((icon) => icon.sourceName && !deniedNamePattern.test(icon.sourceName))
    .sort((a, b) => a.sourceName.localeCompare(b.sourceName, "en"));

  const candidatesByCategory = new Map(categories.map((category) => [category.id, []]));
  for (const iconFile of files) {
    const match = source.forceCategoryId
      ? { category: categories.find((category) => category.id === source.forceCategoryId), score: 100 }
      : classifyIcon(iconFile.sourceName);
    if (!match) {
      continue;
    }
    candidatesByCategory.get(match.category.id).push({
      ...iconFile,
      category: match.category,
      score: match.score,
      complexity: iconComplexity(iconFile.sourceName),
    });
  }

  for (const candidates of candidatesByCategory.values()) {
    candidates.sort(
      (a, b) =>
        b.score - a.score ||
        a.complexity - b.complexity ||
        a.sourceName.length - b.sourceName.length ||
        a.sourceName.localeCompare(b.sourceName, "en"),
    );
  }

  const usedForSource = new Set();
  const maxForSourceCategory = source.maxIconsPerCategory || maxIconsPerSourceCategory;
  for (const category of categories) {
    const categoryManifest = manifest.categories.find((item) => item.id === category.id);
    let selectedForCategory = 0;
    const familyCounts = new Map();
    for (const iconFile of candidatesByCategory.get(category.id)) {
      if (selectedForCategory >= maxForSourceCategory) {
        break;
      }
      if (usedForSource.has(iconFile.sourceName)) {
        continue;
      }
      const semanticKey = semanticIconKey(iconFile.sourceName);
      const selectedSemanticKeys = selectedSemanticKeysByCategory.get(category.id);
      if (semanticKey && selectedSemanticKeys?.has(semanticKey)) {
        continue;
      }
      const family = iconFamily(iconFile.sourceName);
      if (!source.disableFamilyLimit && (familyCounts.get(family) || 0) >= 2) {
        continue;
      }
      const sourceSvg = await readFile(iconFile.filePath, "utf8");
      if (!isUsableSvg(sourceSvg)) {
        continue;
      }
      const svgKey = duplicateSvgKey(sourceSvg);
      const selectedSvgKeys = selectedSvgKeysByCategory.get(category.id);
      if (svgKey && selectedSvgKeys?.has(svgKey)) {
        continue;
      }
      if (svgKey && selectedSvgKeysGlobal.has(svgKey)) {
        continue;
      }
      usedForSource.add(iconFile.sourceName);
      if (semanticKey) {
        selectedSemanticKeys?.add(semanticKey);
      }
      if (svgKey) {
        selectedSvgKeys?.add(svgKey);
        selectedSvgKeysGlobal.add(svgKey);
      }
      familyCounts.set(family, (familyCounts.get(family) || 0) + 1);
      selectedForCategory += 1;

    const sourceNameSlug = slug(iconFile.sourceName);
    const fileName = `${source.id}-${sourceNameSlug}.svg`;
    const outputRelative = `${category.id}/${source.id}/${fileName}`;
    const outputPath = path.join(outputDir, category.id, source.id, fileName);
    await mkdir(path.dirname(outputPath), { recursive: true });

    const icon = {
      id: `${source.id}-${sourceNameSlug}`,
      name: iconFile.sourceName.replace(/[-_]+/g, " "),
      categoryLabel: category.label,
      sourceLabel: source.label,
      sourceName: iconFile.sourceName,
      license: source.license,
    };
    await writeFile(outputPath, normalizeSvg(sourceSvg, icon), "utf8");

    categoryManifest.icons.push({
      id: icon.id,
      name: icon.name,
      file: outputRelative,
      sourceId: source.id,
      sourceLabel: source.label,
      sourceName: iconFile.sourceName,
      sourcePackage: source.packageSpec,
      license: source.license,
    });
    }
  }
}

manifest.categories = manifest.categories.map((category) => ({
  ...category,
  icons: category.icons.sort((a, b) => `${a.sourceId}:${a.sourceName}`.localeCompare(`${b.sourceId}:${b.sourceName}`)),
}));
manifest.totalIcons = manifest.categories.reduce((sum, category) => sum + category.icons.length, 0);

const sourceAudit = {
  generatedAt: manifest.generatedAt,
  outputDir: path.relative(rootDir, outputDir),
  totalIcons: manifest.totalIcons,
  policy: manifest.sourcePolicy,
  sources: manifest.sources,
  categoryCounts: Object.fromEntries(manifest.categories.map((category) => [category.id, category.icons.length])),
};

const searchIndex = manifest.categories.flatMap((category) =>
  category.icons.map((icon) => ({
    id: icon.id,
    name: icon.name,
    file: icon.file,
    categoryId: category.id,
    categoryLabel: category.label,
    sourceId: icon.sourceId,
    sourceLabel: icon.sourceLabel,
    sourceName: icon.sourceName,
    sourcePackage: icon.sourcePackage,
    license: icon.license,
    keywords: [
      icon.name,
      icon.sourceName,
      icon.sourceId,
      icon.sourceLabel,
      category.id,
      category.label,
      icon.license,
    ],
  })),
);

await writeFile(path.join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
await writeFile(path.join(outputDir, "search-index.json"), `${JSON.stringify(searchIndex, null, 2)}\n`, "utf8");
await writeFile(path.join(outputDir, "source-audit.json"), `${JSON.stringify(sourceAudit, null, 2)}\n`, "utf8");
await writeFile(path.join(outputDir, "README.md"), renderReadme(manifest), "utf8");
await writeFile(path.join(outputDir, "index.html"), renderPreviewHtml(manifest), "utf8");

console.log(`Generated ${manifest.totalIcons} SVG icons in ${path.relative(rootDir, outputDir)}`);
