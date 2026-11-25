import { Modal } from "antd";
import { Eye, EyeOff } from "lucide-react";
import {
  DEFAULT_INTERFACE_CUSTOMIZATION_CONFIG,
  interfaceCustomizationDefinitions,
  isInterfaceCustomizationVisible,
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
  const updateVisibility = (id: string, visible: boolean) => {
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

  const updateAll = (visible: boolean) => {
    const next = visible ? DEFAULT_INTERFACE_CUSTOMIZATION_CONFIG : {
      ...DEFAULT_INTERFACE_CUSTOMIZATION_CONFIG,
      buttons: Object.fromEntries(interfaceCustomizationDefinitions("button").map((item) => [item.id, false])),
      modules: Object.fromEntries(interfaceCustomizationDefinitions("module").map((item) => [item.id, false]))
    };
    onChange({
      schemaVersion: next.schemaVersion,
      buttons: { ...next.buttons },
      modules: { ...next.modules }
    });
  };

  const updateGroup = (definitions: readonly InterfaceCustomizationDefinition[], visible: boolean) => {
    const buttonIds = definitions.filter((item) => item.kind === "button").map((item) => item.id);
    const moduleIds = definitions.filter((item) => item.kind === "module").map((item) => item.id);
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

  const renderGroup = (definitions: readonly InterfaceCustomizationDefinition[]) => groupedDefinitions(definitions).map(([group, items]) => {
    const allVisible = items.every((item) => isInterfaceCustomizationVisible(config, item.id));
    const anyVisible = items.some((item) => isInterfaceCustomizationVisible(config, item.id));
    return (
    <fieldset className="interface-customization-fieldset" key={group}>
      <legend>
        <span>{group}</span>
        <span className="interface-customization-group-actions" role="group" aria-label={`${group}批量操作`}>
          <button type="button" onClick={() => updateGroup(items, true)} disabled={busy || allVisible} title={`显示全部${group}`} aria-label={`显示全部${group}`}>
            <Eye size={14}/>
          </button>
          <button type="button" onClick={() => updateGroup(items, false)} disabled={busy || !anyVisible} title={`隐藏全部${group}`} aria-label={`隐藏全部${group}`}>
            <EyeOff size={14}/>
          </button>
        </span>
      </legend>
      <div className="interface-customization-list">
        {items.map((item) => {
          const visible = isInterfaceCustomizationVisible(config, item.id);
          return (
            <label className="interface-customization-row" key={item.id}>
              <input
                type="checkbox"
                name={`interface-customization-${item.id}`}
                checked={visible}
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
          取消勾选后，对应按钮或模块会从界面中隐藏；设置会立即应用，点击“保存设置”后写入后台配置文件。
        </p>
        <div className="interface-customization-actions" role="group" aria-label="界面定制批量操作">
          <button type="button" onClick={() => updateAll(true)} disabled={busy}>全部显示</button>
          <button type="button" onClick={() => updateAll(false)} disabled={busy}>全部隐藏</button>
        </div>
        <section aria-labelledby="interface-customization-buttons-title">
          <h3 id="interface-customization-buttons-title">按钮</h3>
          {renderGroup(interfaceCustomizationDefinitions("button"))}
        </section>
        <section aria-labelledby="interface-customization-modules-title">
          <h3 id="interface-customization-modules-title">模块</h3>
          {renderGroup(interfaceCustomizationDefinitions("module"))}
        </section>
        {status && <p className="interface-customization-status" role="status">{status}</p>}
      </div>
    </Modal>
  );
}
