/**
 * XLSX 파일 생성기
 * ExcelJS를 사용하여 API 명세서를 XLSX 형식으로 출력합니다.
 * @module writer/xlsx-writer
 */

import { existsSync } from "node:fs";
import { dirname } from "node:path";
import ExcelJS from "exceljs";
import {
  AppError,
  type CliOptions,
  type EndpointInfo,
  type ParameterInfo,
  type ResponseInfo,
  type SchemaPropertyInfo,
  type SecuritySchemeInfo,
  type XlsxData,
} from "../models/types";

// ============================================================================
// 스타일 상수
// ============================================================================

/** 헤더 스타일 */
const HEADER_STYLE: Partial<ExcelJS.Style> = {
  font: { bold: true, color: { argb: "FF1F1F1F" } },
  fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E2F3" } },
  alignment: { vertical: "middle", horizontal: "center" },
  border: {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  },
};

/** 섹션 헤더 스타일 */
const SECTION_HEADER_STYLE: Partial<ExcelJS.Style> = {
  font: { bold: true, size: 12, color: { argb: "FFFFFFFF" } },
  fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } },
  alignment: { vertical: "middle" },
  border: {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  },
};

const SUBTITLE_STYLE: Partial<ExcelJS.Style> = {
  ...SECTION_HEADER_STYLE,
  alignment: { vertical: "middle", horizontal: "center" },
};

const SECONDARY_LABEL_STYLE: Partial<ExcelJS.Style> = {
  font: { bold: true, color: { argb: "FF1F1F1F" } },
  fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E2F3" } },
  alignment: { vertical: "top" },
  border: {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  },
};

/** 라벨 스타일 */
const LABEL_STYLE: Partial<ExcelJS.Style> = {
  font: { bold: true, color: { argb: "FF1F1F1F" } },
  fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F5FB" } },
  alignment: { vertical: "top" },
  border: {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  },
};

const PRIMARY_HEADER_STYLE: Partial<ExcelJS.Style> = {
  font: { bold: true, color: { argb: "FFFFFFFF" } },
  fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } },
  alignment: { vertical: "middle", horizontal: "center" },
  border: {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  },
};

const PRIMARY_LABEL_STYLE: Partial<ExcelJS.Style> = {
  font: { bold: true, color: { argb: "FFFFFFFF" } },
  fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } },
  alignment: { vertical: "top" },
  border: {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  },
};

const PRIMARY_LABEL_CENTER_STYLE: Partial<ExcelJS.Style> = {
  ...PRIMARY_LABEL_STYLE,
  alignment: { vertical: "middle", horizontal: "center" },
};

/** 값 스타일 */
const VALUE_STYLE: Partial<ExcelJS.Style> = {
  alignment: { vertical: "top", wrapText: true },
  border: {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  },
};

/** 테이블 셀 스타일 */
const CELL_STYLE: Partial<ExcelJS.Style> = {
  alignment: { vertical: "top", wrapText: true },
  border: {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  },
};

/** 굵은 테두리 (엔드포인트 블록 외곽선용) */
const THICK_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "medium" },
  left: { style: "medium" },
  bottom: { style: "medium" },
  right: { style: "medium" },
};

// ============================================================================
// 메인 함수
// ============================================================================

/**
 * XLSX 파일을 생성합니다.
 *
 * @param data - XLSX 생성에 필요한 데이터
 * @param options - CLI 옵션
 * @returns 생성된 파일 경로
 * @throws {AppError} 파일 쓰기 오류
 */
export async function writeXlsx(data: XlsxData, options: CliOptions): Promise<string> {
  const outputPath = resolveOutputPath(options);

  // 파일 존재 여부 확인 (force 옵션 처리)
  if (existsSync(outputPath) && !options.force) {
    throw new AppError(
      "FILE_EXISTS",
      `출력 파일이 이미 존재합니다: ${outputPath}`,
      "--force 옵션을 사용하거나 다른 경로를 지정하세요."
    );
  }

  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "otd - OpenAPI To Document";
    workbook.created = new Date();

    // 시트 생성
    createOverviewSheet(workbook, data);
    createAuthSheet(workbook, data.securitySchemes);
    createEndpointsSheet(workbook, data.endpoints);
    createTagSheets(workbook, data);

    // 파일 저장
    await workbook.xlsx.writeFile(outputPath);

    return outputPath;
  } catch (error) {
    if (error instanceof AppError) throw error;

    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new AppError(
      "WRITE_ERROR",
      `출력 파일을 저장할 수 없습니다: ${outputPath}`,
      `원인: ${errorMessage}`,
      error instanceof Error ? error : undefined
    );
  }
}

