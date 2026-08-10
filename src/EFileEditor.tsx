import { useState, useMemo } from "react";
import { X, Edit, Eye, Plus, Trash2 } from "lucide-react";

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

export function EFileEditor({ open, onClose, records, onSave }: EFileEditorProps) {
  const [editMode, setEditMode] = useState(false);
  const [activeSection, setActiveSection] = useState(0);
  const [editedRecords, setEditedRecords] = useState<EDeviceRecord[]>(records);

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
              </div>
              <table className="e-file-editor-table">
                <thead>
                  <tr>
                    {editMode && <th style={{ width: "40px" }}>操作</th>}
                    {columns.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sectionRecords.map((record) => (
                    <tr key={record.id}>
                      {editMode && (
                        <td>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(record.id)}
                            title="删除行"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                      {columns.map((col) => (
                        <td key={col}>
                          {editMode ? (
                            <input
                              type="text"
                              value={record.params[col] || ""}
                              onChange={(e) => handleCellEdit(record.id, col, e.target.value)}
                            />
                          ) : (
                            <span>{record.params[col] || ""}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
