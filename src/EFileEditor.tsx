import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { X, Edit, Eye, ArrowUpRight } from "lucide-react";
import { PARAM_LABELS } from "./appExtracted/appCoreCanvasUtilities";
import { formatEDeviceRecordColumnValue, E_REFERENCE_FIELD_TABLE_IDS } from "./model-eexport";

export type EDeviceRecord = {
  id: string;
  kind: string;
  section: string;
  params: Record<string, string>;
  columns?: string[];
  /** 模板输出表名（如 ACGenerator -> unit、ACNode -> node），缺省时展示 section */
  sectionLabel?: string;
  /** 系统表（basevalue/basevoltage/subcontrolarea/substation 等）只读，编辑模式不提供输入 */
  readonly?: boolean;
};

export interface EFileEditorProps {
  open: boolean;
  onClose: () => void;
  records: EDeviceRecord[];
  onSave?: (records: EDeviceRecord[]) => void;
  /** 字段中文名映射：section 内部名 -> 列名(exportName) -> 中文名（来自模板文件中文注释），供表头 tooltip 展示 */
  fieldCnNames?: Record<string, Record<string, string>>;
}

const MAX_COL_WIDTH = 2000;
const MIN_COL_WIDTH = 40;
const DEFAULT_COL_WIDTH = 80;

// 引用字段映射：字段名 -> 目标表名（内部 section 名，跳转时按 idx 匹配目标表行）
const REFERENCE_FIELD_MAP: Record<string, string> = {
  // 节点引用
  i_node: "ACNode",
  j_node: "ACNode",
  node: "ACNode",
  ind: "ACNode",
  znd: "ACNode",
  // 三绕组变压器
  t1_node: "ACNode",
  t2_node: "ACNode",
  t3_node: "ACNode",
  neutral_node: "ACNode",
  // 变压器绕组
  itrfm: "ACTransformer",
  trfm_id: "ACTransformer",
  tr_id: "ACTransformer",
  // DC 节点引用
  source_node: "DCNode",
  target_node: "DCNode",
  // 厂站引用（所属厂站/末端所属厂站 -> substation 表 idx）
  ist: "substation",
  zst: "substation",
  // 实时库模板引用字段（值 = key_to_long 计算 id，跳转时按表号还原行号）
  st_id: "substation",
  ist_id: "substation",
  jst_id: "substation",
  bv_id: "basevoltage",
  subarea_id: "subcontrolarea",
  area_id: "subcontrolarea",
  aclnseg_id: "ACBranch",
  tapty_id: "taptype",
  dcln_id: "DCBranch",
  bulk_id: "dms_def_bulk",
  source_id: "dms_def_source",
  // 配网实时库引用：feeder_id → dms_def_feeder；node_id/inode_id/znode_id → dms_def_node
  // （dms_def_node 元件库映射为 ACNode，内部 section 为 ACNode）
  feeder_id: "dms_def_feeder",
  node_id: "ACNode",
  inode_id: "ACNode",
  znode_id: "ACNode",
};

// 拓扑相关字段（只读，不可编辑）
const TOPOLOGY_READONLY_FIELDS = new Set([
  "ind", "znd", "ist", "zst",
  "i_node", "j_node", "node",
  "t1_node", "t2_node", "t3_node", "neutral_node",
  "itrfm", "source_node", "target_node",
]);

/**
 * 拓扑结构字段判定：编辑模式下禁止修改的字段。
 * 编辑模式下不允许修改模型的拓扑结构，因此以下字段一律只读：
 * 1. 行标识字段：`id`（行主标识）、`idx`（行序号）；
 * 2. 外键/引用字段：指向其他表 `id`（或 idx）的字段，包括
 *    - REFERENCE_FIELD_MAP 中已定义的引用字段（节点号/厂站引用/模板引用）；
 *    - E_REFERENCE_FIELD_TABLE_IDS 中定义的实时库引用 id 字段；
 *    - 遵循 `xxx_id` 命名约定的通用外键字段。
 */
export const EDITABLE_ID_FIELDS = new Set(["rdf_id"]);

