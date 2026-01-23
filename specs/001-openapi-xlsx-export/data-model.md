# Data Model: OpenAPI to XLSX Export

**Date**: 2026-01-15
**Feature**: 001-openapi-xlsx-export

## 도메인 엔티티

### 1. OpenApiDocument

OpenAPI 파서가 반환하는 문서 전체 구조. `openapi-types`의 `OpenAPIV3.Document` 타입 사용.

```typescript
// openapi-types에서 제공
interface OpenAPIV3.Document {
  openapi: string;           // "3.0.0" | "3.1.0"
  info: InfoObject;
  paths?: PathsObject;
  components?: ComponentsObject;
  // ...
}
```

### 2. EndpointInfo

변환기가 추출하는 개별 API 항목 정보.

```typescript
interface EndpointInfo {
  method: HttpMethod;        // 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  path: string;              // '/users/{id}'
  summary: string;           // '사용자 조회'
  description: string;       // '상세 설명'
  parameters: ParameterInfo[];
  requestBody?: RequestBodyInfo;
  responses: ResponseInfo[];
  tags: string[];
  operationId?: string;
}
```

### 3. ParameterInfo

요청 매개변수 정보.

```typescript
interface ParameterInfo {
  name: string;              // 'id'
  in: 'query' | 'path' | 'header' | 'cookie';
  required: boolean;
  type: string;              // 'string', 'integer', 'array'
  description?: string;
}
```

### 4. RequestBodyInfo

요청 본문 정보.

```typescript
interface RequestBodyInfo {
  required: boolean;
  contentType: string;       // 'application/json'
  schema: string;            // 스키마의 문자열 표현
}
```

### 5. ResponseInfo

응답 정보.

```typescript
interface ResponseInfo {
  statusCode: string;        // '200', '404', 'default'
  description: string;       // '성공'
  contentType?: string;
  schema?: string;
}
```

### 6. XlsxRow

XLSX 파일의 단일 행 데이터.

```typescript
interface XlsxRow {
  method: string;
  path: string;
  summary: string;
  description: string;
  parameters: string;        // 문자열로 직렬화
  requestBody: string;       // 문자열로 직렬화
  responses: string;         // 문자열로 직렬화
  tags: string;
}
```

### 7. CliOptions

CLI 옵션 파싱 결과.

```typescript
interface CliOptions {
  inputPath: string;
  outputPath?: string;
  force: boolean;
  help: boolean;
  version: boolean;
}
```

### 8. AppError

구조화된 오류.

```typescript
interface AppError {
  code: ErrorCode;
  message: string;
  cause?: Error;
}

type ErrorCode =
  | 'FILE_NOT_FOUND'
  | 'FILE_EXISTS'
  | 'FILE_READ_ERROR'
  | 'INVALID_OPENAPI'
  | 'UNSUPPORTED_VERSION'
  | 'WRITE_ERROR'
  | 'UNKNOWN_OPTION'
  | 'MISSING_ARGUMENT';
```

## 데이터 흐름

```
┌─────────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ OpenAPI     │───►│ Parser      │───►│ Transformer  │───►│ XLSX Writer │
│ (YAML/JSON) │    │             │    │              │    │             │
└─────────────┘    └─────────────┘    └──────────────┘    └─────────────┘
                         │                   │                   │
                         ▼                   ▼                   ▼
                   OpenAPIV3.Document  EndpointInfo[]      Excel Workbook
```

## 상태 전이

이 도구는 상태 비저장(stateless) CLI이므로 상태 전이 다이어그램 없음.

## 검증 규칙

| 엔티티 | 필드 | 규칙 |
|--------|------|------|
| CliOptions | inputPath | 필수, 존재하는 파일 경로 |
| CliOptions | outputPath | 선택, .xlsx 확장자 자동 추가 |
| OpenApiDocument | openapi | "3.0" 또는 "3.1"로 시작해야 함 |
| EndpointInfo | method | 유효한 HTTP 메서드 |
| EndpointInfo | path | "/"로 시작해야 함 |
