/// <reference lib="dom" />

/**
 * OpenAPI 데이터를 HTML 미리 보기로 렌더링합니다.
 * @module static/openapi-preview
 */

import type {
  EndpointInfo,
  ParameterInfo,
  RequestBodyInfo,
  ResponseInfo,
  SampleInfo,
  SchemaPropertyInfo,
  SecuritySchemeInfo,
  XlsxData,
} from "../models/types";

/**
 * XlsxData를 HTML 미리 보기로 렌더링하여 container에 삽입합니다.
 */
export function renderPreview(data: XlsxData, container: HTMLElement): void {
  const tagGroups = buildTagGroups(data);

  const tabs: Array<{ label: string; content: string }> = [
    { label: "개요", content: buildOverviewContent(data) },
    { label: "인증", content: buildAuthContent(data.securitySchemes) },
    { label: "API 항목", content: buildEndpointsContent(data.endpoints) },
    ...Array.from(tagGroups.entries()).map(([tag, endpoints]) => ({
      label: `${getTagDisplayName(tag, data)} API`,
      content: buildTagContent(endpoints, data),
    })),
  ];

  const tabNav = tabs
    .map(
      (tab, i) =>
        `<button class="preview-tab-btn${i === 0 ? " active" : ""}" data-panel="${i}">${escapeHtml(tab.label)}</button>`
    )
    .join("");

  const panels = tabs
    .map(
      (tab, i) =>
        `<div class="preview-panel${i === 0 ? " active" : ""}" id="preview-panel-${i}">${tab.content}</div>`
    )
    .join("");

  container.hidden = false;
  container.innerHTML = `<h2>미리 보기</h2><nav class="preview-tabs">${tabNav}</nav><div class="preview-panels">${panels}</div>`;

  const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>(".preview-tab-btn"));
  const panelDivs = Array.from(container.querySelectorAll<HTMLDivElement>(".preview-panel"));

  for (const btn of buttons) {
    btn.addEventListener("click", () => {
      const panelIdx = btn.dataset.panel;
      for (const b of buttons) b.classList.toggle("active", b === btn);
      for (const p of panelDivs) p.classList.toggle("active", p.id === `preview-panel-${panelIdx}`);
    });
  }
}

// ============================================================================
// 태그 그룹화
// ============================================================================

function buildTagGroups(data: XlsxData): Map<string, EndpointInfo[]> {
  const groups = new Map<string, EndpointInfo[]>();
  for (const endpoint of data.endpoints) {
    const tag = endpoint.tags[0] ?? "기타";
    const group = groups.get(tag) ?? [];
    group.push(endpoint);
    groups.set(tag, group);
  }
  return groups;
}

function getTagDisplayName(tagName: string, data: XlsxData): string {
  const tag = data.tags.find((t) => t.name === tagName);
  const displayName = tag?.description ?? tagName;
  if (displayName.toUpperCase().endsWith(" API")) {
    return displayName.slice(0, -4);
  }
  return displayName;
}

// ============================================================================
// 개요 탭
// ============================================================================

