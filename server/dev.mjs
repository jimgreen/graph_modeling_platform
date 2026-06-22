import { spawn } from "node:child_process";
import { createImageServer } from "./image-server.mjs";

const host = "127.0.0.1";
const imagePort = Number(process.env.IMAGE_SERVER_PORT ?? 5174);

await createImageServer({ host, port: imagePort });
console.log(`Image backend listening at http://${host}:${imagePort}`);
console.log(`API Swigger:          http://${host}:${imagePort}/swigger`);

const viteCommand = process.platform === "win32" ? "cmd.exe" : "npx";
const viteArgs = process.platform === "win32" ? ["/c", "npx", "vite", "--host", host] : ["vite", "--host", host];
const vite = spawn(viteCommand, viteArgs, {
  stdio: "inherit",
  env: {
    ...process.env,
    IMAGE_SERVER_PORT: String(imagePort)
  }
});

const shutdown = () => {
  vite.kill();
  process.exit();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
vite.on("exit", (code) => process.exit(code ?? 0));
