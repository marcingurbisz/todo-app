import { runLiveTestTool } from "./live-test-env.mjs";

await runLiveTestTool("vitest", ["run", "src/app/lib/github.live.test.ts"]);
