/**
 * 오류 처리 유틸리티
 * @module utils/error-handler
 */

import { AppError } from "../models/types";

/**
 * 오류를 처리하고 적절한 종료 코드로 프로세스를 종료합니다.
 *
 * @param error - 발생한 오류
 */
export function handleError(error: unknown): never {
  if (error instanceof AppError) {
    printError(error.message, error.hint);
    process.exit(error.exitCode);
  }

  // 일반 오류
  const message = error instanceof Error ? error.message : String(error);
  printError(
    `예기치 않은 오류가 발생했습니다: ${message}`,
    "문제가 지속되면 이슈를 등록해 주세요."
  );
  process.exit(1);
}

/**
 * 오류 메시지를 stderr에 출력합니다.
 * 형식: 오류: [메시지]\n      [해결 안내]
 *
 * @param message - 오류 메시지
 * @param hint - 해결 안내 메시지
 */
export function printError(message: string, hint: string): void {
  console.error(`오류: ${message}`);
  console.error(`      ${hint}`);
}

/**
 * 오류 메시지 생성 헬퍼 함수들
 */
export const ErrorMessages = {
  fileNotFound(path: string): AppError {
    return new AppError("FILE_NOT_FOUND", `파일을 찾을 수 없습니다: ${path}`, "경로를 확인하세요.");
  },

  fileExists(path: string): AppError {
    return new AppError(
      "FILE_EXISTS",
      `출력 파일이 이미 존재합니다: ${path}`,
      "--force 옵션을 사용하거나 다른 경로를 지정하세요."
    );
  },

  invalidOpenApi(): AppError {
    return new AppError(
      "INVALID_OPENAPI",
      "유효하지 않은 OpenAPI 문서입니다.",
      "OpenAPI v3 형식인지 확인하세요."
    );
  },

  unsupportedVersion(): AppError {
    return new AppError(
      "UNSUPPORTED_VERSION",
      "OpenAPI v2는 지원하지 않습니다.",
      "v3로 변환 후 다시 시도하세요."
    );
  },

  writeError(path: string): AppError {
    return new AppError(
      "WRITE_ERROR",
      `출력 파일을 저장할 수 없습니다: ${path}`,
      "디렉토리 권한을 확인하세요."
    );
  },

  unknownOption(option: string): AppError {
    return new AppError(
      "UNKNOWN_OPTION",
      `알 수 없는 옵션: ${option}`,
      "'otd --help'로 사용 가능한 옵션을 확인하세요."
    );
  },

  missingArgument(): AppError {
    return new AppError(
      "MISSING_ARGUMENT",
      "입력 파일이 지정되지 않았습니다.",
      "'otd --help'를 실행하세요."
    );
  },
};
