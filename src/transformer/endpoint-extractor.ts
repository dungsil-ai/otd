/**
 * OpenAPI에서 엔드포인트 정보를 추출하는 변환기
 * @module transformer/endpoint-extractor
 */

import { sample as generateSample } from "openapi-sampler";
import type { OpenAPIV3 } from "openapi-types";
import type {
  ApiMetaInfo,
  EndpointInfo,
  HttpMethod,
  ParameterInfo,
  RequestBodyInfo,
  ResponseInfo,
  SchemaPropertyInfo,
  SecuritySchemeInfo,
  ServerInfo,
  TagInfo,
  XlsxData,
} from "../models/types";

/** 지원하는 HTTP 메서드 목록 */
const HTTP_METHODS: HttpMethod[] = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"];

/**
 * OpenAPI 문서에서 XLSX 생성에 필요한 데이터를 추출합니다.
 *
 * @param document - 파싱된 OpenAPI 문서
 * @returns XLSX 생성용 데이터
 */
export function extractEndpoints(document: OpenAPIV3.Document): XlsxData {
  return {
    meta: extractMetaInfo(document),
    securitySchemes: extractSecuritySchemes(document),
    endpoints: extractAllEndpoints(document),
    tags: extractTags(document),
  };
}

/**
 * 최상위 태그 정보를 추출합니다.
 */
function extractTags(document: OpenAPIV3.Document): TagInfo[] {
  return (document.tags ?? []).map((tag) => ({
    name: tag.name,
    description: tag.description,
  }));
}

/**
 * API 메타 정보를 추출합니다.
 */
function extractMetaInfo(document: OpenAPIV3.Document): ApiMetaInfo {
  const info = document.info;
  const servers: ServerInfo[] = (document.servers ?? []).map((server) => ({
    url: server.url,
    description: server.description,
  }));

  return {
    title: info.title,
    version: info.version,
    description: info.description ?? "",
    servers,
  };
}

/**
 * 보안 스키마 정보를 추출합니다.
 */
function extractSecuritySchemes(document: OpenAPIV3.Document): SecuritySchemeInfo[] {
  const schemes = document.components?.securitySchemes ?? {};
  const result: SecuritySchemeInfo[] = [];

  for (const [name, schemeOrRef] of Object.entries(schemes)) {
    // $ref가 해소된 상태이므로 직접 접근
    const scheme = schemeOrRef as OpenAPIV3.SecuritySchemeObject;

    const schemeInfo: SecuritySchemeInfo = {
      name,
      type: scheme.type as SecuritySchemeInfo["type"],
      description: scheme.description,
    };

    if (scheme.type === "apiKey") {
      schemeInfo.in = scheme.in as "query" | "header" | "cookie";
      schemeInfo.parameterName = scheme.name;
    } else if (scheme.type === "http") {
      schemeInfo.scheme = scheme.scheme;
      schemeInfo.bearerFormat = scheme.bearerFormat;
    }

    result.push(schemeInfo);
  }

  return result;
}

/**
 * 모든 엔드포인트를 추출합니다.
 */
function extractAllEndpoints(document: OpenAPIV3.Document): EndpointInfo[] {
  const endpoints: EndpointInfo[] = [];
  const paths = document.paths ?? {};

  for (const [path, pathItem] of Object.entries(paths)) {
    if (!pathItem) continue;

    for (const method of HTTP_METHODS) {
      const methodKey = method.toLowerCase() as keyof OpenAPIV3.PathItemObject;
      const operation = pathItem[methodKey] as OpenAPIV3.OperationObject | undefined;

      if (operation) {
        endpoints.push(extractEndpointInfo(path, method, operation, pathItem));
      }
    }
  }

  return endpoints;
}

/**
 * 단일 엔드포인트 정보를 추출합니다.
 */
function extractEndpointInfo(
  path: string,
  method: HttpMethod,
  operation: OpenAPIV3.OperationObject,
  pathItem: OpenAPIV3.PathItemObject
): EndpointInfo {
  // path-level 파라미터와 operation-level 파라미터 병합
  const pathParams = (pathItem.parameters ?? []) as OpenAPIV3.ParameterObject[];
  const operationParams = (operation.parameters ?? []) as OpenAPIV3.ParameterObject[];
  const allParams = [...pathParams, ...operationParams];

  return {
    method,
    path,
    summary: operation.summary ?? "",
    description: operation.description ?? "",
    parameters: allParams.map(extractParameterInfo),
    requestBodies: extractAllRequestBodies(
      operation.requestBody as OpenAPIV3.RequestBodyObject | undefined
    ),
    responses: extractResponsesInfo(operation.responses),
    tags: operation.tags ?? [],
    operationId: operation.operationId,
  };
}

