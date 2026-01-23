#!/usr/bin/env bun
/**
 * otd - OpenAPI To Document
 * OpenAPI v3 문서를 XLSX 형식의 API 명세서로 변환하는 CLI 도구
 * @module index
 */

import { parseCliArgs, showHelp, showProgress, showVersion } from "./cli/commands";
import type { CliOptions } from "./models/types";
import { parseOpenApi } from "./parser/openapi-parser";
import { extractEndpoints } from "./transformer/endpoint-extractor";
import { handleError } from "./utils/error-handler";
import { writeXlsx } from "./writer/xlsx-writer";

/**
 * 메인 실행 함수
 */
async function main(): Promise<void> {
  try {
    // CLI 인자 파싱
    const options: CliOptions = parseCliArgs(Bun.argv.slice(2));

    // --help 또는 --version 처리 (FR-016: 우선순위)
    if (options.help) {
      showHelp();
      process.exit(0);
    }

    if (options.version) {
      showVersion();
      process.exit(0);
    }

    // OpenAPI 문서 파싱
    showProgress(`📄 OpenAPI 문서 읽는 중: ${options.inputPath}`);
    const document = await parseOpenApi(options.inputPath);

    // 엔드포인트 정보 추출
    showProgress("🔄 API 엔드포인트 추출 중...");
    const xlsxData = extractEndpoints(document);
    showProgress(`✅ ${xlsxData.endpoints.length}개의 API 항목을 발견했습니다.`);

    // XLSX 파일 생성
    showProgress("📊 XLSX 파일 생성 중...");
    const outputPath = await writeXlsx(xlsxData, options);

    // 성공 메시지 출력 (stdout)
    console.log(`변환 완료: ${outputPath}`);
    process.exit(0);
  } catch (error) {
    handleError(error);
  }
}

// 실행
main();
