import type { SampleInfo } from "../models/types";

export function getFileNameWithoutExt(filePath: string): string {
  const fileName = filePath.split(/[/\\]/).pop() ?? filePath;
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
}

export function getDirectory(filePath: string): string {
  const lastSlash = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
  if (lastSlash === -1) return "";
  return filePath.substring(0, lastSlash);
}

export function resolveOutputPath(inputPath: string, outputPath?: string): string {
  if (outputPath) {
    if (outputPath.endsWith("/") || outputPath.endsWith("\\")) {
      return `${outputPath}${getFileNameWithoutExt(inputPath)}.xlsx`;
    }
    if (!outputPath.toLowerCase().endsWith(".xlsx")) return `${outputPath}.xlsx`;
    return outputPath;
  }
  const inputName = getFileNameWithoutExt(inputPath);
  const inputDir = getDirectory(inputPath);
  return inputDir ? `${inputDir}/${inputName}.xlsx` : `${inputName}.xlsx`;
}

export function buildEndpointUrl(baseUrl: string, endpointPath: string): string {
  if (!baseUrl) return endpointPath;
  if (!endpointPath) return baseUrl;
  const tb = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const tp = endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`;
  return `${tb}${tp}`;
}

export function formatSampleTitle(baseTitle: string, sample: SampleInfo): string {
  if (sample.summary) return `${baseTitle}: ${sample.summary}`;
  if (sample.name && sample.name !== "default") return `${baseTitle}: ${sample.name}`;
  return baseTitle;
}

export function isFileContentType(contentType: string): boolean {
  const l = contentType.toLowerCase();
  return l === "application/octet-stream" || l.startsWith("multipart/");
}

export const PARAMETER_TYPE_LABELS: Record<string, string> = {
  path: "요청 경로",
  query: "요청 쿼리",
  header: "요청 헤더",
  cookie: "요청 쿠키",
};
export const PARAMETER_TYPE_ORDER: string[] = ["path", "query", "header", "cookie"];

const SHEET_NAME_FORBIDDEN = /[*?:/\\[\]]/g;
const MAX_SHEET_NAME_LENGTH = 31;

export function sanitizeSheetName(rawName: string, usedNames: Set<string>): string {
  let name = rawName
    .replace(SHEET_NAME_FORBIDDEN, " ")
    .replace(/^'+|'+$/g, "")
    .trim()
    .replace(/\s+/g, " ");
  if (name.length === 0) name = "Untitled";
  name = name.substring(0, MAX_SHEET_NAME_LENGTH);
  let candidate = name;
  let suffix = 2;
  while (usedNames.has(candidate.toLowerCase())) {
    const suffixStr = ` (${suffix})`;
    candidate = `${name.substring(0, MAX_SHEET_NAME_LENGTH - suffixStr.length)}${suffixStr}`;
    suffix++;
    if (suffix > 99) break;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
}
