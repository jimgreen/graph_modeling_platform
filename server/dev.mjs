import { spawn } from "node:child_process";
import { createImageServer } from "./server.mjs";
import { backendPort, frontendPort, host as configHost } from "./config.mjs";

// 解析 --host <value>，CLI > env/config
const parseHost = () => {
  const args = process.argv.slice(2);
  const idx = args.findIndex(a => a === "--host" || a.startsWith("--host="));
  if (idx === -1) return configHost;
  const arg = args[idx];
  if (arg.includes("=")) return arg.split("=")[1];
  return args[idx + 1] ?? configHost;
};

const host = parseHost();
const imagePort = backendPort;

await createImageServer({ host, port: imagePort });
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
