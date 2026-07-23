import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

function readTokenFromSecrets() {
  const content = readFileSync(new URL("../secrets.md", import.meta.url), "utf8");
  const match = content.match(/github_pat_[A-Za-z0-9_]+/);

  if (!match) {
    throw new Error("Could not find a GitHub fine-grained PAT in secrets.md.");
  }

  return match[0];
}

function createLiveTestEnv() {
  return {
    ...process.env,
    TODO_APP_LIVE_E2E: process.env.TODO_APP_LIVE_E2E || "1",
    TODO_APP_TEST_TOKEN: process.env.TODO_APP_TEST_TOKEN || readTokenFromSecrets(),
  };
}

export function runLiveTestTool(toolName, args) {
  return new Promise((resolve, reject) => {
    const executable = join(
      fileURLToPath(new URL("..", import.meta.url)),
      "node_modules",
      ".bin",
      process.platform === "win32" ? `${toolName}.cmd` : toolName,
    );
    const child = spawn(executable, args, {
      stdio: "inherit",
      env: createLiveTestEnv(),
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        process.kill(process.pid, signal);
        return;
      }

      if (code === 0) {
        resolve(undefined);
        return;
      }

      reject(new Error(`${toolName} exited with code ${code ?? 1}.`));
    });
  });
}
