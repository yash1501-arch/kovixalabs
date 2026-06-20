// Kills processes on ports 3000, 4000, 8000 before restarting.
// Usage: node scripts/kill-ports.mjs

import { execSync } from "node:child_process";

const ports = [3000, 4000, 8000];
const os = process.platform;

for (const port of ports) {
  try {
    let pid = null;
    if (os === "win32") {
      const out = execSync(`netstat -ano | findstr "LISTENING.*:${port} "`, { encoding: "utf8", stdio: "pipe" });
      const lines = out.split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const found = parts.pop();
        if (found && found !== "0") { pid = found; break; }
      }
      if (pid) {
        execSync(`taskkill /F /PID ${pid}`);
        console.log(`Killed process on port ${port} (PID ${pid})`);
      }
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null`);
      console.log(`Killed process on port ${port}`);
    }
  } catch {
    console.log(`Port ${port} was free`);
  }
}
