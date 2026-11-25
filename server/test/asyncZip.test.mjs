import { describe, expect, test } from "vitest";
import { createZipBufferAsync, readZipEntriesAsync } from "../asyncZip.mjs";

describe("asyncZip 异步压缩与解压引擎（worker_threads + 小包快路径）", () => {
  test("小包同步快路径往返一致", async () => {
    const buffer = await createZipBufferAsync([
      { name: "root/hello.txt", data: Buffer.from("你好，电网建模平台", "utf-8") },
      { name: "root/data.json", data: JSON.stringify({ ok: true }) }
    ]);
    const zip = await readZipEntriesAsync(buffer);
    const entries = zip.getEntries();
    expect(entries.map((e) => e.entryName).sort()).toEqual(["root/data.json", "root/hello.txt"]);
    const hello = entries.find((e) => e.entryName === "root/hello.txt");
    expect(hello.getData().toString("utf-8")).toBe("你好，电网建模平台");
  });

  test("强制走 worker_threads 时异步压缩与解压往返逐字节一致", async () => {
    const payload = Buffer.from("A".repeat(2048) + "电力能源系统拓扑", "utf-8");
    const buffer = await createZipBufferAsync(
      [
        { name: "scheme/model.json", data: payload },
        { name: "scheme/sub/info.txt", data: Buffer.from("worker-ok", "utf-8") }
      ],
      { forceWorker: true }
    );
    const zip = await readZipEntriesAsync(buffer, { forceWorker: true });
    const entries = zip.getEntries();
    expect(entries).toHaveLength(2);
    const model = entries.find((e) => e.entryName === "scheme/model.json");
    expect(model.isDirectory).toBe(false);
    expect(model.header.size).toBe(payload.byteLength);
    expect(model.getData().equals(payload)).toBe(true);
  });

  test("worker_threads 解析超出解压总大小上限时触发 zip bomb 拦截报错", async () => {
    const payload = Buffer.alloc(4096, 0x41);
    const buffer = await createZipBufferAsync([{ name: "big.txt", data: payload }], { forceWorker: true });
    await expect(
      readZipEntriesAsync(buffer, {
        forceWorker: true,
        maxUncompressedBytes: 1024,
        label: "测试压缩包"
      })
    ).rejects.toThrow(/测试压缩包解压后总大小超过/);
  });

  test("非法 ZIP 字节在 worker_threads 中正确抛错而非挂起", async () => {
    await expect(
      readZipEntriesAsync(Buffer.from("not-a-valid-zip"), { forceWorker: true })
    ).rejects.toThrow();
  });
});
