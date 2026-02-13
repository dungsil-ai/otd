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
  let edgeCasesDoc: OpenAPIV3.Document;

  beforeAll(async () => {
    completeDoc = (await parseOpenApi("tests/fixtures/complete.yaml")) as OpenAPIV3.Document;
    edgeCasesDoc = (await parseOpenApi("tests/fixtures/edge-cases.yaml")) as OpenAPIV3.Document;
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

  describe("중첩 스키마 지원", () => {
    it("array<object> 속성의 중첩 스키마를 children으로 추출해야 한다", () => {
      // GET /users 200 응답: array<User> - (items)가 object이며 children 있어야 함
      const result = extractEndpoints(completeDoc);
      const usersGetEndpoint = result.endpoints.find(
        (e) => e.path === "/users" && e.method === "GET"
      );

      const okResponse = usersGetEndpoint?.responses.find((r) => r.statusCode === "200");
      expect(okResponse).toBeDefined();

      // array 스키마의 (items) 속성에 children이 있어야 함
      const itemsProp = okResponse?.properties.find((p) => p.name === "(items)");
      expect(itemsProp).toBeDefined();
      expect(itemsProp?.type).toBe("object");
      expect(itemsProp?.children).toBeDefined();
      expect(itemsProp?.children?.length).toBeGreaterThan(0);

      // User 스키마의 속성이 children으로 포함되어야 함
      const childNames = itemsProp?.children?.map((c) => c.name) ?? [];
      expect(childNames).toContain("id");
      expect(childNames).toContain("email");
    });

    it("중첩 object 속성의 스키마를 children으로 추출해야 한다", () => {
      // edge-cases.yaml의 /complex/deep-nested: DeepNested 스키마
      const result = extractEndpoints(edgeCasesDoc);
      const deepNestedEndpoint = result.endpoints.find(
        (e) => e.path === "/complex/deep-nested" && e.method === "POST"
      );

      const requestBody = deepNestedEndpoint?.requestBodies[0];
      expect(requestBody).toBeDefined();

      // level1은 object이므로 children이 있어야 함
      const level1Prop = requestBody?.properties.find((p) => p.name === "level1");
      expect(level1Prop).toBeDefined();
      expect(level1Prop?.type).toBe("object");
      expect(level1Prop?.children).toBeDefined();
      expect(level1Prop?.children?.length).toBeGreaterThan(0);

      // level2도 중첩된 children이 있어야 함
      const level2Prop = level1Prop?.children?.find((c) => c.name === "level2");
      expect(level2Prop).toBeDefined();
      expect(level2Prop?.children).toBeDefined();
    });

    it("단순 배열 속성은 children이 없어야 한다", () => {
      // Product.tags는 array<string>이므로 children이 없어야 함
      const result = extractEndpoints(completeDoc);
      const productsGetEndpoint = result.endpoints.find(
        (e) => e.path === "/products" && e.method === "GET"
      );

      const okResponse = productsGetEndpoint?.responses.find((r) => r.statusCode === "200");
      const itemsProp = okResponse?.properties.find((p) => p.name === "(items)");
      expect(itemsProp?.children).toBeDefined();

      // Product의 tags 필드는 array<string>이므로 children이 없어야 함
      const tagsProp = itemsProp?.children?.find((c) => c.name === "tags");
      expect(tagsProp).toBeDefined();
      expect(tagsProp?.type).toBe("array<string>");
      expect(tagsProp?.children).toBeUndefined();
    });

    it("응답의 중첩 스키마도 children으로 추출해야 한다", () => {
      // /complex/deep-nested 200 응답
      const result = extractEndpoints(edgeCasesDoc);
      const deepNestedEndpoint = result.endpoints.find(
        (e) => e.path === "/complex/deep-nested" && e.method === "POST"
      );

      const okResponse = deepNestedEndpoint?.responses.find((r) => r.statusCode === "200");
      expect(okResponse).toBeDefined();

      const level1Prop = okResponse?.properties.find((p) => p.name === "level1");
      expect(level1Prop?.children).toBeDefined();
      expect(level1Prop?.children?.length).toBeGreaterThan(0);
    });

    it("allOf 스키마의 속성을 병합하여 추출해야 한다", () => {
      const result = extractEndpoints(edgeCasesDoc);
      const allOfEndpoint = result.endpoints.find(
        (e) => e.path === "/complex/all-of" && e.method === "POST"
      );

      const requestBody = allOfEndpoint?.requestBodies[0];
      expect(requestBody).toBeDefined();
      expect(requestBody?.properties.length).toBeGreaterThan(0);

      const propNames = requestBody?.properties.map((p) => p.name) ?? [];
      expect(propNames).toContain("id");
      expect(propNames).toContain("name");
    });

    it("oneOf 스키마의 속성을 병합하여 추출해야 한다", () => {
      const result = extractEndpoints(edgeCasesDoc);
      const oneOfEndpoint = result.endpoints.find(
        (e) => e.path === "/complex/one-of" && e.method === "POST"
      );

      const requestBody = oneOfEndpoint?.requestBodies[0];
      expect(requestBody).toBeDefined();
      expect(requestBody?.properties.length).toBeGreaterThan(0);

      const propNames = requestBody?.properties.map((p) => p.name) ?? [];
      expect(propNames).toContain("type");
      expect(propNames).toContain("meow");
      expect(propNames).toContain("bark");
    });

    it("allOf를 포함한 3단계 이상 중첩 스키마를 추출해야 한다", () => {
      const result = extractEndpoints(edgeCasesDoc);
      const composedEndpoint = result.endpoints.find(
        (e) => e.path === "/complex/composed-deep" && e.method === "POST"
      );

      const requestBody = composedEndpoint?.requestBodies[0];
      expect(requestBody).toBeDefined();

      // allOf에서 병합된 id 속성
      const idProp = requestBody?.properties.find((p) => p.name === "id");
      expect(idProp).toBeDefined();
      expect(idProp?.type).toBe("integer");

      // metadata → nested (allOf) → deep → value
      const metadataProp = requestBody?.properties.find((p) => p.name === "metadata");
      expect(metadataProp).toBeDefined();
      expect(metadataProp?.children).toBeDefined();

      const nestedProp = metadataProp?.children?.find((c) => c.name === "nested");
      expect(nestedProp).toBeDefined();
      expect(nestedProp?.children).toBeDefined();

      const deepProp = nestedProp?.children?.find((c) => c.name === "deep");
      expect(deepProp).toBeDefined();
      expect(deepProp?.children).toBeDefined();

      const valueProp = deepProp?.children?.find((c) => c.name === "value");
      expect(valueProp).toBeDefined();
      expect(valueProp?.type).toBe("string");
    });
  });
});
