/**
 * Endpoint Extractor 단위 테스트
 * @module tests/transformer.test
 */

import { beforeAll, describe, expect, it } from "bun:test";
import type { OpenAPIV3 } from "openapi-types";
import { parseOpenApi } from "../src/parser/openapi-parser";
import { extractEndpoints } from "../src/transformer/endpoint-extractor";

describe("Endpoint Extractor", () => {
  let completeDoc: OpenAPIV3.Document;

  beforeAll(async () => {
    completeDoc = (await parseOpenApi("tests/fixtures/complete.yaml")) as OpenAPIV3.Document;
  });

  describe("extractEndpoints", () => {
    it("XlsxData 구조를 반환해야 한다", () => {
      const result = extractEndpoints(completeDoc);

      expect(result).toBeDefined();
      expect(result.meta).toBeDefined();
      expect(result.endpoints).toBeDefined();
      expect(result.securitySchemes).toBeDefined();
    });

    it("API 메타 정보를 올바르게 추출해야 한다", () => {
      const result = extractEndpoints(completeDoc);

      expect(result.meta.title).toBe("Complete API");
      expect(result.meta.version).toBe("2.0.0");
      expect(result.meta.servers.length).toBeGreaterThan(0);
    });

    it("모든 엔드포인트를 추출해야 한다", () => {
      const result = extractEndpoints(completeDoc);

      // complete.yaml에는 여러 엔드포인트가 있음
      expect(result.endpoints.length).toBeGreaterThan(0);
    });

    it("각 엔드포인트에 필수 정보가 포함되어야 한다", () => {
      const result = extractEndpoints(completeDoc);
      const endpoint = result.endpoints[0];

      expect(endpoint).toBeDefined();
      expect(endpoint?.method).toBeDefined();
      expect(endpoint?.path).toBeDefined();
      expect(endpoint?.responses).toBeDefined();
    });

    it("HTTP 메서드가 대문자로 정규화되어야 한다", () => {
      const result = extractEndpoints(completeDoc);

      for (const endpoint of result.endpoints) {
        expect(endpoint.method).toMatch(/^(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)$/);
      }
    });

    it("파라미터 정보가 추출되어야 한다", () => {
      const result = extractEndpoints(completeDoc);

      // /users endpoint has query parameters
      const usersGetEndpoint = result.endpoints.find(
        (e) => e.path === "/users" && e.method === "GET"
      );

      expect(usersGetEndpoint?.parameters.length).toBeGreaterThan(0);
    });

    it("요청 본문 정보가 추출되어야 한다", () => {
      const result = extractEndpoints(completeDoc);

      // POST /users has request body
      const usersPostEndpoint = result.endpoints.find(
        (e) => e.path === "/users" && e.method === "POST"
      );

      expect(usersPostEndpoint?.requestBodies.length).toBeGreaterThan(0);
    });

    it("응답 정보가 추출되어야 한다", () => {
      const result = extractEndpoints(completeDoc);
      const endpoint = result.endpoints[0];

      expect(endpoint?.responses.length).toBeGreaterThan(0);
      expect(endpoint?.responses[0]?.statusCode).toBeDefined();
    });

    it("태그 정보가 추출되어야 한다", () => {
      const result = extractEndpoints(completeDoc);

      const usersEndpoint = result.endpoints.find((e) => e.path === "/users");
      expect(usersEndpoint?.tags).toContain("users");
    });

    it("보안 스키마 정보가 추출되어야 한다", () => {
      const result = extractEndpoints(completeDoc);

      expect(result.securitySchemes.length).toBeGreaterThan(0);

      const apiKeyScheme = result.securitySchemes.find((s) => s.name === "ApiKeyAuth");
      expect(apiKeyScheme).toBeDefined();
      expect(apiKeyScheme?.type).toBe("apiKey");
    });
  });
});
