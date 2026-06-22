import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const rootDir = path.resolve(__dirname, "..");
const iconLibraryDir = path.join(rootDir, "public", "icon-library");

type IconManifest = {
  categories: Array<{
    id: string;
    icons: Array<{
      id: string;
      name: string;
      file: string;
      sourceName?: string;
      source?: string;
    }>;
  }>;
};

type IconCatalog = {
  libraries: Array<{ id: string }>;
};

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function semanticIconKey(value: string) {
  const tokens = String(value)
    .toLowerCase()
    .replace(/checkmark/g, "check")
    .replace(/cancel|xmark|times|^x$/g, "close")
    .replace(/dismiss/g, "close")
    .replace(/trash/g, "delete")
    .replace(/remove/g, "minus")
    .replace(/subtract/g, "minus")
    .replace(/pencil/g, "edit")
    .split(/[^a-z0-9]+/g)
    .filter((token) => token && !/^\d+$/.test(token) && !/^\d+k$/.test(token))
    .filter(
      (token) =>
        ![
          "alt",
          "big",
          "bold",
          "circle",
          "duotone",
          "filled",
          "fill",
          "light",
          "line",
          "linear",
          "o",
          "outline",
          "outlined",
          "rect",
          "rectangle",
          "regular",
          "round",
          "rounded",
          "sharp",
          "small",
          "solid",
          "square",
          "thin",
          "tone",
          "two",
        ].includes(token),
    );
  return [...new Set(tokens)].sort((a, b) => a.localeCompare(b, "en")).join("-");
}

function normalizedSvgStructure(svg: string) {
  return svg
    .replace(/<\?xml[^>]*>\s*/gi, "")
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>\s*/gi, "")
    .replace(/<desc\b[^>]*>[\s\S]*?<\/desc>\s*/gi, "")
    .replace(/<text\b[^>]*>[\s\S]*?<\/text>\s*/gi, "")
    .replace(/\bid="[^"]*"/gi, "")
    .replace(/\baria-labelledby="[^"]*"/gi, "")
    .replace(/\bcolor="[^"]*"/gi, "")
    .replace(/#[0-9a-f]{3,8}/gi, "#color")
    .replace(/\s+/g, " ")
    .trim();
}