function buildOverviewContent(data: XlsxData): string {
  const servers = data.meta.servers
    .map((s) =>
      s.description ? `${escapeHtml(s.url)} — ${escapeHtml(s.description)}` : escapeHtml(s.url)
    )
    .join("<br>");

  const rows: Array<[string, string]> = [
    ["제목", escapeHtml(data.meta.title)],
    ["버전", escapeHtml(data.meta.version)],
    ["서버", servers || "(없음)"],
    ["설명", escapeHtml(data.meta.description) || "(없음)"],
  ];

  const rowsHtml = rows
    .map(([label, value]) => `<tr><th>${label}</th><td>${value}</td></tr>`)
    .join("");

  return `<table class="preview-table"><thead><tr><th>속성</th><th>값</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
}

// ============================================================================
// 인증 탭
// ============================================================================

function buildAuthContent(schemes: SecuritySchemeInfo[]): string {
  if (schemes.length === 0) {
    return "<p>정의된 인증 스키마가 없습니다.</p>";
  }
  return schemes.map((scheme) => buildAuthSchemeBlock(scheme)).join("");
}

function buildAuthSchemeBlock(scheme: SecuritySchemeInfo): string {
  const typeLabels: Record<string, string> = {
    apiKey: "API 키",
    http: "HTTP 인증",
    oauth2: "OAuth 2.0",
    openIdConnect: "OpenID Connect",
  };

  const details: Array<[string, string]> = [["유형", typeLabels[scheme.type] ?? scheme.type]];
  if (scheme.in) details.push(["위치", scheme.in]);
  if (scheme.parameterName) details.push(["파라미터명", scheme.parameterName]);
  if (scheme.scheme) details.push(["스키마", scheme.scheme]);
  if (scheme.bearerFormat) details.push(["Bearer 형식", scheme.bearerFormat]);
  if (scheme.description) details.push(["설명", scheme.description]);

  const rowsHtml = details
    .map(([label, value]) => `<tr><th>${label}</th><td>${escapeHtml(value)}</td></tr>`)
    .join("");

  return `<div class="endpoint-block"><div class="section-title">${escapeHtml(scheme.name)}</div><table class="preview-table"><tbody>${rowsHtml}</tbody></table></div>`;
}

// ============================================================================
// API 항목 탭
// ============================================================================

function buildEndpointsContent(endpoints: EndpointInfo[]): string {
  if (endpoints.length === 0) {
    return "<p>정의된 API 항목이 없습니다.</p>";
  }

  const rowsHtml = endpoints
    .map(
      (ep) =>
        `<tr><td><span class="method-badge method-${ep.method.toLowerCase()}">${ep.method}</span></td><td>${escapeHtml(ep.path)}</td><td>${escapeHtml(ep.summary)}</td></tr>`
    )
    .join("");

  return `<table class="preview-table"><thead><tr><th>메서드</th><th>경로</th><th>요약</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
}

// ============================================================================
// 태그별 탭
// ============================================================================

function buildTagContent(endpoints: EndpointInfo[], data: XlsxData): string {
  return endpoints.map((ep) => buildEndpointBlock(ep, data)).join("");
}

function buildEndpointBlock(endpoint: EndpointInfo, data: XlsxData): string {
  const parts: string[] = [];

  parts.push(
    `<div class="endpoint-header"><span class="method-badge method-${endpoint.method.toLowerCase()}">${endpoint.method}</span><span class="endpoint-path">${escapeHtml(endpoint.path)}</span></div>`
  );

  const metaRows: Array<[string, string]> = [];
  if (endpoint.summary) metaRows.push(["요약", endpoint.summary]);
  if (endpoint.description) metaRows.push(["설명", endpoint.description]);

  const serverRows = resolveServerRows(data.meta.servers, endpoint.path);
  for (const serverRow of serverRows) {
    metaRows.push([serverRow.label, serverRow.value]);
  }

  if (metaRows.length > 0) {
    const metaRowsHtml = metaRows
      .map(([label, value]) => `<tr><th>${label}</th><td>${escapeHtml(value)}</td></tr>`)
      .join("");
    parts.push(`<table class="preview-table endpoint-meta"><tbody>${metaRowsHtml}</tbody></table>`);
  }

  if (endpoint.parameters.length > 0) {
    parts.push(buildParametersSectionHtml(endpoint.parameters));
  }

  for (const requestBody of endpoint.requestBodies) {
    parts.push(buildRequestBodySectionHtml(requestBody));
  }

  for (const response of endpoint.responses) {
    parts.push(buildResponseSectionHtml(response));
  }

  return `<div class="endpoint-block">${parts.join("")}</div>`;
}

// ============================================================================
// 파라미터 섹션
// ============================================================================

