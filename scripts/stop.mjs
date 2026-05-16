import { execSync } from "node:child_process";
import { networkInterfaces } from "node:os";

const ports = [3001, 5173];
const isWin = process.platform === "win32";

for (const port of ports) {
  try {
    let pid = null;
    if (isWin) {
      const out = execSync(`netstat -ano | findstr :${port}`, {
        encoding: "utf8",
        timeout: 3000,
      });
      for (const line of out.split("\n")) {
        if (line.includes("LISTENING")) {
          const parts = line.trim().split(/\s+/);
          pid = parseInt(parts[parts.length - 1], 10);
          break;
        }
      }
    } else {
      try {
        pid = parseInt(
          execSync(`lsof -ti :${port}`, {
            encoding: "utf8",
            timeout: 3000,
          }).trim(),
          10,
        );
      } catch {
        /* no process */
      }
    }
    if (pid) {
      process.kill(pid, "SIGKILL");
      console.log(`Killed PID ${pid} on port ${port}`);
    }
  } catch {
    /* port not in use */
  }
}