describe("generated icon library integrity", () => {
  it("does not keep duplicate command icons with the same semantic meaning", () => {
    const manifest = readJson<IconManifest>(
      path.join(iconLibraryDir, "open-source-svg", "manifest.json"),
    );
    const commands = manifest.categories.find((category) => category.id === "ui-commands");
    expect(commands).toBeDefined();

    const duplicateKeys = new Map<string, string[]>();
    for (const icon of commands?.icons || []) {
      const key = semanticIconKey(icon.sourceName || icon.id || icon.name);
      const items = duplicateKeys.get(key) || [];
      items.push(icon.id);
      duplicateKeys.set(key, items);
    }

    const duplicates = [...duplicateKeys.entries()].filter(([, ids]) => ids.length > 1);
    expect(duplicates).toEqual([]);
  });

  it("uses distinct semantic shapes for generated Docer scene icons instead of repeated text templates", () => {
    const manifest = readJson<IconManifest>(
      path.join(iconLibraryDir, "docer-free-compatible", "manifest.json"),
    );
    for (const categoryId of ["meteorology-scada-scene", "communication-control-scene"]) {
      const category = manifest.categories.find((item) => item.id === categoryId);
      expect(category).toBeDefined();
      const structures = new Map<string, string[]>();
      for (const icon of category?.icons || []) {
        const svg = readFileSync(path.join(iconLibraryDir, "docer-free-compatible", icon.file), "utf8");
        const structure = normalizedSvgStructure(svg);
        const items = structures.get(structure) || [];
        items.push(icon.id);
        structures.set(structure, items);
      }

      const duplicates = [...structures.values()].filter((ids) => ids.length > 1);
      expect(duplicates).toEqual([]);
    }
  });

  it("does not reuse the same generated Docer shape inside one category", () => {
    const manifest = readJson<IconManifest>(
      path.join(iconLibraryDir, "docer-free-compatible", "manifest.json"),
    );

    const duplicateCategories: Array<{ categoryId: string; duplicates: string[][] }> = [];
    for (const category of manifest.categories) {
      const structures = new Map<string, string[]>();
      for (const icon of category.icons || []) {
        const svg = readFileSync(path.join(iconLibraryDir, "docer-free-compatible", icon.file), "utf8");
        const structure = normalizedSvgStructure(svg);
        const items = structures.get(structure) || [];
        items.push(icon.id);
        structures.set(structure, items);
      }

      const duplicates = [...structures.values()].filter((ids) => ids.length > 1);
      if (duplicates.length > 0) {
        duplicateCategories.push({ categoryId: category.id, duplicates });
      }
    }

    expect(duplicateCategories).toEqual([]);
  });

  it("does not keep open-source icons that only match categories through substring fragments", () => {
    const manifest = readJson<IconManifest>(
      path.join(iconLibraryDir, "open-source-svg", "manifest.json"),
    );
    const falsePositiveExamples = new Map([
      ["power-electronics", ["backward", "fast-backward", "idcard", "rollback"]],
      ["weather-environment", ["fairness", "training", "pushchair", "hair-cross"]],
      ["cooling-heating-energy", ["price", "choices", "dns-services"]],
      ["consumption-link", ["chevron100", "chevron200", "backspace-reverse"]],
      ["ui-commands", ["copyright", "fingerprint", "paddleboarding"]],
    ]);

    const remainingFalsePositives: Array<{ categoryId: string; sourceName: string }> = [];
    for (const category of manifest.categories) {
      const deniedNames = falsePositiveExamples.get(category.id);
      if (!deniedNames) {
        continue;
      }
      const deniedSet = new Set(deniedNames);
      for (const icon of category.icons || []) {
        const sourceName = icon.sourceName || icon.id || icon.name;
        if (deniedSet.has(sourceName)) {
          remainingFalsePositives.push({ categoryId: category.id, sourceName });
        }
      }
    }

    expect(remainingFalsePositives).toEqual([]);
  });

  it("does not keep generic UI or transport icons in energy and weather business categories", () => {
    const wrongDomainRules = new Map<string, RegExp[]>([
      [
        "weather-environment",
        [
          /air[-_ ]?traffic/i,
          /air[-_ ]?balloon/i,
          /air[-_ ]?horn/i,
          /hot[-_ ]?air[-_ ]?balloon/i,
          /snowboard/i,
          /snowmobile/i,
          /snowshoe/i,
          /t[-_ ]?shirt[-_ ]?air/i,
        ],
      ],
      [
        "power-electronics",
        [
          /^filter($|[-_ ])/i,
          /^filter[-_ ]?(cog|confirm|dollar|drama|frames|hdr|left|none|off|reset|right|settings|up|vintage|x)$/i,
        ],
      ],
      ["power-grid-electrical", [/^arrow[-_ ]/i]],
      ["generation-link", [/[-_ ]arrow[-_ ]/i]],
      ["distribution-link", [/^arrow[-_ ]/i, /[-_ ]arrow[-_ ]/i, /^chevron[-_ ]/i, /^keyboard[-_ ]/i]],
      ["substation-link", [/^keyboard[-_ ]/i]],
      ["transmission-link", [/^arrow[-_ ]/i, /[-_ ]arrow[-_ ]/i]],
    ]);

    const violations: Array<{ libraryId: string; categoryId: string; sourceName: string }> = [];
    for (const libraryId of ["open-source-svg", "office-fluent-compatible"]) {
      const manifest = readJson<IconManifest>(
        path.join(iconLibraryDir, libraryId, "manifest.json"),
      );
      for (const category of manifest.categories) {
        const rules = wrongDomainRules.get(category.id);
        if (!rules) {
          continue;
        }
        for (const icon of category.icons || []) {
          const sourceName = icon.sourceName || icon.id || icon.name;
          if (rules.some((rule) => rule.test(sourceName))) {
            violations.push({ libraryId, categoryId: category.id, sourceName });
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("does not keep high-confidence wrong-domain icons in any generated icon library", () => {
    const wrongDomainRules = new Map<string, RegExp[]>([
      ["weather-environment", [/air[-_ ]?(traffic|balloon|horn)/i, /balloon[-_ ]?hot[-_ ]?air/i]],
      ["meteorology-environment", [/air[-_ ]?(traffic|balloon|horn)/i, /balloon[-_ ]?hot[-_ ]?air/i]],
      [
        "power-grid-electrical",
        [
          /^nintendo[-_ ]?switch$/i,
          /auto[-_ ]?transmission/i,
          /eiffel[-_ ]?tower/i,
          /(beijing|berlin|dallas|osaka|paris|shanghai|stuttgart)[-_ ].*tower/i,
          /(broadcast|cell|communications|computer|control|desktop|radio|signal)[-_ ]tower/i,
          /tower[-_ ](beach|broadcast|cell|control|no[-_ ]?access|observation)/i,
          /observation[-_ ]tower/i,
          /(bus|truck|razor)[-_ ]electric/i,
          /(electric[-_ ])?(bike|moped|rickshaw|scooter)/i,
          /brain[-_ ]electricity/i,
          /city[-_ ]?switch/i,
          /dance[-_ ]?pole/i,
          /domain[-_ ]?switch/i,
          /letter[-_ ]?switch/i,
          /sign[-_ ]?pole/i,
          /switch[-_ ]?(access|account|left|vertical)/i,
          /transmission[-_ ]?lte/i,
          /frost[-_ ]?tower/i,
        ],
      ],
      ["generation-link", [/blood[-_ ]?pressure/i]],
      [
        "transmission-link",
        [
          /road/i,
          /location[-_ ]?heart/i,
          /location[-_ ]?marina/i,
          /drone[-_ ]?delivery/i,
          /(beijing|berlin|dallas|osaka|paris|shanghai|stuttgart)[-_ ].*tower/i,
          /source[-_ ]?branch/i,
          /star[-_ ]?line/i,
          /edit[-_ ]?line/i,
          /line[-_ ]?horizontal/i,
          /network[-_ ]?adapter/i,
          /auto[-_ ]?transmission/i,
          /frost[-_ ]?tower/i,
          /(broadcast|cell|communications|computer|control|desktop|radio|signal)[-_ ]tower/i,
          /tower[-_ ](broadcast|cell|control)/i,
          /transmission[-_ ]?lte/i,
        ],
      ],
      [
        "substation-link",
        [
          /account[-_ ]?settings/i,
          /airplane[-_ ]?settings/i,
          /movie[-_ ].*settings/i,
          /settings[-_ ]?voice/i,
          /^nintendo[-_ ]?switch$/i,
          /fraud/i,
          /panel[-_ ]?(bottom|left|right|top)/i,
          /panel[-_ ]?(expansion|open)/i,
          /side[-_ ]?panel/i,
          /source[-_ ]?control/i,
          /pest[-_ ]?control/i,
          /devops/i,
          /kubernetes/i,
          /settings/i,
          /switch[-_ ]?(access|account|left)/i,
          /air[-_ ]?traffic[-_ ]?control/i,
        ],
      ],
      [
        "distribution-link",
        [
          /home[-_ ]?repair[-_ ]?service/i,
          /medicine[-_ ]?box/i,
          /bounding[-_ ]?box/i,
          /heart[-_ ]?box/i,
          /box\d*[-_ ]?heart/i,
        ],
      ],
      ["consumption-link", [/f1[-_ ]?pit/i, /food[-_ ]?journey/i, /financial[-_ ]?customer/i, /sign[-_ ]?stop/i]],
      [
        "thermal-heating",
        [
          /hot[-_ ]?dog/i,
          /food[-_ ]?hot[-_ ]?dog/i,
          /cup[-_ ]?hot/i,
          /bowl[-_ ]?hot/i,
          /build[-_ ]?and[-_ ]?deploy[-_ ]?pipeline/i,
          /devops/i,
          /cicd/i,
        ],
      ],
      [
        "hydrogen-storage",
        [
          /blood[-_ ]?cells?/i,
          /cancer/i,
          /cell[-_ ]?signal/i,
          /container[-_ ]?microservices/i,
          /block[-_ ]?storage/i,
          /deploying[-_ ]?containers/i,
          /diving/i,
          /flash[-_ ]?storage/i,
          /hyper[-_ ]?protect[-_ ]?containers/i,
          /ibm[-_ ].*containers?/i,
          /ibm[-_ ].*storage/i,
          /managing[-_ ]?containers/i,
          /object[-_ ]?storage/i,
          /offline[-_ ]?storage/i,
          /storage[-_ ]?(domain|pool|product|request|systems)/i,
          /virtual[-_ ]?storage/i,
          /scuba/i,
          /sd[-_ ]?storage/i,
          /shirt[-_ ]?tank/i,
          /tape[-_ ]?storage/i,
        ],
      ],
      [
        "new-energy-equipment",
        [
          /block[-_ ]?storage/i,
          /flash[-_ ]?storage/i,
          /ibm[-_ ].*storage/i,
          /object[-_ ]?storage/i,
          /offline[-_ ]?storage/i,
          /sd[-_ ]?storage/i,
          /storage[-_ ]?(domain|pool|product|request|systems)/i,
          /tape[-_ ]?storage/i,
          /virtual[-_ ]?storage/i,
        ],
      ],
      ["cooling-heating-energy", [/ice[-_ ]?cream/i]],
      ["gas-energy", [/blood[-_ ]?pressure/i, /diving/i, /scuba/i, /shirt[-_ ]?tank/i]],
      [
        "power-electronics",
        [
          /washington[-_ ]?dc/i,
          /global[-_ ]?filters?/i,
          /(account|airplane|calendar|keyboard|movie)[-_ ].*(filter|settings)/i,
          /ac[-_ ]?unit/i,
          /air[-_ ]?traffic[-_ ]?control/i,
          /bed[-_ ]?pulse/i,
          /electronics[-_ ]?store/i,
          /game[-_ ]?controller/i,
          /handheld[-_ ]?controller/i,
          /heart[-_ ]?pulse/i,
          /missing[-_ ]?controller/i,
          /pulse[-_ ]?oximeter/i,
          /^dc$/i,
          /settings[-_ ]?(power|voice)/i,
          /power[-_ ]?settings/i,
          /stadia[-_ ]?controller/i,
          /^controller$/i,
          /controller[-_ ]?(classic|fast|gen|next|off|paus|play|record|retro|stop)/i,
        ],
      ],
      [
        "integrated-energy",
        [
          /currency[-_ ]?exchange/i,
          /cash[-_ ]?flow/i,
          /contractual[-_ ]?flow/i,
          /carbon[-_ ]?for[-_ ]?ibm/i,
          /db2[-_ ]?genius/i,
          /player[-_ ]?flow/i,
          /traffic[-_ ]?flow/i,
          /money[-_ ]?exchange/i,
          /exchange[-_ ]?(cny|funds)/i,
        ],
      ],
      ["health-safety", [/airline/i, /hair[-_ ]?care/i]],
      ["transport-facilities", [/paper[-_ ]?plane/i]],
      [
        "flags-regions",
        [
          /mailbox/i,
          /cross[-_ ]country/i,
          /diving[-_ ]scuba/i,
          /flight[-_ ]international/i,
          /world[-_ ]trade/i,
          /cics/i,
          /global[-_ ](markets|partner|loan|pandemic)/i,
          /global[-_ ](currency|filters|strategy)/i,
          /soil[-_ ]moisture[-_ ]global/i,
        ],
      ],
      ["energy-control", [/xbox/i]],
    ]);

    const violations: Array<{
      libraryId: string;
      categoryId: string;
      iconId: string;
      sourceName: string;
    }> = [];
    for (const libraryId of ["docer-free-compatible", "office-fluent-compatible", "open-source-svg"]) {
      const manifest = readJson<IconManifest>(
        path.join(iconLibraryDir, libraryId, "manifest.json"),
      );
      for (const category of manifest.categories) {
        const rules = wrongDomainRules.get(category.id);
        if (!rules) {
          continue;
        }
        for (const icon of category.icons || []) {
          const sourceName = icon.sourceName || icon.id || icon.name;
          if (rules.some((rule) => rule.test(sourceName))) {
            violations.push({ libraryId, categoryId: category.id, iconId: icon.id, sourceName });
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("does not use compact generated Docer symbols for detailed equipment categories", () => {
    const manifest = readJson<IconManifest>(
      path.join(iconLibraryDir, "docer-free-compatible", "manifest.json"),
    );
    const detailedCategoryIds = new Set([
      "energy-storage-scene",
      "hydrogen-process-advanced",
      "storage-advanced-scene",
      "wind-power-advanced",
    ]);

    const compactGeneratedIcons: Array<{ categoryId: string; iconId: string }> = [];
    for (const category of manifest.categories) {
      if (!detailedCategoryIds.has(category.id)) {
        continue;
      }
      for (const icon of category.icons || []) {
        if (!icon.source || icon.source === "original-generated") {
          compactGeneratedIcons.push({ categoryId: category.id, iconId: icon.id });
        }
      }
    }

    expect(compactGeneratedIcons).toEqual([]);
  });

  it("does not keep duplicate SVG structures inside generated library categories", () => {
    const duplicateCategories: Array<{ libraryId: string; categoryId: string; duplicates: string[][] }> = [];
    for (const libraryId of ["office-fluent-compatible", "open-source-svg"]) {
      const manifest = readJson<IconManifest>(
        path.join(iconLibraryDir, libraryId, "manifest.json"),
      );

      for (const category of manifest.categories) {
        const structures = new Map<string, string[]>();
        for (const icon of category.icons || []) {
          const svg = readFileSync(path.join(iconLibraryDir, libraryId, icon.file), "utf8");
          const structure = normalizedSvgStructure(svg);
          const items = structures.get(structure) || [];
          items.push(icon.id);
          structures.set(structure, items);
        }

        const duplicates = [...structures.values()].filter((ids) => ids.length > 1);
        if (duplicates.length > 0) {
          duplicateCategories.push({ libraryId, categoryId: category.id, duplicates });
        }
      }
    }

    expect(duplicateCategories).toEqual([]);
  });

  it("does not keep duplicate SVG structures across the whole icon library", () => {
    const catalog = readJson<IconCatalog>(path.join(iconLibraryDir, "catalog.json"));
    const structures = new Map<string, string[]>();
    for (const library of catalog.libraries) {
      const manifest = readJson<IconManifest>(
        path.join(iconLibraryDir, library.id, "manifest.json"),
      );
      for (const category of manifest.categories) {
        for (const icon of category.icons || []) {
          const svg = readFileSync(path.join(iconLibraryDir, library.id, icon.file), "utf8");
          const structure = normalizedSvgStructure(svg);
          const items = structures.get(structure) || [];
          items.push(`${library.id}/${category.id}/${icon.id}`);
          structures.set(structure, items);
        }
      }
    }

    const duplicates = [...structures.values()].filter((ids) => ids.length > 1);
    expect(duplicates).toEqual([]);
  });
});
