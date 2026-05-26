import { describe, expect, test } from "vitest";

async function readStyles() {
  // @ts-ignore - tests run in Node, while the app tsconfig intentionally stays browser-focused.
  const { readFile } = await import("node:fs/promises");
  return readFile(new URL("./styles.css", import.meta.url), "utf8") as Promise<string>;
}

function hasCursorRule(styles: string, selector: string, cursor: string) {
  return styles.split("}").some((block) => {
    const [selectorText, body] = block.split("{");
    if (!selectorText || !body) {
      return false;
    }
    const selectors = selectorText.split(",").map((item) => item.trim());
    return selectors.includes(selector) && new RegExp(`cursor:\\s*${cursor}\\s*;`).test(body);
  });
}

describe("cursor styles", () => {
  test("uses the animated light-dot indicator instead of a hand cursor when a connection can be dropped", async () => {
    const styles = await readStyles();
    expect(hasCursorRule(styles, ".diagram-canvas.connect-drop-ready", "none")).toBe(true);
    expect(hasCursorRule(styles, ".diagram-canvas.connect-drop-ready .diagram-node", "none")).toBe(true);
    expect(hasCursorRule(styles, ".diagram-canvas.connect-drop-ready .node-hitbox", "none")).toBe(true);
  });
});
