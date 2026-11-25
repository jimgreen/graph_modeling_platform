// 后端异步 ZIP 引擎：小包零开销同步路径 + 大包自动卸载到 worker_threads。
// 严格不包含任何模块级路径常量（遵守 spacePathConstantGuard）。
import { Worker } from "node:worker_threads";
import AdmZip from "adm-zip";

/** 默认触发 worker_threads 卸载的字节阈值（128KB） */
export const DEFAULT_ZIP_WORKER_THRESHOLD_BYTES = 128 * 1024;
/** 默认触发 worker_threads 卸载的条目数阈值 */
export const DEFAULT_ZIP_WORKER_THRESHOLD_ENTRIES = 12;
/** 默认 ZIP Worker 超时兜底（60 秒） */
export const DEFAULT_ZIP_WORKER_TIMEOUT_MS = 60_000;
/** 解压总大小默认上限（512MB，与 server.mjs 的 zip bomb 防护一致） */
export const DEFAULT_MAX_ZIP_UNCOMPRESSED_BYTES = 512 * 1024 * 1024;

function runZipWorker(workerData, timeoutMs = DEFAULT_ZIP_WORKER_TIMEOUT_MS) {
  const workerUrl = new URL("./zipWorker.mjs", import.meta.url);
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerUrl, { workerData });
    let settled = false;
    let timer;

    const finish = (cb) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
      worker.removeAllListeners();
      void worker.terminate().catch(() => {});
      cb();
    };

    if (Number.isFinite(timeoutMs) && timeoutMs > 0) {
      timer = setTimeout(() => {
        finish(() => reject(new Error(`ZIP 工作线程 ${timeoutMs}ms 内未完成，已终止。`)));
      }, timeoutMs);
    }

    worker.once("message", (msg) => {
      if (msg?.ok) {
        finish(() => resolve(msg));
      } else {
        finish(() => reject(new Error(msg?.error || "ZIP 工作线程处理失败。")));
      }
    });

    worker.once("error", (error) => {
      finish(() => reject(error));
    });

    worker.once("exit", (code) => {
      if (!settled && code !== 0) {
        finish(() => reject(new Error(`ZIP 工作线程异常退出（code=${code}）。`)));
      }
    });
  });
}

function toBufferSafe(value) {
  if (Buffer.isBuffer(value)) {
    return value;
  }
  if (value instanceof Uint8Array) {
    return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
  }
  return Buffer.from(value ?? "");
}

/**
 * 异步构建 ZIP Buffer。
 *
 * @param {Array<{ name: string, data: Buffer | Uint8Array | string }>} entries
 * @param {{ workerThresholdBytes?: number, workerThresholdEntries?: number, timeoutMs?: number, forceWorker?: boolean }} [options]
 * @returns {Promise<Buffer>}
 */
export async function createZipBufferAsync(entries = [], options = {}) {
  const normalized = entries.map((entry) => ({
    name: String(entry.name),
    data: toBufferSafe(entry.data)
  }));
  const totalBytes = normalized.reduce((sum, item) => sum + item.data.byteLength, 0);
  const thresholdBytes = options.workerThresholdBytes ?? DEFAULT_ZIP_WORKER_THRESHOLD_BYTES;
  const thresholdEntries = options.workerThresholdEntries ?? DEFAULT_ZIP_WORKER_THRESHOLD_ENTRIES;
  const shouldUseWorker =
    Boolean(options.forceWorker) ||
    totalBytes >= thresholdBytes ||
    normalized.length >= thresholdEntries;

  if (!shouldUseWorker) {
    const zip = new AdmZip();
    for (const item of normalized) {
      zip.addFile(item.name, item.data);
    }
    return zip.toBuffer();
  }

  const response = await runZipWorker(
    { action: "create", entries: normalized },
    options.timeoutMs ?? DEFAULT_ZIP_WORKER_TIMEOUT_MS
  );
  return toBufferSafe(response.buffer);
}

/**
 * 将 worker 返回的只读条目快照包装为与 AdmZip 实例兼容的视图对象
 * （支持 `.getEntries()`、`entry.entryName`、`entry.isDirectory`、`entry.header.size`、`entry.getData()`）。
 */
function wrapSnapshotAsZipLike(rawEntries) {
  const wrappedEntries = rawEntries.map((item) => {
    const dataBuffer = toBufferSafe(item.data);
    return {
      entryName: item.entryName,
      isDirectory: Boolean(item.isDirectory),
      header: { size: Number(item?.header?.size) || dataBuffer.byteLength },
      getData() {
        return dataBuffer;
      }
    };
  });
  return {
    getEntries() {
      return wrappedEntries;
    }
  };
}

/**
 * 异步解析 ZIP Buffer 并返回兼容 AdmZip 的只读视图。
 * 大包在 worker_threads 中执行解析与 zip bomb 预校验，避免阻塞主事件循环。
 *
 * @param {Buffer | Uint8Array} buffer
 * @param {{ workerThresholdBytes?: number, maxUncompressedBytes?: number, label?: string, timeoutMs?: number, forceWorker?: boolean }} [options]
 */
export async function readZipEntriesAsync(buffer, options = {}) {
  const inputBuffer = toBufferSafe(buffer);
  const thresholdBytes = options.workerThresholdBytes ?? DEFAULT_ZIP_WORKER_THRESHOLD_BYTES;
  const maxUncompressedBytes = options.maxUncompressedBytes ?? DEFAULT_MAX_ZIP_UNCOMPRESSED_BYTES;
  const shouldUseWorker = Boolean(options.forceWorker) || inputBuffer.byteLength >= thresholdBytes;

  if (!shouldUseWorker) {
    return new AdmZip(inputBuffer);
  }

  const response = await runZipWorker(
    {
      action: "read",
      buffer: inputBuffer,
      maxUncompressedBytes,
      label: options.label || "压缩包"
    },
    options.timeoutMs ?? DEFAULT_ZIP_WORKER_TIMEOUT_MS
  );
  return wrapSnapshotAsZipLike(response.entries ?? []);
}