/**
 * 파라미터 정보를 추출합니다.
 */
function extractParameterInfo(param: OpenAPIV3.ParameterObject): ParameterInfo {
  const schema = param.schema as OpenAPIV3.SchemaObject | undefined;

  return {
    name: param.name,
    in: param.in as ParameterInfo["in"],
    required: param.required ?? false,
    type: schema?.type ?? "string",
    format: schema?.format,
    description: param.description,
  };
}

/**
 * 모든 요청 본문 정보를 추출합니다 (여러 Content-Type 지원).
 * application/octet-stream, multipart/* 는 파일 첨부로 별도 분리합니다.
 */
function extractAllRequestBodies(
  requestBody: OpenAPIV3.RequestBodyObject | undefined
): RequestBodyInfo[] {
  if (!requestBody?.content) return [];

  const required = requestBody.required ?? false;
  const result: RequestBodyInfo[] = [];
  const grouped = new Map<
    string,
    {
      contentTypes: string[];
      schema: string;
      properties: SchemaPropertyInfo[];
      schemaObject?: OpenAPIV3.SchemaObject;
    }
  >();

  // 모든 content type 추출
  for (const [contentType, mediaType] of Object.entries(requestBody.content)) {
    const schema = mediaType?.schema as OpenAPIV3.SchemaObject | undefined;
    const schemaText = schemaToString(schema);
    const properties = extractSchemaProperties(schema);

    // 파일 관련 content-type은 별도 항목으로 분리
    if (isFileContentType(contentType)) {
      result.push({
        required,
        contentType,
        schema: schemaText || "(파일)",
        properties,
        sample: undefined, // 파일은 샘플 생성 불가
      });
      continue;
    }

    const signature = buildSchemaSignature(schemaText, properties);
    const entry = grouped.get(signature);
    if (entry) {
      entry.contentTypes.push(contentType);
      continue;
    }
    grouped.set(signature, {
      contentTypes: [contentType],
      schema: schemaText,
      properties,
      schemaObject: schema,
    });
  }

  // 그룹화된 항목 추가
  for (const entry of grouped.values()) {
    result.push({
      required,
      contentType: entry.contentTypes.join(", "),
      schema: entry.schema,
      properties: entry.properties,
      sample: generateSampleJson(entry.schemaObject),
    });
  }

  return result;
}

/**
 * 응답 정보 목록을 추출합니다.
 * 같은 status code 내에서 스키마가 다른 content-type은 별도 항목으로 분리합니다.
 * application/octet-stream, multipart/* 는 파일로 별도 분리합니다.
 */
function extractResponsesInfo(responses: OpenAPIV3.ResponsesObject): ResponseInfo[] {
  const result: ResponseInfo[] = [];

  for (const [statusCode, responseOrRef] of Object.entries(responses)) {
    const response = responseOrRef as OpenAPIV3.ResponseObject;
    const description = response.description ?? "";

    const contentEntries = response.content ? Object.entries(response.content) : [];

    // content가 없는 경우 (예: 204 No Content)
    if (contentEntries.length === 0) {
      result.push({
        statusCode,
        description,
        properties: [],
      });
      continue;
    }

    // 스키마 시그니처 기준으로 그룹화
    const grouped = new Map<
      string,
      {
        contentTypes: string[];
        schema: string;
        properties: SchemaPropertyInfo[];
        schemaObject?: OpenAPIV3.SchemaObject;
      }
    >();

    for (const [contentType, mediaType] of contentEntries) {
      const schema = mediaType?.schema as OpenAPIV3.SchemaObject | undefined;
      const schemaText = schemaToString(schema);
      const properties = extractSchemaProperties(schema);

      // 파일 관련 content-type은 별도 항목으로 분리
      if (isFileContentType(contentType)) {
        result.push({
          statusCode,
          description,
          contentType,
          schema: schemaText || "(파일)",
          properties,
          sample: undefined, // 파일은 샘플 생성 불가
        });
        continue;
      }

      const signature = buildSchemaSignature(schemaText, properties);

      const entry = grouped.get(signature);
      if (entry) {
        entry.contentTypes.push(contentType);
        continue;
      }
      grouped.set(signature, {
        contentTypes: [contentType],
        schema: schemaText,
        properties,
        schemaObject: schema,
      });
    }

    // 그룹별로 ResponseInfo 생성
    for (const entry of grouped.values()) {
      result.push({
        statusCode,
        description,
        contentType: entry.contentTypes.join(", "),
        schema: entry.schema,
        properties: entry.properties,
        sample: generateSampleJson(entry.schemaObject),
      });
    }
  }

  return result;
}

