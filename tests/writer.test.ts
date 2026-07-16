/**
 * XLSX Writer 단위 테스트
 * @module tests/writer.test
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { existsSync, unlinkSync } from "node:fs";
import type { OpenAPIV3 } from "openapi-types";
import type { CliOptions, XlsxData } from "../src/models/types";
import { parseOpenApi } from "../src/parser/openapi-parser";
import { extractEndpoints } from "../src/transformer/endpoint-extractor";
import { createWorkbook, writeXlsx } from "../src/writer/xlsx-writer";

describe("XLSX Writer", () => {
  let xlsxData: XlsxData;
  const testOutputPath = "tests/fixtures/test-output.xlsx";

  beforeAll(async () => {
    const doc = (await parseOpenApi("tests/fixtures/complete.yaml")) as OpenAPIV3.Document;
    xlsxData = extractEndpoints(doc);
  });

  afterAll(() => {
    // 테스트 출력 파일 정리
    if (existsSync(testOutputPath)) {
      unlinkSync(testOutputPath);
    }
  });

  describe("writeXlsx", () => {
    it("XLSX 파일을 생성해야 한다", async () => {
      const options: CliOptions = {
        inputPath: "tests/fixtures/complete.yaml",
        outputPath: testOutputPath,
        force: true,
        help: false,
        version: false,
      };

      const result = await writeXlsx(xlsxData, options);

      expect(result).toBe(testOutputPath);
      expect(existsSync(testOutputPath)).toBe(true);
    });

    it("생성된 파일이 유효한 XLSX 형식이어야 한다", async () => {
      const options: CliOptions = {
        inputPath: "tests/fixtures/complete.yaml",
        outputPath: testOutputPath,
        force: true,
        help: false,
        version: false,
      };

      await writeXlsx(xlsxData, options);

      // 파일이 존재하고 크기가 0보다 큰지 확인
      const file = Bun.file(testOutputPath);
      expect(await file.exists()).toBe(true);
      expect(file.size).toBeGreaterThan(0);
    });

    it("인증 스키마가 없으면 인증 시트를 생성하지 않아야 한다", () => {
      const workbook = createWorkbook({
        ...xlsxData,
        securitySchemes: [],
      });

      const sheetNames = workbook.worksheets.map((worksheet) => worksheet.name);

      expect(sheetNames).toContain("개요");
      expect(sheetNames).not.toContain("인증");
      expect(sheetNames).toContain("API 항목");
    });

    it("기존 파일이 있고 force가 false면 오류를 던져야 한다", async () => {
      // 먼저 파일 생성
      const options: CliOptions = {
        inputPath: "tests/fixtures/complete.yaml",
        outputPath: testOutputPath,
        force: true,
        help: false,
        version: false,
      };
      await writeXlsx(xlsxData, options);

      // force: false로 다시 시도
      const optionsNoForce: CliOptions = {
        ...options,
        force: false,
      };

      await expect(writeXlsx(xlsxData, optionsNoForce)).rejects.toThrow();
    });
  });
  describe("createTagSheets with sanitization", () => {
    it("금지 문자가 포함된 태그명을 정리하고 중복을 구분해야 한다", async () => {
      const doc = (await parseOpenApi("tests/fixtures/edge-cases.yaml")) as OpenAPIV3.Document;
      const data = extractEndpoints(doc);
      data.tags = data.tags.map((tag) =>
        tag.name === "users:admin" || tag.name === "users/admin" ? { name: tag.name } : tag
      );

      const workbook = createWorkbook(data);
      const sheetNames = workbook.worksheets.map((worksheet) => worksheet.name);

      expect(sheetNames).toContain("users admin API");
      expect(sheetNames).toContain("users admin API (2)");
    });

    it("31자가 같은 접두사의 시트명을 번호 접미사로 구분해야 한다", async () => {
      const doc = (await parseOpenApi("tests/fixtures/edge-cases.yaml")) as OpenAPIV3.Document;
      const data = extractEndpoints(doc);
      const prefix = "A".repeat(31);
      data.tags = data.tags.map((tag) => {
        if (tag.name === "VeryLongTagNameThirtyCharsAAAA") {
          return { ...tag, description: `${prefix}A` };
        }
        if (tag.name === "VeryLongTagNameThirtyCharsBBBB") {
          return { ...tag, description: `${prefix}B` };
        }
        return tag;
      });

      const workbook = createWorkbook(data);
      const sheetNames = workbook.worksheets.map((worksheet) => worksheet.name);

      expect(sheetNames).toContain(prefix);
      expect(sheetNames).toContain(`${"A".repeat(27)} (2)`);
    });
  });
});
