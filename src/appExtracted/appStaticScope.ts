// @ts-nocheck

import * as ReactScope from "react";
import * as ReactDomScope from "react-dom";
// 仅显式引入 src 实际用到的 lucide 图标（替代 import * 全量命名空间），恢复 tree-shaking。
// 列表由 scripts/list-used-lucide-icons.mjs 扫描 src 生成（整词匹配、宁多勿漏）。
import {
  AlignCenter, AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical,
  AlignHorizontalDistributeCenter, AlignStartHorizontal, AlignStartVertical, AlignVerticalDistributeCenter,
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Bell, Bold, BoxSelect, Bus, Cable, ChevronDown, ChevronRight,
  ChevronsDown, ChevronsUp, CircleDot, Copy, Delete, Dot, Download, Eye, EyeOff, File, FileInput, FileJson,
  FlipHorizontal, FlipVertical, FolderOpen, Frame, Grid2X2, Group, Icon, Italic, Layers, Layers2, LocateFixed,
  Map, MapIcon, Maximize2, Minus, MousePointer2, Paintbrush, Palette, PanelLeftOpen, PanelRightOpen, Pencil,
  Pin, Plus, Pointer, RotateCcw, RotateCw, Route, Save, ScanSearch, Scissors, Search, Shrink, Sparkles, Terminal,
  Text, Trash2, Type, Underline, Undo2, Ungroup, X, Zap, ZapOff
} from "lucide-react";

const LucideReactScope = {
  AlignCenter, AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical,
  AlignHorizontalDistributeCenter, AlignStartHorizontal, AlignStartVertical, AlignVerticalDistributeCenter,
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Bell, Bold, BoxSelect, Bus, Cable, ChevronDown, ChevronRight,
  ChevronsDown, ChevronsUp, CircleDot, Copy, Delete, Dot, Download, Eye, EyeOff, File, FileInput, FileJson,
  FlipHorizontal, FlipVertical, FolderOpen, Frame, Grid2X2, Group, Icon, Italic, Layers, Layers2, LocateFixed,
  Map, MapIcon, Maximize2, Minus, MousePointer2, Paintbrush, Palette, PanelLeftOpen, PanelRightOpen, Pencil,
  Pin, Plus, Pointer, RotateCcw, RotateCw, Route, Save, ScanSearch, Scissors, Search, Shrink, Sparkles, Terminal,
  Text, Trash2, Type, Underline, Undo2, Ungroup, X, Zap, ZapOff
};
import * as ModelScope from "../model";
import * as KeyboardShortcutsScope from "../keyboardShortcuts";
import * as GraphStoreScope from "../graphStore";
import * as RouteStoreScope from "../routeStore";
import * as SelectionActionsScope from "../selectionActions";
import * as CanvasViewportScope from "../canvasViewport";
import * as SidePanelVisibilityScope from "../sidePanelVisibility";
import * as MeasurementsScope from "../measurements";
import * as DefinitionInstanceSyncScope from "../definitionInstanceSync";
import * as StaticButtonComponentsScope from "../components/StaticButtonComponents";
import * as FormatUtilsScope from "../formatUtils";
import * as FileIOScope from "../fileIO";
import * as SvgUtilsScope from "../svgUtils";
import * as InputComponentsScope from "../components/InputComponents";
import * as NodeLabelUtilsScope from "../nodeLabelUtils";
import * as StaticRenderUtilsScope from "../staticRenderUtils";
import * as DeviceGlyphScope from "../DeviceGlyph";
import * as SvgExportUtilsScope from "../svgExportUtils";
import * as StateIconDrawingScope from "../stateIconDrawing";
import * as CustomDeviceUtilsScope from "../customDeviceUtils";
import * as AppCoreCanvasUtilitiesScope from "./appCoreCanvasUtilities";
import * as AppPersistenceLibraryExportScope from "./appPersistenceLibraryExport";

// Module-level bindings that extracted App factories read through __appScope.
// This restores the lexical visibility those factories had before App.tsx was split.
export const APP_STATIC_SCOPE = Object.assign(
  {},
  ReactScope,
  ReactDomScope,
  LucideReactScope,
  ModelScope,
  KeyboardShortcutsScope,
  GraphStoreScope,
  RouteStoreScope,
  SelectionActionsScope,
  CanvasViewportScope,
  SidePanelVisibilityScope,
  MeasurementsScope,
  DefinitionInstanceSyncScope,
  StaticButtonComponentsScope,
  FormatUtilsScope,
  FileIOScope,
  SvgUtilsScope,
  InputComponentsScope,
  NodeLabelUtilsScope,
  StaticRenderUtilsScope,
  DeviceGlyphScope,
  SvgExportUtilsScope,
  StateIconDrawingScope,
  CustomDeviceUtilsScope,
  AppCoreCanvasUtilitiesScope,
  AppPersistenceLibraryExportScope,
  {
    CSS: globalThis.CSS,
    ResizeObserver: globalThis.ResizeObserver,
    MapIcon: LucideReactScope.Map,
    getModelEdgeEndpointPoint: ModelScope.getEdgeEndpointPoint
  }
);