// ============================================================================
// 경로 처리
// ============================================================================

/**
 * 출력 경로를 결정합니다.
 */
function resolveOutputPath(options: CliOptions): string {
  if (options.outputPath) {
    let path = options.outputPath;

    // 디렉토리인 경우 입력 파일명 사용
    if (path.endsWith("/") || path.endsWith("\\")) {
      const inputName = getFileNameWithoutExt(options.inputPath);
      path = `${path}${inputName}.xlsx`;
    }
    // 확장자가 없으면 추가
    else if (!path.toLowerCase().endsWith(".xlsx")) {
      path = `${path}.xlsx`;
    }

    return path;
  }

  // 기본: 입력 파일과 동일한 위치, 동일한 이름
  const inputDir = dirname(options.inputPath);
  const inputName = getFileNameWithoutExt(options.inputPath);
  return inputDir === "." ? `${inputName}.xlsx` : `${inputDir}/${inputName}.xlsx`;
}

/**
 * 파일명에서 확장자를 제거합니다.
 */
function getFileNameWithoutExt(filePath: string): string {
  const fileName = filePath.split(/[/\\]/).pop() ?? filePath;
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex > 0 ? fileName.substring(0, dotIndex) : fileName;
}

// ============================================================================
// 시트 1: 개요
// ============================================================================

/**
 * 개요 시트를 생성합니다.
 */
function createOverviewSheet(workbook: ExcelJS.Workbook, data: XlsxData): void {
  const sheet = workbook.addWorksheet("개요");

  // 열 너비 설정 (C열: 약 800px로 설정하여 긴 설명도 읽기 편하게)
  sheet.columns = [
    { width: 3 }, // A: 여백
    { width: 15 }, // B: 라벨
    { width: 100 }, // C: 값 (약 800px)
  ];

  // 헤더
  sheet.getCell("B2").value = "속성";
  sheet.getCell("C2").value = "값";
  applyStyle(sheet.getCell("B2"), PRIMARY_HEADER_STYLE);
  applyStyle(sheet.getCell("C2"), PRIMARY_HEADER_STYLE);

  // 데이터
  const rows = [
    ["제목", data.meta.title],
    ["버전", data.meta.version],
    ["서버", formatServers(data.meta.servers)],
    ["설명", data.meta.description],
  ];

  rows.forEach((row, index) => {
    const rowNum = index + 3;
    sheet.getCell(`B${rowNum}`).value = row[0];
    sheet.getCell(`C${rowNum}`).value = row[1];
    applyStyle(sheet.getCell(`B${rowNum}`), PRIMARY_LABEL_STYLE);
    applyStyle(sheet.getCell(`C${rowNum}`), VALUE_STYLE);
  });

  const endRow = 2 + rows.length;
  applyBlockOutline(sheet, 2, endRow, "B", "C");
}

/**
 * 서버 정보를 문자열로 포맷합니다.
 */
function formatServers(servers: { url: string; description?: string }[]): string {
  return servers.map((s) => (s.description ? `${s.url} - ${s.description}` : s.url)).join("\n");
}

// ============================================================================
// 시트 2: 인증
// ============================================================================

/**
 * 인증 시트를 생성합니다.
 */
