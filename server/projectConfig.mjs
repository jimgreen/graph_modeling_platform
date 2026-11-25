import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const PROJECT_CONFIG_FILENAME = "platform.config.json";

function normalizeValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function parseProjectName(argv = process.argv.slice(2), env = process.env) {
  const index = argv.findIndex((arg) => arg === "--project" || arg.startsWith("--project="));
  if (index >= 0) {
    const argument = argv[index];
    const equalsIndex = argument.indexOf("=");
    if (equalsIndex >= 0) return normalizeValue(argument.slice(equalsIndex + 1)) || null;
    const next = argv[index + 1];
    return next !== undefined && !next.startsWith("-") ? normalizeValue(next) || null : null;
  }
  return normalizeValue(env.GRAPH_MODEL_PROJECT) || null;
}

export function isValidProjectName(value) {
  return typeof value === "string" &&
    value.length > 0 &&
    value.trim() === value &&
    value !== "." &&
    value !== ".." &&
    !value.includes("/") &&
    !value.includes("\\") &&
    !value.includes("\0");
}

function readJsonObject(filePath, readFile) {
  try {
    const parsed = JSON.parse(readFile(filePath, "utf8"));
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function selectPlatformConfig({
  repoRoot,
  projectName,
  explicitConfigPath,
  readFile = readFileSync
}) {
  const selectedProjectName = isValidProjectName(projectName) ? projectName : null;
  const projectDirectory = selectedProjectName
    ? resolve(repoRoot, "projects", selectedProjectName)
    : null;
  const rootConfigPath = explicitConfigPath
    ? resolve(explicitConfigPath)
    : resolve(repoRoot, PROJECT_CONFIG_FILENAME);

  if (projectDirectory) {
    const projectConfigPath = join(projectDirectory, PROJECT_CONFIG_FILENAME);
    const projectConfig = readJsonObject(projectConfigPath, readFile);
    if (projectConfig) {
      return {
        projectName: selectedProjectName,
        projectDirectory,
        platformConfigPath: projectConfigPath,
        dataDirBase: projectDirectory,
        config: projectConfig
      };
    }
  }

  return {
    projectName: selectedProjectName,
    projectDirectory,
    platformConfigPath: rootConfigPath,
    dataDirBase: resolve(repoRoot),
    config: readJsonObject(rootConfigPath, readFile) ?? {}
  };
}
