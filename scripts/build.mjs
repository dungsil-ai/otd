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

const browserResult = spawnSync(
  "bun",
  [
    "build",
    "src/static/openapi-browser.ts",
    "--target",
    "browser",
    "--outfile",
    "dist/openapi-to-document.js",
    "--banner",
    // ExcelJS and json-schema-ref-parser reference the global Buffer.
    // Polyfill it before any module code runs so browser builds work correctly.
    "if(typeof globalThis.Buffer==='undefined'){globalThis.Buffer={isBuffer:function(v){return v!=null&&v._isBuffer===true},from:function(d,e){if(typeof d==='string'){const t=new TextEncoder();return t.encode(d);}return d instanceof Uint8Array?d:new Uint8Array(d);},alloc:function(n){return new Uint8Array(n)},concat:function(list){const total=list.reduce((s,b)=>s+b.length,0);const out=new Uint8Array(total);let off=0;for(const b of list){out.set(b,off);off+=b.length;}return out;}};}\n",
  ],
  { stdio: "inherit" }
);

if (browserResult.status !== 0) {
  if (browserResult.error) {
    console.error("Failed to run browser build with 'bun':", browserResult.error);
  }
  process.exit(typeof browserResult.status === "number" ? browserResult.status : 1);
}

mkdirSync("dist", { recursive: true });
copyFileSync("src/static/index.html", "dist/index.html");
