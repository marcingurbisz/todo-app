import { runNpmScript } from "./live-test-env.mjs";

await runNpmScript("test:ui:live");
import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";

function readTokenFromSecrets() {
  const content = readFileSync(new URL("../secrets.md", import.meta.url), "utf8");
  const match = content.match(/github_pat_[A-Za-z0-9_]+/);

  if (!match) {
    throw new Error("Could not find a GitHub fine-grained PAT in secrets.md.");
  }

  return match[0];
}

const token = process.env.TODO_APP_TEST_TOKEN || readTokenFromSecrets();

const child = spawn(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["run", "test:ui:live"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      TODO_APP_LIVE_E2E: process.env.TODO_APP_LIVE_E2E || "1",
      TODO_APP_TEST_TOKEN: token,
    },
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