const PARAMETER_TYPE_LABELS: Record<string, string> = {
  path: "요청 경로",
  query: "요청 쿼리",
  header: "요청 헤더",
  cookie: "요청 쿠키",
};

const PARAMETER_TYPE_ORDER = ["path", "query", "header", "cookie"];

function buildParametersSectionHtml(parameters: ParameterInfo[]): string {
  const grouped = new Map<string, ParameterInfo[]>();
  for (const param of parameters) {
    const group = grouped.get(param.in) ?? [];
    group.push(param);
    grouped.set(param.in, group);
  }

  const sections: string[] = [];

  for (const paramType of PARAMETER_TYPE_ORDER) {
    const params = grouped.get(paramType);
    if (!params || params.length === 0) continue;
    sections.push(buildSingleParameterSectionHtml(paramType, params));
  }

  for (const [paramType, params] of grouped) {
    if (PARAMETER_TYPE_ORDER.includes(paramType)) continue;
    if (params.length === 0) continue;
    sections.push(buildSingleParameterSectionHtml(paramType, params));
  }

  return sections.join("");
}

function buildSingleParameterSectionHtml(paramType: string, parameters: ParameterInfo[]): string {
  const title = PARAMETER_TYPE_LABELS[paramType] ?? `${paramType} 파라미터`;

  const rowsHtml = parameters
    .map(
      (p) =>
        `<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.type)}</td><td>${escapeHtml(p.format ?? "")}</td><td class="center">${p.required ? "O" : ""}</td><td>${escapeHtml(p.description ?? "")}</td><td>${escapeHtml(p.example ?? "")}</td></tr>`
    )
    .join("");

  return `<div class="subsection-title">${escapeHtml(title)}</div><table class="preview-table"><thead><tr><th>이름</th><th>타입</th><th>형식</th><th>필수</th><th>설명</th><th>예시</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
}

// ============================================================================
// 요청 본문 섹션
// ============================================================================

function buildRequestBodySectionHtml(requestBody: RequestBodyInfo): string {
  const title = `요청 바디 (${requestBody.contentType})`;

  let content: string;
  if (requestBody.properties.length === 0) {
    const lower = requestBody.contentType.toLowerCase();
    const isFile = lower.includes("octet-stream") || lower.includes("multipart");
    content = `<p class="empty-note">${isFile ? "(첨부파일)" : "(스키마 없음)"}</p>`;
  } else {
    content = buildPropertiesTableHtml(requestBody.properties);
  }

  const samples = requestBody.samples
    .map((sample) => {
      const sampleTitle = formatSampleTitle("요청 예시", sample);
      return buildSampleSectionHtml(sampleTitle, sample.value);
    })
    .join("");

  return `<div class="subsection-title">${escapeHtml(title)}</div>${content}${samples}`;
}

// ============================================================================
// 응답 섹션
// ============================================================================

function buildResponseSectionHtml(response: ResponseInfo): string {
  const title = `응답 ${response.statusCode}`;

  const metaRows: Array<[string, string]> = [];
  if (response.description) metaRows.push(["설명", response.description]);
  if (response.contentType) metaRows.push(["지원 형식", response.contentType]);

  let metaHtml = "";
  if (metaRows.length > 0) {
    const rowsHtml = metaRows
      .map(([label, value]) => `<tr><th>${label}</th><td>${escapeHtml(value)}</td></tr>`)
      .join("");
    metaHtml = `<table class="preview-table"><tbody>${rowsHtml}</tbody></table>`;
  }

  const propertiesHtml =
    response.properties.length > 0 ? buildPropertiesTableHtml(response.properties) : "";

  const samples = response.samples
    .map((sample) => {
      const baseTitle = `응답 ${response.statusCode} 예시`;
      const sampleTitle = formatSampleTitle(baseTitle, sample);
      return buildSampleSectionHtml(sampleTitle, sample.value);
    })
    .join("");

  return `<div class="subsection-title">${escapeHtml(title)}</div>${metaHtml}${propertiesHtml}${samples}`;
}

// ============================================================================
// 속성 테이블
// ============================================================================

function buildPropertiesTableHtml(properties: SchemaPropertyInfo[]): string {
  const rowsHtml = buildPropertyRowsHtml(properties, 0);
  return `<table class="preview-table"><thead><tr><th>속성명</th><th>타입</th><th>형식</th><th>필수</th><th>설명</th></tr></thead><tbody>${rowsHtml}</tbody></table>`;
}

function buildPropertyRowsHtml(properties: SchemaPropertyInfo[], depth: number): string {
  return properties
    .map((prop) => {
      const indent = "\u00a0\u00a0".repeat(depth * 2);
      const nameHtml = depth > 0 ? `${indent}${escapeHtml(prop.name)}` : escapeHtml(prop.name);

      const rowHtml = `<tr><td>${nameHtml}</td><td>${escapeHtml(prop.type)}</td><td>${escapeHtml(prop.format ?? "")}</td><td class="center">${prop.required ? "O" : ""}</td><td>${escapeHtml(prop.description ?? "")}</td></tr>`;

      const childrenHtml =
        prop.children && prop.children.length > 0
          ? buildPropertyRowsHtml(prop.children, depth + 1)
          : "";

      return rowHtml + childrenHtml;
    })
    .join("");
}

// ============================================================================
// 샘플 섹션
// ============================================================================

function buildSampleSectionHtml(title: string, value: string): string {
  return `<div class="sample-title">${escapeHtml(title)}</div><pre class="sample-code">${escapeHtml(value)}</pre>`;
}

// ============================================================================
// 유틸리티
// ============================================================================

function formatSampleTitle(baseTitle: string, sample: SampleInfo): string {
  if (sample.summary) return `${baseTitle}: ${sample.summary}`;
  if (sample.name && sample.name !== "default") return `${baseTitle}: ${sample.name}`;
  return baseTitle;
}

function buildEndpointUrl(baseUrl: string, endpointPath: string): string {
  if (!baseUrl) return endpointPath;
  if (!endpointPath) return baseUrl;
  const trimmedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const trimmedPath = endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`;
  return `${trimmedBase}${trimmedPath}`;
}

