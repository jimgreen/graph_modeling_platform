import { spawn } from "node:child_process";
import { createImageServer } from "./server.mjs";
import { backendPort, frontendPort, host as configHost } from "./config.mjs";

// 解析 --host <value>，CLI > env/config
export function parseHost(argv = process.argv.slice(2)) {
  const idx = argv.findIndex(a => a === "--host" || a.startsWith("--host="));
  if (idx === -1) return configHost;
  const arg = argv[idx];
  // `--key=value`：只按首个 `=` 切分，取其后**全部**内容（值里可以再含 `=`）。
  // split("=")[1] 会把 `--host=a=b` 截成 `a`。
  const eq = arg.indexOf("=");
  if (eq !== -1) return arg.slice(eq + 1);
  // 无 `=` 时才看下一个 token：以 `-` 开头说明那是另一个 flag，不能被吞成 host 的值。
  const next = argv[idx + 1];
  if (next !== undefined && !next.startsWith("-")) return next;
  return configHost;
}

const host = parseHost();
const imagePort = backendPort;

await createImageServer({ host, port: imagePort });
// 启动横幅：监听地址与接口文档地址，开发者启动时要看 —— 保留在 stdout。
// 「Swigger」拼写与对齐空格是既有文案，改动会破坏外部对启动输出的依赖，勿动。
console.log(`Image backend listening at http://${host}:${imagePort}`);
console.log(`API Swigger:          http://${host}:${imagePort}/swigger`);

const viteCommand = process.platform === "win32" ? "cmd.exe" : "npx";
const viteConfigArgs = ["--host", host, "--config", "vite.config.ts"];
const viteArgs = process.platform === "win32" ? ["/c", "npx", "vite", ...viteConfigArgs] : ["vite", ...viteConfigArgs];
const vite = spawn(viteCommand, viteArgs, {
  stdio: "inherit",
  env: {
    ...process.env,
    IMAGE_SERVER_PORT: String(imagePort),
    VITE_PORT: String(frontendPort)
  }
});

const shutdown = () => {
  vite.kill();
  process.exit();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
vite.on("exit", (code) => process.exit(code ?? 0));