function createAuthSheet(workbook: ExcelJS.Workbook, schemes: SecuritySchemeInfo[]): void {
  const sheet = workbook.addWorksheet("인증");

  // 열 너비 설정
  sheet.columns = [
    { width: 3 }, // A: 여백
    { width: 15 }, // B: 라벨
    { width: 40 }, // C: 값
  ];

  let currentRow = 2;

  if (schemes.length === 0) {
    sheet.getCell(`B${currentRow}`).value = "정의된 인증 스키마가 없습니다.";
    applyBlockOutline(sheet, currentRow, currentRow, "B", "C");
    return;
  }

  for (const scheme of schemes) {
    const blockStartRow = currentRow;
    // 스키마 이름 헤더
    sheet.getCell(`B${currentRow}`).value = scheme.name;
    applyStyle(sheet.getCell(`B${currentRow}`), SECTION_HEADER_STYLE);
    sheet.mergeCells(`B${currentRow}:C${currentRow}`);
    currentRow++;

    // 스키마 상세
    const details: [string, string][] = [["유형", formatSecurityType(scheme.type)]];

    if (scheme.in) details.push(["위치", scheme.in]);
    if (scheme.parameterName) details.push(["파라미터명", scheme.parameterName]);
    if (scheme.scheme) details.push(["스키마", scheme.scheme]);
    if (scheme.bearerFormat) details.push(["Bearer 형식", scheme.bearerFormat]);
    if (scheme.description) details.push(["설명", scheme.description]);

    for (const [label, value] of details) {
      sheet.getCell(`B${currentRow}`).value = label;
      sheet.getCell(`C${currentRow}`).value = value;
      applyStyle(sheet.getCell(`B${currentRow}`), LABEL_STYLE);
      applyStyle(sheet.getCell(`C${currentRow}`), VALUE_STYLE);
      currentRow++;
    }

    const blockEndRow = currentRow - 1;
    applyBlockOutline(sheet, blockStartRow, blockEndRow, "B", "C");
    currentRow += 2; // 섹션 간 여백
  }
}

/**
 * 보안 타입을 한글로 변환합니다.
 */
function formatSecurityType(type: string): string {
  const typeMap: Record<string, string> = {
    apiKey: "API 키",
    http: "HTTP 인증",
    oauth2: "OAuth 2.0",
    openIdConnect: "OpenID Connect",
  };
  return typeMap[type] ?? type;
}

// ============================================================================
// 시트 3: API 항목
// ============================================================================

/**
 * API 항목 요약 시트를 생성합니다.
 */
function createEndpointsSheet(workbook: ExcelJS.Workbook, endpoints: EndpointInfo[]): void {
  const sheet = workbook.addWorksheet("API 항목");

  // 열 너비 설정
  sheet.columns = [
    { width: 3 }, // A: 여백
    { width: 10 }, // B: 메서드
    { width: 35 }, // C: 경로
    { width: 50 }, // D: 요약
  ];

  // 헤더
  sheet.getCell("B2").value = "메서드";
  sheet.getCell("C2").value = "경로";
  sheet.getCell("D2").value = "요약";
  for (const cell of ["B2", "C2", "D2"]) {
    applyStyle(sheet.getCell(cell), PRIMARY_HEADER_STYLE);
  }

  // 데이터
  let rowNum = 3;
  for (const endpoint of endpoints) {
    sheet.getCell(`B${rowNum}`).value = endpoint.method;
    sheet.getCell(`C${rowNum}`).value = endpoint.path;
    sheet.getCell(`D${rowNum}`).value = endpoint.summary;

    // 셀 스타일 적용
    applyStyle(sheet.getCell(`C${rowNum}`), CELL_STYLE);
    applyStyle(sheet.getCell(`D${rowNum}`), CELL_STYLE);

    // 메서드별 색상
    applyMethodColor(sheet.getCell(`B${rowNum}`), endpoint.method);
    rowNum++;
  }

  const startRow = 2;
  const endRow = rowNum - 1;
  if (endRow >= startRow) {
    applyBlockOutline(sheet, startRow, endRow, "B", "D");
  }
}

/**
 * HTTP 메서드에 따른 색상을 적용합니다.
 */
function applyMethodColor(cell: ExcelJS.Cell, method: string): void {
  const colors: Record<string, string> = {
    GET: "FF28A745", // 녹색
    POST: "FF007BFF", // 파란색
    PUT: "FFFFC107", // 노란색
    DELETE: "FFDC3545", // 빨간색
    PATCH: "FF6F42C1", // 보라색
  };

  const color = colors[method] ?? "FF6C757D";
  cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
  cell.alignment = { horizontal: "center" };
  cell.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  };
}

// ============================================================================
// 시트 4+: 태그별 API 상세
// ============================================================================

/**
 * 태그별 API 상세 시트를 생성합니다.
 */
