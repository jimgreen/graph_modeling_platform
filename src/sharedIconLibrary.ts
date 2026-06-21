import type { ImageAsset } from "./appExtracted/appCoreCanvasUtilities";

export const BUILTIN_SHARED_ICON_FOLDER_ID = "builtin-shared-icons";

const BLUE = "#2f63ff";
const DARK = "#3b3b3b";
const SOFT_BLUE = "#dbeafe";
const SOFT_GRAY = "#f8fafc";

type BuiltinSharedIconSpec = {
  key: string;
  category: string;
  name: string;
  body: string;
  stroke?: string;
};

const escapeSvgText = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const group = (body: string, stroke = DARK, width = 1.75, fill = "none") =>
  `<g fill="${fill}" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;

const shapeGroup = (body: string, stroke = BLUE, fill = "none", width = 1.75) => group(body, stroke, width, fill);
const p = (d: string) => `<path d="${d}"/>`;
const ln = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
const rect = (x: number, y: number, width: number, height: number, rx = 0) =>
  `<rect x="${x}" y="${y}" width="${width}" height="${height}"${rx ? ` rx="${rx}"` : ""}/>`;
const circle = (cx: number, cy: number, r: number) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`;
const ellipse = (cx: number, cy: number, rx: number, ry: number) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;
const polyline = (points: string) => `<polyline points="${points}"/>`;
const polygon = (points: string) => `<polygon points="${points}"/>`;
const text = (content: string, x = 12, y = 13.4, size = 8, color = DARK, weight = 700) =>
  `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${escapeSvgText(content)}</text>`;

const icon = (key: string, category: string, name: string, body: string, stroke?: string): BuiltinSharedIconSpec => ({
  key,
  category,
  name,
  body,
  stroke
});

const preset = (key: string, category: string, name: string, body: string) => icon(`preset-${key}`, `预设/${category}`, name, body, BLUE);
const common = (key: string, category: string, name: string, body: string) => icon(`${category}-${key}`, category, name, body, DARK);

const arrowHeadRight = `${ln(5, 12, 18, 12)}${polyline("14 8 18 12 14 16")}`;
const arrowHeadLeft = `${ln(19, 12, 6, 12)}${polyline("10 8 6 12 10 16")}`;
const arrowHeadUp = `${ln(12, 19, 12, 6)}${polyline("8 10 12 6 16 10")}`;
const arrowHeadDown = `${ln(12, 5, 12, 18)}${polyline("8 14 12 18 16 14")}`;
const monitorBody = group(`${rect(4, 5, 16, 10, 1.5)}${ln(9, 18, 15, 18)}${ln(12, 15, 12, 18)}`);
const phoneBody = group(`${rect(8, 4, 8, 16, 1.8)}${ln(10.5, 6.5, 13.5, 6.5)}${circle(12, 17.5, 0.45)}`);
const bookBody = group(`${p("M5 5.5h5.5c1 0 1.5.5 1.5 1.5v12c0-1-1-1.5-2-1.5H5z")}${p("M19 5.5h-5.5c-1 0-1.5.5-1.5 1.5v12c0-1 1-1.5 2-1.5h5z")}`);
const userBody = group(`${circle(12, 8, 3)}${p("M5.5 20c1.2-4 11.8-4 13 0")}`);
const mapPinBody = group(`${p("M12 21s6-5.6 6-11a6 6 0 0 0-12 0c0 5.4 6 11 6 11Z")}${circle(12, 10, 2)}`);
const carBody = group(`${p("M4 15h16")}${p("M6 15l2-5h8l2 5")}${rect(5, 13, 14, 4, 1)}${circle(8, 18, 1)}${circle(16, 18, 1)}`);
const truckBody = group(`${rect(3, 9, 10, 6, 1)}${p("M13 11h4l3 3v1h-7z")}${circle(7, 17, 1)}${circle(17, 17, 1)}`);
const cameraBody = group(`${rect(5, 8, 14, 10, 1.4)}${p("M8 8l1.4-2h5.2L16 8")}${circle(12, 13, 3)}`);
const flowerBody = group(`${circle(12, 12, 1.4)}${ellipse(12, 6.8, 2, 3)}${ellipse(17.2, 10, 2, 3)}${ellipse(16, 16.1, 2, 3)}${ellipse(8, 16.1, 2, 3)}${ellipse(6.8, 10, 2, 3)}`);
const treeBody = group(`${p("M12 20v-5")}${p("M8 20h8")}${p("M12 4l-5 7h3l-3 5h10l-3-5h3z")}`);

