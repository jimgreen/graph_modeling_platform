import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconLibraryDir = path.join(rootDir, "data", "icon-library");
const libraryIds = ["open-source-svg"];

const wrongDomainRules = new Map([
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
      /frost[-_ ]?tower/i,
      /switch[-_ ]?(access|account|left|vertical)/i,
      /transmission[-_ ]?lte/i,
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
      /block[-_ ]?storage/i,
      /cancer/i,
      /cell[-_ ]?signal/i,
      /container[-_ ]?microservices/i,
      /deploying[-_ ]?containers/i,
      /diving/i,
      /flash[-_ ]?storage/i,
      /hyper[-_ ]?protect[-_ ]?containers/i,
      /ibm[-_ ].*(containers?|storage)/i,
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

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function normalizedSvgStructure(svg) {
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

const summary = {
  libraries: {},
  wrongDomainViolations: [],
  duplicateStructures: [],
};

const globalStructures = new Map();

for (const libraryId of libraryIds) {
  const manifest = readJson(path.join(iconLibraryDir, libraryId, "manifest.json"));
  const librarySummary = {
    totalIcons: 0,
    categories: manifest.categories?.length || 0,
    sources: {},
  };

  for (const category of manifest.categories || []) {
    const categoryStructures = new Map();
    for (const icon of category.icons || []) {
      librarySummary.totalIcons += 1;
      const sourceId = icon.source || icon.sourceId || icon.pickedBy || "unknown";
      librarySummary.sources[sourceId] = (librarySummary.sources[sourceId] || 0) + 1;

      const sourceName = icon.sourceName || icon.id || icon.name || "";
      const rules = wrongDomainRules.get(category.id) || [];
      for (const rule of rules) {
        if (rule.test(sourceName)) {
          summary.wrongDomainViolations.push({
            libraryId,
            categoryId: category.id,
            iconId: icon.id,
            sourceName,
            rule: String(rule),
          });
        }
      }

      const svg = readFileSync(path.join(iconLibraryDir, libraryId, icon.file), "utf8");
      const structure = normalizedSvgStructure(svg);
      const categoryItems = categoryStructures.get(structure) || [];
      categoryItems.push(icon.id);
      categoryStructures.set(structure, categoryItems);

      const globalItems = globalStructures.get(structure) || [];
      globalItems.push(`${libraryId}/${category.id}/${icon.id}`);
      globalStructures.set(structure, globalItems);
    }

    for (const duplicates of categoryStructures.values()) {
      if (duplicates.length > 1) {
        summary.duplicateStructures.push({
          scope: "category",
          libraryId,
          categoryId: category.id,
          icons: duplicates,
        });
      }
    }
  }

  summary.libraries[libraryId] = librarySummary;
}

for (const duplicates of globalStructures.values()) {
  if (duplicates.length > 1) {
    summary.duplicateStructures.push({
      scope: "global",
      icons: duplicates,
    });
  }
}

console.log(JSON.stringify(summary, null, 2));

if (summary.wrongDomainViolations.length > 0 || summary.duplicateStructures.length > 0) {
  process.exitCode = 1;
}
