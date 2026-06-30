import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type RunBlock = {
  file: string;
  line: number;
  script: string;
};

type ReleaseActionStep = {
  file: string;
  line: number;
  inputs: Map<string, string>;
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

function findWithIndex(lines: string[], startIndex: number, indent: number): number {
  return lines.findIndex(
    (line, lineIndex) =>
      lineIndex > startIndex && leadingSpaces(line) === indent && line.trim() === "with:"
  );
}

function collectWithInputs(
  lines: string[],
  withIndex: number,
  parentIndent: number
): Map<string, string> {
  const inputs = new Map<string, string>();

  for (let inputIndex = withIndex + 1; inputIndex < lines.length; inputIndex += 1) {
    const line = lines[inputIndex];

    if (line.trim() === "") {
      continue;
    }

    if (leadingSpaces(line) <= parentIndent) {
      break;
    }

    const inputMatch = /^\s+([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/.exec(line);
    if (inputMatch) {
      inputs.set(inputMatch[1], inputMatch[2].trim());
    }
  }

  return inputs;
}

function extractReleaseActionSteps(file: string): ReleaseActionStep[] {
  const content = readFileSync(join(process.cwd(), file), "utf8");
  const lines = content.split(/\r?\n/);
  const steps: ReleaseActionStep[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const usesMatch = /^(\s*)uses:\s*softprops\/action-gh-release@/.exec(lines[index]);
    if (!usesMatch) {
      continue;
    }

    const usesIndent = usesMatch[1].length;
    const withIndex = findWithIndex(lines, index, usesIndent);

    if (withIndex === -1) {
      continue;
    }

    steps.push({
      file,
      line: index + 1,
      inputs: collectWithInputs(lines, withIndex, usesIndent),
    });
  }

  return steps;
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

  it("prerelease assets should be uploaded to draft releases", () => {
    const releaseSteps = workflowFiles.flatMap(extractReleaseActionSteps);
    const unsafePrereleases = releaseSteps.filter(
      (step) =>
        step.inputs.get("prerelease") === "true" &&
        step.inputs.has("files") &&
        step.inputs.get("draft") !== "true"
    );

    expect(
      unsafePrereleases,
      unsafePrereleases
        .map((step) => `${step.file}:${step.line} uses prerelease assets without draft: true`)
        .join("\n")
    ).toEqual([]);
  });
});
