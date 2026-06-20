#!/usr/bin/env node

import { spawn, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function log(tag, msg) {
  const ts = new Date().toLocaleTimeString();
  console.log(`[${ts}] [${tag}] ${msg}`);
}

async function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: "inherit", shell: true, ...opts });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
    proc.on("error", reject);
  });
}

async function checkDocker() {
  try {
    execSync("docker info", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function killPort(port) {
  try {
    if (process.platform !== "win32") {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, { stdio: "ignore" });
      return;
    }
    const raw = execSync("netstat -ano", { encoding: "utf8", stdio: "pipe", windowsHide: true })
      .split(/\r?\n/).filter(l => l.includes(`:${port}`));
    if (!raw.length) return;
    const pid = [...new Set(raw.map(l => (l.match(/(\d+)\s*$/) || [])[1]).filter(Boolean))].find(Boolean);
    if (pid && pid !== "0") {
      execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore", windowsHide: true });
      log("PORTS", `Killed PID ${pid} on port ${port}`);
    }
  } catch { /* nothing */ }
}

function killByImageAndCmd(name, cmdPattern) {
  /* Kill processes matching image name AND command-line pattern (Windows only) */
  if (process.platform !== "win32") return;
  try {
    const raw = execSync(`wmic process where "name='${name}'" get ProcessId,CommandLine /FORMAT:CSV 2>nul`, { encoding: "utf8", stdio: "pipe", windowsHide: true });
    const myPid = process.pid;
    raw.split(/\r?\n/).forEach(line => {
      const parts = line.replace(/"/g, "").split(",");
      const pid = parts.length >= 2 ? parts[parts.length - 1].trim() : "";
      const cmd = parts.length >= 2 ? parts.slice(0, -1).join(",").trim() : "";
      if (pid && pid !== myPid.toString() && cmd.match(cmdPattern)) {
        try { execSync(`taskkill /F /PID ${pid} 2> nul`, { stdio: "ignore", windowsHide: true }); log("PORTS", `Killed orphan ${name} PID ${pid}`); } catch {}
      }
    });
  } catch { /* wmic not available */ }
}

async function main() {
  log("AISMOS", "Starting all services...");
  console.log("");

  /* Wipe orphan tsx watch / node processes from prior crashed runs */
  killByImageAndCmd("node.exe", /tsx|node.*server\.(ts|js)/);
  await new Promise((r) => setTimeout(r, 1000));

  killPort(4000);
  killPort(3000);
  killPort(8000);
  await new Promise((r) => setTimeout(r, 2000)); /* Give OS time to release ports */

  const hasDocker = await checkDocker();

  if (hasDocker) {
    log("INFRA", "Starting Docker services (postgres, mongo, redis, qdrant)...");
    try {
      execSync("docker compose up -d postgres mongo redis qdrant", { cwd: root, stdio: "inherit" });
      log("INFRA", "Waiting for databases to be ready...");
      await new Promise((r) => setTimeout(r, 5000));
    } catch (e) {
      log("INFRA", `Docker start issue: ${e.message}. Continuing anyway...`);
    }
  } else {
    log("INFRA", "Docker not available — assuming databases are running externally.");
  }

  log("PRISMA", "Generating Prisma client...");
  try {
    execSync("npm run prisma:generate", { cwd: root, stdio: "inherit" });
  } catch {
    log("PRISMA", "Prisma generate failed — continuing...");
  }

  log("PRISMA", "Running migrations...");
  try {
    execSync("npm run db:migrate", { cwd: root, stdio: "inherit" });
  } catch {
    log("PRISMA", "Migration failed — continuing...");
  }

  /* Kill any processes that snuck onto our ports during setup */
  killPort(4000);
  killPort(3000);
  killPort(8000);
  await new Promise((r) => setTimeout(r, 1000));

  console.log("");
  log("AISMOS", "Starting all services concurrently:");
  log("AISMOS", "  📦 API      → http://localhost:4000");
  log("AISMOS", "  🌐 Web      → http://localhost:3000");
  log("AISMOS", "  🧠 AI       → http://localhost:8000");
  log("AISMOS", "  ⚙️  Workers  → Redis queue consumer");
  console.log("");

  run("npm", ["run", "dev:all"], { cwd: root, stdio: "inherit" });
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
