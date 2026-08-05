// @ts-nocheck
import { useRef, useState } from "react";
import { X, Save, RotateCcw, Plus, Trash2 } from "lucide-react";
import { BUILTIN_VOLTAGE_LEVELS, VoltageLevelConfig, VoltageLevelSettings, writeVoltageLevelSettings } from "./model";

type Props = {
  open: boolean;
  onClose: () => void;
  settings: VoltageLevelSettings;
  onSave: (settings: VoltageLevelSettings) => void;
};

export function VoltageLevelDialog({ open, onClose, settings, onSave }: Props) {
  const [tab, setTab] = useState<"ac" | "dc">("ac");
  const [draft, setDraft] = useState<VoltageLevelSettings>(settings);
  const [error, setError] = useState<string>("");
  const listRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  const currentList = draft[tab];
  const builtinSet = new Set(BUILTIN_VOLTAGE_LEVELS);

  const checkNameDuplicate = (name: string, excludeIndex: number): boolean => {
    return currentList.some((row, i) => i !== excludeIndex && row.name === name);
  };

  const updateRow = (index: number, field: keyof VoltageLevelConfig, value: string) => {
    const next = [...currentList];
    next[index] = { ...next[index], [field]: value };
    setDraft({ ...draft, [tab]: next });
    if (field === "name" && checkNameDuplicate(value, index)) {
      setError(`电压等级名称 "${value}" 已存在`);
    } else {
      setError("");
    }
  };

  const addRow = () => {
    setDraft({ ...draft, [tab]: [...currentList, { name: "", vltp: "", isNew: true }] });
    setTimeout(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    }, 0);
  };

  const removeRow = (index: number) => {
    const row = currentList[index];
    if (builtinSet.has(row.name)) {
      if (!confirm(`"${row.name}" 为内置电压等级，确定删除？`)) return;
    }
    setDraft({ ...draft, [tab]: currentList.filter((_, i) => i !== index) });
  };

  const restoreRow = (index: number) => {
    const row = currentList[index];
    if (builtinSet.has(row.name)) {
      updateRow(index, "vltp", row.name);
    }
  };

  const handleSave = () => {
    // 检查重复
    const names = new Set<string>();
    for (let i = 0; i < currentList.length; i++) {
      const name = currentList[i].name;
      if (!name.trim()) {
        setError(`第 ${i + 1} 行名称不能为空`);
        return;
      }
      if (names.has(name)) {
        setError(`电压等级名称 "${name}" 重复`);
        return;
      }
      names.add(name);
    }
    writeVoltageLevelSettings(draft);
    onSave(draft);
    onClose();
  };

  return (
    <div className="image-picker-backdrop" onPointerDown={onClose}>
      <section className="e-device-interface-dialog" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} style={{ width: 500, display: "flex", flexDirection: "column", maxHeight: "80vh", fontSize: 12 }}>
        <div className="image-picker-title" style={{ padding: "8px 12px" }}>
          <h2 style={{ fontSize: 14, margin: 0 }}>电压等级设置</h2>
          <button type="button" aria-label="关闭" title="关闭" onClick={onClose} style={{ padding: 4 }}>
            <X size={14} />
          </button>
        </div>
        <div className="voltage-level-tabs" style={{ display: "flex", gap: 0, padding: "4px 12px", borderBottom: "1px solid #e2e8f0" }}>
          <button type="button" className={tab === "ac" ? "active" : ""} onClick={() => setTab("ac")} style={{ padding: "4px 12px", border: "none", borderBottom: tab === "ac" ? "2px solid #2563eb" : "2px solid transparent", background: "none", cursor: "pointer", fontSize: 12, fontWeight: tab === "ac" ? 600 : 400, color: tab === "ac" ? "#2563eb" : "#64748b" }}>交流</button>
          <button type="button" className={tab === "dc" ? "active" : ""} onClick={() => setTab("dc")} style={{ padding: "4px 12px", border: "none", borderBottom: tab === "dc" ? "2px solid #2563eb" : "2px solid transparent", background: "none", cursor: "pointer", fontSize: 12, fontWeight: tab === "dc" ? 600 : 400, color: tab === "dc" ? "#2563eb" : "#64748b" }}>直流</button>
        </div>
        <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "4px 8px", textAlign: "left", fontWeight: 600 }}>名称</th>
                <th style={{ padding: "4px 8px", textAlign: "left", fontWeight: 600 }}>电压等级</th>
                <th style={{ padding: "4px 8px", textAlign: "center", width: 50, fontWeight: 600 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {currentList.map((row, index) => {
                const isBuiltin = !row.isNew && builtinSet.has(row.name);
                const isModified = isBuiltin && row.vltp !== row.name;
                return (
                  <tr key={index} style={{ borderBottom: "1px solid #f1f5f9", lineHeight: 1.2 }}>
                    <td style={{ padding: "3px 8px" }}>
                      <input
                        type="text"
                        value={row.name}
                        disabled={isBuiltin}
                        onChange={(e) => updateRow(index, "name", e.target.value)}
                        style={{ width: "100%", padding: "2px 6px", border: "1px solid #cbd5e1", borderRadius: 3, background: isBuiltin ? "#f8fafc" : "#fff", fontSize: 12 }}
                      />
                    </td>
                    <td style={{ padding: "3px 8px" }}>
                      <input
                        type="text"
                        value={row.vltp}
                        onChange={(e) => updateRow(index, "vltp", e.target.value)}
                        style={{ width: "100%", padding: "2px 6px", border: "1px solid #cbd5e1", borderRadius: 3, fontSize: 12 }}
                      />
                    </td>
                    <td style={{ padding: "3px 8px", textAlign: "center" }}>
                      {isModified && (
                        <button type="button" title="还原" onClick={() => restoreRow(index)} style={{ marginRight: 2, padding: 2, border: "none", background: "none", cursor: "pointer" }}>
                          <RotateCcw size={12} />
                        </button>
                      )}
                      <button type="button" title="删除" onClick={() => removeRow(index)} style={{ padding: 2, border: "none", background: "none", cursor: "pointer", color: "#ef4444" }}>
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 12px", borderTop: "1px solid #e2e8f0", marginTop: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button type="button" onClick={addRow} style={{ padding: "3px 8px", fontSize: 12 }}>
              <Plus size={12} />
              <span>新增</span>
            </button>
            {error && <span style={{ color: "#ef4444", fontSize: 11 }}>{error}</span>}
          </div>
          <button type="button" className="primary" onClick={handleSave} disabled={!!error} style={{ padding: "3px 10px", fontSize: 12 }}>
            <Save size={12} />
            <span>保存</span>
          </button>
        </div>
      </section>
    </div>
  );
}
