// 后端异步 ZIP 工作线程（Node.js worker_threads）
// 将大体积 ZIP 的压缩（toBuffer）与解压（new AdmZip + getData）从主事件循环移出，
// 防止大方案/大空间导入导出阻塞其它 HTTP/WS 请求。
import { parentPort, workerData } from "node:worker_threads";
import AdmZip from "adm-zip";

function handleCreate(entries) {
  const zip = new AdmZip();
  for (const entry of entries) {
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
    zip.addFile(entry.name, data);
  }
  return zip.toBuffer();
}

function handleRead(buffer, maxUncompressedBytes, label) {
  const inputBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const zip = new AdmZip(inputBuffer);
  const rawEntries = zip.getEntries();
  let totalUncompressed = 0;
  for (const entry of rawEntries) {
    totalUncompressed += Number(entry?.header?.size) || 0;
    if (Number.isFinite(maxUncompressedBytes) && maxUncompressedBytes > 0 && totalUncompressed > maxUncompressedBytes) {
      throw new Error(`${label || "压缩包"}解压后总大小超过 ${Math.round(maxUncompressedBytes / 1024 / 1024)}MB 上限。`);
    }
  }
  return rawEntries.map((entry) => ({
    entryName: String(entry.entryName ?? ""),
    isDirectory: Boolean(entry.isDirectory),
    header: { size: Number(entry?.header?.size) || 0 },
    data: entry.isDirectory ? Buffer.alloc(0) : entry.getData()
  }));
}

if (parentPort && workerData) {
  try {
    if (workerData.action === "create") {
      const buffer = handleCreate(workerData.entries ?? []);
      parentPort.postMessage({ ok: true, buffer });
    } else if (workerData.action === "read") {
      const entries = handleRead(
        workerData.buffer,
        workerData.maxUncompressedBytes,
        workerData.label
      );
      parentPort.postMessage({ ok: true, entries });
    } else {
      parentPort.postMessage({ ok: false, error: `未知 ZIP Worker 操作：${String(workerData.action)}` });
    }
  } catch (error) {
    parentPort.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
