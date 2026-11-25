/**
 * CommandPaletteDialog - 全局快捷命令面板（Ctrl+K）与快捷键速查（?）
 *
 * 按需懒加载组件，采用高密度紧凑布局与全键盘导航（↑ / ↓ / Enter / Esc），
 * 自适应平台浅色 / 深色主题变量。
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildCommandPaletteItems,
  filterCommandPaletteItems,
  KEYBOARD_SHORTCUT_GROUPS,
  type CommandPaletteCategory,
  type CommandPaletteItem
} from "../commandPalette";
import {
  closeCommandPalette,
  setCommandPaletteTab,
  type CommandPaletteTab
} from "../commandPaletteStore";

const CATEGORY_TABS: ReadonlyArray<{ id: CommandPaletteCategory; label: string }> = [
  { id: "all", label: "全部" },
  { id: "command", label: "命令" },
  { id: "node", label: "画布图元" },
  { id: "model", label: "模型" },
  { id: "template", label: "图元库" }
];

const CATEGORY_BADGE_LABEL: Record<CommandPaletteItem["category"], string> = {
  command: "命令",
  node: "图元",
  model: "模型",
  template: "库"
};

export interface CommandPaletteDialogProps {
  scope: Record<string, any>;
  tab: CommandPaletteTab;
}

export default function CommandPaletteDialog({ scope, tab }: CommandPaletteDialogProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CommandPaletteCategory>("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const allItems = useMemo(() => buildCommandPaletteItems(scope), [scope]);
  const filteredItems = useMemo(
    () => filterCommandPaletteItems(allItems, query, category),
    [allItems, query, category]
  );

  // 打开或切回检索页时自动聚焦输入框
  useEffect(() => {
    if (tab === "search") {
      inputRef.current?.focus();
    }
  }, [tab]);

  // 结果变化时将高亮项夹紧到有效范围
  useEffect(() => {
    setActiveIndex(0);
  }, [query, category, tab]);

  // 键盘移动时自动滚入可视区域
  useEffect(() => {
    const activeEl = listRef.current?.querySelector<HTMLElement>(`[data-palette-index="${activeIndex}"]`);
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const runItem = (item: CommandPaletteItem | undefined) => {
    if (!item || item.disabled) {
      return;
    }
    closeCommandPalette();
    item.execute(scope);
  };

  return (
    <div
      className="command-palette-backdrop"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          closeCommandPalette();
        }
      }}
    >
      <section
        className="command-palette-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={tab === "shortcuts" ? "快捷键速查" : "全局快捷命令面板"}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            closeCommandPalette();
            return;
          }
          if (tab !== "search") {
            return;
          }
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActiveIndex((cur) => (filteredItems.length > 0 ? (cur + 1) % filteredItems.length : 0));
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((cur) =>
              filteredItems.length > 0 ? (cur - 1 + filteredItems.length) % filteredItems.length : 0
            );
          } else if (event.key === "Enter") {
            event.preventDefault();
            runItem(filteredItems[activeIndex]);
          }
        }}
      >
        <header className="command-palette-header">
          <div className="command-palette-mode-switch" role="tablist" aria-label="面板模式">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "search"}
              className={tab === "search" ? "active" : ""}
              onClick={() => setCommandPaletteTab("search")}
            >
              快捷检索
              <kbd>Ctrl+K</kbd>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "shortcuts"}
              className={tab === "shortcuts" ? "active" : ""}
              onClick={() => setCommandPaletteTab("shortcuts")}
            >
              快捷键速查
              <kbd>?</kbd>
            </button>
          </div>
          <button
            type="button"
            className="command-palette-close"
            aria-label="关闭"
            onClick={closeCommandPalette}
          >
            Esc
          </button>
        </header>

        {tab === "search" ? (
          <>
            <div className="command-palette-search-bar">
              <input
                ref={inputRef}
                type="text"
                className="command-palette-input"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="输入命令、画布设备名/ID、模型名或图元模板…"
                aria-label="搜索命令、图元或模型"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="command-palette-categories" role="tablist" aria-label="结果分类">
              {CATEGORY_TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={category === item.id}
                  className={category === item.id ? "active" : ""}
                  onClick={() => setCategory(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="command-palette-list" ref={listRef} role="listbox" aria-label="匹配结果">
              {filteredItems.length === 0 ? (
                <div className="command-palette-empty">无匹配项</div>
              ) : (
                filteredItems.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    data-palette-index={index}
                    disabled={item.disabled}
                    className={`command-palette-item ${index === activeIndex ? "active" : ""} ${
                      item.disabled ? "disabled" : ""
                    }`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => runItem(item)}
                  >
                    <span className={`command-palette-badge badge-${item.category}`}>
                      {CATEGORY_BADGE_LABEL[item.category]}
                    </span>
                    <span className="command-palette-item-main">
                      <span className="command-palette-item-title">{item.title}</span>
                      {item.subtitle && <span className="command-palette-item-sub">{item.subtitle}</span>}
                    </span>
                    {item.shortcut && <kbd className="command-palette-shortcut">{item.shortcut}</kbd>}
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="command-palette-shortcuts-grid">
            {KEYBOARD_SHORTCUT_GROUPS.map((group) => (
              <section key={group.id} className="command-palette-shortcut-group">
                <h3>{group.title}</h3>
                <ul>
                  {group.items.map((entry) => (
                    <li key={`${group.id}:${entry.label}`}>
                      <span className="shortcut-label">{entry.label}</span>
                      <span className="shortcut-keys">
                        {entry.keys.map((k, idx) => (
                          <kbd key={`${k}-${idx}`}>{k}</kbd>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
