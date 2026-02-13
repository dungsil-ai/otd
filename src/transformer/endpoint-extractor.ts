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
  SampleInfo,
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

  // example 값 추출 (param.example 우선, 그 다음 schema.example)
  let example: string | undefined;
  const rawExample = param.example ?? schema?.example;
  if (rawExample !== undefined) {
    example = formatParameterExample(param, rawExample);
  }

  // 배열인 경우 타입을 array<itemType> 형태로 표시
  let type: string = schema?.type ?? "string";
  if (schema?.type === "array" && schema.items) {
    const itemSchema = schema.items as OpenAPIV3.SchemaObject;
    const itemType = itemSchema.type ?? "string";
    type = `array<${itemType}>`;
  }

  return {
    name: param.name,
    in: param.in as ParameterInfo["in"],
    required: param.required ?? false,
    type,
    format: schema?.format,
    description: param.description,
    example,
  };
}

/**
 * 파라미터 예시를 적절한 형식으로 포맷합니다.
 * 쿼리스트링 파라미터는 실제 URL 형식(key=value)으로 변환합니다.
 */
function formatParameterExample(param: OpenAPIV3.ParameterObject, rawExample: unknown): string {
  // query 파라미터인 경우 key=value 형식으로 변환
  if (param.in === "query") {
    // 배열인 경우
    if (Array.isArray(rawExample)) {
      const style = param.style ?? "form";
      const explode = param.explode ?? style === "form";

      if (explode) {
        // explode=true: name=value1&name=value2
        return rawExample.map((v) => `${param.name}=${encodeURIComponent(String(v))}`).join("&");
      }
      // explode=false: name=value1,value2
      return `${param.name}=${rawExample.map((v) => encodeURIComponent(String(v))).join(",")}`;
    }
    // 단일 값인 경우: name=value
    return `${param.name}=${encodeURIComponent(String(rawExample))}`;
  }

  // query가 아닌 경우 (path, header, cookie)
  if (typeof rawExample === "string") {
    return rawExample;
  }

  // 그 외의 경우 JSON 문자열로 변환
  return JSON.stringify(rawExample);
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
  const grouped = new Map<string, GroupedContentEntry>();

  // 모든 content type 추출
  for (const [contentType, mediaType] of Object.entries(requestBody.content)) {
    const entry = buildMediaTypeEntry(mediaType);

    // 파일 관련 content-type은 별도 항목으로 분리
    if (isFileContentType(contentType)) {
      result.push({
        required,
        contentType,
        schema: entry.schemaText || "(파일)",
        properties: entry.properties,
        samples: [], // 파일은 샘플 생성 불가
      });
      continue;
    }

    const signature = buildSchemaSignature(entry.schemaText, entry.properties);
    addGroupedEntry(grouped, signature, contentType, entry);
  }

  // 그룹화된 항목 추가
  for (const entry of grouped.values()) {
    result.push({
      required,
      contentType: entry.contentTypes.join(", "),
      schema: entry.schema,
      properties: entry.properties,
      samples: resolveSamples(entry),
    });
  }

  return result;
}

/**
 * MediaType에서 examples를 추출합니다.
 */
function extractMediaTypeExamples(mediaType: OpenAPIV3.MediaTypeObject): Map<string, SampleInfo> {
  const result = new Map<string, SampleInfo>();

  // 1. examples (named examples) 처리 - 우선순위 높음
  if (mediaType.examples) {
    for (const [name, exampleOrRef] of Object.entries(mediaType.examples)) {
      const example = exampleOrRef as OpenAPIV3.ExampleObject;
      if (example.value !== undefined) {
        result.set(name, {
          name,
          summary: example.summary,
          value:
            typeof example.value === "string"
              ? example.value
              : JSON.stringify(example.value, null, 2),
        });
      }
    }
  }

  // 2. example (단일 예시) 처리 - examples가 없을 때만
  if (result.size === 0 && mediaType.example !== undefined) {
    result.set("default", {
      value:
        typeof mediaType.example === "string"
          ? mediaType.example
          : JSON.stringify(mediaType.example, null, 2),
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
        samples: [],
      });
      continue;
    }

    const grouped = groupResponseContentEntries(contentEntries, result, statusCode, description);

    // 그룹별로 ResponseInfo 생성
    for (const entry of grouped.values()) {
      result.push({
        statusCode,
        description,
        contentType: entry.contentTypes.join(", "),
        schema: entry.schema,
        properties: entry.properties,
        samples: resolveSamples(entry),
      });
    }
  }

  return result;
}

type GroupedContentEntry = {
  contentTypes: string[];
  schema: string;
  properties: SchemaPropertyInfo[];
  schemaObject?: OpenAPIV3.SchemaObject;
  examples: Map<string, SampleInfo>;
};

type MediaTypeEntry = {
  schemaText: string;
  properties: SchemaPropertyInfo[];
  schemaObject?: OpenAPIV3.SchemaObject;
  examples: Map<string, SampleInfo>;
};

