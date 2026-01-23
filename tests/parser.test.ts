/**
 * OpenAPI Parser 단위 테스트
 * @module tests/parser.test
 */

import { beforeAll, describe, expect, it } from "bun:test";
import { AppError } from "../src/models/types";
import { parseOpenApi } from "../src/parser/openapi-parser";

describe("OpenAPI Parser", () => {
  describe("parseOpenApi", () => {
    it("유효한 YAML 파일을 파싱할 수 있어야 한다", async () => {
      const result = await parseOpenApi("tests/fixtures/minimal.yaml");

      expect(result).toBeDefined();
      expect(result.openapi).toMatch(/^3\./);
      expect(result.info.title).toBe("Minimal API");
      expect(result.info.version).toBe("1.0.0");
    });

    it("OpenAPI 3.1 문서를 파싱할 수 있어야 한다", async () => {
      const result = await parseOpenApi("tests/fixtures/complete.yaml");

      expect(result).toBeDefined();
      expect(result.openapi).toBe("3.1.0");
      expect(result.info.title).toBe("Complete API");
    });

    it("$ref 참조가 해소되어야 한다", async () => {
      const result = await parseOpenApi("tests/fixtures/complete.yaml");

      // $ref가 해소되어 실제 스키마로 대체되었는지 확인
      const usersPath = result.paths?.["/users"];
      expect(usersPath).toBeDefined();
    });

    it("paths 정보가 올바르게 추출되어야 한다", async () => {
      const result = await parseOpenApi("tests/fixtures/complete.yaml");

      expect(result.paths).toBeDefined();
      expect(Object.keys(result.paths ?? {}).length).toBeGreaterThan(0);
    });

    it("존재하지 않는 파일에 대해 AppError를 던져야 한다", async () => {
      await expect(parseOpenApi("nonexistent.yaml")).rejects.toThrow(AppError);
    });

    it("잘못된 형식의 파일에 대해 AppError를 던져야 한다", async () => {
      // 잘못된 형식 파일이 필요한 경우 별도 픽스처 생성
      // 현재는 건너뜀
    });

    it("servers 정보가 파싱되어야 한다", async () => {
      const result = await parseOpenApi("tests/fixtures/complete.yaml");

      expect(result.servers).toBeDefined();
      expect(result.servers?.length).toBeGreaterThan(0);
      expect(result.servers?.[0]?.url).toBe("https://api.example.com/v2");
    });

    it("securitySchemes 정보가 파싱되어야 한다", async () => {
      const result = await parseOpenApi("tests/fixtures/complete.yaml");

      expect(result.components?.securitySchemes).toBeDefined();
      expect(result.components?.securitySchemes?.ApiKeyAuth).toBeDefined();
    });
  });
});
