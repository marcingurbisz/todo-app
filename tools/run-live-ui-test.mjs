import { runLiveTestTool } from "./live-test-env.mjs";

await runLiveTestTool("playwright", ["test", "e2e/live-ui.spec.ts"]);