function buildMediaTypeEntry(mediaType: OpenAPIV3.MediaTypeObject): MediaTypeEntry {
  const schema = mediaType?.schema as OpenAPIV3.SchemaObject | undefined;
  return {
    schemaText: schemaToString(schema),
    properties: extractSchemaProperties(schema),
    schemaObject: schema,
    examples: extractMediaTypeExamples(mediaType),
  };
}

function addGroupedEntry(
  grouped: Map<string, GroupedContentEntry>,
  signature: string,
  contentType: string,
  entry: MediaTypeEntry
): void {
  const existing = grouped.get(signature);
  if (existing) {
    existing.contentTypes.push(contentType);
    mergeExamples(existing.examples, entry.examples);
    return;
  }

  grouped.set(signature, {
    contentTypes: [contentType],
    schema: entry.schemaText,
    properties: entry.properties,
    schemaObject: entry.schemaObject,
    examples: entry.examples,
  });
}

function mergeExamples(target: Map<string, SampleInfo>, source: Map<string, SampleInfo>): void {
  for (const [name, sample] of source) {
    if (!target.has(name)) {
      target.set(name, sample);
    }
  }
}

function resolveSamples(entry: GroupedContentEntry): SampleInfo[] {
  const samples = Array.from(entry.examples.values());
  if (samples.length > 0) {
    return samples;
  }

  const generated = generateSampleJson(entry.schemaObject);
  return generated ? [{ value: generated }] : [];
}

function groupResponseContentEntries(
  contentEntries: [string, OpenAPIV3.MediaTypeObject][],
  result: ResponseInfo[],
  statusCode: string,
  description: string
): Map<string, GroupedContentEntry> {
  const grouped = new Map<string, GroupedContentEntry>();

  for (const [contentType, mediaType] of contentEntries) {
    const entry = buildMediaTypeEntry(mediaType);

    if (isFileContentType(contentType)) {
      result.push({
        statusCode,
        description,
        contentType,
        schema: entry.schemaText || "(파일)",
        properties: entry.properties,
        samples: [],
      });
      continue;
    }

    const signature = buildSchemaSignature(entry.schemaText, entry.properties);
    addGroupedEntry(grouped, signature, contentType, entry);
  }

  return grouped;
}

function buildSchemaSignature(schema: string, properties: SchemaPropertyInfo[]): string {
  const normalized = [...properties].sort((a, b) => {
    if (a.name !== b.name) return a.name.localeCompare(b.name);
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return (a.format ?? "").localeCompare(b.format ?? "");
  });
  const parts = normalized.map((prop) => {
    const base = [
      prop.name,
      prop.type,
      prop.format ?? "",
      prop.required ? "1" : "0",
      prop.description ?? "",
    ].join("|");
    if (prop.children && prop.children.length > 0) {
      return `${base}[${buildSchemaSignature("", prop.children)}]`;
    }
    return base;
  });
  return `${schema}::${parts.join("||")}`;
}

/** 중첩 스키마 추출 최대 깊이 */
const MAX_SCHEMA_DEPTH = 5;

/**
 * 조합 스키마의 하위 스키마 목록을 추출합니다.
 */
function getComposedSubSchemas(schema: OpenAPIV3.SchemaObject): OpenAPIV3.SchemaObject[] {
  return [
    ...((schema.allOf ?? []) as OpenAPIV3.SchemaObject[]),
    ...((schema.oneOf ?? []) as OpenAPIV3.SchemaObject[]),
    ...((schema.anyOf ?? []) as OpenAPIV3.SchemaObject[]),
  ];
}

/**
 * 해소된 하위 스키마를 병합 대상에 반영합니다.
 */
function mergeResolvedSubSchema(
  resolved: OpenAPIV3.SchemaObject,
  target: {
    properties: Record<string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject>;
    required: string[];
    type: string | undefined;
    items: OpenAPIV3.ArraySchemaObject["items"] | undefined;
  }
): void {
  if (resolved.properties) {
    Object.assign(target.properties, resolved.properties);
  }
  if (resolved.required) {
    target.required.push(...resolved.required);
  }
  target.type ??= resolved.type;
  target.items ??= "items" in resolved ? resolved.items : undefined;
}

/**
 * allOf, oneOf, anyOf 조합 스키마를 병합하여 단일 스키마로 해소합니다.
 */
function resolveComposedSchema(schema: OpenAPIV3.SchemaObject): OpenAPIV3.SchemaObject {
  const composed = getComposedSubSchemas(schema);
  if (composed.length === 0) return schema;

  const target = {
    properties: { ...(schema.properties ?? {}) } as Record<
      string,
      OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
    >,
    required: [...(schema.required ?? [])],
    type: schema.type as string | undefined,
    items: ("items" in schema ? schema.items : undefined) as
      | OpenAPIV3.ArraySchemaObject["items"]
      | undefined,
  };

  for (const sub of composed) {
    mergeResolvedSubSchema(resolveComposedSchema(sub), target);
  }

  return {
    ...schema,
    ...(target.type ? { type: target.type } : {}),
    ...(Object.keys(target.properties).length > 0 ? { properties: target.properties } : {}),
    ...(target.required.length > 0 ? { required: [...new Set(target.required)] } : {}),
    ...(target.items ? { items: target.items } : {}),
  } as OpenAPIV3.SchemaObject;
}