function createTagSheets(workbook: ExcelJS.Workbook, data: XlsxData): void {
  // 태그 이름 -> description 매핑 (시트명에 사용)
  const tagDescriptions = new Map<string, string>();
  for (const tag of data.tags) {
    if (tag.description) {
      tagDescriptions.set(tag.name, tag.description);
    }
  }

  // 태그별로 엔드포인트 그룹화
  const tagGroups = new Map<string, EndpointInfo[]>();

  for (const endpoint of data.endpoints) {
    const tag = endpoint.tags[0] ?? "기타";
    const group = tagGroups.get(tag) ?? [];
    group.push(endpoint);
    tagGroups.set(tag, group);
  }

  // 각 태그별로 시트 생성
  for (const [tagName, endpoints] of tagGroups) {
    // description이 있으면 사용, 없으면 tag name 사용
    const displayName = tagDescriptions.get(tagName) ?? tagName;
    // 이미 "API"로 끝나면 접미사 생략
    const sheetName = displayName.toUpperCase().endsWith("API")
      ? displayName.substring(0, 31)
      : `${displayName} API`.substring(0, 31);
    const sheet = workbook.addWorksheet(sheetName);

    // 열 너비 설정
    sheet.columns = [
      { width: 3 }, // A: 여백
      { width: 15 }, // B: 라벨/이름
      { width: 20 }, // C: 값/타입
      { width: 12 }, // D: 형식
      { width: 8 }, // E: 필수
      { width: 50 }, // F: 설명
    ];

    let currentRow = 2;

    for (const endpoint of endpoints) {
      currentRow = writeEndpointDetail(sheet, endpoint, data, currentRow);
      currentRow += 3; // 엔드포인트 간 여백
    }
  }
}

/**
 * 단일 엔드포인트 상세 정보를 작성합니다.
 */
function writeEndpointDetail(
  sheet: ExcelJS.Worksheet,
  endpoint: EndpointInfo,
  data: XlsxData,
  startRow: number
): number {
  let row = startRow;

  // 기본 정보 (메서드/엔드포인트/요약/설명/서버)
  sheet.getCell(`B${row}`).value = "메서드";
  sheet.getCell(`C${row}`).value = endpoint.method;
  sheet.getCell(`D${row}`).value = "엔드포인트";
  sheet.getCell(`E${row}`).value = endpoint.path;
  applyStyle(sheet.getCell(`B${row}`), PRIMARY_LABEL_CENTER_STYLE);
  applyStyle(sheet.getCell(`C${row}`), VALUE_STYLE);
  applyStyle(sheet.getCell(`D${row}`), PRIMARY_LABEL_CENTER_STYLE);
  applyStyle(sheet.getCell(`E${row}`), VALUE_STYLE);
  sheet.mergeCells(`E${row}:F${row}`);
  row++;

  const writeMergedRow = (label: string, value: string): void => {
    sheet.getCell(`B${row}`).value = label;
    sheet.getCell(`C${row}`).value = value;
    applyStyle(sheet.getCell(`B${row}`), PRIMARY_LABEL_CENTER_STYLE);
    applyStyle(sheet.getCell(`C${row}`), VALUE_STYLE);
    sheet.mergeCells(`C${row}:F${row}`);
    row++;
  };

  if (endpoint.summary) {
    writeMergedRow("요약", endpoint.summary);
  }

  if (endpoint.description) {
    writeMergedRow("설명", endpoint.description);
  }

  const serverRows = resolveServerRows(data.meta.servers, endpoint.path);
  for (const serverRow of serverRows) {
    writeMergedRow(serverRow.label, serverRow.value);
  }

  // 파라미터 섹션 (기본 정보 바로 다음에 시작)
  if (endpoint.parameters.length > 0) {
    row = writeParametersSection(sheet, endpoint.parameters, row);
    row += 3; // 마진 3행
  }

  // 요청 본문 섹션 (여러 Content-Type 지원)
  for (const requestBody of endpoint.requestBodies) {
    row = writeRequestBodySection(sheet, requestBody, row);
    row += 3; // 마진 3행
  }

  // 응답 섹션
  for (const response of endpoint.responses) {
    row = writeResponseSection(sheet, response, row);
    row += 3; // 마진 3행
  }

  // 엔드포인트 블록 전체에 굵은 외곽선 적용
  applyBlockOutline(sheet, startRow, row - 1, "B", "F");

  return row;
}

