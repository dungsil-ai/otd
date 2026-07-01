import SwaggerParser from "@apidevtools/swagger-parser";
import type { OpenAPI, OpenAPIV3 } from "openapi-types";
import { extractEndpoints } from "../transformer/endpoint-extractor";
import { createWorkbook } from "../writer/xlsx-writer";

type UiState = {
  sourceName: string;
};

const uiState: UiState = {
  sourceName: "openapi",
};

const sourceInput = getElement<HTMLInputElement>("sourceFile");
const sourceText = getElement<HTMLTextAreaElement>("sourceText");
const convertButton = getElement<HTMLButtonElement>("convertBtn");
const statusText = getElement<HTMLParagraphElement>("status");

sourceInput.addEventListener("change", async () => {
  const file = sourceInput.files?.[0];
  if (!file) {
    return;
  }

  uiState.sourceName = getFileNameWithoutExt(file.name);
  sourceText.value = await file.text();
  setStatus(`파일 로드 완료: ${file.name}`);
});

convertButton.addEventListener("click", async () => {
  try {
    const raw = sourceText.value.trim();
    if (!raw) {
      throw new Error("OpenAPI 문서 내용을 입력하세요.");
    }

    setStatus("OpenAPI 문서 파싱 중...");
    const document = await parseOpenApiFromText(raw);
    const validated = validateOpenApiDocument(document);

    setStatus("엔드포인트 추출 및 엑셀 생성 중...");
    const xlsxData = extractEndpoints(validated);
    const workbook = createWorkbook(xlsxData);
    const buffer = await workbook.xlsx.writeBuffer();

    downloadXlsx(buffer, `${uiState.sourceName || "openapi"}.xlsx`);
    setStatus(`변환 완료: ${xlsxData.endpoints.length}개 API 항목`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus(`오류: ${message}`, true);
  }
});

async function parseOpenApiFromText(raw: string): Promise<OpenAPI.Document> {
  const blob = new Blob([raw], { type: "text/plain" });
  const blobUrl = URL.createObjectURL(blob);

  try {
    return (await SwaggerParser.dereference(blobUrl)) as OpenAPI.Document;
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

function validateOpenApiDocument(api: OpenAPI.Document): OpenAPIV3.Document {
  if (!("openapi" in api) || typeof api.openapi !== "string") {
    throw new Error("OpenAPI v2는 지원하지 않습니다.");
  }

  if (!api.openapi.startsWith("3.")) {
    throw new Error(`지원하지 않는 OpenAPI 버전입니다: ${api.openapi}`);
  }

  return api as OpenAPIV3.Document;
}

function downloadXlsx(data: unknown, fileName: string): void {
  const blob = new Blob([data as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function setStatus(message: string, isError = false): void {
  statusText.textContent = message;
  statusText.className = isError ? "error" : "";
}

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`필수 DOM 요소를 찾을 수 없습니다: #${id}`);
  }
  return element as T;
}

function getFileNameWithoutExt(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
}
