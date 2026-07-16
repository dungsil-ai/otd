/**
 * CLI Commands 단위 테스트
 * @module tests/cli.test
 */

import { afterEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseCliArgs,
  resolveBuildDate,
  resolvePackageVersionFrom,
  resolveVersion,
} from "../src/cli/commands";
import { AppError } from "../src/models/types";

describe("CLI Commands", () => {
  describe("parseCliArgs", () => {
    it("입력 파일 경로를 파싱해야 한다", () => {
      const options = parseCliArgs(["input.yaml"]);

      expect(options.inputPath).toBe("input.yaml");
      expect(options.help).toBe(false);
      expect(options.version).toBe(false);
    });

    it("--output 옵션을 파싱해야 한다", () => {
      const options = parseCliArgs(["input.yaml", "--output", "output.xlsx"]);

      expect(options.inputPath).toBe("input.yaml");
      expect(options.outputPath).toBe("output.xlsx");
    });

    it("-o 단축 옵션을 파싱해야 한다", () => {
      const options = parseCliArgs(["-o", "output.xlsx", "input.yaml"]);

      expect(options.outputPath).toBe("output.xlsx");
      expect(options.inputPath).toBe("input.yaml");
    });

    it("--force 옵션을 파싱해야 한다", () => {
      const options = parseCliArgs(["input.yaml", "--force"]);

      expect(options.force).toBe(true);
    });

    it("-f 단축 옵션을 파싱해야 한다", () => {
      const options = parseCliArgs(["-f", "input.yaml"]);

      expect(options.force).toBe(true);
    });

    it("--help 옵션이 즉시 반환되어야 한다 (FR-016)", () => {
      const options = parseCliArgs(["--help", "-o", "output.xlsx"]);

      expect(options.help).toBe(true);
      // 다른 옵션은 파싱되지 않음
      expect(options.outputPath).toBeUndefined();
    });

    it("-h 단축 옵션이 즉시 반환되어야 한다", () => {
      const options = parseCliArgs(["-h"]);

      expect(options.help).toBe(true);
    });

    it("--version 옵션이 즉시 반환되어야 한다 (FR-016)", () => {
      const options = parseCliArgs(["--version", "input.yaml"]);

      expect(options.version).toBe(true);
      // 입력 파일은 파싱되지 않음
      expect(options.inputPath).toBe("");
    });

    it("-v 단축 옵션이 즉시 반환되어야 한다", () => {
      const options = parseCliArgs(["-v"]);

      expect(options.version).toBe(true);
    });

    it("알 수 없는 옵션에 대해 AppError를 던져야 한다", () => {
      expect(() => parseCliArgs(["--unknown-option", "input.yaml"])).toThrow(AppError);
    });

    it("입력 파일 없이 실행하면 도움말 옵션이 활성화되어야 한다", () => {
      const options = parseCliArgs([]);

      expect(options.help).toBe(true);
    });

    it("옵션 순서에 관계없이 동작해야 한다", () => {
      const options1 = parseCliArgs(["input.yaml", "-o", "output.xlsx", "-f"]);
      const options2 = parseCliArgs(["-f", "-o", "output.xlsx", "input.yaml"]);

      expect(options1.inputPath).toBe("input.yaml");
      expect(options2.inputPath).toBe("input.yaml");
      expect(options1.outputPath).toBe("output.xlsx");
      expect(options2.outputPath).toBe("output.xlsx");
      expect(options1.force).toBe(true);
      expect(options2.force).toBe(true);
    });
  });

  describe("version/build metadata resolution", () => {
    const tempDirs: string[] = [];

    afterEach(() => {
      for (const dir of tempDirs) {
        rmSync(dir, { recursive: true, force: true });
      }
      tempDirs.length = 0;
    });

    it("resolveVersion should prefer defined value over env/npm/package fallback", () => {
      const version = resolveVersion({
        definedVersion: "9.9.9",
        envVersion: "8.8.8",
        npmPackageVersion: "7.7.7",
        packageVersion: "6.6.6",
      });

      expect(version).toBe("9.9.9");
    });

    it("resolveVersion should use package version before default", () => {
      const version = resolveVersion({
        packageVersion: "2.3.4",
      });

      expect(version).toBe("2.3.4");
    });

    it("resolveBuildDate should prefer defined value over env/fallback", () => {
      const buildDate = resolveBuildDate({
        definedBuildDate: "2030-01-03",
        envBuildDate: "2030-01-02",
        fallbackBuildDate: "2030-01-01",
      });

      expect(buildDate).toBe("2030-01-03");
    });

    it("resolveBuildDate should use a stable development default without injected metadata", () => {
      const buildDate = resolveBuildDate();

      expect(buildDate).toBe("development");
    });

    it("resolvePackageVersionFrom should traverse parent directories", () => {
      const root = mkdtempSync(join(tmpdir(), "otd-cli-version-"));
      tempDirs.push(root);
      const nested = join(root, "a", "b", "c");
      mkdirSync(nested, { recursive: true });
      writeFileSync(join(root, "package.json"), JSON.stringify({ version: "4.5.6" }));

      const version = resolvePackageVersionFrom(nested);

      expect(version).toBe("4.5.6");
    });

    it("resolvePackageVersionFrom should ignore invalid package.json and continue", () => {
      const root = mkdtempSync(join(tmpdir(), "otd-cli-version-"));
      tempDirs.push(root);
      const parent = join(root, "parent");
      const nested = join(parent, "child");
      mkdirSync(nested, { recursive: true });
      writeFileSync(join(parent, "package.json"), "{ invalid json ");
      writeFileSync(join(root, "package.json"), JSON.stringify({ version: "5.6.7" }));

      const version = resolvePackageVersionFrom(nested);

      expect(version).toBe("5.6.7");
    });
  });
});
