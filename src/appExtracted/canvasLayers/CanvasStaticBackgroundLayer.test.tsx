import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { customCanvasThemeColorsFor } from "../../canvasTheme";
import { CanvasStaticBackgroundLayer } from "./CanvasStaticBackgroundLayer";

describe("CanvasStaticBackgroundLayer custom background", () => {
  test("uses the saved custom background for the canvas rect fill", () => {
    const customBackground = "#204060";
    const scope = {
      SvgMarkupChunk: ({ markup }: { markup: string }) => createElement("g", { dangerouslySetInnerHTML: { __html: markup } }),
      canvasThemeColors: customCanvasThemeColorsFor(customBackground),
      canvasRenderBounds: { width: 800, height: 600 },
      themeMode: "custom",
      customTheme: { background: customBackground },
      canvasBackgroundColor: "",
      canvasBackgroundImageUrl: "",
      canvasBackgroundImageFit: "cover",
      svgImageContentMarkup: () => "",
      renderReadonlyBackgroundPage: () => null
    } as any;

    const markup = renderToStaticMarkup(
      createElement("svg", null, createElement(CanvasStaticBackgroundLayer, { scope, electricFlowStyleMarkup: "" }))
    );

    expect(markup).toContain(`data-theme-background="${customBackground}"`);
    expect(markup).toContain(`fill="${customBackground}"`);
  });
});