function resolveServerRows(
  servers: Array<{ url: string; description?: string }>,
  endpointPath: string
): Array<{ label: string; value: string }> {
  if (servers.length === 0) return [];

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

  const devIndex = normalized.findIndex((s) => devKeywords.some((kw) => s.descriptor.includes(kw)));
  const prodIndex = normalized.findIndex((s) =>
    prodKeywords.some((kw) => s.descriptor.includes(kw))
  );

  const used = new Set<number>();
  const rows: Array<{ label: string; value: string }> = [];

  const resolvedDevIndex = devIndex >= 0 ? devIndex : 0;
  const devServer = normalized[resolvedDevIndex];
  if (resolvedDevIndex >= 0 && devServer) {
    rows.push({ label: "개발 서버", value: devServer.endpointUrl });
    used.add(resolvedDevIndex);
  }

  let resolvedProdIndex = prodIndex;
  if (resolvedProdIndex < 0) {
    resolvedProdIndex = normalized.findIndex((_, i) => !used.has(i));
  }
  const prodServer = normalized[resolvedProdIndex];
  if (resolvedProdIndex >= 0 && prodServer) {
    rows.push({ label: "운영 서버", value: prodServer.endpointUrl });
    used.add(resolvedProdIndex);
  }

  for (const [i, server] of normalized.entries()) {
    if (used.has(i)) continue;
    const extraIdx = rows.length - 1;
    const label = server.description
      ? `추가 서버 (${server.description})`
      : `추가 서버 ${extraIdx}`;
    rows.push({ label, value: server.endpointUrl });
  }

  return rows;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
