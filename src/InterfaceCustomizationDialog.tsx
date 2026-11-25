import { useMemo } from "react";
import { Modal } from "antd";
import { Eye, EyeOff } from "lucide-react";
import {
  DEFAULT_INTERFACE_CUSTOMIZATION_CONFIG,
  buildHideAllInterfaceCustomizationConfig,
  interfaceCustomizationDefinitions,
  isInterfaceCustomizationVisible,
  isProtectedInterfaceCustomizationId,
  type InterfaceCustomizationConfig,
  type InterfaceCustomizationDefinition
} from "./interfaceCustomization";

type InterfaceCustomizationDialogProps = {
  open: boolean;
  config: InterfaceCustomizationConfig;
  busy?: boolean;
  status?: string;
  onChange: (config: InterfaceCustomizationConfig) => void;
  onSave: () => void;
  onClose: () => void;
};

function groupedDefinitions(definitions: readonly InterfaceCustomizationDefinition[]) {
  const groups = new Map<string, InterfaceCustomizationDefinition[]>();
  for (const definition of definitions) {
    const list = groups.get(definition.group) ?? [];
    list.push(definition);
    groups.set(definition.group, list);
  }
  return [...groups.entries()];
}

export function InterfaceCustomizationDialog({
  open,
  config,
  busy = false,
  status = "",
  onChange,
  onSave,
  onClose
}: InterfaceCustomizationDialogProps) {
  const buttonGroups = useMemo(() => groupedDefinitions(interfaceCustomizationDefinitions("button")), []);
  const moduleGroups = useMemo(() => groupedDefinitions(interfaceCustomizationDefinitions("module")), []);

  const updateVisibility = (id: string, visible: boolean) => {
    if (!visible && isProtectedInterfaceCustomizationId(id)) return;
    const definition = interfaceCustomizationDefinitions().find((item) => item.id === id);
    if (!definition) return;
    const key = definition.kind === "button" ? "buttons" : "modules";
    onChange({
      ...config,
      [key]: {
        ...config[key],
        [id]: visible
      }
    });
  };

  const applyAll = (visible: boolean) => {
    const next = visible ? DEFAULT_INTERFACE_CUSTOMIZATION_CONFIG : buildHideAllInterfaceCustomizationConfig();
    onChange({
      schemaVersion: next.schemaVersion,
      buttons: { ...next.buttons },
      modules: { ...next.modules }
    });
  };

  const requestHideAll = () => {
    Modal.confirm({
      title: "隐藏全部界面元素？",
      content: "将隐藏除“界面定制设置入口”外的全部按钮与模块，关闭未保存将自动恢复。",
      okText: "隐藏全部",
      cancelText: "取消",
      okButtonProps: { danger: true },
      autoFocusButton: "cancel",
      onOk: () => applyAll(false)
    });
  };

  const updateGroup = (definitions: readonly InterfaceCustomizationDefinition[], visible: boolean) => {
    const actionable = visible
      ? definitions
      : definitions.filter((item) => !isProtectedInterfaceCustomizationId(item.id));
    const buttonIds = actionable.filter((item) => item.kind === "button").map((item) => item.id);
    const moduleIds = actionable.filter((item) => item.kind === "module").map((item) => item.id);
    onChange({
      ...config,
      buttons: {
        ...config.buttons,
        ...Object.fromEntries(buttonIds.map((id) => [id, visible]))
      },
      modules: {
        ...config.modules,
        ...Object.fromEntries(moduleIds.map((id) => [id, visible]))
      }
    });
  };

  const renderGroups = (groups: readonly [string, InterfaceCustomizationDefinition[]][]) => groups.map(([group, items]) => {
    const toggleable = items.filter((item) => !isProtectedInterfaceCustomizationId(item.id));
    const allVisible = items.every((item) => isInterfaceCustomizationVisible(config, item.id));
    const anyHideableVisible = toggleable.some((item) => isInterfaceCustomizationVisible(config, item.id));
    return (
    <fieldset className="interface-customization-fieldset" key={group}>
      <legend>
        <span>{group}</span>
        <span className="interface-customization-group-actions" role="group" aria-label={`${group}批量操作`}>
          <button type="button" onClick={() => updateGroup(items, true)} disabled={busy || allVisible} title={`显示全部${group}`} aria-label={`显示全部${group}`}>
            <Eye size={14}/>
          </button>
          <button type="button" onClick={() => updateGroup(items, false)} disabled={busy || !anyHideableVisible} title={`隐藏全部${group}`} aria-label={`隐藏全部${group}`}>
            <EyeOff size={14}/>
          </button>
        </span>
      </legend>
      <div className="interface-customization-list">
        {items.map((item) => {
          const protectedItem = isProtectedInterfaceCustomizationId(item.id);
          const visible = protectedItem ? true : isInterfaceCustomizationVisible(config, item.id);
          return (
            <label className="interface-customization-row" key={item.id} title={protectedItem ? "受保护入口，防止隐藏后无法恢复" : undefined}>
              <input
                type="checkbox"
                name={`interface-customization-${item.id}`}
                checked={visible}
                disabled={busy || protectedItem}
                onChange={(event) => updateVisibility(item.id, event.target.checked)}
              />
              <span>{item.label}</span>
              <code>{item.id}</code>
            </label>
          );
        })}
      </div>
    </fieldset>
    );
  });

  return (
    <Modal
      open={open}
      title="界面定制设置"
      okText="保存设置"
      cancelText="关闭"
      width={720}
      confirmLoading={busy}
      destroyOnHidden
      onOk={onSave}
      onCancel={onClose}
    >
      <div className="interface-customization-dialog">
        <p className="interface-customization-intro">
          勾选即时预览；点击“保存设置”写入后台，直接关闭将恢复未保存修改。
        </p>
        <div className="interface-customization-actions" role="group" aria-label="界面定制批量操作">
          <button type="button" onClick={() => applyAll(true)} disabled={busy}>恢复默认（全部显示）</button>
          <button type="button" onClick={requestHideAll} disabled={busy}>全部隐藏</button>
        </div>
        <section aria-labelledby="interface-customization-buttons-title">
          <h3 id="interface-customization-buttons-title">按钮</h3>
          {renderGroups(buttonGroups)}
        </section>
        <section aria-labelledby="interface-customization-modules-title">
          <h3 id="interface-customization-modules-title">模块</h3>
          {renderGroups(moduleGroups)}
        </section>
        {status && <p className="interface-customization-status" role="status">{status}</p>}
      </div>
    </Modal>
  );
}