const BUILTIN_SHARED_ICON_SPECS: BuiltinSharedIconSpec[] = [
  preset("line-diagonal", "线条", "直线", shapeGroup(ln(5, 5, 19, 19))),
  preset("line-arrow-down-right", "线条", "箭头直线", shapeGroup(`${ln(5, 5, 18, 18)}${polyline("13 18 18 18 18 13")}`)),
  preset("line-double-arrow-diagonal", "线条", "双向斜线", shapeGroup(`${ln(6, 18, 18, 6)}${polyline("13 6 18 6 18 11")}${polyline("11 18 6 18 6 13")}`)),
  preset("line-elbow", "线条", "直角线", shapeGroup(polyline("6 6 15 6 15 18"))),
  preset("line-elbow-arrow", "线条", "直角箭头", shapeGroup(`${polyline("5 6 14 6 14 17")}${polyline("10 13 14 17 18 13")}`)),
  preset("line-turn-arrow", "线条", "转角箭头", shapeGroup(`${p("M6 5v7h9")}${polyline("12 9 15 12 12 15")}`)),
  preset("line-curve", "线条", "曲线", shapeGroup(p("M5 16c4-10 10 10 14-2"))),
  preset("line-curve-arrow", "线条", "曲线箭头", shapeGroup(`${p("M5 16c4-10 10 10 14-2")}${polyline("15 13 19 14 17 18")}`)),
  preset("line-s-curve", "线条", "S形线", shapeGroup(p("M8 5c8 0 8 7 0 7s-8 7 0 7"))),
  preset("line-wave", "线条", "波浪线", shapeGroup(p("M4 13c2-4 4-4 6 0s4 4 6 0 4-4 6 0"))),

  preset("rectangle-square", "矩形", "正方形", shapeGroup(rect(6, 6, 12, 12), BLUE, SOFT_BLUE)),
  preset("rectangle-rounded", "矩形", "圆角矩形", shapeGroup(rect(5, 7, 14, 10, 2), BLUE, SOFT_BLUE)),
  preset("rectangle-cut-corner", "矩形", "剪角矩形", shapeGroup(p("M5 7h10l4 4v6H5z"), BLUE, SOFT_BLUE)),
  preset("rectangle-home", "矩形", "屋形矩形", shapeGroup(p("M5 11l7-6 7 6v7H5z"), BLUE, SOFT_BLUE)),
  preset("rectangle-chamfer", "矩形", "倒角矩形", shapeGroup(p("M7 6h10l3 3v8l-3 3H7l-3-3V9z"), BLUE, SOFT_BLUE)),
  preset("rectangle-tab", "矩形", "标签矩形", shapeGroup(p("M5 7h10l4 4v6H5z"), BLUE, "none")),
  preset("rectangle-frame", "矩形", "边框矩形", shapeGroup(`${rect(5, 6, 14, 12)}${rect(8, 9, 8, 6)}`)),
  preset("rectangle-round-frame", "矩形", "圆角边框", shapeGroup(`${rect(5, 7, 14, 10, 2)}${rect(8, 10, 8, 4, 1)}`)),
  preset("rectangle-snip", "矩形", "缺角矩形", shapeGroup(p("M5 7h14v8l-4 4H5z"), BLUE, SOFT_BLUE)),

  preset("basic-text-box", "基本形状", "文本框", shapeGroup(`${rect(5, 6, 14, 12, 1)}${text("A", 9, 12, 7, BLUE)}${ln(12, 10, 17, 10)}${ln(12, 14, 17, 14)}`)),
  preset("basic-vertical-text", "基本形状", "竖排文本", shapeGroup(`${rect(5, 6, 14, 12, 1)}${ln(9, 8, 9, 16)}${ln(12, 8, 12, 16)}${text("A", 16, 12, 6, BLUE)}`)),
  preset("basic-circle", "基本形状", "圆形", shapeGroup(circle(12, 12, 7), BLUE, SOFT_BLUE)),
  preset("basic-triangle", "基本形状", "三角形", shapeGroup(polygon("12 5 20 19 4 19"), BLUE, SOFT_BLUE)),
  preset("basic-right-triangle", "基本形状", "直角三角形", shapeGroup(polygon("5 5 19 19 5 19"), BLUE, SOFT_BLUE)),
  preset("basic-parallelogram", "基本形状", "平行四边形", shapeGroup(polygon("8 6 20 6 16 18 4 18"), BLUE, SOFT_BLUE)),
  preset("basic-trapezoid", "基本形状", "梯形", shapeGroup(polygon("8 6 16 6 20 18 4 18"), BLUE, SOFT_BLUE)),
  preset("basic-diamond", "基本形状", "菱形", shapeGroup(polygon("12 4 20 12 12 20 4 12"), BLUE, SOFT_BLUE)),
  preset("basic-pentagon", "基本形状", "五边形", shapeGroup(polygon("12 4 20 10 17 20 7 20 4 10"), BLUE, SOFT_BLUE)),
  preset("basic-hexagon", "基本形状", "六边形", shapeGroup(polygon("8 5 16 5 21 12 16 19 8 19 3 12"), BLUE, SOFT_BLUE)),
  preset("basic-octagon", "基本形状", "八边形", shapeGroup(polygon("8 4 16 4 20 8 20 16 16 20 8 20 4 16 4 8"), BLUE, SOFT_BLUE)),
  preset("basic-octagon-7", "基本形状", "七号形", shapeGroup(polygon("8 4 16 4 20 8 20 16 16 20 8 20 4 16 4 8"), BLUE, SOFT_BLUE) + text("7", 12, 12, 5.5, BLUE)),
  preset("basic-octagon-10", "基本形状", "十号形", shapeGroup(polygon("8 4 16 4 20 8 20 16 16 20 8 20 4 16 4 8"), BLUE, SOFT_BLUE) + text("10", 12, 12, 5, BLUE)),
  preset("basic-pie", "基本形状", "饼形", shapeGroup(`${p("M12 12V4a8 8 0 1 1-7.5 10.8z")}${ln(12, 12, 19, 12)}`, BLUE, SOFT_BLUE)),
  preset("basic-arc", "基本形状", "弧形", shapeGroup(p("M5 17a9 9 0 0 1 14-8"))),
  preset("basic-teardrop", "基本形状", "水滴形", shapeGroup(p("M12 4c5 5 7 8 4 12a5.7 5.7 0 0 1-8 0c-3-4-1-7 4-12z"), BLUE, SOFT_BLUE)),
  preset("basic-frame", "基本形状", "矩形框", shapeGroup(`${rect(5, 6, 14, 12)}${rect(8, 9, 8, 6)}`)),
  preset("basic-l-corner", "基本形状", "直角折角", shapeGroup(polyline("18 6 8 6 8 16 18 16"))),
  preset("basic-plus", "基本形状", "十字形", shapeGroup(p("M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z"), BLUE, SOFT_BLUE)),
  preset("basic-gear", "基本形状", "齿轮形", shapeGroup(`${circle(12, 12, 3)}${p("M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1")}`)),
  preset("basic-cylinder", "基本形状", "圆柱体", shapeGroup(`${ellipse(12, 6, 5, 2)}${p("M7 6v12c0 1.1 2.2 2 5 2s5-.9 5-2V6")}${ellipse(12, 18, 5, 2)}`)),
  preset("basic-cube", "基本形状", "立方体", shapeGroup(`${polygon("7 8 13 5 18 8 12 11")}${polygon("7 8 12 11 12 18 7 15")}${polygon("18 8 12 11 12 18 18 15")}`)),
  preset("basic-donut", "基本形状", "圆环", shapeGroup(`${circle(12, 12, 7)}${circle(12, 12, 3)}`)),
  preset("basic-no", "基本形状", "禁止符号", shapeGroup(`${circle(12, 12, 7)}${ln(7, 17, 17, 7)}`)),
  preset("basic-arch", "基本形状", "拱形", shapeGroup(p("M5 18v-4a7 7 0 0 1 14 0v4"))),
  preset("basic-page-fold", "基本形状", "折角页", shapeGroup(`${p("M6 5h9l3 3v11H6z")}${polyline("15 5 15 9 18 9")}`)),
  preset("basic-smile", "基本形状", "笑脸", shapeGroup(`${circle(12, 12, 7)}${circle(9, 10, 0.5)}${circle(15, 10, 0.5)}${p("M8.5 14c2 2 5 2 7 0")}`)),
  preset("basic-heart", "基本形状", "心形", shapeGroup(p("M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z"))),
  preset("basic-lightning", "基本形状", "闪电", shapeGroup(polygon("13 3 5 14 12 14 10 21 19 10 12 10"), BLUE, SOFT_BLUE)),
  preset("basic-sun", "基本形状", "太阳", shapeGroup(`${circle(12, 12, 4)}${p("M12 2v3M12 19v3M2 12h3M19 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M19.8 4.2l-2.1 2.1M6.3 17.7l-2.1 2.1")}`)),
  preset("basic-moon", "基本形状", "月亮", shapeGroup(p("M18 17.5A8 8 0 0 1 10.5 5 7 7 0 1 0 18 17.5z"))),
  preset("basic-cloud", "基本形状", "云形", shapeGroup(p("M7 17h10a4 4 0 0 0 .6-8 6 6 0 0 0-11.2 1.5A3.5 3.5 0 0 0 7 17z"))),
  preset("basic-parentheses", "基本形状", "圆括号", shapeGroup(`${p("M9 5c-3 4-3 10 0 14")}${p("M15 5c3 4 3 10 0 14")}`)),
  preset("basic-braces", "基本形状", "大括号", shapeGroup(`${p("M9 5c-2 0-2 2-2 4 0 2-2 2-2 3s2 1 2 3c0 2 0 4 2 4")}${p("M15 5c2 0 2 2 2 4 0 2 2 2 2 3s-2 1-2 3c0 2 0 4-2 4")}`)),

  preset("arrow-right", "箭头总汇", "右箭头", shapeGroup(arrowHeadRight)),
  preset("arrow-left", "箭头总汇", "左箭头", shapeGroup(arrowHeadLeft)),
  preset("arrow-up", "箭头总汇", "上箭头", shapeGroup(arrowHeadUp)),
  preset("arrow-down", "箭头总汇", "下箭头", shapeGroup(arrowHeadDown)),
  preset("arrow-left-right", "箭头总汇", "左右箭头", shapeGroup(`${ln(5, 12, 19, 12)}${polyline("9 8 5 12 9 16")}${polyline("15 8 19 12 15 16")}`)),
  preset("arrow-up-down", "箭头总汇", "上下箭头", shapeGroup(`${ln(12, 5, 12, 19)}${polyline("8 9 12 5 16 9")}${polyline("8 15 12 19 16 15")}`)),
  preset("arrow-move", "箭头总汇", "四向移动", shapeGroup(`${ln(12, 4, 12, 20)}${ln(4, 12, 20, 12)}${polyline("8 8 12 4 16 8")}${polyline("8 16 12 20 16 16")}${polyline("8 8 4 12 8 16")}${polyline("16 8 20 12 16 16")}`)),
  preset("arrow-corner", "箭头总汇", "转角箭头", shapeGroup(`${p("M6 17v-7h8")}${polyline("11 7 15 10 11 13")}`)),
  preset("arrow-uturn", "箭头总汇", "回转箭头", shapeGroup(`${p("M17 8a5 5 0 1 0 0 8h-6")}${polyline("13 12 9 16 13 20")}`)),
  preset("arrow-refresh", "箭头总汇", "刷新箭头", shapeGroup(`${p("M7 7a7 7 0 0 1 10 1")}${polyline("17 4 17 8 21 8")}${p("M17 17a7 7 0 0 1-10-1")}${polyline("7 20 7 16 3 16")}`)),
  preset("arrow-shuffle", "箭头总汇", "交叉箭头", shapeGroup(`${p("M4 7h3c3 0 4 10 7 10h3")}${p("M4 17h3c3 0 4-10 7-10h3")}${polyline("15 5 19 7 15 9")}${polyline("15 15 19 17 15 19")}`)),
  preset("arrow-upload", "箭头总汇", "上传箭头", shapeGroup(`${arrowHeadUp}${polyline("5 18 5 21 19 21 19 18")}`)),
  preset("arrow-download", "箭头总汇", "下载箭头", shapeGroup(`${arrowHeadDown}${polyline("5 19 5 21 19 21 19 19")}`)),
  preset("arrow-expand", "箭头总汇", "放大箭头", shapeGroup(`${polyline("8 4 4 4 4 8")}${ln(4, 4, 10, 10)}${polyline("16 20 20 20 20 16")}${ln(20, 20, 14, 14)}`)),
  preset("arrow-chevron", "箭头总汇", "连续箭头", shapeGroup(`${polyline("7 6 13 12 7 18")}${polyline("13 6 19 12 13 18")}`)),

  preset("formula-plus", "公式形状", "加号", shapeGroup(`${ln(12, 5, 12, 19)}${ln(5, 12, 19, 12)}`)),
  preset("formula-minus", "公式形状", "减号", shapeGroup(ln(5, 12, 19, 12))),
  preset("formula-times", "公式形状", "乘号", shapeGroup(`${ln(6, 6, 18, 18)}${ln(18, 6, 6, 18)}`)),
  preset("formula-divide", "公式形状", "除号", shapeGroup(`${ln(5, 12, 19, 12)}${circle(12, 7, 0.8)}${circle(12, 17, 0.8)}`)),
  preset("formula-equal", "公式形状", "等号", shapeGroup(`${ln(5, 9, 19, 9)}${ln(5, 15, 19, 15)}`)),
  preset("formula-not-equal", "公式形状", "不等号", shapeGroup(`${ln(5, 9, 19, 9)}${ln(5, 15, 19, 15)}${ln(15, 5, 9, 19)}`)),
  preset("formula-percent", "公式形状", "百分号", shapeGroup(`${ln(6, 18, 18, 6)}${circle(7, 7, 1.5)}${circle(17, 17, 1.5)}`)),
  preset("formula-sigma", "公式形状", "求和", text("Σ", 12, 12, 15, BLUE)),
  preset("formula-root", "公式形状", "根号", shapeGroup(`${polyline("5 13 8 13 10 18 14 6 20 6")}`)),
  preset("formula-pi", "公式形状", "圆周率", text("π", 12, 12, 15, BLUE)),

  preset("flow-process", "流程图", "处理", shapeGroup(rect(5, 7, 14, 10, 1), BLUE, SOFT_BLUE)),
  preset("flow-terminator", "流程图", "开始结束", shapeGroup(rect(5, 8, 14, 8, 4), BLUE, SOFT_BLUE)),
  preset("flow-decision", "流程图", "判断", shapeGroup(polygon("12 4 21 12 12 20 3 12"), BLUE, SOFT_BLUE)),
  preset("flow-data", "流程图", "数据", shapeGroup(polygon("7 7 21 7 17 17 3 17"), BLUE, SOFT_BLUE)),
  preset("flow-predefined", "流程图", "预定义过程", shapeGroup(`${rect(5, 7, 14, 10)}${ln(8, 7, 8, 17)}${ln(16, 7, 16, 17)}`, BLUE, SOFT_BLUE)),
  preset("flow-document", "流程图", "文档", shapeGroup(p("M5 6h14v10c-4-2-6 2-14 0z"), BLUE, SOFT_BLUE)),
  preset("flow-documents", "流程图", "多文档", shapeGroup(`${p("M7 5h12v10c-3-1-5 2-12 0z")}${p("M5 8h12v10c-3-1-5 2-12 0z")}`, BLUE, SOFT_BLUE)),
  preset("flow-delay", "流程图", "延迟", shapeGroup(p("M6 6h7a6 6 0 0 1 0 12H6z"), BLUE, SOFT_BLUE)),
  preset("flow-preparation", "流程图", "准备", shapeGroup(polygon("8 6 16 6 20 12 16 18 8 18 4 12"), BLUE, SOFT_BLUE)),
  preset("flow-manual-input", "流程图", "人工输入", shapeGroup(polygon("5 9 19 6 19 18 5 18"), BLUE, SOFT_BLUE)),
  preset("flow-database", "流程图", "数据库", shapeGroup(`${ellipse(12, 6, 5, 2)}${p("M7 6v12c0 1.1 2.2 2 5 2s5-.9 5-2V6")}${ellipse(12, 18, 5, 2)}`)),
  preset("flow-connector", "流程图", "连接点", shapeGroup(circle(12, 12, 6), BLUE, SOFT_BLUE)),
  preset("flow-or", "流程图", "或", shapeGroup(`${circle(12, 12, 6)}${ln(6, 12, 18, 12)}${ln(12, 6, 12, 18)}`)),
  preset("flow-summing", "流程图", "汇总", shapeGroup(`${circle(12, 12, 6)}${ln(8, 8, 16, 16)}${ln(16, 8, 8, 16)}`)),
  preset("flow-offpage", "流程图", "离页连接", shapeGroup(polygon("6 5 18 5 18 15 12 20 6 15"), BLUE, SOFT_BLUE)),

  preset("star-burst", "星与旗帜", "爆炸形", shapeGroup(polygon("12 3 14 8 19 5 16 10 21 12 16 14 19 19 14 16 12 21 10 16 5 19 8 14 3 12 8 10 5 5 10 8"), BLUE, SOFT_BLUE)),
  preset("star-five", "星与旗帜", "五角星", shapeGroup(polygon("12 4 14.3 9 20 9.2 15.8 13 17 19 12 16 7 19 8.2 13 4 9.2 9.7 9"), BLUE, SOFT_BLUE)),
  preset("star-spark", "星与旗帜", "闪光", shapeGroup(polygon("12 4 14 10 20 12 14 14 12 20 10 14 4 12 10 10"), BLUE, SOFT_BLUE)),
  preset("star-badge-8", "星与旗帜", "八角徽章", shapeGroup(polygon("12 3 14.3 6.5 18 6 18.5 9.7 22 12 18.5 14.3 18 18 14.3 17.5 12 21 9.7 17.5 6 18 5.5 14.3 2 12 5.5 9.7 6 6 9.7 6.5"), BLUE, SOFT_BLUE) + text("8", 12, 12, 5, BLUE)),
  preset("star-ribbon", "星与旗帜", "绶带", shapeGroup(`${circle(12, 8, 4)}${p("M9 12l-2 7 5-3 5 3-2-7")}`)),
  preset("star-flag", "星与旗帜", "旗帜", shapeGroup(`${ln(5, 4, 5, 20)}${p("M5 5c5-2 7 2 12 0v8c-5 2-7-2-12 0")}`)),
  preset("star-scroll", "星与旗帜", "卷轴", shapeGroup(`${rect(5, 6, 14, 12, 1)}${p("M5 7c2-2 4-2 6 0M13 17c2 2 4 2 6 0")}`)),

  preset("callout-rect", "标注", "矩形标注", shapeGroup(`${rect(5, 6, 14, 9, 1)}${polyline("9 15 7 19 12 15")}`, BLUE, SOFT_BLUE)),
  preset("callout-round", "标注", "圆角标注", shapeGroup(`${rect(5, 6, 14, 9, 3)}${polyline("9 15 7 19 12 15")}`, BLUE, SOFT_BLUE)),
  preset("callout-oval", "标注", "椭圆标注", shapeGroup(`${ellipse(12, 10, 7, 5)}${polyline("9 14 7 19 13 15")}`, BLUE, SOFT_BLUE)),
  preset("callout-cloud", "标注", "云朵标注", shapeGroup(`${p("M7 15h9a3 3 0 0 0 0-6 5 5 0 0 0-9-1 3.5 3.5 0 0 0 0 7z")}${polyline("9 15 7 20 13 15")}`)),
  preset("callout-line", "标注", "线性标注", shapeGroup(`${ln(5, 19, 10, 12)}${rect(10, 6, 8, 6, 1)}`)),
  preset("callout-side", "标注", "侧边标注", shapeGroup(`${ln(5, 19, 9, 12)}${rect(9, 5, 7, 9)}${rect(15, 5, 4, 9)}`, BLUE, SOFT_BLUE)),

  preset("action-back", "动作按钮", "后退", shapeGroup(`${rect(5, 5, 14, 14, 1)}${polygon("14 8 9 12 14 16")}`, BLUE, SOFT_BLUE)),
  preset("action-play", "动作按钮", "播放", shapeGroup(`${rect(5, 5, 14, 14, 1)}${polygon("10 8 16 12 10 16")}`, BLUE, SOFT_BLUE)),
  preset("action-home", "动作按钮", "主页", shapeGroup(`${rect(5, 5, 14, 14, 1)}${p("M8 12l4-4 4 4v5H8z")}`)),
  preset("action-info", "动作按钮", "信息", shapeGroup(`${rect(5, 5, 14, 14, 1)}${circle(12, 8, 0.6)}${ln(12, 11, 12, 16)}`)),
  preset("action-return", "动作按钮", "返回", shapeGroup(`${rect(5, 5, 14, 14, 1)}${p("M15 8h-4a3 3 0 1 0 0 6h5")}${polyline("11 5 7 8 11 11")}`)),
  preset("action-document", "动作按钮", "文档", shapeGroup(`${rect(5, 5, 14, 14, 1)}${p("M9 8h4l2 2v6H9z")}${polyline("13 8 13 10 15 10")}`)),
  preset("action-sound", "动作按钮", "声音", shapeGroup(`${rect(5, 5, 14, 14, 1)}${p("M9 14H7v-4h2l4-3v10z")}${p("M15 9c1 1 1 5 0 6")}`)),
  preset("action-help", "动作按钮", "帮助", shapeGroup(`${rect(5, 5, 14, 14, 1)}${text("?", 12, 12, 10, BLUE)}`)),

  common("arrow-up", "基本形状", "向上箭头", group(arrowHeadUp)),
  common("arrow-down", "基本形状", "向下箭头", group(arrowHeadDown)),
  common("arrow-left-stop", "基本形状", "左向限位箭头", group(`${ln(8, 12, 18, 12)}${ln(6, 9, 6, 15)}${polyline("11 8 7 12 11 16")}`)),
  common("upload", "基本形状", "上传", group(`${arrowHeadUp}${polyline("5 16 5 19 19 19 19 16")}`)),
  common("swap", "基本形状", "左右切换", group(`${ln(5, 9, 17, 9)}${polyline("14 6 17 9 14 12")}${ln(19, 15, 7, 15)}${polyline("10 12 7 15 10 18")}`)),
  common("loop", "基本形状", "循环", group(`${p("M7 9a5 5 0 0 1 8-3l2 2")}${p("M17 15a5 5 0 0 1-8 3l-2-2")}${polyline("17 5 17 8 14 8")}${polyline("7 19 7 16 10 16")}`)),
  common("wave", "基本形状", "波形", group(p("M4 13c2-4 4-4 6 0s4 4 6 0 4-4 6 0"))),
  common("equal", "基本形状", "等号", group(`${ln(5, 10, 19, 10)}${ln(5, 14, 19, 14)}`)),
  common("chevrons", "基本形状", "多重箭头", group(`${polyline("6 6 12 12 6 18")}${polyline("12 6 18 12 12 18")}`)),
  common("move", "基本形状", "移动", group(`${ln(12, 5, 12, 19)}${ln(5, 12, 19, 12)}${polyline("8 8 12 5 16 8")}${polyline("8 16 12 19 16 16")}${polyline("8 8 5 12 8 16")}${polyline("16 8 19 12 16 16")}`)),

  common("question-circle", "公式符号", "问号圆", group(`${circle(12, 12, 8)}${p("M9.8 9a2.4 2.4 0 1 1 3.6 2.1c-.9.6-1.4 1-1.4 2.2")}${circle(12, 16.5, 0.5)}`)),
  common("x-circle", "公式符号", "叉号圆", group(`${circle(12, 12, 8)}${ln(9, 9, 15, 15)}${ln(15, 9, 9, 15)}`)),
  common("check-circle", "公式符号", "对号圆", group(`${circle(12, 12, 8)}${polyline("8 12 11 15 16 9")}`)),
  common("plus-circle", "公式符号", "加号圆", group(`${circle(12, 12, 8)}${ln(12, 8, 12, 16)}${ln(8, 12, 16, 12)}`)),
  common("minus-circle", "公式符号", "减号圆", group(`${circle(12, 12, 8)}${ln(8, 12, 16, 12)}`)),
  common("percent-badge", "公式符号", "百分比徽章", group(`${circle(12, 12, 8)}${ln(8, 16, 16, 8)}${circle(8.5, 8.5, 1)}${circle(15.5, 15.5, 1)}`)),
  common("at", "公式符号", "邮箱符号", text("@", 12, 12, 16, DARK, 400)),
  common("vo", "公式符号", "变量", group(circle(12, 12, 8)) + text("vo", 12, 12, 5.6, DARK, 700)),
  common("male", "公式符号", "男性符号", group(`${circle(10, 14, 4)}${ln(13, 11, 19, 5)}${polyline("15 5 19 5 19 9")}`)),
  common("parallel", "公式符号", "平行线", group(`${ln(9, 5, 9, 19)}${ln(15, 5, 15, 19)}`)),

  common("chart", "教育教学", "曲线图", group(`${ln(5, 19, 5, 5)}${ln(5, 19, 20, 19)}${p("M6 16c3-8 5-8 7 0s3 2 5-7")}`)),
  common("pie", "教育教学", "饼图", group(`${circle(12, 12, 7)}${p("M12 12V5l5 4")}`)),
  common("graduate", "教育教学", "学士帽", group(`${polygon("12 4 21 8 12 12 3 8")}${p("M7 10v4c2 3 8 3 10 0v-4")}`)),
  common("eraser", "教育教学", "橡皮", group(`${polygon("8 7 18 12 14 18 4 13")}${ln(7, 14.5, 11, 9.5)}`)),
  common("ruler-pencil", "教育教学", "尺规笔", group(`${polygon("5 17 16 6 18 8 7 19 5 19")}${polyline("15 5 19 9")}${rect(4, 5, 5, 12)}`)),
  common("palette", "教育教学", "调色盘", group(`${p("M12 4a8 8 0 1 0 0 16h2a2 2 0 0 0 0-4h-1a1.5 1.5 0 0 1 0-3h2a4 4 0 0 0-3-9z")}${circle(8, 10, 0.7)}${circle(11, 8, 0.7)}${circle(15, 10, 0.7)}${circle(9, 14, 0.7)}`)),
  common("battery", "教育教学", "电池", group(`${rect(8, 5, 8, 14, 1)}${rect(10, 3, 4, 2)}${ln(11, 9, 13, 9)}${ln(12, 13, 12, 16)}${ln(10.5, 14.5, 13.5, 14.5)}`)),
  common("books", "教育教学", "书本", group(`${rect(5, 7, 4, 11)}${rect(10, 6, 4, 12)}${p("M16 7l3 10-4 1-3-10z")}`)),
  common("download-book", "教育教学", "下载书籍", group(`${rect(7, 5, 10, 14, 1)}${arrowHeadDown}`)),
  common("atom", "教育教学", "原子", group(`${ellipse(12, 12, 8, 3)}${ellipse(12, 12, 8, 3)}${ellipse(12, 12, 3, 8)}${circle(12, 12, 0.7)}`)),
  common("open-book", "教育教学", "打开书本", bookBody),
  common("bell", "教育教学", "铃铛", group(`${p("M8 17h8M9 17V11a3 3 0 0 1 6 0v6M10 20h4")}`)),

  common("exclamation", "标志标识", "感叹号", group(`${ln(12, 5, 12, 14)}${circle(12, 18, 0.8)}`)),
  common("chat", "标志标识", "消息", group(`${p("M5 7h14v9H10l-4 4v-4H5z")}`)),
  common("thought", "标志标识", "疑问气泡", group(`${p("M8 15h8a4 4 0 0 0 0-8h-2a5 5 0 0 0-8 5")}${circle(6, 18, 0.7)}`) + text("?", 13, 11, 5, DARK)),
  common("wc", "标志标识", "WC", group(circle(12, 12, 8)) + text("WC", 12, 12, 5.8, DARK)),
  common("next", "标志标识", "下一步", group(`${circle(12, 12, 8)}${polyline("10 8 14 12 10 16")}`)),
  common("prohibit", "标志标识", "禁止", group(`${circle(12, 12, 8)}${ln(7, 17, 17, 7)}`)),
  common("like-badge", "标志标识", "推荐", group(`${circle(12, 12, 8)}${p("M10 14v-4l2-3 1 1v3h3l-1 4h-5z")}`)),
  common("double-down", "标志标识", "双下箭头", group(`${circle(12, 12, 8)}${polyline("8 9 12 13 16 9")}${polyline("8 14 12 18 16 14")}`)),
  common("check", "标志标识", "确认", group(`${circle(12, 12, 8)}${polyline("8 12 11 15 16 9")}`)),
  common("radiation", "标志标识", "放射", group(`${circle(12, 12, 8)}${circle(12, 12, 1.2)}${pathArcSegment("12 6a6 6 0 0 1 4 2l-3 4")}${pathArcSegment("18 14a6 6 0 0 1-4 4l-2-4")}${pathArcSegment("6 14a6 6 0 0 1 2-6l3 4")}`)),
  common("pin", "标志标识", "定位", mapPinBody),
  common("map-pin", "标志标识", "地图定位", group(`${p(mapPinPath())}${p("M6 19l-3 1 2-6")}${p("M18 19l3 1-2-6")}`)),

  common("pointing-hand", "人像手势", "指向手势", group(`${p("M5 13h7l2-2h5v3h-4l-2 3H7z")}${p("M5 13v-3")}`)),
  common("finger-up", "人像手势", "手指点击", group(`${p("M12 4v9")}${p("M12 13l2-2 2 2 2-1 2 3v4H9l-3-5 2-2 2 3")}`)),
  common("person", "人像手势", "人物", userBody),
  common("person-line", "人像手势", "站立人物", group(`${circle(12, 5, 1.5)}${ln(12, 7, 12, 15)}${ln(8, 10, 16, 10)}${ln(12, 15, 9, 20)}${ln(12, 15, 15, 20)}`)),
  common("profile", "人像手势", "头像", group(`${circle(12, 8, 3)}${pathArcSegment("6 20c2-5 10-5 12 0")}`)),
  common("graduate-person", "人像手势", "毕业生", group(`${circle(12, 10, 2.5)}${polygon("12 3 19 6 12 9 5 6")}${p("M7 20c1-4 9-4 10 0")}`)),
  common("baby", "人像手势", "婴儿", group(`${circle(12, 11, 5)}${p("M9 8c2-3 4-3 6 0")}${circle(10, 11, 0.4)}${circle(14, 11, 0.4)}${p("M10 14c1.2 1 2.8 1 4 0")}`)),
  common("group", "人像手势", "群组", group(`${circle(8, 9, 2)}${circle(16, 9, 2)}${circle(12, 7, 2)}${p("M4 19c1-3 7-3 8 0M12 19c1-3 7-3 8 0M7 17c1-3 9-3 10 0")}`)),
  common("org", "人像手势", "组织结构", group(`${circle(12, 5, 1.5)}${ln(12, 6.5, 12, 11)}${ln(7, 11, 17, 11)}${ln(7, 11, 7, 14)}${ln(17, 11, 17, 14)}${circle(7, 16, 1.5)}${circle(17, 16, 1.5)}`)),
  common("meeting", "人像手势", "会议", group(`${circle(8, 8, 1.5)}${circle(16, 8, 1.5)}${rect(5, 13, 14, 4)}${p("M6 13c1-3 5-3 6 0M12 13c1-3 5-3 6 0")}`)),

  common("medal", "休闲娱乐", "奖牌", group(`${circle(12, 8, 4)}${p("M9 12l-2 7 5-3 5 3-2-7")}`)),
  common("award", "休闲娱乐", "奖章", group(`${circle(12, 9, 4)}${polygon("12 4 13 7 16 7 14 10 15 13 12 11 9 13 10 10 8 7 11 7")}${p("M9 13l-2 6 5-3 5 3-2-6")}`)),
  common("signpost", "休闲娱乐", "指示牌", group(`${ln(12, 7, 12, 20)}${polygon("5 5 17 5 20 8 17 11 5 11")}${polygon("19 12 7 12 4 15 7 18 19 18")}`)),
  common("skateboard", "休闲娱乐", "滑板", group(`${ln(6, 15, 18, 15)}${circle(8, 17, 0.8)}${circle(16, 17, 0.8)}`)),
  common("bike", "休闲娱乐", "自行车", group(`${circle(6, 16, 3)}${circle(18, 16, 3)}${polyline("6 16 10 9 13 16 10 16 14 9 16 9")}${ln(14, 9, 18, 16)}`)),
  common("scooter", "休闲娱乐", "滑板车", group(`${circle(8, 18, 1)}${circle(17, 18, 1)}${ln(8, 18, 15, 18)}${p("M15 18l3-10h2")}`)),
  common("car", "休闲娱乐", "汽车", carBody),
  common("taxi", "休闲娱乐", "出租车", group(`${p("M4 15h16")}${p("M6 15l2-5h8l2 5")}${rect(5, 13, 14, 4, 1)}${rect(10, 7, 4, 2)}${circle(8, 18, 1)}${circle(16, 18, 1)}`)),
  common("truck", "休闲娱乐", "货车", truckBody),
  common("train", "休闲娱乐", "火车", group(`${rect(6, 4, 12, 14, 2)}${rect(8, 7, 8, 4)}${circle(9, 15, 0.8)}${circle(15, 15, 0.8)}${ln(9, 21, 15, 21)}${ln(10, 18, 8, 21)}${ln(14, 18, 16, 21)}`)),
  common("video", "休闲娱乐", "视频", group(`${rect(5, 8, 10, 8, 1)}${polygon("15 11 20 8 20 16 15 13")}`)),
  common("camera", "休闲娱乐", "相机", cameraBody),

  common("sprout", "动植物", "新芽", group(`${p("M12 20V10")}${p("M12 11c-5-1-7-4-7-7 5 0 7 3 7 7Z")}${p("M12 11c5-1 7-4 7-7-5 0-7 3-7 7Z")}`)),
  common("leaf", "动植物", "叶片", group(`${p("M5 18C5 9 12 5 20 4c-1 8-5 15-15 14Z")}${p("M6 17c4-4 7-6 12-11")}`)),
  common("maple", "动植物", "枫叶", group(`${p("M12 20l1-5 5 2-2-4 4-3-5-1 1-5-4 3-4-3 1 5-5 1 4 3-2 4 5-2z")}`)),
  common("branch", "动植物", "枝叶", group(`${p("M6 19c4-6 8-10 12-14")}${p("M10 13c-3 0-4-2-5-4 3 0 5 1 5 4Z")}${p("M14 9c0-3 2-4 4-5 0 3-1 5-4 5Z")}`)),
  common("flower", "动植物", "花朵", flowerBody),
  common("rose", "动植物", "玫瑰", group(`${p("M12 12c-4-1-5-5-1-7 5 1 6 6 1 9")}${p("M12 14v6")}${p("M12 17c-3 0-4-2-5-4")}${p("M12 17c3 0 4-2 5-4")}`)),
  common("lotus", "动植物", "莲花", group(`${p("M12 18c-4-4-4-8 0-12 4 4 4 8 0 12Z")}${p("M6 18c-2-3-1-6 4-8")}${p("M18 18c2-3 1-6-4-8")}${ln(5, 20, 19, 20)}`)),
  common("tree", "动植物", "树", treeBody),
  common("forest", "动植物", "树林", group(`${p("M7 20v-4")}${p("M5 16l2-4 2 4z")}${p("M13 20v-5")}${p("M10 15l3-6 3 6z")}${p("M18 20v-3")}${p("M16 17l2-4 2 4z")}`)),
  common("field", "动植物", "田地", group(`${ln(4, 19, 20, 19)}${p("M6 19c2-5 4-8 6-10 2 2 4 5 6 10")}${p("M12 19V9")}${p("M9 13c-2 0-3-1-4-3")}${p("M15 13c2 0 3-1 4-3")}`)),

  common("screen", "生活用品", "屏幕", monitorBody),
  common("tv", "生活用品", "电视", group(`${rect(5, 6, 14, 10, 1)}${ln(9, 20, 15, 20)}${ln(12, 16, 12, 20)}${ln(8, 4, 10, 6)}${ln(16, 4, 14, 6)}`)),
  common("briefcase", "生活用品", "公文包", group(`${rect(5, 9, 14, 8, 1)}${p("M9 9V7h6v2")}${ln(5, 12, 19, 12)}${rect(10.5, 11, 3, 2, 0.4)}`)),
  common("phone", "生活用品", "手机", phoneBody),
  common("phone-message", "生活用品", "手机消息", group(`${rect(7, 4, 8, 16, 1.6)}${p("M13 8h6v5h-3l-2 2v-2h-1z")}`)),
  common("phone-search", "生活用品", "手机搜索", group(`${rect(7, 4, 8, 16, 1.6)}${circle(16.5, 12, 2)}${ln(18, 13.5, 20, 15.5)}`)),
  common("phone-5g", "生活用品", "5G手机", phoneBody + text("5G", 12, 12, 4.3, DARK)),
  common("tablet", "生活用品", "平板", group(`${rect(4, 7, 16, 10, 1.5)}${ln(7, 9, 15, 9)}${circle(18, 12, 0.45)}`)),
  common("landline", "生活用品", "座机", group(`${rect(6, 10, 12, 7, 1)}${p("M8 10V7h8v3")}${circle(9, 14, 0.5)}${circle(12, 14, 0.5)}${circle(15, 14, 0.5)}`)),
  common("watch", "生活用品", "手表", group(`${circle(12, 12, 5)}${p("M9 7l1-4h4l1 4M9 17l1 4h4l1-4")}${polyline("12 9 12 12 14 13")}`)),
  common("cloud-phone", "生活用品", "云电话", group(`${p("M7 15h9a3 3 0 0 0 0-6 5 5 0 0 0-9-1 3.5 3.5 0 0 0 0 7z")}${p("M8 18c3 2 5 2 8 0")}`)),
  common("bag", "生活用品", "手提包", group(`${rect(6, 8, 12, 11, 1)}${p("M9 8a3 3 0 0 1 6 0")}`)),

  common("map", "天文地理", "地图", group(`${polygon("5 6 10 4 15 6 20 4 20 18 15 20 10 18 5 20")}${ln(10, 4, 10, 18)}${ln(15, 6, 15, 20)}`)),
  common("location", "天文地理", "定位点", mapPinBody),
  common("globe", "天文地理", "地球", group(`${circle(12, 12, 8)}${ellipse(12, 12, 3, 8)}${ln(4, 12, 20, 12)}${p("M6 8h12M6 16h12")}`)),
  common("compass", "天文地理", "指南针", group(`${circle(12, 12, 8)}${polygon("15 8 13 14 7 16 11 10")}`)),
  common("mountain", "天文地理", "山峰", group(`${polygon("4 19 10 8 14 15 16 12 21 19")}${ln(10, 8, 12, 12)}`)),
  common("sun", "天文地理", "太阳", group(`${circle(12, 12, 4)}${p("M12 2v3M12 19v3M2 12h3M19 12h3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M19.8 4.2l-2.1 2.1M6.3 17.7l-2.1 2.1")}`)),
  common("moon", "天文地理", "月亮", group(p("M18 17.5A8 8 0 0 1 10.5 5 7 7 0 1 0 18 17.5z"))),
  common("cloud", "天文地理", "云", group(p("M7 17h10a4 4 0 0 0 .6-8 6 6 0 0 0-11.2 1.5A3.5 3.5 0 0 0 7 17z"))),
  common("star", "天文地理", "星星", group(polygon("12 4 14.3 9 20 9.2 15.8 13 17 19 12 16 7 19 8.2 13 4 9.2 9.7 9"))),
  common("home", "天文地理", "房屋", group(`${p("M4 11l8-7 8 7")}${p("M6 10v10h12V10")}${rect(10, 14, 4, 6)}`))
];