function buildSchemaSignature(schema: string, properties: SchemaPropertyInfo[]): string {
  const normalized = [...properties].sort((a, b) => {
    if (a.name !== b.name) return a.name.localeCompare(b.name);
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return (a.format ?? "").localeCompare(b.format ?? "");
  });
  const parts = normalized.map((prop) =>
    [prop.name, prop.type, prop.format ?? "", prop.required ? "1" : "0", prop.description ?? ""].join(
      "|"
    )
  );
  return `${schema}::${parts.join("||")}`;
}

/**
 * 스키마에서 속성 정보를 추출합니다.
 */
function extractSchemaProperties(schema: OpenAPIV3.SchemaObject | undefined): SchemaPropertyInfo[] {
  if (!schema) return [];

  const properties: SchemaPropertyInfo[] = [];
  const requiredFields = new Set(schema.required ?? []);

  // 객체 타입인 경우 properties 추출
  if (schema.properties) {
    for (const [name, propSchemaOrRef] of Object.entries(schema.properties)) {
      const propSchema = propSchemaOrRef as OpenAPIV3.SchemaObject;
      properties.push({
        name,
        type: propSchema.type ?? "object",
        format: propSchema.format,
        required: requiredFields.has(name),
        description: propSchema.description,
      });

      // 배열인 경우 items 정보 추가
      if (propSchema.type === "array" && propSchema.items) {
        const itemSchema = propSchema.items as OpenAPIV3.SchemaObject;
        properties.push({
          name: `${name}[]`,
          type: itemSchema.type ?? "object",
          format: itemSchema.format,
          required: false,
          description: itemSchema.description,
        });
      }
    }
  }

  // 배열 타입인 경우 items 스키마 표시
  if (schema.type === "array" && schema.items) {
    const itemSchema = schema.items as OpenAPIV3.SchemaObject;
    properties.push({
      name: "(items)",
      type: itemSchema.type ?? "object",
      format: itemSchema.format,
      required: false,
      description: itemSchema.description,
    });
  }

  return properties;
}

/**
 * 스키마를 문자열로 변환합니다.
 */
function schemaToString(schema: OpenAPIV3.SchemaObject | undefined): string {
  if (!schema) return "";

  if (schema.type === "array") {
    const itemSchema = schema.items as OpenAPIV3.SchemaObject | undefined;
    const itemType = itemSchema?.type ?? "object";
    return `array<${itemType}>`;
  }

  if (schema.type === "object") {
    const propNames = Object.keys(schema.properties ?? {});
    if (propNames.length > 0) {
      return `object { ${propNames.slice(0, 3).join(", ")}${propNames.length > 3 ? ", ..." : ""} }`;
    }
    return "object";
  }

  return schema.type ?? "unknown";
}

/**
 * 스키마에서 샘플 JSON 문자열을 생성합니다.
 */
function generateSampleJson(schema: OpenAPIV3.SchemaObject | undefined): string | undefined {
  if (!schema) return undefined;

  try {
    // openapi-sampler는 JSONSchema7 타입을 기대하지만, OpenAPI 스키마와 호환됨
    const sample = generateSample(schema as Parameters<typeof generateSample>[0]);
    return JSON.stringify(sample, null, 2);
  } catch {
    // 샘플 생성 실패 시 undefined 반환
    return undefined;
  }
}

/**
 * 파일 전송 관련 content-type인지 확인합니다.
 */
function isFileContentType(contentType: string): boolean {
  const lower = contentType.toLowerCase();
  return lower === "application/octet-stream" || lower.startsWith("multipart/");
}
