// Starts the grounded assistant API and the Vite app together.
//   npm run dev:all

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const kids = [];

function start(label, args) {
  const child = spawn(process.execPath, args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  kids.push(child);
  const tag = (stream) => {
    let leftover = "";
    stream.on("data", (chunk) => {
      leftover += chunk;
      const lines = leftover.split("\n");
      leftover = lines.pop() ?? "";
      for (const line of lines) if (line.trim()) process.stdout.write(`[${label}] ${line}\n`);
    });
  };
  tag(child.stdout);
  tag(child.stderr);
  child.on("exit", (code) => {
    if (shuttingDown) return;
    console.error(`[${label}] exited ${code}`);
    shutdown();
    process.exit(code ?? 1);
  });
}

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of kids) {
    try {
      child.kill("SIGTERM");
    } catch {}
  }
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});
process.on("SIGTERM", shutdown);

start("api", [path.join(root, "server", "index.mjs")]);
start("web", [path.join(root, "node_modules", "vite", "bin", "vite.js")]);
