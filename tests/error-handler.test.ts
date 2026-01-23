/**
 * Error Handler 단위 테스트
 * @module tests/error-handler.test
 */

import { describe, expect, it } from "bun:test";
import { AppError, EXIT_CODES } from "../src/models/types";
import { ErrorMessages } from "../src/utils/error-handler";

describe("Error Handler", () => {
  describe("AppError", () => {
    it("올바른 속성을 가져야 한다", () => {
      const error = new AppError("FILE_NOT_FOUND", "파일을 찾을 수 없습니다", "경로를 확인하세요.");

      expect(error.code).toBe("FILE_NOT_FOUND");
      expect(error.message).toBe("파일을 찾을 수 없습니다");
      expect(error.hint).toBe("경로를 확인하세요.");
      expect(error.name).toBe("AppError");
    });

    it("올바른 종료 코드를 반환해야 한다", () => {
      const error = new AppError("FILE_NOT_FOUND", "테스트", "힌트");

      expect(error.exitCode).toBe(1);
    });

    it("원인 오류를 포함할 수 있어야 한다", () => {
      const cause = new Error("원인 오류");
      const error = new AppError("INVALID_OPENAPI", "테스트", "힌트", cause);

      expect(error.cause).toBe(cause);
    });
  });

  describe("EXIT_CODES", () => {
    it("파일 시스템 오류는 종료 코드 1을 가져야 한다", () => {
      expect(EXIT_CODES.FILE_NOT_FOUND).toBe(1);
      expect(EXIT_CODES.FILE_EXISTS).toBe(1);
      expect(EXIT_CODES.FILE_READ_ERROR).toBe(1);
    });

    it("OpenAPI 파싱 오류는 종료 코드 2를 가져야 한다", () => {
      expect(EXIT_CODES.INVALID_OPENAPI).toBe(2);
      expect(EXIT_CODES.UNSUPPORTED_VERSION).toBe(2);
    });

    it("출력 오류는 종료 코드 3을 가져야 한다", () => {
      expect(EXIT_CODES.WRITE_ERROR).toBe(3);
    });
  });

  describe("ErrorMessages", () => {
    it("fileNotFound가 올바른 AppError를 반환해야 한다", () => {
      const error = ErrorMessages.fileNotFound("/path/to/file.yaml");

      expect(error.code).toBe("FILE_NOT_FOUND");
      expect(error.message).toContain("/path/to/file.yaml");
    });

    it("fileExists가 올바른 AppError를 반환해야 한다", () => {
      const error = ErrorMessages.fileExists("/path/to/output.xlsx");

      expect(error.code).toBe("FILE_EXISTS");
      expect(error.hint).toContain("--force");
    });

    it("invalidOpenApi가 올바른 AppError를 반환해야 한다", () => {
      const error = ErrorMessages.invalidOpenApi();

      expect(error.code).toBe("INVALID_OPENAPI");
    });

    it("unsupportedVersion이 올바른 AppError를 반환해야 한다", () => {
      const error = ErrorMessages.unsupportedVersion();

      expect(error.code).toBe("UNSUPPORTED_VERSION");
      expect(error.hint).toContain("v3");
    });

    it("unknownOption이 올바른 AppError를 반환해야 한다", () => {
      const error = ErrorMessages.unknownOption("--bad-option");

      expect(error.code).toBe("UNKNOWN_OPTION");
      expect(error.message).toContain("--bad-option");
    });

    it("missingArgument가 올바른 AppError를 반환해야 한다", () => {
      const error = ErrorMessages.missingArgument();

      expect(error.code).toBe("MISSING_ARGUMENT");
    });
  });
});
