/**
 * 공유 타입 정의
 * @module models/types
 */

// ============================================================================
// HTTP 메서드 타입
// ============================================================================

/** 지원하는 HTTP 메서드 */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";

// ============================================================================
// OpenAPI 변환 관련 타입
// ============================================================================

/**
 * 개별 API 엔드포인트 정보
 * OpenAPI paths에서 추출된 정보를 정규화한 구조
 */
export interface EndpointInfo {
  /** HTTP 메서드 */
  method: HttpMethod;
  /** API 경로 (예: '/users/{id}') */
  path: string;
  /** 요약 설명 */
  summary: string;
  /** 상세 설명 */
  description: string;
  /** 요청 매개변수 목록 */
  parameters: ParameterInfo[];
  /** 요청 본문 정보 (여러 Content-Type 지원) */
  requestBodies: RequestBodyInfo[];
  /** 응답 정보 목록 */
  responses: ResponseInfo[];
  /** 태그 목록 */
  tags: string[];
  /** Operation ID (선택) */
  operationId?: string;
}

/**
 * 요청 매개변수 정보
 */
export interface ParameterInfo {
  /** 매개변수 이름 */
  name: string;
  /** 매개변수 위치 */
  in: "query" | "path" | "header" | "cookie";
  /** 필수 여부 */
  required: boolean;
  /** 데이터 타입 */
  type: string;
  /** 데이터 형식 (선택) */
  format?: string;
  /** 설명 (선택) */
  description?: string;
  /** 예시 값 (선택) */
  example?: string;
}

/**
 * 요청 본문 정보
 */
export interface RequestBodyInfo {
  /** 필수 여부 */
  required: boolean;
  /** Content-Type */
  contentType: string;
  /** 스키마 문자열 표현 */
  schema: string;
  /** 스키마 속성 목록 */
  properties: SchemaPropertyInfo[];
  /** 샘플 데이터 목록 */
  samples: SampleInfo[];
}

/**
 * 샘플 데이터 정보
 */
export interface SampleInfo {
  /** 샘플 이름 (선택, named example의 경우) */
  name?: string;
  /** 샘플 요약 (선택) */
  summary?: string;
  /** 샘플 JSON 문자열 */
  value: string;
}

/**
 * 스키마 속성 정보
 */
export interface SchemaPropertyInfo {
  /** 속성 이름 */
  name: string;
  /** 데이터 타입 */
  type: string;
  /** 데이터 형식 (선택) */
  format?: string;
  /** 필수 여부 */
  required: boolean;
  /** 설명 (선택) */
  description?: string;
}

/**
 * 응답 정보
 */
export interface ResponseInfo {
  /** HTTP 상태 코드 */
  statusCode: string;
  /** 응답 설명 */
  description: string;
  /** Content-Type (선택) */
  contentType?: string;
  /** 스키마 문자열 표현 (선택) */
  schema?: string;
  /** 스키마 속성 목록 */
  properties: SchemaPropertyInfo[];
  /** 샘플 데이터 목록 */
  samples: SampleInfo[];
}

/**
 * API 문서 메타 정보
 */
export interface ApiMetaInfo {
  /** API 제목 */
  title: string;
  /** API 버전 */
  version: string;
  /** API 설명 */
  description: string;
  /** 서버 목록 */
  servers: ServerInfo[];
}

/**
 * 서버 정보
 */
export interface ServerInfo {
  /** 서버 URL */
  url: string;
  /** 서버 설명 (선택) */
  description?: string;
}

/**
 * 보안 스키마 정보
 */
export interface SecuritySchemeInfo {
  /** 스키마 이름 */
  name: string;
  /** 스키마 유형 */
  type: "apiKey" | "http" | "oauth2" | "openIdConnect";
  /** 위치 (apiKey 전용) */
  in?: "query" | "header" | "cookie";
  /** 파라미터명 (apiKey 전용) */
  parameterName?: string;
  /** 스키마 (http 전용) */
  scheme?: string;
  /** Bearer 형식 (http 전용) */
  bearerFormat?: string;
  /** 설명 (선택) */
  description?: string;
}

// ============================================================================
// CLI 관련 타입
// ============================================================================

/**
 * CLI 옵션 파싱 결과
 */
export interface CliOptions {
  /** 입력 파일 경로 */
  inputPath: string;
  /** 출력 파일 경로 (선택) */
  outputPath?: string;
  /** 기존 파일 덮어쓰기 여부 */
  force: boolean;
  /** 도움말 표시 요청 */
  help: boolean;
  /** 버전 표시 요청 */
  version: boolean;
}

// ============================================================================
// 오류 관련 타입
// ============================================================================

/**
 * 오류 코드 타입
 */
export type ErrorCode =
  | "FILE_NOT_FOUND"
  | "FILE_EXISTS"
  | "FILE_READ_ERROR"
  | "INVALID_OPENAPI"
  | "UNSUPPORTED_VERSION"
  | "WRITE_ERROR"
  | "UNKNOWN_OPTION"
  | "MISSING_ARGUMENT";

/**
 * 오류 코드별 종료 코드 매핑
 */
export const EXIT_CODES: Record<ErrorCode, number> = {
  FILE_NOT_FOUND: 1,
  FILE_EXISTS: 1,
  FILE_READ_ERROR: 1,
  INVALID_OPENAPI: 2,
  UNSUPPORTED_VERSION: 2,
  WRITE_ERROR: 3,
  UNKNOWN_OPTION: 1,
  MISSING_ARGUMENT: 1,
};

/**
 * 구조화된 애플리케이션 오류
 */
export class AppError extends Error {
  /** 오류 코드 */
  readonly code: ErrorCode;
  /** 원인 오류 (선택) */
  readonly cause?: Error;
  /** 해결 안내 메시지 */
  readonly hint: string;

  constructor(code: ErrorCode, message: string, hint: string, cause?: Error) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.hint = hint;
    this.cause = cause;
  }

  /**
   * 종료 코드 반환
   */
  get exitCode(): number {
    return EXIT_CODES[this.code];
  }
}

// ============================================================================
// XLSX 관련 타입
// ============================================================================

/**
 * XLSX 생성에 필요한 전체 데이터
 */
export interface XlsxData {
  /** API 메타 정보 */
  meta: ApiMetaInfo;
  /** 보안 스키마 목록 */
  securitySchemes: SecuritySchemeInfo[];
  /** 엔드포인트 목록 */
  endpoints: EndpointInfo[];
  /** 태그 목록 (시트명에 사용) */
  tags: TagInfo[];
}

/**
 * 태그 정보
 */
export interface TagInfo {
  /** 태그 이름 */
  name: string;
  /** 태그 설명 (선택) */
  description?: string;
}

