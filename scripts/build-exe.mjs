import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const version = process.env.OTD_VERSION ?? packageJson.version;
const buildDate = process.env.OTD_BUILD_DATE ?? new Date().toISOString().slice(0, 10);

const targets = [
  { target: "bun-linux-x64", output: "otd-linux-x64" },
  { target: "bun-linux-arm64", output: "otd-linux-arm64" },
  { target: "bun-darwin-x64", output: "otd-darwin-x64" },
  { target: "bun-darwin-arm64", output: "otd-darwin-arm64" },
  { target: "bun-windows-x64", output: "otd-windows-x64.exe" },
];

const outdir = "dist/exe";
mkdirSync(outdir, { recursive: true });

let failed = false;

for (const { target, output } of targets) {
  console.log(`Building ${output} (${target})...`);

  const result = spawnSync(
    "bun",
    [
      "build",
      "src/index.ts",
      "--compile",
      "--target",
      target,
      "--outfile",
      `${outdir}/${output}`,
      "--define",
      `OTD_VERSION=${JSON.stringify(version)}`,
      "--define",
      `OTD_BUILD_DATE=${JSON.stringify(buildDate)}`,
    ],
    { stdio: "inherit" }
  );

  if (result.status !== 0) {
    console.error(`Failed to build ${output}`);
    if (result.error) {
      console.error(result.error);
    }
    failed = true;
  } else {
    console.log(`Successfully built ${output}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log(`\nAll executables built in ${outdir}/`);
