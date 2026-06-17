// @ts-nocheck

import * as ReactScope from "react";
import * as ReactDomScope from "react-dom";
import * as LucideReactScope from "lucide-react";
import * as ModelScope from "../model";
import * as KeyboardShortcutsScope from "../keyboardShortcuts";
import * as GraphStoreScope from "../graphStore";
import * as RouteStoreScope from "../routeStore";
import * as SelectionActionsScope from "../selectionActions";
import * as CanvasViewportScope from "../canvasViewport";
import * as SidePanelVisibilityScope from "../sidePanelVisibility";
import * as MeasurementsScope from "../measurements";
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
