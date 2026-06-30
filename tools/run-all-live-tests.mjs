import { runNpmScript } from "./live-test-env.mjs";

await runNpmScript("test:live");
await runNpmScript("test:ui:live");