/**
 * 파라미터 섹션을 작성합니다.
 */
function writeParametersSection(
  sheet: ExcelJS.Worksheet,
  parameters: ParameterInfo[],
  startRow: number
): number {
  let row = startRow;

  // 섹션 헤더
  sheet.getCell(`B${row}`).value = "파라미터";
  applyStyle(sheet.getCell(`B${row}`), SUBTITLE_STYLE);
  sheet.mergeCells(`B${row}:F${row}`);
  row++;

  // 테이블 헤더
  const headers = ["이름", "위치", "타입", "필수", "설명"];
  ["B", "C", "D", "E", "F"].forEach((col, i) => {
    sheet.getCell(`${col}${row}`).value = headers[i];
    applyStyle(sheet.getCell(`${col}${row}`), HEADER_STYLE);
  });
  row++;

  // 데이터
  for (const param of parameters) {
    sheet.getCell(`B${row}`).value = param.name;
    sheet.getCell(`C${row}`).value = param.in;
    sheet.getCell(`D${row}`).value = param.format ? `${param.type} (${param.format})` : param.type;
    sheet.getCell(`E${row}`).value = param.required ? "O" : "";
    sheet.getCell(`F${row}`).value = param.description ?? "";

    // 테두리 적용
    for (const col of ["B", "C", "D", "E", "F"]) {
      applyStyle(sheet.getCell(`${col}${row}`), CELL_STYLE);
    }
    sheet.getCell(`E${row}`).alignment = { horizontal: "center" };
    row++;
  }

  return row;
}

/**
 * 요청 본문 섹션을 작성합니다.
 */
function writeRequestBodySection(
  sheet: ExcelJS.Worksheet,
  requestBody: { required: boolean; contentType: string; properties: SchemaPropertyInfo[] },
  startRow: number
): number {
  let row = startRow;

  // 섹션 헤더
  sheet.getCell(`B${row}`).value = `요청 바디 (${requestBody.contentType})`;
  applyStyle(sheet.getCell(`B${row}`), SUBTITLE_STYLE);
  sheet.mergeCells(`B${row}:F${row}`);
  row++;

  if (requestBody.properties.length === 0) {
    sheet.getCell(`B${row}`).value = "(스키마 없음)";
    return row + 1;
  }

  // 테이블 헤더
  const headers = ["속성명", "타입", "형식", "필수", "설명"];
  ["B", "C", "D", "E", "F"].forEach((col, i) => {
    sheet.getCell(`${col}${row}`).value = headers[i];
    applyStyle(sheet.getCell(`${col}${row}`), HEADER_STYLE);
  });
  row++;

  // 데이터
  for (const prop of requestBody.properties) {
    sheet.getCell(`B${row}`).value = prop.name;
    sheet.getCell(`C${row}`).value = prop.type;
    sheet.getCell(`D${row}`).value = prop.format ?? "";
    sheet.getCell(`E${row}`).value = prop.required ? "O" : "";
    sheet.getCell(`F${row}`).value = prop.description ?? "";

    // 테두리 적용
    for (const col of ["B", "C", "D", "E", "F"]) {
      applyStyle(sheet.getCell(`${col}${row}`), CELL_STYLE);
    }
    sheet.getCell(`E${row}`).alignment = { horizontal: "center" };
    row++;
  }

  return row;
}

/**
 * 응답 섹션을 작성합니다.
 */
