import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { X, Edit, Eye, ArrowUpRight } from "lucide-react";
import { PARAM_LABELS } from "./appExtracted/appCoreCanvasUtilities";
import { formatEDeviceRecordColumnValue } from "./model-eexport";

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
  // DC 节点引用
  source_node: "DCNode",
  target_node: "DCNode",
  // 厂站引用（所属厂站/末端所属厂站 -> substation 表 idx）
  ist: "substation",
  zst: "substation",
};

// 拓扑相关字段（只读，不可编辑）
const TOPOLOGY_READONLY_FIELDS = new Set([
  "ind", "znd", "ist", "zst",
  "i_node", "j_node", "node",
  "t1_node", "t2_node", "t3_node", "neutral_node",
  "itrfm", "source_node", "target_node",
]);

export function EFileEditor({ open, onClose, records, onSave, fieldCnNames }: EFileEditorProps) {
  const [editMode, setEditMode] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [editedRecords, setEditedRecords] = useState<EDeviceRecord[]>(records);
  // 列宽状态：key = `${sectionName}:${col}`
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState(false);
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
  const handleJumpToReference = useCallback((fieldName: string, targetIdx: string) => {
    const targetSection = REFERENCE_FIELD_MAP[fieldName];
    if (!targetSection) return;

    // 找到目标 section（元件库内部名）的索引
    const targetSectionIndex = sections.findIndex((section) => section.key === targetSection);
    if (targetSectionIndex === -1) return;

    // 切换到目标 section
    setActiveSection(targetSectionIndex);

    // 高亮目标行
    const targetRecord = sections[targetSectionIndex].records.find(
      (record) => record.params.idx === targetIdx
    );
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
                                  {TOPOLOGY_READONLY_FIELDS.has(col) ? (
                                    <span className="e-file-editor-cell-input e-file-editor-cell-readonly">{value}</span>
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
                                  {!record.readonly && isReferenceField && (
                                    <button
                                      type="button"
                                      className="e-file-editor-jump-btn"
                                      onClick={() => handleJumpToReference(col, value)}
                                      title={`跳转到 ${REFERENCE_FIELD_MAP[col]} 的 idx=${value}`}
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
