import { randomUUID } from "node:crypto";
import { rmSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { atomicWriteFile } from "../shared/atomicWrite.mjs";
import { repositoryRoot } from "./config.mjs";

export const webgrpInstancesRoot = join(repositoryRoot, "instances");
const INSTANCE_FILE_PATTERN = /^webgrp-[0-9]+-[0-9a-f-]+\.json$/iu;
const MIGRATION_LOCK_FILENAME = "data-dir.lock";
const REGISTRY_LOCK_FILENAME = "instances.lock";
const HEARTBEAT_INTERVAL_MS = 3000;
const REGISTRY_LOCK_RETRY_MS = 20;
const REGISTRY_LOCK_MAX_RETRIES = 100;

export class WebgrpInstanceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "WebgrpInstanceError";
    this.code = code;
    this.statusCode = 409;
  }
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

function isMissing(error) {
  return error?.code === "ENOENT";
}

async function readJsonFile(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (isMissing(error)) return null;
    if (error instanceof SyntaxError) return null;
    throw error;
  }
}

export function createWebgrpInstanceRegistry({
  root = webgrpInstancesRoot,
  workdir = repositoryRoot,
  dataRoot = "",
  host = "",
  port = 0
} = {}) {
  const instancesRoot = resolve(root);
  const resolvedWorkdir = resolve(workdir);
  const lockPath = join(instancesRoot, MIGRATION_LOCK_FILENAME);
  const registryLockPath = join(instancesRoot, REGISTRY_LOCK_FILENAME);
  let instanceId = null;
  let recordPath = null;
  let currentRecord = null;
  let heartbeatTimer = null;
  let exitHandler = null;
  let released = false;

  async function ensureRoot() {
    await mkdir(instancesRoot, { recursive: true });
  }

  async function readMigrationLock() {
    try {
      return JSON.parse(await readFile(lockPath, "utf8"));
    } catch (error) {
      if (isMissing(error)) return null;
      if (error instanceof SyntaxError) {
        await rm(lockPath, { force: true });
        return null;
      }
      throw error;
    }
  }

  async function clearDeadMigrationLock() {
    const lock = await readMigrationLock();
    if (!lock) return null;
    if (isProcessAlive(Number(lock.pid))) return lock;
    await rm(lockPath, { force: true });
    return null;
  }

  async function assertNoMigrationLock() {
    const lock = await clearDeadMigrationLock();
    if (lock) {
      throw new WebgrpInstanceError(
        "DATA_DIR_MIGRATION_IN_PROGRESS",
        "该工作目录正在进行数据目录迁移，暂不能启动新的 webgrp 实例。"
      );
    }
  }

  async function acquireRegistryLock() {
    await ensureRoot();
    const token = randomUUID();
    const lock = {
      kind: "webgrp-instance-registry",
      token,
      pid: process.pid,
      workdir: resolvedWorkdir,
      createdAt: new Date().toISOString()
    };
    for (let attempt = 0; attempt <= REGISTRY_LOCK_MAX_RETRIES; attempt += 1) {
      try {
        await writeFile(registryLockPath, `${JSON.stringify(lock, null, 2)}\n`, {
          encoding: "utf8",
          flag: "wx"
        });
        let releasedLock = false;
        return {
          async release() {
            if (releasedLock) return;
            releasedLock = true;
            const current = await readJsonFile(registryLockPath);
            if (current?.token === token) await rm(registryLockPath, { force: true });
          }
        };
      } catch (error) {
        if (error?.code !== "EEXIST") throw error;
        const current = await readJsonFile(registryLockPath);
        if (!current || !isProcessAlive(Number(current.pid))) {
          await rm(registryLockPath, { force: true });
          continue;
        }
        if (attempt === REGISTRY_LOCK_MAX_RETRIES) {
          throw new WebgrpInstanceError(
            "DATA_DIR_MIGRATION_IN_PROGRESS",
            "正在等待其他 webgrp 实例完成状态切换。"
          );
        }
        await new Promise((resolvePromise) => setTimeout(resolvePromise, REGISTRY_LOCK_RETRY_MS));
      }
    }
    throw new WebgrpInstanceError(
      "DATA_DIR_MIGRATION_IN_PROGRESS",
      "无法取得 webgrp 实例登记锁。"
    );
  }

  async function writeCurrentRecord() {
    if (!recordPath || !currentRecord) return;
    await atomicWriteFile(recordPath, `${JSON.stringify(currentRecord, null, 2)}\n`, "utf8");
  }

  async function heartbeat() {
    if (!recordPath || !currentRecord || released) return;
    currentRecord = { ...currentRecord, heartbeatAt: new Date().toISOString() };
    try {
      await writeCurrentRecord();
    } catch (error) {
      if (!isMissing(error)) throw error;
    }
  }

  async function register() {
    if (recordPath) return { instanceId, recordPath };
    const registryLock = await acquireRegistryLock();
    try {
      await assertNoMigrationLock();
      instanceId = randomUUID();
      recordPath = join(instancesRoot, `webgrp-${process.pid}-${instanceId}.json`);
      currentRecord = {
        kind: "webgrp",
        instanceId,
        pid: process.pid,
        workdir: resolvedWorkdir,
        dataRoot: dataRoot ? resolve(dataRoot) : "",
        host: String(host),
        port: Number(port),
        startedAt: new Date().toISOString(),
        heartbeatAt: new Date().toISOString()
      };
      await writeFile(recordPath, `${JSON.stringify(currentRecord, null, 2)}\n`, {
        encoding: "utf8",
        flag: "wx"
      });
    } finally {
      await registryLock.release();
    }
    released = false;
    heartbeatTimer = setInterval(() => {
      void heartbeat().catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);
    heartbeatTimer.unref?.();
    exitHandler = () => {
      if (recordPath) rmSync(recordPath, { force: true });
    };
    process.once("exit", exitHandler);
    return { instanceId, recordPath };
  }

  async function release() {
    if (released) return;
    released = true;
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    if (exitHandler) process.removeListener("exit", exitHandler);
    exitHandler = null;
    if (recordPath) await rm(recordPath, { force: true });
    recordPath = null;
    currentRecord = null;
    instanceId = null;
  }

  async function updateDataRoot(nextRoot) {
    if (!currentRecord) return;
    currentRecord = {
      ...currentRecord,
      dataRoot: resolve(nextRoot),
      heartbeatAt: new Date().toISOString()
    };
    await writeCurrentRecord();
  }

  async function listActive() {
    await ensureRoot();
    const entries = await readdir(instancesRoot, { withFileTypes: true });
    const active = [];
    for (const entry of entries) {
      if (!entry.isFile() || !INSTANCE_FILE_PATTERN.test(entry.name)) continue;
      const filePath = join(instancesRoot, entry.name);
      const record = await readJsonFile(filePath);
      if (!record || record.kind !== "webgrp") {
        await rm(filePath, { force: true });
        continue;
      }
      if (resolve(String(record.workdir ?? "")) !== resolvedWorkdir) continue;
      if (!isProcessAlive(Number(record.pid))) {
        await rm(filePath, { force: true });
        continue;
      }
      active.push(record);
    }
    return active.sort((left, right) => String(left.instanceId).localeCompare(String(right.instanceId)));
  }

  async function acquireMigrationLock() {
    const registryLock = await acquireRegistryLock();
    try {
      await clearDeadMigrationLock();
      const token = randomUUID();
      const lock = {
        kind: "webgrp-data-dir-migration",
        token,
        pid: process.pid,
        workdir: resolvedWorkdir,
        createdAt: new Date().toISOString()
      };
      try {
        await writeFile(lockPath, `${JSON.stringify(lock, null, 2)}\n`, {
          encoding: "utf8",
          flag: "wx"
        });
      } catch (error) {
        if (error?.code === "EEXIST") {
          throw new WebgrpInstanceError(
            "DATA_DIR_MIGRATION_IN_PROGRESS",
            "该工作目录已经有数据目录迁移正在进行。"
          );
        }
        throw error;
      }
      let releasedLock = false;
      return {
        path: lockPath,
        async release() {
          if (releasedLock) return;
          releasedLock = true;
          const current = await readMigrationLock();
          if (current?.token === token) await rm(lockPath, { force: true });
        }
      };
    } finally {
      await registryLock.release();
    }
  }

  return {
    register,
    release,
    updateDataRoot,
    listActive,
    acquireMigrationLock,
    get instancesRoot() {
      return instancesRoot;
    },
    get recordPath() {
      return recordPath;
    }
  };
}
