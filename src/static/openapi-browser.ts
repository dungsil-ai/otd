/// <reference lib="dom" />

import "./buffer-polyfill";
import SwaggerParser from "@apidevtools/swagger-parser";
import jsYaml from "js-yaml";
import type { OpenAPI, OpenAPIV3 } from "openapi-types";
import type { XlsxData } from "../models/types";
import { extractEndpoints } from "../transformer/endpoint-extractor";
import { createWorkbook } from "../writer/xlsx-writer";
import { renderPreview } from "./openapi-preview";

type UiState = {
  previewRequestId: number;
  previewTimer: ReturnType<typeof setTimeout> | null;
  sourceName: string;
};

const PREVIEW_DEBOUNCE_MS = 300;

const uiState: UiState = {
  previewRequestId: 0,
  previewTimer: null,
  sourceName: "openapi",
};

const sourceInput = getElement<HTMLInputElement>("sourceFile");
const sourceText = getElement<HTMLTextAreaElement>("sourceText");
const convertButton = getElement<HTMLButtonElement>("convertBtn");
const statusText = getElement<HTMLParagraphElement>("status");
const previewContainer = getElement<HTMLDivElement>("preview");

sourceInput.addEventListener("change", async () => {
  const file = sourceInput.files?.[0];
  if (!file) {
    return;
  }

  uiState.sourceName = getFileNameWithoutExt(file.name);
  sourceText.value = await file.text();
  setStatus(`파일 로드 완료: ${file.name}`);
  await updatePreview();
});

sourceText.addEventListener("input", () => {
  schedulePreviewUpdate();
});

convertButton.addEventListener("click", async () => {
  try {
    const raw = sourceText.value.trim();
    if (!raw) {
      throw new Error("OpenAPI 문서 내용을 입력하세요.");
    }

    clearPreviewTimer();
    resetPreview();
    setStatus("OpenAPI 문서 파싱 중...");
    const xlsxData = await buildXlsxDataFromText(raw);

    setStatus("미리 보기 생성 중...");
    renderPreview(xlsxData, previewContainer);

    setStatus("엑셀 파일 생성 중...");
    const workbook = createWorkbook(xlsxData);
    const buffer = await workbook.xlsx.writeBuffer();

    downloadXlsx(buffer, `${uiState.sourceName || "openapi"}.xlsx`);
    setStatus(`변환 완료: ${xlsxData.endpoints.length}개 API 항목`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    resetPreview();
    setStatus(`오류: ${message}`, true);
  }
});

async function updatePreview(): Promise<void> {
  const requestId = ++uiState.previewRequestId;
  const raw = sourceText.value.trim();

  if (!raw) {
    resetPreview();
    setStatus("");
    return;
  }

  try {
    setStatus("미리 보기 업데이트 중...");
    const xlsxData = await buildXlsxDataFromText(raw);
    if (requestId !== uiState.previewRequestId) return;

    renderPreview(xlsxData, previewContainer);
    setStatus(`미리 보기 업데이트 완료: ${xlsxData.endpoints.length}개 API 항목`);
  } catch (error) {
    if (requestId !== uiState.previewRequestId) return;

    const message = error instanceof Error ? error.message : String(error);
    resetPreview();
    setStatus(`미리 보기 오류: ${message}`, true);
  }
}

function schedulePreviewUpdate(): void {
  clearPreviewTimer();
  uiState.previewTimer = setTimeout(() => {
    void updatePreview();
  }, PREVIEW_DEBOUNCE_MS);
}

function clearPreviewTimer(): void {
  if (uiState.previewTimer === null) return;

  clearTimeout(uiState.previewTimer);
  uiState.previewTimer = null;
}

async function buildXlsxDataFromText(raw: string): Promise<XlsxData> {
  const document = await parseOpenApiFromText(raw);
  const validated = validateOpenApiDocument(document);
  return extractEndpoints(validated);
}

async function parseOpenApiFromText(raw: string): Promise<OpenAPI.Document> {
  const parsed = jsYaml.load(raw) as OpenAPI.Document;
  return (await SwaggerParser.dereference(parsed)) as OpenAPI.Document;
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
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function resetPreview(): void {
  previewContainer.hidden = true;
  previewContainer.innerHTML = "";
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