function writeResponseSection(
  sheet: ExcelJS.Worksheet,
  response: ResponseInfo,
  startRow: number
): number {
  let row = startRow;

  // 섹션 헤더
  sheet.getCell(`B${row}`).value = `응답 ${response.statusCode}`;
  applyStyle(sheet.getCell(`B${row}`), SUBTITLE_STYLE);
  sheet.mergeCells(`B${row}:F${row}`);
  row++;

  const writeMetaRow = (label: string, value?: string): void => {
    if (!value) return;
    sheet.getCell(`B${row}`).value = label;
    sheet.getCell(`C${row}`).value = value;
    applyStyle(sheet.getCell(`B${row}`), SECONDARY_LABEL_STYLE);
    applyStyle(sheet.getCell(`C${row}`), VALUE_STYLE);
    sheet.mergeCells(`C${row}:F${row}`);
    row++;
  };

  writeMetaRow("설명", response.description);
  writeMetaRow("지원 형식", response.contentType);

  if (response.properties.length === 0) {
    return row;
  }

  // 테이블 헤더
  const headers = ["속성명", "타입", "형식", "필수", "설명"];
  ["B", "C", "D", "E", "F"].forEach((col, i) => {
    sheet.getCell(`${col}${row}`).value = headers[i];
    applyStyle(sheet.getCell(`${col}${row}`), HEADER_STYLE);
  });
  row++;

  // 데이터
  for (const prop of response.properties) {
    sheet.getCell(`B${row}`).value = prop.name;
    sheet.getCell(`C${row}`).value = prop.type;
    sheet.getCell(`D${row}`).value = prop.format ?? "";
    sheet.getCell(`E${row}`).value = prop.required ? "O" : "";
    sheet.getCell(`F${row}`).value = prop.description ?? "";

    // 테두리 적용
    for (const col of ["B", "C", "D", "E", "F"]) {
      applyStyle(sheet.getCell(`${col}${row}`), CELL_STYLE);
    }
    sheet.getCell(`E${row}`).alignment = { horizontal: "center" };
    row++;
  }

  return row;
}

// ============================================================================
// 유틸리티
// ============================================================================

/**
 * 셀에 스타일을 적용합니다.
 */
function applyStyle(cell: ExcelJS.Cell, style: Partial<ExcelJS.Style>): void {
  if (style.font) cell.font = style.font;
  if (style.fill) cell.fill = style.fill as ExcelJS.Fill;
  if (style.alignment) cell.alignment = style.alignment;
  if (style.border) cell.border = style.border;
}

function resolveServerRows(
  servers: { url: string; description?: string }[],
  endpointPath: string
): { label: string; value: string }[] {
  if (servers.length === 0) {
    return [];
  }

  const normalized = servers.map((server) => ({
    ...server,
    endpointUrl: buildEndpointUrl(server.url, endpointPath),
    descriptor: `${server.description ?? ""} ${server.url}`.toLowerCase(),
  }));

  const devKeywords = ["dev", "development", "staging", "local", "localhost", "test", "qa", "sandbox", "개발", "스테이징", "테스트"];
  const prodKeywords = ["prod", "production", "live", "운영"];

  const devIndex = findServerIndex(normalized, devKeywords);
  const prodIndex = findServerIndex(normalized, prodKeywords);

  const used = new Set<number>();
  const rows: { label: string; value: string }[] = [];

  const resolvedDevIndex = devIndex >= 0 ? devIndex : 0;
  if (resolvedDevIndex >= 0) {
    rows.push({ label: "개발 서버", value: normalized[resolvedDevIndex].endpointUrl });
    used.add(resolvedDevIndex);
  }

  let resolvedProdIndex = prodIndex;
  if (resolvedProdIndex < 0) {
    resolvedProdIndex = normalized.findIndex((_, index) => !used.has(index));
  }

  if (resolvedProdIndex >= 0) {
    rows.push({ label: "운영 서버", value: normalized[resolvedProdIndex].endpointUrl });
    used.add(resolvedProdIndex);
  }

  const extras = normalized.filter((_, index) => !used.has(index));
  extras.forEach((server, index) => {
    const label = server.description ? `추가 서버 (${server.description})` : `추가 서버 ${index + 1}`;
    rows.push({ label, value: server.endpointUrl });
  });

  return rows;
}

function findServerIndex(
  servers: { descriptor: string }[],
  keywords: string[]
): number {
  return servers.findIndex((server) => keywords.some((keyword) => server.descriptor.includes(keyword)));
}

