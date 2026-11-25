/**
 * 全局快捷命令面板（Ctrl+K）与快捷键速查（?）外部状态存储
 *
 * 采用 useSyncExternalStore 隔离于 App.tsx 顶层状态：
 * 打开、关闭或切换面板标签时仅重渲染 CommandPaletteHost，0 次触发主画布与面板树重渲染。
 */
import { useSyncExternalStore } from "react";

export type CommandPaletteTab = "search" | "shortcuts";

export interface CommandPaletteState {
  open: boolean;
  tab: CommandPaletteTab;
}

type Listener = () => void;

const listeners = new Set<Listener>();
let state: CommandPaletteState = {
  open: false,
  tab: "search"
};

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export function getCommandPaletteState(): CommandPaletteState {
  return state;
}

export function openCommandPalette(tab: CommandPaletteTab = "search") {
  if (state.open && state.tab === tab) {
    return;
  }
  state = { open: true, tab };
  emitChange();
}

export function toggleCommandPalette(tab: CommandPaletteTab = "search") {
  if (state.open && state.tab === tab) {
    state = { open: false, tab };
  } else {
    state = { open: true, tab };
  }
  emitChange();
}

export function setCommandPaletteTab(tab: CommandPaletteTab) {
  if (state.tab === tab) {
    return;
  }
  state = { ...state, tab };
  emitChange();
}

export function closeCommandPalette() {
  if (!state.open) {
    return;
  }
  state = { ...state, open: false };
  emitChange();
}

export function subscribeCommandPalette(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useCommandPaletteState(): CommandPaletteState {
  return useSyncExternalStore(
    subscribeCommandPalette,
    getCommandPaletteState,
    getCommandPaletteState
  );
}
