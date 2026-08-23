// 原子文件写入（Node 端专用）。
// 审查来源：MCHECK-REPORT A1-P0-1（manifest 非原子写）、D-P1-2（nativeExportSave）、
// G-P1-3（migrate 脚本）；正确实现参照 server/globalLineRegistry.mjs writeState（tmp+rename）。

import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

/**
 * 原子写入：先写同目录临时文件，成功后 rename 到目标。
 * 崩溃/断电时目标文件要么是旧完整内容、要么是新完整内容，不会出现半写损坏。
 */
export async function atomicWriteFile(filePath, data, options = {}) {
  await mkdir(dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(tmpPath, data, options);
    await rename(tmpPath, filePath);
  } catch (error) {
    await rm(tmpPath, { force: true }).catch(() => {});
    throw error;
  }
}

/** 同步版本：供维护脚本使用。 */
export function atomicWriteFileSync(filePath, data, options = {}) {
  mkdirSync(dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  try {
    writeFileSync(tmpPath, data, options);
    renameSync(tmpPath, filePath);
  } catch (error) {
    try {
      rmSync(tmpPath, { force: true });
    } catch {
      // 清理失败不掩盖原错误
    }
    throw error;
  }
}
