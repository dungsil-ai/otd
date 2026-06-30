import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type RunBlock = {
  file: string;
  line: number;
  script: string;
};

const workflowFiles = [
  ".github/workflows/ci.yml",
  ".github/workflows/nightly-release.yml",
  ".github/workflows/preview.yml",
  ".github/workflows/release.yml",
];

function leadingSpaces(line: string): number {
  return line.match(/^ */)?.[0].length ?? 0;
}

function extractRunBlocks(file: string): RunBlock[] {
  const content = readFileSync(join(process.cwd(), file), "utf8");
  const lines = content.split(/\r?\n/);
  const blocks: RunBlock[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const match = /^(\s*)run:\s*\|\s*$/.exec(lines[index]);
    if (!match) {
      continue;
    }

    const line = index + 1;
    const runIndent = match[1].length;
    const contentIndent = runIndent + 2;
    const scriptLines: string[] = [];
    index += 1;

    while (index < lines.length) {
      const line = lines[index];

      if (line.trim() === "") {
        scriptLines.push("");
        index += 1;
        continue;
      }

      if (leadingSpaces(line) <= runIndent) {
        index -= 1;
        break;
      }

      scriptLines.push(line.slice(Math.min(leadingSpaces(line), contentIndent)));
      index += 1;
    }

    blocks.push({
      file,
      line,
      script: scriptLines.join("\n"),
    });
  }

  return blocks;
}

describe("GitHub Actions workflows", () => {
  it("run blocks should be valid bash scripts", () => {
    const runBlocks = workflowFiles.flatMap(extractRunBlocks);

    expect(runBlocks.length).toBeGreaterThan(0);

    for (const block of runBlocks) {
      const result = spawnSync("bash", ["-n"], {
        input: block.script,
        encoding: "utf8",
      });

      expect(
        result.status,
        `${block.file}:${block.line} contains invalid bash:\n${result.stderr}\n--- script ---\n${block.script}`
      ).toBe(0);
    }
  });
});
