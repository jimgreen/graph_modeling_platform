import { readFile } from "node:fs/promises";
import { describe, expect, test } from "vitest";

const packageJsonUrl = new URL("../package.json", import.meta.url);

describe("Vite config selection", () => {
  test.each(["dev:frontend", "build", "preview"])("%s explicitly loads vite.config.ts", async (scriptName) => {
    const packageJson = JSON.parse(await readFile(packageJsonUrl, "utf8"));

    expect(packageJson.scripts[scriptName]).toContain("--config vite.config.ts");
  });
});
