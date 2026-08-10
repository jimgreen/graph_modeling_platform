import { useState, useMemo, useRef, useCallback } from "react";
import { X, Edit, Eye, Plus, Trash2 } from "lucide-react";
import { PARAM_LABELS } from "./appExtracted/appCoreCanvasUtilities";

export type EDeviceRecord = {
  id: string;
  kind: string;
  section: string;
  params: Record<string, string>;
  columns?: string[];
};

export interface EFileEditorProps {
  open: boolean;
  onClose: () => void;
  records: EDeviceRecord[];
  onSave?: (records: EDeviceRecord[]) => void;
}

const MAX_COL_WIDTH = 200;
const MIN_COL_WIDTH = 40;
const DEFAULT_COL_WIDTH = 80;

export function EFileEditor({ open, onClose, records, onSave }: EFileEditorProps) {
  const [editMode, setEditMode] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [editedRecords, setEditedRecords] = useState<EDeviceRecord[]>(records);
  // 列宽状态：key = `${sectionName}:${col}`
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const [copiedCell, setCopiedCell] = useState<string | null>(null);
  const resizeRef = useRef<{ colKey: string; startX: number; startWidth: number } | null>(null);

  // 按 section 分组记录
  const sections = useMemo(() => {
    const sectionMap = new Map<string, EDeviceRecord[]>();
    for (const record of editedRecords) {
      const list = sectionMap.get(record.section) || [];
      list.push(record);
      sectionMap.set(record.section, list);
    }
    return Array.from(sectionMap.entries());
  }, [editedRecords]);

  // 当 records 变化时重置编辑状态
  useMemo(() => {
    setEditedRecords(records);
    setActiveSection(0);
    setEditMode(false);
  }, [records]);

  const getColWidth = useCallback((sectionName: string, col: string) => {
    const key = `${sectionName}:${col}`;
    return colWidths[key] ?? DEFAULT_COL_WIDTH;
  }, [colWidths]);

  const handleResizeStart = useCallback((e: React.PointerEvent, sectionName: string, col: string) => {
    e.preventDefault();
    e.stopPropagation();
    const key = `${sectionName}:${col}`;
    const startWidth = colWidths[key] ?? DEFAULT_COL_WIDTH;
    resizeRef.current = { colKey: key, startX: e.clientX, startWidth };

    const handleMove = (ev: PointerEvent) => {
      if (!resizeRef.current) return;
      const delta = ev.clientX - resizeRef.current.startX;
      const newWidth = Math.max(MIN_COL_WIDTH, Math.min(MAX_COL_WIDTH, resizeRef.current.startWidth + delta));
      setColWidths((prev) => ({ ...prev, [resizeRef.current!.colKey]: newWidth }));
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
    if (!editMode) return;
    const text = value || "";
    if (!text) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedCell(text);
        window.setTimeout(() => setCopiedCell(null), 1500);
      }).catch(() => {
        // 回退方案：用临时 textarea
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); setCopiedCell(text); window.setTimeout(() => setCopiedCell(null), 1500); } catch {}
        document.body.removeChild(ta);
      });
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); setCopiedCell(text); window.setTimeout(() => setCopiedCell(null), 1500); } catch {}
      document.body.removeChild(ta);
    }
  }, [editMode]);

  if (!open) return null;

  const currentSection = sections[activeSection];
  const sectionName = currentSection?.[0] || "";
  const sectionRecords = currentSection?.[1] || [];
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

  const handleAddRow = () => {
    if (!editMode || !currentSection) return;
    const newId = `new_${Date.now()}`;
    const newRecord: EDeviceRecord = {
      id: newId,
      kind: sectionRecords[0]?.kind || "",
      section: sectionName,
      params: Object.fromEntries(columns.map((c) => [c, ""])),
      columns
    };
    setEditedRecords((prev) => [...prev, newRecord]);
  };

  const handleDeleteRow = (recordId: string) => {
    if (!editMode) return;
    setEditedRecords((prev) => prev.filter((r) => r.id !== recordId));
  };

  const handleSave = () => {
    if (onSave) {
      onSave(editedRecords);
    }
    setEditMode(false);
  };

  const handleCancel = () => {
    setEditedRecords(records);
    setEditMode(false);
  };

  // 获取字段中文名称
  const getFieldCnName = (col: string) => PARAM_LABELS[col] || col;

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

        <div className="e-file-editor-content">
          {/* Tab 导航 */}
          <div className="e-file-editor-tabs">
            {sections.map(([section], index) => (
              <button
                key={section}
                type="button"
                className={index === activeSection ? "active" : ""}
                onClick={() => setActiveSection(index)}
              >
                {section}
              </button>
            ))}
          </div>

          {/* 表格内容 */}
          {currentSection && (
            <div className="e-file-editor-table-container">
              <div className="e-file-editor-table-actions">
                {editMode && (
                  <>
                    <button type="button" onClick={handleAddRow} title="添加行">
                      <Plus size={14} />
                      <span>添加行</span>
                    </button>
                    <button type="button" onClick={handleSave} className="primary">
                      保存
                    </button>
                    <button type="button" onClick={handleCancel}>
                      取消
                    </button>
                  </>
                )}
                {copiedCell !== null && <span className="e-file-editor-copied-toast">已复制到剪切板</span>}
              </div>
              <div className="e-file-editor-table-scroll">
                <table className="e-file-editor-table">
                  <thead>
                    <tr>
                      {editMode && <th className="e-file-editor-th-action">操作</th>}
                      {columns.map((col) => (
                        <th key={col} title={getFieldCnName(col)} className="e-file-editor-th">
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
                    {sectionRecords.map((record) => (
                      <tr key={record.id}>
                        {editMode && (
                          <td className="e-file-editor-td-action">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(record.id)}
                              title="删除行"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                        {columns.map((col) => {
                          const value = record.params[col] || "";
                          const colWidth = getColWidth(sectionName, col);
                          return (
                            <td
                              key={col}
                              className="e-file-editor-td"
                              style={{ maxWidth: `${colWidth}px` }}
                              title={editMode ? undefined : value}
                            >
                              {editMode ? (
                                <input
                                  type="text"
                                  value={value}
                                  onChange={(e) => handleCellEdit(record.id, col, e.target.value)}
                                  onDoubleClick={(e) => { e.stopPropagation(); handleDoubleClickCell(value); }}
                                  title="双击复制到剪切板"
                                />
                              ) : (
                                <span className="e-file-editor-cell-text">{value}</span>
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
