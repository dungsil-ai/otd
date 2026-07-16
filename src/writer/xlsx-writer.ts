/**
 * XLSX 파일 생성기
 * ExcelJS를 사용하여 API 명세서를 XLSX 형식으로 출력합니다.
 * @module writer/xlsx-writer
 */

import ExcelJS from "exceljs";
import {
  AppError,
  type CliOptions,
  type EndpointInfo,
  type ParameterInfo,
  type RequestBodyInfo,
  type ResponseInfo,
  type SchemaPropertyInfo,
  type SecuritySchemeInfo,
  type XlsxData,
} from "../models/types";
import {
  buildEndpointUrl,
  formatSampleTitle,
  isFileContentType,
  PARAMETER_TYPE_LABELS,
  PARAMETER_TYPE_ORDER,
  resolveOutputPath,
  sanitizeSheetName,
} from "../utils/common";

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
  const { existsSync } = await import("node:fs");
  const outputPath = resolveOutputPath(options.inputPath, options.outputPath);

  // 파일 존재 여부 확인 (force 옵션 처리)
  if (existsSync(outputPath) && !options.force) {
    throw new AppError(
      "FILE_EXISTS",
      `출력 파일이 이미 존재합니다: ${outputPath}`,
      "--force 옵션을 사용하거나 다른 경로를 지정하세요."
    );
  }

  try {
    const workbook = createWorkbook(data);

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

export function createWorkbook(data: XlsxData): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "otd - OpenAPI To Document";
  workbook.created = new Date();

  createOverviewSheet(workbook, data);
  if (data.securitySchemes.length > 0) {
    createAuthSheet(workbook, data.securitySchemes);
  }
  createEndpointsSheet(workbook, data.endpoints);
  createTagSheets(workbook, data);

  return workbook;
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

function buildTagDescriptions(tags: XlsxData["tags"]): Map<string, string> {
  const descriptions = new Map<string, string>();
  for (const tag of tags) {
    if (tag.description) {
      descriptions.set(tag.name, tag.description);
    }
  }
  return descriptions;
}

/**
 * 태그별 API 상세 시트를 생성합니다.
 */
function createTagSheets(workbook: ExcelJS.Workbook, data: XlsxData): void {
  const tagDescriptions = buildTagDescriptions(data.tags);

  // 태그별로 엔드포인트 그룹화
  const tagGroups = new Map<string, EndpointInfo[]>();

  for (const endpoint of data.endpoints) {
    const tags = endpoint.tags.length > 0 ? endpoint.tags : ["기타"];
    for (const tag of tags) {
      const group = tagGroups.get(tag) ?? [];
      group.push(endpoint);
      tagGroups.set(tag, group);
    }
  }

  // 각 태그별로 시트 생성
  const usedNames = new Set<string>();
  for (const ws of workbook.worksheets) {
    usedNames.add(ws.name.toLowerCase());
  }
  for (const [tagName, endpoints] of tagGroups) {
    const rawDisplayName = tagDescriptions.get(tagName) ?? tagName;
    const displayName = rawDisplayName.toUpperCase().endsWith("API")
      ? rawDisplayName
      : `${rawDisplayName} API`;
    const sheetName = sanitizeSheetName(displayName, usedNames);
    const sheet = workbook.addWorksheet(sheetName);

    // 열 너비 설정
    sheet.columns = [
      { width: 3 }, // A: 여백
      { width: 15 }, // B: 라벨/이름
      { width: 20 }, // C: 값/타입
      { width: 12 }, // D: 형식
      { width: 8 }, // E: 필수
      { width: 40 }, // F: 설명
      { width: 25 }, // G: 예시
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

  row = writeEndpointHeader(sheet, endpoint, row);
  row = writeEndpointMetaRows(sheet, endpoint, data, row);
  row = writeEndpointParametersSection(sheet, endpoint.parameters, row);
  row = writeEndpointRequestBodiesSection(sheet, endpoint.requestBodies, row);
  row = applyRequestResponseMargin(row, endpoint.requestBodies, endpoint.responses);
  row = writeEndpointResponsesSection(sheet, endpoint.responses, row);

  // 엔드포인트 블록 전체에 굵은 외곽선 적용
  applyBlockOutline(sheet, startRow, row - 1, "B", "G");

  return row;
}

function writeEndpointHeader(
  sheet: ExcelJS.Worksheet,
  endpoint: EndpointInfo,
  startRow: number
): number {
  const row = startRow;
  sheet.getCell(`B${row}`).value = "메서드";
  sheet.getCell(`C${row}`).value = endpoint.method;
  sheet.getCell(`D${row}`).value = "엔드포인트";
  sheet.getCell(`E${row}`).value = endpoint.path;
  applyStyle(sheet.getCell(`B${row}`), PRIMARY_LABEL_CENTER_STYLE);
  applyStyle(sheet.getCell(`C${row}`), VALUE_STYLE);
  applyStyle(sheet.getCell(`D${row}`), PRIMARY_LABEL_CENTER_STYLE);
  applyStyle(sheet.getCell(`E${row}`), VALUE_STYLE);
  sheet.mergeCells(`E${row}:G${row}`);
  return row + 1;
}

function writeEndpointMetaRows(
  sheet: ExcelJS.Worksheet,
  endpoint: EndpointInfo,
  data: XlsxData,
  startRow: number
): number {
  let row = startRow;
  const writeMergedRow = (label: string, value: string): void => {
    sheet.getCell(`B${row}`).value = label;
    sheet.getCell(`C${row}`).value = value;
    applyStyle(sheet.getCell(`B${row}`), PRIMARY_LABEL_CENTER_STYLE);
    applyStyle(sheet.getCell(`C${row}`), VALUE_STYLE);
    sheet.mergeCells(`C${row}:G${row}`);
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

  return row;
}

function writeEndpointParametersSection(
  sheet: ExcelJS.Worksheet,
  parameters: ParameterInfo[],
  startRow: number
): number {
  if (parameters.length === 0) {
    return startRow;
  }

  const [paramRow, _sectionCount] = writeParametersSections(sheet, parameters, startRow);
  return paramRow + 3;
}

function writeEndpointRequestBodiesSection(
  sheet: ExcelJS.Worksheet,
  requestBodies: RequestBodyInfo[],
  startRow: number
): number {
  let row = startRow;

  for (const [index, requestBody] of requestBodies.entries()) {
    row = writeRequestBodySection(sheet, requestBody, row);
    if (requestBody.properties.length > 0) {
      row += 3;
    }
    if (requestBody.samples.length > 0) {
      for (const sample of requestBody.samples) {
        const title = formatSampleTitle("요청 예시", sample);
        row = writeSampleSection(sheet, title, sample.value, row);
      }
    } else if (index < requestBodies.length - 1) {
      row += 3;
    }
  }

  return row;
}

function applyRequestResponseMargin(
  row: number,
  requestBodies: RequestBodyInfo[],
  responses: ResponseInfo[]
): number {
  if (requestBodies.length === 0 || responses.length === 0) {
    return row;
  }

  const lastRequestBody = requestBodies[requestBodies.length - 1];
  if (lastRequestBody && lastRequestBody.samples.length === 0) {
    return row + 3;
  }

  return row;
}

function writeEndpointResponsesSection(
  sheet: ExcelJS.Worksheet,
  responses: ResponseInfo[],
  startRow: number
): number {
  let row = startRow;

  for (const [index, response] of responses.entries()) {
    row = writeResponseSection(sheet, response, row);
    if (response.properties.length > 0) {
      row += 3;
    }
    if (response.samples.length > 0) {
      for (const sample of response.samples) {
        const baseTitle = `응답 ${response.statusCode} 예시`;
        const title = formatSampleTitle(baseTitle, sample);
        row = writeSampleSection(sheet, title, sample.value, row);
      }
    } else if (index < responses.length - 1) {
      row += 3;
    }
  }

  return row;
}

/**
 * 파라미터 섹션을 타입별로 작성합니다.
 * 반환값: [마지막 행 번호, 작성된 섹션 수]
 */
function writeParametersSections(
  sheet: ExcelJS.Worksheet,
  parameters: ParameterInfo[],
  startRow: number
): [number, number] {
  // 타입별로 그룹화
  const grouped = new Map<string, ParameterInfo[]>();
  for (const param of parameters) {
    const group = grouped.get(param.in) ?? [];
    group.push(param);
    grouped.set(param.in, group);
  }

  let row = startRow;
  let sectionCount = 0;

  // 정렬 순서에 따라 각 타입별 섹션 작성
  for (const paramType of PARAMETER_TYPE_ORDER) {
    const params = grouped.get(paramType);
    if (!params || params.length === 0) continue;

    // 첫 섹션이 아니면 마진 추가
    if (sectionCount > 0) {
      row += 3;
    }

    row = writeSingleParameterSection(sheet, paramType, params, row);
    sectionCount++;
  }

  // 정의되지 않은 타입의 파라미터 처리 (fallback)
  for (const [paramType, params] of grouped) {
    if (PARAMETER_TYPE_ORDER.includes(paramType)) continue;
    if (params.length === 0) continue;

    if (sectionCount > 0) {
      row += 3;
    }

    row = writeSingleParameterSection(sheet, paramType, params, row);
    sectionCount++;
  }

  return [row, sectionCount];
}

/**
 * 단일 파라미터 타입 섹션을 작성합니다.
 */
function writeSingleParameterSection(
  sheet: ExcelJS.Worksheet,
  paramType: string,
  parameters: ParameterInfo[],
  startRow: number
): number {
  let row = startRow;

  // 섹션 헤더
  const sectionTitle = PARAMETER_TYPE_LABELS[paramType] ?? `${paramType} 파라미터`;
  sheet.getCell(`B${row}`).value = sectionTitle;
  applyStyle(sheet.getCell(`B${row}`), SUBTITLE_STYLE);
  sheet.mergeCells(`B${row}:G${row}`);
  row++;

  // 테이블 헤더
  const headers = ["이름", "타입", "형식", "필수", "설명", "예시"];
  ["B", "C", "D", "E", "F", "G"].forEach((col, i) => {
    sheet.getCell(`${col}${row}`).value = headers[i];
    applyStyle(sheet.getCell(`${col}${row}`), HEADER_STYLE);
  });
  row++;

  // 데이터
  for (const param of parameters) {
    sheet.getCell(`B${row}`).value = param.name;
    sheet.getCell(`C${row}`).value = param.type;
    sheet.getCell(`D${row}`).value = param.format ?? "";
    sheet.getCell(`E${row}`).value = param.required ? "O" : "";
    sheet.getCell(`F${row}`).value = param.description ?? "";
    sheet.getCell(`G${row}`).value = param.example ?? "";

    // 테두리 적용
    for (const col of ["B", "C", "D", "E", "F", "G"]) {
      applyStyle(sheet.getCell(`${col}${row}`), CELL_STYLE);
    }
    sheet.getCell(`E${row}`).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
    row++;
  }

  return row;
}

/**
 * 요청 본문 섹션을 작성합니다.
 */
function writeRequestBodySection(
  sheet: ExcelJS.Worksheet,
  requestBody: RequestBodyInfo,
  startRow: number
): number {
  let row = startRow;

  // 섹션 헤더
  sheet.getCell(`B${row}`).value = `요청 바디 (${requestBody.contentType})`;
  applyStyle(sheet.getCell(`B${row}`), SUBTITLE_STYLE);
  sheet.mergeCells(`B${row}:G${row}`);
  row++;

  if (requestBody.properties.length === 0) {
    const isFile = isFileContentType(requestBody.contentType);
    sheet.getCell(`B${row}`).value = isFile ? "(첨부파일)" : "(스키마 없음)";
    applyStyle(sheet.getCell(`B${row}`), CELL_STYLE);
    sheet.mergeCells(`B${row}:G${row}`);
    return row + 1;
  }

  // 테이블 헤더
  const headers = ["속성명", "타입", "형식", "필수", "설명"];
  ["B", "C", "D", "E", "F"].forEach((col, i) => {
    sheet.getCell(`${col}${row}`).value = headers[i];
    applyStyle(sheet.getCell(`${col}${row}`), HEADER_STYLE);
  });
  // G열에 빈 헤더 추가 (일관성)
  applyStyle(sheet.getCell(`G${row}`), HEADER_STYLE);
  row++;

  // 데이터
  row = writePropertiesRows(sheet, requestBody.properties, row, 0);

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
  sheet.mergeCells(`B${row}:G${row}`);
  row++;

  const writeMetaRow = (label: string, value?: string): void => {
    if (!value) return;
    sheet.getCell(`B${row}`).value = label;
    sheet.getCell(`C${row}`).value = value;
    applyStyle(sheet.getCell(`B${row}`), SECONDARY_LABEL_STYLE);
    applyStyle(sheet.getCell(`C${row}`), VALUE_STYLE);
    sheet.mergeCells(`C${row}:G${row}`);
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
  // G열에 빈 헤더 추가 (일관성)
  applyStyle(sheet.getCell(`G${row}`), HEADER_STYLE);
  row++;

  // 데이터
  row = writePropertiesRows(sheet, response.properties, row, 0);

  return row;
}

/**
 * 속성 행을 재귀적으로 작성합니다.
 * 중첩된 속성은 들여쓰기로 표현됩니다.
 */
function writePropertiesRows(
  sheet: ExcelJS.Worksheet,
  properties: SchemaPropertyInfo[],
  startRow: number,
  depth: number
): number {
  let row = startRow;
  const indent = "  ".repeat(depth);

  for (const prop of properties) {
    sheet.getCell(`B${row}`).value = depth > 0 ? `${indent}${prop.name}` : prop.name;
    sheet.getCell(`C${row}`).value = prop.type;
    sheet.getCell(`D${row}`).value = prop.format ?? "";
    sheet.getCell(`E${row}`).value = prop.required ? "O" : "";
    sheet.getCell(`F${row}`).value = prop.description ?? "";

    // 테두리 적용
    for (const col of ["B", "C", "D", "E", "F", "G"]) {
      applyStyle(sheet.getCell(`${col}${row}`), CELL_STYLE);
    }
    const requiredCell = sheet.getCell(`E${row}`);
    requiredCell.alignment = {
      ...(CELL_STYLE.alignment ?? {}),
      ...requiredCell.alignment,
      horizontal: "center",
      vertical: "middle",
    };
    row++;

    // 중첩 속성이 있으면 재귀적으로 작성
    if (prop.children && prop.children.length > 0) {
      row = writePropertiesRows(sheet, prop.children, row, depth + 1);
    }
  }

  return row;
}

/**
 * 샘플 데이터 섹션을 작성합니다.
 */
function writeSampleSection(
  sheet: ExcelJS.Worksheet,
  title: string,
  sample: string,
  startRow: number
): number {
  let row = startRow;

  // 예시 제목 (depth 2 스타일)
  sheet.getCell(`B${row}`).value = title;
  applyStyle(sheet.getCell(`B${row}`), HEADER_STYLE);
  sheet.mergeCells(`B${row}:G${row}`);
  row++;

  // 샘플 데이터 (전체 행, wrapText)
  const sampleCell = sheet.getCell(`B${row}`);
  sampleCell.value = sample;
  applyStyle(sampleCell, CELL_STYLE);
  sampleCell.alignment = { vertical: "top", wrapText: true };
  sheet.mergeCells(`B${row}:G${row}`);

  // 행 높이를 줄 수에 맞게 조정 (줄당 18pt + 여유분)
  const lineCount = sample.split("\n").length;
  sheet.getRow(row).height = Math.max(20, lineCount * 18 + 5);
  row++;

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

  const devKeywords = [
    "dev",
    "development",
    "staging",
    "local",
    "localhost",
    "test",
    "qa",
    "sandbox",
    "개발",
    "스테이징",
    "테스트",
  ];
  const prodKeywords = ["prod", "production", "live", "운영"];

  const devIndex = findServerIndex(normalized, devKeywords);
  const prodIndex = findServerIndex(normalized, prodKeywords);

  const used = new Set<number>();
  const rows: { label: string; value: string }[] = [];

  const resolvedDevIndex = devIndex >= 0 ? devIndex : 0;
  const devServer = normalized[resolvedDevIndex];
  if (resolvedDevIndex >= 0 && devServer) {
    rows.push({ label: "개발 서버", value: devServer.endpointUrl });
    used.add(resolvedDevIndex);
  }

  let resolvedProdIndex = prodIndex;
  if (resolvedProdIndex < 0) {
    resolvedProdIndex = normalized.findIndex((_, index) => !used.has(index));
  }

  const prodServer = normalized[resolvedProdIndex];
  if (resolvedProdIndex >= 0 && prodServer) {
    rows.push({ label: "운영 서버", value: prodServer.endpointUrl });
    used.add(resolvedProdIndex);
  }

  const extras = normalized.filter((_, index) => !used.has(index));
  extras.forEach((server, index) => {
    const label = server.description
      ? `추가 서버 (${server.description})`
      : `추가 서버 ${index + 1}`;
    rows.push({ label, value: server.endpointUrl });
  });

  return rows;
}

function findServerIndex(servers: { descriptor: string }[], keywords: string[]): number {
  return servers.findIndex((server) =>
    keywords.some((keyword) => server.descriptor.includes(keyword))
  );
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
  if (!leftCol || !rightCol) {
    return;
  }

  // 먼저 모든 행을 순회하면서 외곽 테두리 적용
  for (let r = startRow; r <= endRow; r++) {
    applyBlockOutlineRow(sheet, columns, r, startRow, endRow, leftCol, rightCol);
  }
}

function applyBlockOutlineRow(
  sheet: ExcelJS.Worksheet,
  columns: string[],
  row: number,
  startRow: number,
  endRow: number,
  leftCol: string,
  rightCol: string
): void {
  const isTopRow = row === startRow;
  const isBottomRow = row === endRow;

  if (columns.length === 1) {
    const cell = getMasterCell(sheet, `${leftCol}${row}`);
    cell.border = buildRowBorder(isTopRow, isBottomRow, THICK_BORDER.left, THICK_BORDER.right);
    return;
  }

  const leftMaster = getMasterCell(sheet, `${leftCol}${row}`);
  const rightMaster = getMasterCell(sheet, `${rightCol}${row}`);

  if (leftMaster.address === rightMaster.address) {
    leftMaster.border = buildRowBorder(
      isTopRow,
      isBottomRow,
      THICK_BORDER.left,
      THICK_BORDER.right
    );
    return;
  }

  leftMaster.border = buildRowBorder(isTopRow, isBottomRow, THICK_BORDER.left, {
    style: "thin",
  });
  rightMaster.border = buildRowBorder(isTopRow, isBottomRow, { style: "thin" }, THICK_BORDER.right);

  applyMiddleCellBorders(sheet, columns, row, isTopRow, isBottomRow, leftMaster, rightMaster);
}

function applyMiddleCellBorders(
  sheet: ExcelJS.Worksheet,
  columns: string[],
  row: number,
  isTopRow: boolean,
  isBottomRow: boolean,
  leftMaster: ExcelJS.Cell,
  rightMaster: ExcelJS.Cell
): void {
  const skipMasters = new Set([leftMaster.address, rightMaster.address]);
  const processedMasters = new Set<string>();

  for (let c = 1; c < columns.length - 1; c++) {
    const col = columns[c];
    const master = getMasterCell(sheet, `${col}${row}`);
    if (skipMasters.has(master.address) || processedMasters.has(master.address)) {
      continue;
    }

    master.border = buildRowBorder(isTopRow, isBottomRow, { style: "thin" }, { style: "thin" });
    processedMasters.add(master.address);
  }
}

function buildRowBorder(
  isTopRow: boolean,
  isBottomRow: boolean,
  left: Partial<ExcelJS.Border> | undefined,
  right: Partial<ExcelJS.Border> | undefined
): Partial<ExcelJS.Borders> {
  return {
    top: isTopRow ? (THICK_BORDER.top ?? { style: "thin" }) : { style: "thin" },
    left: left ?? { style: "thin" },
    bottom: isBottomRow ? (THICK_BORDER.bottom ?? { style: "thin" }) : { style: "thin" },
    right: right ?? { style: "thin" },
  };
}

function getMasterCell(sheet: ExcelJS.Worksheet, address: string): ExcelJS.Cell {
  const cell = sheet.getCell(address);
  // Defensive: ExcelJS types allow `cell.master` to be undefined even when `isMerged` is true.
  // Fallback to the cell itself if master is not available.
  if (!cell.isMerged || !cell.master) {
    return cell;
  }
  return cell.master;
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