/**
 * 배열 속성의 children을 추출합니다.
 */
function extractArrayChildren(
  propSchema: OpenAPIV3.SchemaObject,
  depth: number
): SchemaPropertyInfo[] | undefined {
  if (propSchema.type !== "array" || !propSchema.items) return undefined;

  const itemSchema = resolveComposedSchema(propSchema.items as OpenAPIV3.SchemaObject);
  const itemType = itemSchema.type ?? "object";

  if (itemType === "object" && itemSchema.properties) {
    return extractSchemaProperties(itemSchema, depth + 1);
  }
  return undefined;
}

/**
 * 중첩 객체 속성의 children을 추출합니다.
 */
function extractObjectChildren(
  propSchema: OpenAPIV3.SchemaObject,
  depth: number
): SchemaPropertyInfo[] | undefined {
  const isObject = propSchema.type === "object" || !propSchema.type;
  if (isObject && propSchema.properties) {
    return extractSchemaProperties(propSchema, depth + 1);
  }
  return undefined;
}

/**
 * 스키마에서 속성 정보를 추출합니다.
 * 중첩된 object 및 array<object> 스키마를 재귀적으로 추출합니다.
 * allOf, oneOf, anyOf 조합 스키마도 지원합니다.
 */
function extractSchemaProperties(
  schema: OpenAPIV3.SchemaObject | undefined,
  depth = 0
): SchemaPropertyInfo[] {
  if (!schema || depth > MAX_SCHEMA_DEPTH) return [];

  const resolved = resolveComposedSchema(schema);
  const properties: SchemaPropertyInfo[] = [];

  // 객체 타입인 경우 properties 추출
  if (resolved.properties) {
    const requiredFields = new Set(resolved.required ?? []);
    for (const [name, propSchemaOrRef] of Object.entries(resolved.properties)) {
      const propSchema = propSchemaOrRef as OpenAPIV3.SchemaObject;
      properties.push(extractSingleProperty(name, propSchema, requiredFields, depth));
    }
  }

  // 배열 타입인 경우 items 스키마 표시
  if (resolved.type === "array" && resolved.items) {
    properties.push(extractArrayItemsProperty(resolved.items as OpenAPIV3.SchemaObject, depth));
  }

  return properties;
}

/**
 * 단일 속성 정보를 추출합니다.
 */
function extractSingleProperty(
  name: string,
  propSchema: OpenAPIV3.SchemaObject,
  requiredFields: Set<string>,
  depth: number
): SchemaPropertyInfo {
  const resolved = resolveComposedSchema(propSchema);
  let type: string = resolved.type ?? "object";
  if (resolved.type === "array" && resolved.items) {
    const itemSchema = resolveComposedSchema(resolved.items as OpenAPIV3.SchemaObject);
    type = `array<${itemSchema.type ?? "object"}>`;
  }

  const children = extractArrayChildren(resolved, depth) ?? extractObjectChildren(resolved, depth);

  const prop: SchemaPropertyInfo = {
    name,
    type,
    format: resolved.format,
    required: requiredFields.has(name),
    description: resolved.description,
  };

  if (children && children.length > 0) {
    prop.children = children;
  }

  return prop;
}

/**
 * 배열의 items 속성 정보를 추출합니다.
 */
function extractArrayItemsProperty(
  itemSchema: OpenAPIV3.SchemaObject,
  depth: number
): SchemaPropertyInfo {
  const resolved = resolveComposedSchema(itemSchema);
  const prop: SchemaPropertyInfo = {
    name: "(items)",
    type: resolved.type ?? "object",
    format: resolved.format,
    required: false,
    description: resolved.description,
  };

  const children = extractObjectChildren(resolved, depth);
  if (children && children.length > 0) {
    prop.children = children;
  }

  return prop;
}

/**
 * 스키마를 문자열로 변환합니다.
 */
function schemaToString(schema: OpenAPIV3.SchemaObject | undefined): string {
  if (!schema) return "";

  const resolved = resolveComposedSchema(schema);

  if (resolved.type === "array") {
    const itemSchema = resolved.items as OpenAPIV3.SchemaObject | undefined;
    const itemType = itemSchema?.type ?? "object";
    return `array<${itemType}>`;
  }

  if (resolved.type === "object" || resolved.properties) {
    const propNames = Object.keys(resolved.properties ?? {});
    if (propNames.length > 0) {
      return `object { ${propNames.slice(0, 3).join(", ")}${propNames.length > 3 ? ", ..." : ""} }`;
    }
    return "object";
  }

  return resolved.type ?? "unknown";
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