function pathArcSegment(d: string) {
  return `<path d="${d}"/>`;
}

function mapPinPath() {
  return "M12 21s6-5.6 6-11a6 6 0 0 0-12 0c0 5.4 6 11 6 11Z";
}

function svgSourceForSpec(spec: BuiltinSharedIconSpec) {
  const title = `${spec.category} / ${spec.name}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" role="img" aria-label="${escapeSvgText(title)}"><title>${escapeSvgText(title)}</title><rect width="24" height="24" fill="${SOFT_GRAY}" fill-opacity="0"/>${spec.body}</svg>`;
}

function svgDataUrl(source: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(source)}`;
}

export const BUILTIN_SHARED_ICON_ASSETS: ImageAsset[] = BUILTIN_SHARED_ICON_SPECS.map((spec, index) => {
  const svgSource = svgSourceForSpec(spec);
  return {
    id: `builtin-shared-icon-${String(index + 1).padStart(3, "0")}-${spec.key}`,
    name: `${spec.category} / ${spec.name}`,
    filename: `${spec.key}.svg`,
    folderId: BUILTIN_SHARED_ICON_FOLDER_ID,
    mimeType: "image/svg+xml",
    size: svgSource.length,
    createdAt: "builtin",
    url: svgDataUrl(svgSource)
  };
});

export function builtinSharedIconAssetMap(assets: ImageAsset[] = BUILTIN_SHARED_ICON_ASSETS) {
  return Object.fromEntries(assets.map((asset) => [asset.id, asset.url]));
}

export function isBuiltinSharedIconAssetId(assetId: string) {
  return assetId.startsWith("builtin-shared-icon-");
}

export function mergeBuiltinSharedIconAssets(assets: ImageAsset[]) {
  const merged: ImageAsset[] = [];
  const seen = new Set<string>();
  for (const asset of [...BUILTIN_SHARED_ICON_ASSETS, ...assets]) {
    if (seen.has(asset.id)) {
      continue;
    }
    seen.add(asset.id);
    merged.push(asset);
  }
  return merged;
}
