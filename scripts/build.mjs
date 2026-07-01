import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = process.env.OTD_VERSION ?? packageJson.version;
const buildDate = process.env.OTD_BUILD_DATE ?? new Date().toISOString().slice(0, 10);

const result = spawnSync(
  "bun",
  [
    "build",
    "src/index.ts",
    "--outdir",
    "dist",
    "--target",
    "node",
    "--define",
    `OTD_VERSION=${JSON.stringify(version)}`,
    "--define",
    `OTD_BUILD_DATE=${JSON.stringify(buildDate)}`,
  ],
  { stdio: "inherit" }
);

if (result.status !== 0) {
  if (result.error) {
    console.error("Failed to run 'bun':", result.error);
  }
  process.exit(typeof result.status === "number" ? result.status : 1);
}

mkdirSync("dist", { recursive: true });
copyFileSync("src/static/openapi-to-document.html", "dist/openapi-to-document.html");
