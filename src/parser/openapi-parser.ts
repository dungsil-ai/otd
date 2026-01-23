/**
 * OpenAPI 문서 파서
 * swagger-parser를 사용하여 OpenAPI v3 문서를 파싱하고 $ref를 해소합니다.
 * @module parser/openapi-parser
 */

import { existsSync } from "node:fs";
import SwaggerParser from "@apidevtools/swagger-parser";
import type { OpenAPI, OpenAPIV3 } from "openapi-types";
import { AppError } from "../models/types";

/**
 * OpenAPI 문서를 파싱하고 모든 $ref를 해소합니다.
 *
 * @param filePath - OpenAPI 문서 파일 경로 (YAML 또는 JSON)
 * @returns 파싱된 OpenAPI 문서 ($ref 해소됨)
 * @throws {AppError} 파일을 찾을 수 없거나 유효하지 않은 문서인 경우
 */
export async function parseOpenApi(filePath: string): Promise<OpenAPIV3.Document> {
  // 파일 존재 여부 확인
  if (!existsSync(filePath)) {
    throw new AppError(
      "FILE_NOT_FOUND",
      `파일을 찾을 수 없습니다: ${filePath}`,
      "경로를 확인하세요."
    );
  }

  try {
    // swagger-parser로 파싱 및 $ref 해소
    const api = (await SwaggerParser.dereference(filePath)) as OpenAPI.Document;

    // OpenAPI 버전 검증
    if (!isOpenApiV3(api)) {
      throw new AppError(
        "UNSUPPORTED_VERSION",
        "OpenAPI v2는 지원하지 않습니다.",
        "v3로 변환 후 다시 시도하세요."
      );
    }

    // OpenAPI 3.x 버전 확인
    if (!api.openapi.startsWith("3.")) {
      throw new AppError(
        "UNSUPPORTED_VERSION",
        `지원하지 않는 OpenAPI 버전입니다: ${api.openapi}`,
        "OpenAPI 3.0.x 또는 3.1.x 버전을 사용하세요."
      );
    }

    return api;
  } catch (error) {
    // 이미 AppError인 경우 그대로 전달
    if (error instanceof AppError) {
      throw error;
    }

    // swagger-parser 오류 처리
    const errorMessage = error instanceof Error ? error.message : String(error);

    // YAML/JSON 파싱 오류
    if (errorMessage.includes("YAML") || errorMessage.includes("JSON")) {
      throw new AppError(
        "INVALID_OPENAPI",
        "유효하지 않은 OpenAPI 문서입니다.",
        "OpenAPI v3 형식인지 확인하세요.",
        error instanceof Error ? error : undefined
      );
    }

    // 기타 파싱 오류
    throw new AppError(
      "INVALID_OPENAPI",
      "유효하지 않은 OpenAPI 문서입니다.",
      "OpenAPI v3 형식인지 확인하세요.",
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * OpenAPI v3 문서인지 확인합니다.
 *
 * @param api - OpenAPI 문서
 * @returns OpenAPI v3이면 true
 */
function isOpenApiV3(api: OpenAPI.Document): api is OpenAPIV3.Document {
  return "openapi" in api && typeof api.openapi === "string";
}
