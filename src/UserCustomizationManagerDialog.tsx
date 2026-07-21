import { useEffect, useMemo, useState } from "react";
import {
  Download,
  FileInput,
  RotateCcw,
  Search,
  X
} from "lucide-react";
import type {
  UserCustomizationChangeType,
  UserCustomizationDomain,
  UserCustomizationImportMode,
  UserCustomizationImportPreview,
  UserCustomizationInventory,
  UserCustomizationSnapshot
} from "./userCustomizations";

export type PendingUserCustomizationImportView = {
  fileName: string;
  imported: Partial<UserCustomizationSnapshot>;
  mode: UserCustomizationImportMode;
  preview: UserCustomizationImportPreview;
};

export type UserCustomizationManagerDialogProps = {
  open: boolean;
  inventory: UserCustomizationInventory;
  activeDomain: UserCustomizationDomain;
  busy: boolean;
  status: string;
  pendingImport: PendingUserCustomizationImportView | null;
  onClose: () => void;
  onDomainChange: (domain: UserCustomizationDomain) => void;
  onExport: () => void | Promise<unknown>;
  onChooseImport: () => void;
  onImportModeChange: (mode: UserCustomizationImportMode) => void | Promise<unknown>;
  onConfirmImport: () => void | Promise<unknown>;
  onCancelImport: () => void;
  onRestore: (itemKeys: readonly string[]) => void | Promise<unknown>;
};

export const USER_CUSTOMIZATION_DOMAIN_OPTIONS: Array<{
  value: UserCustomizationDomain;
  label: string;
}> = [
  { value: "category-libraries", label: "自定义类别库" },
  { value: "component-libraries", label: "自定义元件库" },
  { value: "custom-devices", label: "自定义元件" },
  { value: "device-definition-overrides", label: "内置元件定义覆盖" },
  { value: "parameter-definitions", label: "参数定义" },
  { value: "measurement-definitions", label: "量测定义" },
  { value: "e-interface-definitions", label: "E 文件接口定义" },
  { value: "graph-templates", label: "自定义模板" },
  { value: "user-assets", label: "用户图标与图片" },
  { value: "color-settings", label: "配色设置" }
];

const CHANGE_TYPE_LABELS: Record<UserCustomizationChangeType, string> = {
  added: "新增",
  modified: "修改",
  protected: "依赖保留"
};

const normalizedSearchText = (value: unknown) => String(value ?? "").trim().toLocaleLowerCase();

