// 空间 id 生成与校验。允许中文/Unicode 字母：方案树目录本就是中文，
// 目录可读性对运维有实值；排除路径分隔符与 Windows 保留名防穿越与歧义。

const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
const ID_OK = /^[\p{L}\p{N}_][\p{L}\p{N}_-]{0,39}$/u;
const MAX_LEN = 40;

export const isValidSpaceId = (id) => typeof id === "string" && ID_OK.test(id);

export const isReservedSpaceId = (id) => RESERVED.test(String(id ?? ""));

// 名称 → 唯一 id。taken 为已有 id 列表。
export function spaceIdFromName(name, taken = []) {
  const text = String(name ?? "").normalize("NFKC").trim();
  let base = text
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
  base = [...base].slice(0, MAX_LEN).join("");
  if (!base) base = "space";
  if (RESERVED.test(base)) base = `_${base}`;

  const used = new Set(taken.map((id) => String(id).toLowerCase()));
  if (!used.has(base.toLowerCase())) return base;
  for (let n = 2; ; n += 1) {
    const suffix = `-${n}`;
    const candidate = [...base].slice(0, MAX_LEN - suffix.length).join("") + suffix;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
}

// 空间**显示名**的接受规则 —— 三个入口（POST /spaces、PUT /spaces 改名、空间 ZIP 导入）共用这一份。
// 单源是「能被创建的名字一定能无损往返」成立的前提：任一处自己再归一/再截断一次，
// 都会让导出→导入悄悄改名（截断与 NFKC 各来一遍 = 名字被改两次）。
export const MAX_SPACE_NAME_LENGTH = 40;

/**
 * 归一化显示名：NFKC + trim。
 * **不截断** —— 静默截断就是把用户输入的名字悄悄改掉；超长由各入口按各自的语义处理
 * （能拒收的入口 400，导入回退到包内顶层目录名）。
 */
export function normalizeSpaceName(value) {
  return String(value ?? "").normalize("NFKC").trim();
}

/** 是否可接受：非空、非全符号、且不超过上限（按**码点**计，中文名不能按 UTF-16 单元切）。传入值须已归一化。 */
export function isAcceptableSpaceName(normalized) {
  return Boolean(normalized)
    && [...normalized].length <= MAX_SPACE_NAME_LENGTH
    && Boolean(normalized.replace(/[^\p{L}\p{N}_-]+/gu, ""));
}
