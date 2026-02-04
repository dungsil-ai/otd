/**
 * CLI 명령어 및 옵션 처리
 * @module cli/commands
 */

import type { CliOptions } from "../models/types";
import { AppError } from "../models/types";

/** 버전 정보 */
const VERSION = "1.0.0";
const BUILD_DATE = "2026-01-19";

/**
 * CLI 인자를 파싱합니다.
 *
 * @param args - 명령줄 인자 배열 (Bun.argv.slice(2))
 * @returns 파싱된 옵션
 * @throws {AppError} 알 수 없는 옵션이나 필수 인자 누락 시
 */
export function parseCliArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    inputPath: "",
    outputPath: undefined,
    force: false,
    help: false,
    version: false,
  };

  let i = 0;
  const positionalArgs: string[] = [];

  while (i < args.length) {
    const arg = args[i];
    if (!arg) {
      i++;
      continue;
    }
    const result = parseOptionToken(arg, args, i, options);

    if (result.type === "return") {
      return options;
    }

    if (result.type === "advance") {
      i = result.nextIndex;
      continue;
    }

    if (result.type === "unknown") {
      throw new AppError(
        "UNKNOWN_OPTION",
        `알 수 없는 옵션: ${arg}`,
        "'otd --help'로 사용 가능한 옵션을 확인하세요."
      );
    }

    positionalArgs.push(arg);
    i++;
  }

  // help나 version이 아닌 경우 입력 파일 필수
  if (!options.help && !options.version) {
    if (positionalArgs.length === 0) {
      // 인자가 없으면 도움말 표시
      options.help = true;
      return options;
    }
    options.inputPath = positionalArgs[0] ?? "";
  }

  return options;
}

type OptionParseResult =
  | { type: "return" }
  | { type: "advance"; nextIndex: number }
  | { type: "unknown" }
  | { type: "none" };

function parseOptionToken(
  arg: string,
  args: string[],
  index: number,
  options: CliOptions
): OptionParseResult {
  // --help, -h 처리 (FR-016: 우선순위)
  if (arg === "--help" || arg === "-h") {
    options.help = true;
    return { type: "return" };
  }

  // --version, -v 처리 (FR-016: 우선순위)
  if (arg === "--version" || arg === "-v") {
    options.version = true;
    return { type: "return" };
  }

  // --output, -o 옵션
  if (arg === "--output" || arg === "-o") {
    const outputPath = args[index + 1];
    if (!outputPath || outputPath.startsWith("-")) {
      throw new AppError(
        "MISSING_ARGUMENT",
        "--output 옵션에 경로가 필요합니다.",
        "사용법: otd -o <경로> <입력파일>"
      );
    }
    options.outputPath = outputPath;
    return { type: "advance", nextIndex: index + 2 };
  }

  // --force, -f 옵션
  if (arg === "--force" || arg === "-f") {
    options.force = true;
    return { type: "advance", nextIndex: index + 1 };
  }

  if (arg.startsWith("-")) {
    return { type: "unknown" };
  }

  return { type: "none" };
}

/**
 * 도움말을 stdout에 출력합니다.
 */
export function showHelp(): void {
  const helpText = `otd - OpenAPI To Document 변환 도구

사용법:
  otd [옵션] <입력파일>

인자:
  입력파일    OpenAPI v3 문서 파일 (YAML 또는 JSON)

옵션:
  -o, --output <경로>  출력 파일 경로 (기본값: 입력파일명.xlsx)
  -f, --force          기존 파일 덮어쓰기
  -h, --help           도움말 표시
  -v, --version        버전 정보 표시

예시:
  otd openapi.yaml
  otd openapi.json -o api-spec.xlsx
  otd spec.yaml -o ./docs/ --force
`;

  console.log(helpText);
}

/**
 * 버전 정보를 stdout에 출력합니다.
 */
export function showVersion(): void {
  console.log(`otd v${VERSION} (${BUILD_DATE})`);
}

/**
 * 진행 상황을 stderr에 출력합니다.
 *
 * @param message - 진행 상황 메시지
 */
export function showProgress(message: string): void {
  console.error(message);
}

/**
 * 출력 경로를 결정합니다.
 *
 * @param inputPath - 입력 파일 경로
 * @param outputPath - 출력 경로 옵션 (선택)
 * @returns 최종 출력 경로
 */
export function resolveOutputPath(inputPath: string, outputPath?: string): string {
  if (outputPath) {
    // 디렉토리인 경우 입력 파일명 사용
    if (outputPath.endsWith("/") || outputPath.endsWith("\\")) {
      const inputName = getFileNameWithoutExt(inputPath);
      return `${outputPath}${inputName}.xlsx`;
    }

    // 확장자가 없으면 추가
    if (!outputPath.toLowerCase().endsWith(".xlsx")) {
      return `${outputPath}.xlsx`;
    }

    return outputPath;
  }

  // 기본: 입력 파일과 동일한 위치, 동일한 이름
  const inputName = getFileNameWithoutExt(inputPath);
  const inputDir = getDirectory(inputPath);

  return inputDir ? `${inputDir}/${inputName}.xlsx` : `${inputName}.xlsx`;
}

/**
 * 파일 경로에서 디렉토리를 추출합니다.
 */
function getDirectory(filePath: string): string {
  const lastSlash = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
  if (lastSlash === -1) return "";
  return filePath.substring(0, lastSlash);
}

/**
 * 파일명에서 확장자를 제거합니다.
 */
function getFileNameWithoutExt(filePath: string): string {
  const fileName = filePath.split(/[/\\]/).pop() ?? filePath;
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName;
}