function ImportPreviewPanel(props: {
  pending: PendingUserCustomizationImportView;
  busy: boolean;
  onModeChange: (mode: UserCustomizationImportMode) => void | Promise<unknown>;
  onConfirm: () => void | Promise<unknown>;
  onCancel: () => void;
}) {
  const { pending } = props;
  return (
    <div className="user-customization-import-shade">
      <section className="user-customization-import-preview" role="dialog" aria-modal="true" aria-label="导入预览">
        <header>
          <div>
            <h3>导入预览</h3>
            <p title={pending.fileName}>{pending.fileName}</p>
          </div>
          <button type="button" className="icon-button" onClick={props.onCancel} disabled={props.busy} aria-label="关闭导入预览" title="关闭">
            <X size={16} />
          </button>
        </header>
        <div className="user-customization-import-modes" role="radiogroup" aria-label="导入方式">
          <label className={pending.mode === "replace" ? "active" : ""}>
            <input
              type="radio"
              name="user-customization-import-mode"
              checked={pending.mode === "replace"}
              onChange={() => void props.onModeChange("replace")}
              disabled={props.busy}
            />
            <span><strong>整体替换</strong><small>以导入文件完整替换其中包含的自定义数据域</small></span>
          </label>
          <label className={pending.mode === "incremental" ? "active" : ""}>
            <input
              type="radio"
              name="user-customization-import-mode"
              checked={pending.mode === "incremental"}
              onChange={() => void props.onModeChange("incremental")}
              disabled={props.busy}
            />
            <span><strong>增量更新</strong><small>保留本地独有项目，同 ID 或同名冲突由导入内容覆盖</small></span>
          </label>
        </div>
        <div className="user-customization-import-counts">
          <span>新增 <strong>{pending.preview.additions}</strong></span>
          <span>更新或删除 <strong>{pending.preview.updates}</strong></span>
          <span>保持不变 <strong>{pending.preview.unchanged}</strong></span>
          <span>冲突 <strong>{pending.preview.conflicts.length}</strong></span>
        </div>
        <div className="user-customization-conflicts">
          {pending.preview.conflicts.length > 0 ? (
            <table>
              <thead><tr><th>分类</th><th>名称</th><th>本地 ID</th><th>导入 ID</th></tr></thead>
              <tbody>
                {pending.preview.conflicts.map((conflict, index) => (
                  <tr key={`${conflict.domain}-${conflict.localId}-${conflict.importedId}-${index}`}>
                    <td>{USER_CUSTOMIZATION_DOMAIN_OPTIONS.find((item) => item.value === conflict.domain)?.label ?? conflict.domain}</td>
                    <td>{conflict.name}</td>
                    <td><code>{conflict.localId}</code></td>
                    <td><code>{conflict.importedId}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="user-customization-empty">未发现同名不同 ID 冲突。</p>
          )}
        </div>
        <footer>
          <span>执行前会自动导出当前全部自定义内容作为备份。</span>
          <div>
            <button type="button" onClick={props.onCancel} disabled={props.busy}>取消</button>
            <button type="button" className="primary" onClick={() => void props.onConfirm()} disabled={props.busy}>确认导入</button>
          </div>
        </footer>
      </section>
    </div>
  );
}

export function UserCustomizationManagerDialog(props: UserCustomizationManagerDialogProps) {
  const [query, setQuery] = useState("");
  const [changeFilter, setChangeFilter] = useState<"all" | UserCustomizationChangeType>("all");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  useEffect(() => {
    setSelectedKeys([]);
    setQuery("");
    setChangeFilter("all");
  }, [props.activeDomain, props.open]);

  const visibleItems = useMemo(() => {
    const needle = normalizedSearchText(query);
    return props.inventory.items.filter((item) => (
      item.domain === props.activeDomain &&
      (changeFilter === "all" || item.changeType === changeFilter) &&
      (!needle || normalizedSearchText(`${item.name} ${item.owner} ${item.summary} ${item.itemId}`).includes(needle))
    ));
  }, [changeFilter, props.activeDomain, props.inventory.items, query]);

  if (!props.open) {
    return null;
  }

  const restorableVisibleKeys = visibleItems.filter((item) => !item.protected).map((item) => item.key);
  const restorableDomainKeys = props.inventory.items
    .filter((item) => item.domain === props.activeDomain && !item.protected)
    .map((item) => item.key);
  const restorableAllKeys = props.inventory.items.filter((item) => !item.protected).map((item) => item.key);
  const selectedRestorableKeys = selectedKeys.filter((key) => restorableAllKeys.includes(key));
  const allVisibleSelected = restorableVisibleKeys.length > 0 && restorableVisibleKeys.every((key) => selectedKeys.includes(key));
  const activeDomainLabel = USER_CUSTOMIZATION_DOMAIN_OPTIONS.find((item) => item.value === props.activeDomain)?.label ?? props.activeDomain;
  const toggleKey = (key: string) => setSelectedKeys((current) => (
    current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
  ));
  const toggleVisible = () => setSelectedKeys((current) => {
    if (allVisibleSelected) {
      return current.filter((key) => !restorableVisibleKeys.includes(key));
    }
    return [...new Set([...current, ...restorableVisibleKeys])];
  });

  return (
    <div className="modal-backdrop user-customization-backdrop" role="presentation">
      <section className="user-customization-dialog" role="dialog" aria-modal="true" aria-label="用户自定义管理">
        <header className="user-customization-header">
          <div>
            <h2>用户自定义管理</h2>
            <p>显示当前相对于程序内置默认值仍然生效的自定义内容</p>
          </div>
          <div className="user-customization-actions">
            <button type="button" onClick={() => void props.onExport()} disabled={props.busy}>
              <Download size={15} aria-hidden="true" /><span>导出全部</span>
            </button>
            <button type="button" className="primary" onClick={props.onChooseImport} disabled={props.busy}>
              <FileInput size={15} aria-hidden="true" /><span>导入配置</span>
            </button>
            <button type="button" className="icon-button" onClick={props.onClose} disabled={props.busy} aria-label="关闭用户自定义管理" title="关闭">
              <X size={17} />
            </button>
          </div>
        </header>

        <div className="user-customization-summary">
          <span><small>自定义项目</small><strong>{props.inventory.summary.total}</strong></span>
          <span><small>新增</small><strong>{props.inventory.summary.added}</strong></span>
          <span><small>修改</small><strong>{props.inventory.summary.modified}</strong></span>
          <span><small>用户资源</small><strong>{props.inventory.summary.assets}</strong></span>
        </div>

        <div className="user-customization-main">
          <aside className="user-customization-tree" aria-label="用户自定义分类">
            {USER_CUSTOMIZATION_DOMAIN_OPTIONS.map((domain) => (
              <button
                type="button"
                key={domain.value}
                className={props.activeDomain === domain.value ? "active" : ""}
                onClick={() => props.onDomainChange(domain.value)}
              >
                <span>{domain.label}</span>
                <strong>{props.inventory.countsByDomain[domain.value]}</strong>
              </button>
            ))}
          </aside>

          <main className="user-customization-detail">
            <div className="user-customization-detail-heading">
              <div><h3>{activeDomainLabel}</h3><p>共 {props.inventory.countsByDomain[props.activeDomain]} 项当前有效变更</p></div>
              <div className="user-customization-filter">
                <label><Search size={15} aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索当前分类" /></label>
                <select value={changeFilter} onChange={(event) => setChangeFilter(event.target.value as typeof changeFilter)} aria-label="筛选变更类型">
                  <option value="all">全部变更</option>
                  <option value="added">新增</option>
                  <option value="modified">修改</option>
                  <option value="protected">依赖保留</option>
                </select>
              </div>
            </div>

            <div className="user-customization-table-wrap">
              <table className="user-customization-table">
                <thead>
                  <tr>
                    <th className="selection-column"><input type="checkbox" checked={allVisibleSelected} disabled={restorableVisibleKeys.length === 0 || props.busy} onChange={toggleVisible} aria-label="选择当前列表全部可恢复项目" /></th>
                    <th>项目</th><th>归属</th><th>类型</th><th>变更摘要</th><th className="operation-column">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleItems.length > 0 ? visibleItems.map((item) => (
                    <tr key={item.key} className={item.protected ? "protected" : ""}>
                      <td className="selection-column"><input type="checkbox" disabled={item.protected || props.busy} checked={selectedKeys.includes(item.key)} onChange={() => toggleKey(item.key)} aria-label={`选择${item.name}`} /></td>
                      <td><strong>{item.name}</strong><code>{item.itemId}</code></td>
                      <td>{item.owner}</td>
                      <td><span className={`change-tag ${item.changeType}`}>{CHANGE_TYPE_LABELS[item.changeType]}</span></td>
                      <td>{item.summary}</td>
                      <td className="operation-column">
                        <button type="button" className="icon-button" disabled={item.protected || props.busy} onClick={() => void props.onRestore([item.key])} aria-label={`恢复${item.name}`} title={item.protected ? "该资源仍被模型引用" : "恢复该项"}>
                          <RotateCcw size={15} />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6}><p className="user-customization-empty">当前分类没有符合条件的自定义内容。</p></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </main>
        </div>

        <footer className="user-customization-footer">
          <span>{props.status || "恢复操作不会删除模型画布中已经绘制的设备、线路或量测实例。"}</span>
          <div>
            <button type="button" disabled={props.busy || selectedRestorableKeys.length === 0} onClick={() => void props.onRestore(selectedRestorableKeys)}>
              <RotateCcw size={15} aria-hidden="true" />恢复所选
            </button>
            <button type="button" disabled={props.busy || restorableDomainKeys.length === 0} onClick={() => void props.onRestore(restorableDomainKeys)}>恢复当前分类</button>
            <button type="button" className="danger" disabled={props.busy || restorableAllKeys.length === 0} onClick={() => void props.onRestore(restorableAllKeys)}>恢复全部默认</button>
          </div>
        </footer>

        {props.busy && <div className="user-customization-busy" role="status"><span />正在处理，请稍候...</div>}
        {props.pendingImport && (
          <ImportPreviewPanel
            pending={props.pendingImport}
            busy={props.busy}
            onModeChange={props.onImportModeChange}
            onConfirm={props.onConfirmImport}
            onCancel={props.onCancelImport}
          />
        )}
      </section>
    </div>
  );
}
