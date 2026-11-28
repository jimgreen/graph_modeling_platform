import { describe, expect, test } from "vitest";
import { normalizeColorConfig } from "../measurementConfigNormalization.mjs";

describe("normalizeColorConfig custom theme", () => {
  test("fills the custom deep-blue theme when reading a legacy payload", () => {
    const normalized = normalizeColorConfig({
      colorDisplayMode: "voltage",
      colorPalette: { energy: { ac: "#123456" } }
    });

    expect(normalized.colorDisplayMode).toBe("voltage");
    expect(normalized.colorPalette.energy.ac).toBe("#123456");
    expect(normalized.canvasThemeMode).toBe("light");
    expect(normalized.customTheme.background).toBe("#192586");
    expect(normalized.customTheme.colorPalette.energy.ac).toBeTruthy();
  });

  test("keeps custom background and palette independent from the standard palette", () => {
    const normalized = normalizeColorConfig({
      colorDisplayMode: "energy",
      colorPalette: { energy: { ac: "#123456" } },
      canvasThemeMode: "custom",
      customTheme: {
        background: "#102a4c",
        colorPalette: { energy: { ac: "#abcdef" } }
      }
    });

    expect(normalized.canvasThemeMode).toBe("custom");
    expect(normalized.customTheme.background).toBe("#102a4c");
    expect(normalized.colorPalette.energy.ac).toBe("#123456");
    expect(normalized.customTheme.colorPalette.energy.ac).toBe("#abcdef");
  });

  test("rejects invalid custom mode/background and falls back to defaults", () => {
    const normalized = normalizeColorConfig({
      canvasThemeMode: "purple",
      customTheme: { background: "not-a-color" }
    });

    expect(normalized.canvasThemeMode).toBe("light");
    expect(normalized.customTheme.background).toBe("#192586");
  });
});