function buildEndpointUrl(baseUrl: string, endpointPath: string): string {
  if (!baseUrl) {
    return endpointPath;
  }
  if (!endpointPath) {
    return baseUrl;
  }
  const trimmedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const trimmedPath = endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`;
  return `${trimmedBase}${trimmedPath}`;
}

/**
 * 블록 영역에 테두리를 적용합니다.
 * - 모든 셀에 기본(thin) 테두리 적용
 * - 외곽에는 굵은(medium) 테두리 적용
 */
function applyBlockOutline(
  sheet: ExcelJS.Worksheet,
  startRow: number,
  endRow: number,
  startCol: string,
  endCol: string
): void {
  const columns = buildColumnRange(startCol, endCol);
  if (columns.length === 0) {
    return;
  }
  const leftCol = columns[0];
  const rightCol = columns[columns.length - 1];

  // 먼저 모든 행을 순회하면서 외곽 테두리 적용
  for (let r = startRow; r <= endRow; r++) {
    const isTopRow = r === startRow;
    const isBottomRow = r === endRow;

    if (columns.length === 1) {
      const cell = sheet.getCell(`${leftCol}${r}`);
      cell.border = {
        top: isTopRow ? THICK_BORDER.top : { style: "thin" },
        left: THICK_BORDER.left,
        bottom: isBottomRow ? THICK_BORDER.bottom : { style: "thin" },
        right: THICK_BORDER.right,
      };
      continue;
    }

    const leftCell = sheet.getCell(`${leftCol}${r}`);
    const rightCell = sheet.getCell(`${rightCol}${r}`);
    const leftMaster = leftCell.isMerged ? leftCell.master : leftCell;
    const rightMaster = rightCell.isMerged ? rightCell.master : rightCell;

    if (leftMaster.address === rightMaster.address) {
      leftMaster.border = {
        top: isTopRow ? THICK_BORDER.top : { style: "thin" },
        left: THICK_BORDER.left,
        bottom: isBottomRow ? THICK_BORDER.bottom : { style: "thin" },
        right: THICK_BORDER.right,
      };
      continue;
    }

    leftMaster.border = {
      top: isTopRow ? THICK_BORDER.top : { style: "thin" },
      left: THICK_BORDER.left, // 항상 굵은 왼쪽 테두리
      bottom: isBottomRow ? THICK_BORDER.bottom : { style: "thin" },
      right: { style: "thin" },
    };

    rightMaster.border = {
      top: isTopRow ? THICK_BORDER.top : { style: "thin" },
      left: { style: "thin" },
      bottom: isBottomRow ? THICK_BORDER.bottom : { style: "thin" },
      right: THICK_BORDER.right, // 항상 굵은 오른쪽 테두리
    };

    const skipMasters = new Set([leftMaster.address, rightMaster.address]);
    const processedMasters = new Set<string>();

    // 중간 셀들에 상하 테두리만 적용
    for (let c = 1; c < columns.length - 1; c++) {
      const col = columns[c];
      const cell = sheet.getCell(`${col}${r}`);
      const master = cell.isMerged ? cell.master : cell;
      if (skipMasters.has(master.address) || processedMasters.has(master.address)) {
        continue;
      }

      const middleBorder: Partial<ExcelJS.Borders> = {
        top: isTopRow ? THICK_BORDER.top : { style: "thin" },
        left: { style: "thin" },
        bottom: isBottomRow ? THICK_BORDER.bottom : { style: "thin" },
        right: { style: "thin" },
      };
      master.border = middleBorder;
      processedMasters.add(master.address);
    }
  }
}

function buildColumnRange(startCol: string, endCol: string): string[] {
  const start = columnToNumber(startCol);
  const end = columnToNumber(endCol);
  if (start === 0 || end === 0) {
    return [];
  }

  const columns: string[] = [];
  const step = start <= end ? 1 : -1;
  for (let i = start; step > 0 ? i <= end : i >= end; i += step) {
    columns.push(numberToColumn(i));
  }
  return columns;
}

function columnToNumber(column: string): number {
  let num = 0;
  const normalized = column.toUpperCase();
  for (let i = 0; i < normalized.length; i++) {
    const code = normalized.charCodeAt(i);
    if (code < 65 || code > 90) {
      continue;
    }
    num = num * 26 + (code - 64);
  }
  return num;
}

function numberToColumn(columnNumber: number): string {
  let num = columnNumber;
  let col = "";
  while (num > 0) {
    const remainder = (num - 1) % 26;
    col = String.fromCharCode(65 + remainder) + col;
    num = Math.floor((num - 1) / 26);
  }
  return col || "A";
}
