/**
 * CLI Commands 단위 테스트
 * @module tests/cli.test
 */

import { describe, expect, it } from "bun:test";
import { parseCliArgs, resolveOutputPath } from "../src/cli/commands";
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

  describe("resolveOutputPath", () => {
    it("출력 경로가 지정되면 그대로 반환해야 한다", () => {
      const result = resolveOutputPath("input.yaml", "output.xlsx");

      expect(result).toBe("output.xlsx");
    });

    it("확장자가 없으면 .xlsx를 추가해야 한다", () => {
      const result = resolveOutputPath("input.yaml", "output");

      expect(result).toBe("output.xlsx");
    });

    it("대소문자 구분 없이 .xlsx 확장자를 인식해야 한다", () => {
      const result = resolveOutputPath("input.yaml", "output.XLSX");

      expect(result).toBe("output.XLSX");
    });

    it("디렉토리 경로면 입력 파일명을 사용해야 한다", () => {
      const result = resolveOutputPath("input.yaml", "./docs/");

      expect(result).toBe("./docs/input.xlsx");
    });

    it("출력 경로가 없으면 입력 파일명 기반으로 생성해야 한다", () => {
      const result = resolveOutputPath("input.yaml");

      expect(result).toBe("input.xlsx");
    });

    it("입력 경로에 디렉토리가 있으면 해당 디렉토리에 생성해야 한다", () => {
      const result = resolveOutputPath("./specs/input.yaml");

      expect(result).toBe("./specs/input.xlsx");
    });
  });
});