export const isTopologyField = (col: string): boolean => {
  if (EDITABLE_ID_FIELDS.has(col)) return false;
  return (
    col === "id" ||
    col === "idx" ||
    REFERENCE_FIELD_MAP[col] !== undefined ||
    E_REFERENCE_FIELD_TABLE_IDS[col] !== undefined ||
    TOPOLOGY_READONLY_FIELDS.has(col) ||
    col.endsWith("_id")
  );
};

export function EFileEditor({ open, onClose, records, onSave, fieldCnNames }: EFileEditorProps) {
  const [editMode, setEditMode] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [editedRecords, setEditedRecords] = useState<EDeviceRecord[]>(records);
  // 列宽状态：key = `${sectionName}:${col}`
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState(false);
  // 点击只读拓扑字段时的提示（禁止修改提示）
  const [protectedToast, setProtectedToast] = useState<string | null>(null);
  const protectedToastTimer = useRef<number | null>(null);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [highlightedRow, setHighlightedRow] = useState<string | null>(null);
  const resizeRef = useRef<{ colKey: string; startX: number; startWidth: number } | null>(null);

  // 按 section 分组记录：key=元件库内部名（供跳转/保存映射），label=模板输出表名（供展示）
  const sections = useMemo(() => {
    const sectionMap = new Map<string, { key: string; label: string; records: EDeviceRecord[] }>();
    for (const record of editedRecords) {
      const key = record.section;
      const label = record.sectionLabel ?? record.section;
      const existing = sectionMap.get(key);
      if (existing) {
        existing.records.push(record);
      } else {
        sectionMap.set(key, { key, label, records: [record] });
      }
    }
    return Array.from(sectionMap.values());
  }, [editedRecords]);

  // 当 records 变化时重置编辑状态
  useEffect(() => {
    setEditedRecords(records);
    setActiveSection(0);
    setEditMode(false);
  }, [records]);

  const getColWidth = useCallback((sectionName: string, col: string): number | undefined => {
    const key = `${sectionName}:${col}`;
    return colWidths[key];
  }, [colWidths]);

  const handleResizeStart = useCallback((e: React.PointerEvent, sectionName: string, col: string) => {
    e.preventDefault();
    e.stopPropagation();
    const key = `${sectionName}:${col}`;
    const th = e.currentTarget.parentElement as HTMLElement;
    const startWidth = colWidths[key] ?? th.getBoundingClientRect().width;
    resizeRef.current = { colKey: key, startX: e.clientX, startWidth };

    const handleMove = (ev: PointerEvent) => {
      const ref = resizeRef.current;
      if (!ref) return;
      const delta = ev.clientX - ref.startX;
      const newWidth = Math.max(MIN_COL_WIDTH, Math.min(MAX_COL_WIDTH, ref.startWidth + delta));
      setColWidths((prev) => ({ ...prev, [ref.colKey]: newWidth }));
    };
    const handleUp = () => {
      resizeRef.current = null;
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
    };
    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
  }, [colWidths]);

  const handleDoubleClickCell = useCallback((value: string) => {
    if (editMode) return;
    const text = value || "";
    if (!text) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedCell(text);
        window.setTimeout(() => setCopiedCell(null), 1000);
      }).catch(() => {
        // 回退方案：用临时 textarea
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); setCopiedCell(text); window.setTimeout(() => setCopiedCell(null), 1000); } catch {}
        document.body.removeChild(ta);
      });
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); setCopiedCell(text); window.setTimeout(() => setCopiedCell(null), 1000); } catch {}
      document.body.removeChild(ta);
    }
  }, [editMode]);

  // 跳转到引用行
  const handleJumpToReference = useCallback((fieldName: string, targetValue: string) => {
    const targetSection = REFERENCE_FIELD_MAP[fieldName];
    if (!targetSection) return;

    // 找到目标 section（元件库内部名）的索引
    const targetSectionIndex = sections.findIndex((section) => section.key === targetSection);
    if (targetSectionIndex === -1) return;

    // 切换到目标 section
    setActiveSection(targetSectionIndex);

    const targetRecords = sections[targetSectionIndex].records;
    let targetRecord: EDeviceRecord | undefined;
    const tableId = E_REFERENCE_FIELD_TABLE_IDS[fieldName];
    if (tableId) {
      // 实时库引用字段：值 = key_to_long(表号, 0, 行号)，还原行号（低 48 位 = field<<32|area<<24|key_no，
      // 因 field_id=0 且 area_no=0，行号 = value - (表号<<48)），再按 idx 排序取第 rowNo 行
      const valueBig = BigInt(String(targetValue ?? "").trim());
      const rowNo = Number(valueBig - (BigInt(String(tableId).trim()) << 48n));
      if (Number.isFinite(rowNo) && rowNo >= 1) {
        const sorted = [...targetRecords].sort((a, b) =>
          Number(a.params.idx ?? 0) - Number(b.params.idx ?? 0)
        );
        targetRecord = sorted[rowNo - 1];
      }
    }
    if (!targetRecord) {
      // 旧字段（i_node/ind 等）：值即目标 idx，直接匹配
      targetRecord = targetRecords.find((record) => record.params.idx === targetValue);
    }
    if (targetRecord) {
      setHighlightedRow(targetRecord.id);
      // 3秒后取消高亮
      setTimeout(() => setHighlightedRow(null), 3000);
    }
  }, [sections]);

  if (!open) return null;

  const currentSection = sections[activeSection];
  const sectionName = currentSection?.label || "";
  const sectionRecords = currentSection?.records || [];
  const columns = sectionRecords[0]?.columns || [];

  const handleCellEdit = (recordId: string, column: string, value: string) => {
    if (!editMode) return;
    // 拓扑结构字段（id/idx/外键引用）禁止修改，输入一律忽略
    if (isTopologyField(column)) return;
    setEditedRecords((prev) =>
      prev.map((r) =>
        r.id === recordId
          ? { ...r, params: { ...r.params, [column]: value } }
          : r
      )
    );
  };

  const handleSave = () => {
    if (onSave) {
      onSave(editedRecords);
    }
    setSavedMessage(true);
    window.setTimeout(() => setSavedMessage(false), 2000);
  };

  const handleCancel = () => {
    setEditedRecords(records);
    setEditMode(false);
  };

  // 获取字段中文名称：优先读取模板文件中的中文注释（fieldCnNames），
  // 其次使用通用参数标签（PARAM_LABELS），最后回退英文列名
  const getFieldCnName = (sectionKey: string, col: string) => {
    const templateCn = fieldCnNames?.[sectionKey]?.[col];
    if (templateCn) return templateCn;
    return PARAM_LABELS[col] || col;
  };

  // 用户尝试编辑拓扑结构字段时：禁止修改并提示
  const showProtectedToast = (col: string) => {
    if (protectedToastTimer.current) window.clearTimeout(protectedToastTimer.current);
    const cnName = getFieldCnName(currentSection?.key ?? "", col);
    setProtectedToast(`「${cnName}」为模型拓扑字段（行标识/外键引用），编辑模式下不可修改`);
    protectedToastTimer.current = window.setTimeout(() => setProtectedToast(null), 2500);
  };

  return (
    <div className="image-picker-backdrop" onPointerDown={onClose}>
      <section
        className="e-file-editor-dialog"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="image-picker-title">
          <div>
            <h2>E文件查看与编辑</h2>
          </div>
          <div className="e-file-editor-mode-toggle">
            <button
              type="button"
              className={!editMode ? "active" : ""}
              onClick={() => setEditMode(false)}
              title="查看模式"
            >
              <Eye size={14} />
              <span>查看</span>
            </button>
            <button
              type="button"
              className={editMode ? "active" : ""}
              onClick={() => setEditMode(true)}
              title="编辑模式"
            >
              <Edit size={14} />
              <span>编辑</span>
            </button>
          </div>
          <button type="button" onClick={onClose} title="关闭">
            <X size={16} />
          </button>
        </div>
        {copiedCell !== null && (
          <div className="e-file-editor-copied-toast">已复制到剪切板</div>
        )}
        {savedMessage && (
          <div className="e-file-editor-saved-toast">已保存</div>
        )}
        {protectedToast && (
          <div className="e-file-editor-protected-toast">{protectedToast}</div>
        )}
        {tooltip && (
          <div
            className="e-file-editor-tooltip"
            style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
          >
            {tooltip.text}
          </div>
        )}

        <div className="e-file-editor-content">
          {/* Tab 导航 */}
          <div className="e-file-editor-tabs">
            {sections.map((section, index) => (
              <button
                key={section.key}
                type="button"
                className={index === activeSection ? "active" : ""}
                onClick={() => setActiveSection(index)}
              >
                {section.label}
              </button>
            ))}
          </div>

          {/* 表格内容 */}
          {currentSection && (
            <div className="e-file-editor-table-container">
              <div className="e-file-editor-table-actions">
                {editMode && (
                  <>
                    <button type="button" onClick={handleSave} className="primary">
                      保存
                    </button>
                    <button type="button" onClick={handleCancel}>
                      取消
                    </button>
                  </>
                )}
              </div>
              <div className="e-file-editor-table-scroll">
                <table className="e-file-editor-table">
                  <thead>
                    <tr>
                      {columns.map((col) => (
                        <th
                          key={col}
                          className="e-file-editor-th"
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setTooltip({
                              text: getFieldCnName(currentSection.key, col),
                              x: rect.left + rect.width / 2,
                              y: rect.top
                            });
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        >
                          <span className="e-file-editor-th-text">{col}</span>
                          <span
                            className="e-file-editor-col-resizer"
                            onPointerDown={(e) => handleResizeStart(e, sectionName, col)}
                          />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sectionRecords.map((record, rowIndex) => (
                      <tr key={record.id} className={`${highlightedRow === record.id ? "highlighted" : ""}${record.readonly ? " read-only-row" : ""}`}>
                        {columns.map((col) => {
                          const value = record.params[col] || "";
                          // 查看模式按导出规格展示：空白字段显示与导出 E 文件一致的默认值
                          const displayValue = formatEDeviceRecordColumnValue(record.section, record, col, rowIndex);
                          const colWidth = getColWidth(sectionName, col);
                          const isReferenceField = REFERENCE_FIELD_MAP[col] && value;
                          return (
                            <td
                              key={col}
                              className={`e-file-editor-td${isReferenceField ? " reference-field" : ""}`}
                              style={colWidth ? { width: `${colWidth}px` } : undefined}
                              title={editMode ? undefined : displayValue}
                            >
                              {editMode && !record.readonly ? (
                                <>
                                  <span className="e-file-editor-cell-text e-file-editor-cell-ghost">{displayValue}</span>
                                  {isTopologyField(col) ? (
                                    <span
                                      className="e-file-editor-cell-input e-file-editor-cell-readonly"
                                      title="拓扑结构字段（行标识/外键引用），编辑模式下不可修改"
                                      onClick={() => showProtectedToast(col)}
                                    >{value}</span>
                                  ) : (
                                    <input
                                      type="text"
                                      className="e-file-editor-cell-input"
                                      value={value}
                                      placeholder={displayValue}
                                      onChange={(e) => handleCellEdit(record.id, col, e.target.value)}
                                    />
                                  )}
                                </>
                              ) : (
                                <>
                                  <span
                                    className="e-file-editor-cell-text"
                                    onDoubleClick={() => handleDoubleClickCell(displayValue)}
                                    title={record.readonly ? displayValue : "双击复制到剪切板"}
                                  >{displayValue}</span>
                                  {isReferenceField && (
                                    <button
                                      type="button"
                                      className="e-file-editor-jump-btn"
                                      onClick={() => handleJumpToReference(col, value)}
                                      title={`跳转到 ${REFERENCE_FIELD_MAP[col]} 的 ${E_REFERENCE_FIELD_TABLE_IDS[col] ? "行号" : "idx"}=${E_REFERENCE_FIELD_TABLE_IDS[col]
                                        ? (Number(BigInt(String(value ?? "0").trim()) - (BigInt(String(E_REFERENCE_FIELD_TABLE_IDS[col]).trim()) << 48n)) || "1")
                                        : value}`}
                                    >
                                      <ArrowUpRight size={12} />
                                    </button>
                                  )}
                                </>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
