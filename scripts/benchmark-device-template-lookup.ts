import { performance } from "node:perf_hooks";
import {
  DEVICE_LIBRARY,
  getTemplate,
  type DeviceKind,
  type DeviceTemplate
} from "../src/model";

/**
 * 基准测试：设备模板按 kind 查找（线性扫描 vs Map）。
 *
 * 复现命令（项目根目录）：
 *   node_modules/.bin/esbuild scripts/benchmark-device-template-lookup.ts \
 *     --bundle --platform=node --format=esm --outfile=tmp/bench-device-template-lookup.mjs \
 *   && node tmp/bench-device-template-lookup.mjs
 */

const WARMUP_RUNS = 5;
const MEASURED_RUNS = 21; // 取中位数
const NODES_PER_DIAGRAM = 2000; // 模拟一个 2000 节点的方案
const REPEAT_PER_RUN = 200; // 每次测量重复整张图，放大到 ~40 万次查找

const ALL_KINDS: DeviceKind[] = DEVICE_LIBRARY.map((template) => template.kind);

/** 旧实现：与 model.ts 当前的 DEVICE_LIBRARY.find(...) 完全一致 */
function linearLookup(kind: string): DeviceTemplate | undefined {
  return DEVICE_LIBRARY.find((item) => item.kind === kind);
}

/** 新实现：模块级 Map（与即将落地的 DEVICE_LIBRARY_BY_KIND 一致） */
const LOCAL_BY_KIND = new Map<string, DeviceTemplate>(
  DEVICE_LIBRARY.map((template) => [template.kind, template])
);
function mapLookup(kind: string): DeviceTemplate | undefined {
  return LOCAL_BY_KIND.get(kind);
}

/** 构造一个伪随机但可复现的查找序列，模拟一张图里各节点的 kind 分布 */
function buildWorkload(size: number, missRatio: number): string[] {
  const sequence: string[] = [];
  let seed = 123456789;
  const nextRandom = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let index = 0; index < size; index += 1) {
    if (nextRandom() < missRatio) {
      sequence.push(`__unknown_kind_${index % 7}`); // 未命中 → 全表扫描（最坏情况）
    } else {
      sequence.push(ALL_KINDS[Math.floor(nextRandom() * ALL_KINDS.length)]!);
    }
  }
  return sequence;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

type Variant = { name: string; lookup: (kind: string) => DeviceTemplate | undefined };

function measure(variant: Variant, workload: string[]): number {
  // 防止 JIT 把循环优化掉
  let sink = 0;
  const run = () => {
    for (let repeat = 0; repeat < REPEAT_PER_RUN; repeat += 1) {
      for (let index = 0; index < workload.length; index += 1) {
        const template = variant.lookup(workload[index]!);
        if (template) {
          sink += template.kind.length;
        }
      }
    }
  };
  for (let warmup = 0; warmup < WARMUP_RUNS; warmup += 1) {
    run();
  }
  const samples: number[] = [];
  for (let measured = 0; measured < MEASURED_RUNS; measured += 1) {
    const start = performance.now();
    run();
    samples.push(performance.now() - start);
  }
  if (sink === -1) {
    throw new Error("unreachable");
  }
  return median(samples);
}

function report(title: string, workload: string[]) {
  const lookupsPerRun = workload.length * REPEAT_PER_RUN;
  const linearMs = measure({ name: "linear (DEVICE_LIBRARY.find)", lookup: linearLookup }, workload);
  const mapMs = measure({ name: "map (DEVICE_LIBRARY_BY_KIND.get)", lookup: mapLookup }, workload);
  const realMs = measure({ name: "real getTemplate()", lookup: (kind) => {
    try {
      return getTemplate(kind as DeviceKind);
    } catch {
      return undefined;
    }
  } }, workload.filter((kind) => LOCAL_BY_KIND.has(kind))); // getTemplate 对未知 kind 会抛错

  const nsPer = (ms: number, count: number) => ((ms * 1e6) / count).toFixed(1);

  console.log(`\n=== ${title} ===`);
  console.log(`library entries: ${DEVICE_LIBRARY.length} | lookups/run: ${lookupsPerRun.toLocaleString()} | runs: ${MEASURED_RUNS} (median)`);
  console.log(`  linear .find : ${linearMs.toFixed(2)} ms  (${nsPer(linearMs, lookupsPerRun)} ns/op)`);
  console.log(`  map    .get  : ${mapMs.toFixed(2)} ms  (${nsPer(mapMs, lookupsPerRun)} ns/op)`);
  console.log(`  speedup      : ${(linearMs / mapMs).toFixed(1)}x faster`);
  console.log(`  real getTemplate() (current build): ${realMs.toFixed(2)} ms`);
}

console.log(`node ${process.version} | DEVICE_LIBRARY kinds: ${ALL_KINDS.length}`);
report("All-hit workload (typical diagram)", buildWorkload(NODES_PER_DIAGRAM, 0));
report("20% miss workload (inactive-layer / unknown kinds)", buildWorkload(NODES_PER_DIAGRAM, 0.2));
