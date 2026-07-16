/**
 * CLI 명령어 및 옵션 처리
 * @module cli/commands
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CliOptions } from "../models/types";
import { AppError } from "../models/types";

/** 버전 정보 */
declare const OTD_VERSION: string | undefined;
declare const OTD_BUILD_DATE: string | undefined;

const DEFAULT_VERSION = "1.0.0";
const DEFAULT_BUILD_DATE = "development";
const VERSION = resolveVersion({
  definedVersion: typeof OTD_VERSION !== "undefined" ? OTD_VERSION : undefined,
  envVersion: process.env.OTD_VERSION,
  npmPackageVersion: process.env.npm_package_version,
  packageVersion: resolvePackageVersion(),
});
const BUILD_DATE = resolveBuildDate({
  definedBuildDate: typeof OTD_BUILD_DATE !== "undefined" ? OTD_BUILD_DATE : undefined,
  envBuildDate: process.env.OTD_BUILD_DATE,
});

export function resolveVersion(params?: {
  definedVersion?: string;
  envVersion?: string;
  npmPackageVersion?: string;
  packageVersion?: string;
}): string {
  return (
    params?.definedVersion ??
    params?.envVersion ??
    params?.npmPackageVersion ??
    params?.packageVersion ??
    DEFAULT_VERSION
  );
}

export function resolveBuildDate(params?: {
  definedBuildDate?: string;
  envBuildDate?: string;
  fallbackBuildDate?: string;
}): string {
  return (
    params?.definedBuildDate ??
    params?.envBuildDate ??
    params?.fallbackBuildDate ??
    DEFAULT_BUILD_DATE
  );
}

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

function resolvePackageVersion(): string {
  return resolvePackageVersionFrom(dirname(fileURLToPath(import.meta.url)));
}

export function resolvePackageVersionFrom(startDir: string): string {
  let dir = startDir;

  while (true) {
    const packageJsonPath = join(dir, "package.json");
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
          version?: string;
        };
        if (packageJson.version) {
          return packageJson.version;
        }
      } catch {
        // Ignore unreadable or invalid package.json and continue traversing
      }
    }

    const parentDir = dirname(dir);
    if (parentDir === dir) {
      break;
    }
    dir = parentDir;
  }

  return DEFAULT_VERSION;
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
