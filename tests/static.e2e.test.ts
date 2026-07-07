/**
 * 정적 HTML 변환기 E2E 테스트
 * @module tests/static.e2e.test
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";
import ExcelJS from "exceljs";
import type { Browser } from "playwright";
import { chromium } from "playwright";

type Fixture =
  | {
      name: string;
      expectedEndpoints: number;
      shouldError: false;
      expectedTitle: string;
      expectedFirstEndpoint: { method: string; path: string } | null;
    }
  | {
      name: string;
      expectedEndpoints: null;
      shouldError: true;
      expectedError: string;
    };

const FIXTURES: Fixture[] = [
  {
    name: "minimal.yaml",
    expectedEndpoints: 1,
    shouldError: false,
    expectedTitle: "Minimal API",
    expectedFirstEndpoint: { method: "GET", path: "/health" },
  },
  {
    name: "complete.yaml",
    expectedEndpoints: 16,
    shouldError: false,
    expectedTitle: "Complete API",
    expectedFirstEndpoint: { method: "GET", path: "/users" },
  },
  {
    name: "edge-cases.yaml",
    expectedEndpoints: 22,
    shouldError: false,
    expectedTitle: "Edge Cases API",
    expectedFirstEndpoint: { method: "GET", path: "/" },
  },
  {
    name: "empty-paths.yaml",
    expectedEndpoints: 0,
    shouldError: false,
    expectedTitle: "Empty Paths API",
    expectedFirstEndpoint: null,
  },
  {
    name: "no-paths.yaml",
    expectedEndpoints: 0,
    shouldError: false,
    expectedTitle: "No Paths API",
    expectedFirstEndpoint: null,
  },
  {
    name: "large-100-endpoints.yaml",
    expectedEndpoints: 93,
    shouldError: false,
    expectedTitle: "Large API (100 Endpoints)",
    expectedFirstEndpoint: { method: "GET", path: "/users" },
  },
  { name: "swagger-v2.yaml", expectedEndpoints: null, shouldError: true, expectedError: "v2" },
];

describe("Static HTML Converter E2E", () => {
  let browser: Browser;
  let server: ReturnType<typeof Bun.serve>;
  let baseUrl: string;

  beforeAll(async () => {
    // 정적 파일 변경사항이 E2E 테스트에 항상 반영되도록 먼저 빌드
    await $`bun run build`.quiet();

    // dist 디렉토리를 정적으로 서빙하는 로컬 HTTP 서버 시작
    server = Bun.serve({
      port: 0,
      fetch(req) {
        const url = new URL(req.url);
        const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
        const baseDir = pathname.startsWith("/fixtures/") ? "tests" : "dist";
        const fullPath = join(process.cwd(), baseDir, pathname);
        const file = Bun.file(fullPath);
        return new Response(file);
      },
    });

    baseUrl = `http://localhost:${server.port}`;

    // 헤드리스 브라우저 실행
    browser = await chromium.launch({ headless: true });
  }, 60_000);

  afterAll(async () => {
    await browser.close();
    server.stop();
  });

  for (const fixture of FIXTURES) {
    if (fixture.shouldError) {
      it(`${fixture.name}: 오류 메시지를 표시해야 한다`, async () => {
        const context = await browser.newContext();
        const page = await context.newPage();

        try {
          await page.goto(baseUrl);

          const content = readFileSync(
            join(process.cwd(), "tests/fixtures", fixture.name),
            "utf-8"
          );

          await page.fill("#sourceText", content);
          await page.click("#convertBtn");

          await page.waitForFunction(
            () => {
              const el = document.getElementById("status");
              return el?.textContent?.startsWith("오류");
            },
            { timeout: 30_000 }
          );

          const status = await page.textContent("#status");
          expect(status).toContain("오류");
          expect(status).toContain(fixture.expectedError);
        } finally {
          await context.close();
        }
      }, 60_000);
    } else {
      it(`${fixture.name}: XLSX 변환에 성공해야 한다`, async () => {
        const context = await browser.newContext({ acceptDownloads: true });
        const page = await context.newPage();

        try {
          await page.goto(baseUrl);

          const content = readFileSync(
            join(process.cwd(), "tests/fixtures", fixture.name),
            "utf-8"
          );

          await page.fill("#sourceText", content);

          // 다운로드와 버튼 클릭을 동시에 대기
          const [download] = await Promise.all([
            page.waitForEvent("download", { timeout: 60_000 }),
            page.click("#convertBtn"),
          ]);

          // 변환 완료 상태 대기
          await page.waitForFunction(
            () => {
              const el = document.getElementById("status");
              return el?.textContent?.startsWith("변환 완료");
            },
            { timeout: 60_000 }
          );

          const status = await page.textContent("#status");
          expect(status).toContain("변환 완료");
          expect(status).toContain(`${fixture.expectedEndpoints}개`);

          // 다운로드된 파일 검증
          expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
          const downloadPath = await download.path();
          expect(downloadPath).not.toBeNull();
          if (downloadPath !== null) {
            await verifyXlsx(downloadPath, fixture);
          }

          // 미리 보기 렌더링 검증
          await verifyPreview(page, fixture);
        } finally {
          await context.close();
        }
      }, 120_000);
    }
  }

  it("입력 내용 변경만으로 미리 보기를 즉시 갱신해야 한다", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(baseUrl);

      await page.fill("#sourceText", buildInlineOpenApi("첫 번째 API", "/first"));
      await page.waitForFunction(() => document.getElementById("preview")?.hidden === false, {
        timeout: 30_000,
      });
      await expectPreviewPath(page, "/first");

      await page.fill("#sourceText", buildInlineOpenApi("두 번째 API", "/second"));
      await expectPreviewPath(page, "/second");
    } finally {
      await context.close();
    }
  }, 60_000);

  it("구글 시트 버튼은 API 항목 TSV를 클립보드에 복사하고 새 시트를 열어야 한다", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(baseUrl);
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: {
            writeText: async (text: string) => {
              (window as Window & { __copiedSheetsText?: string }).__copiedSheetsText = text;
            },
          },
        });
        window.open = (url?: string | URL) => {
          (window as Window & { __openedSheetsUrl?: string }).__openedSheetsUrl = String(url);
          return null;
        };
      });
      await page.reload();

      expect(await page.locator("#googleSheetsBtn").isDisabled()).toBe(true);

      await page.fill("#sourceText", buildInlineOpenApi("구글 시트 내보내기", "/sheets"));
      await expectPreviewPath(page, "/sheets");
      await page.click("#googleSheetsBtn");

      const result = await page.evaluate(() => ({
        copiedText: (window as Window & { __copiedSheetsText?: string }).__copiedSheetsText,
        openedUrl: (window as Window & { __openedSheetsUrl?: string }).__openedSheetsUrl,
      }));

      expect(result.openedUrl).toBe("https://sheets.new");
      expect(result.copiedText).toContain("메서드\t경로\t요약\t설명\t태그");
      expect(result.copiedText).toContain("GET\t/sheets\t상태 조회\t");
    } finally {
      await context.close();
    }
  }, 60_000);

  it("content 쿼리 스트링으로 직접 입력 내용을 프리셋하고 미리 보기를 갱신해야 한다", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const content = buildInlineOpenApi("쿼리 프리셋 API", "/preset-content");
      await page.goto(`${baseUrl}/?content=${encodeURIComponent(content)}`);

      await expectPreviewPath(page, "/preset-content");
      const textValue = await page.inputValue("#sourceText");
      expect(textValue).toBe(content);
    } finally {
      await context.close();
    }
  }, 60_000);

  it("content 쿼리 스트링의 추가 서버 설명 HTML을 실행 가능한 마크업으로 렌더링하지 않아야 한다", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const content = buildInlineOpenApiWithServers(
        '<img src=x onerror="window.__otdXss=1">',
        "/safe-server-description"
      );
      await page.goto(`${baseUrl}/?content=${encodeURIComponent(content)}`);
      await expectPreviewPath(page, "/safe-server-description");

      const result = await page.evaluate(() => {
        const preview = document.getElementById("preview");
        return {
          executed: (window as Window & { __otdXss?: number }).__otdXss === 1,
          imageCount: preview?.querySelectorAll("img").length ?? 0,
          text: preview?.textContent ?? "",
        };
      });

      expect(result.executed).toBe(false);
      expect(result.imageCount).toBe(0);
      expect(result.text).toContain('<img src=x onerror="window.__otdXss=1">');
    } finally {
      await context.close();
    }
  }, 60_000);

  it("url 쿼리 스트링으로 URL 입력값을 프리셋하고 문서를 불러와야 한다", async () => {
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();

    try {
      const presetUrl = `${baseUrl}/fixtures/minimal.yaml`;
      await page.goto(`${baseUrl}/?url=${encodeURIComponent(presetUrl)}`);

      await expectPreviewPath(page, "/health");
      expect(await page.inputValue("#sourceUrl")).toBe(presetUrl);

      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 60_000 }),
        page.click("#convertBtn"),
      ]);
      expect(download.suggestedFilename()).toBe("minimal.xlsx");
    } finally {
      await context.close();
    }
  }, 60_000);

  it("URL로 불러온 내용을 수정해도 원본 기반 XLSX 파일명을 유지해야 한다", async () => {
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();

    try {
      await page.goto(baseUrl);
      await page.fill("#sourceUrl", `${baseUrl}/fixtures/minimal.yaml`);
      await page.click("#loadUrlBtn");
      await expectPreviewPath(page, "/health");

      await page.fill("#sourceText", buildInlineOpenApi("수정된 API", "/edited-url"));
      await expectPreviewPath(page, "/edited-url");

      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 60_000 }),
        page.click("#convertBtn"),
      ]);
      expect(download.suggestedFilename()).toBe("minimal.xlsx");
    } finally {
      await context.close();
    }
  }, 60_000);

  it("URL 입력으로 OpenAPI 문서를 불러와 미리 보기와 XLSX 파일명을 갱신해야 한다", async () => {
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();

    try {
      await page.goto(baseUrl);
      await page.fill("#sourceUrl", `${baseUrl}/fixtures/minimal.yaml`);
      await page.click("#loadUrlBtn");

      await expectPreviewPath(page, "/health");
      const status = await page.textContent("#status");
      expect(status).toContain("미리 보기 업데이트 완료");

      const textValue = await page.inputValue("#sourceText");
      expect(textValue).toContain("Minimal API");

      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 60_000 }),
        page.click("#convertBtn"),
      ]);
      expect(download.suggestedFilename()).toBe("minimal.xlsx");
    } finally {
      await context.close();
    }
  }, 60_000);

  it("파일 업로드 후 미리 보기와 개행 렌더링을 갱신해야 한다", async () => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto(baseUrl);
      const multilineDescription = ["첫 줄", "둘째 줄"].join("\n");

      await page.setInputFiles("#sourceFile", {
        name: "inline.yaml",
        mimeType: "application/yaml",
        buffer: Buffer.from(buildInlineOpenApi(multilineDescription, "/uploaded")),
      });

      await expectPreviewPath(page, "/uploaded");
      const overviewDescriptionStyle = await page.evaluate(() => {
        const preview = document.getElementById("preview");
        const cell = preview?.querySelector(".preview-table tbody tr:nth-child(4) td");
        if (!(cell instanceof HTMLElement)) return null;
        return {
          text: cell.textContent,
          whiteSpace: getComputedStyle(cell).whiteSpace,
        };
      });

      expect(overviewDescriptionStyle?.text).toBe(multilineDescription);
      expect(overviewDescriptionStyle?.whiteSpace).toContain("pre");
    } finally {
      await context.close();
    }
  }, 60_000);
});

function buildInlineOpenApi(description: string, path: string): string {
  return JSON.stringify({
    openapi: "3.0.0",
    info: {
      title: "Inline API",
      version: "1.0.0",
      description,
    },
    paths: {
      [path]: {
        get: {
          summary: "상태 조회",
          responses: {
            "200": {
              description: "성공",
            },
          },
        },
      },
    },
  });
}

function buildInlineOpenApiWithServers(serverDescription: string, path: string): string {
  return JSON.stringify({
    openapi: "3.0.0",
    info: {
      title: "Inline Server API",
      version: "1.0.0",
    },
    servers: [
      { url: "https://dev.example.com", description: "개발" },
      { url: "https://prod.example.com", description: "운영" },
      { url: "https://extra.example.com", description: serverDescription },
    ],
    paths: {
      [path]: {
        get: {
          summary: "상태 조회",
          responses: {
            "200": {
              description: "성공",
            },
          },
        },
      },
    },
  });
}

async function expectPreviewPath(page: import("playwright").Page, path: string): Promise<void> {
  await page.waitForFunction(
    (expectedPath) => document.getElementById("preview")?.textContent?.includes(expectedPath),
    path,
    { timeout: 30_000 }
  );
}

async function verifyXlsx(
  filePath: string,
  fixture: Extract<Fixture, { shouldError: false }>
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  // 필수 시트 존재 확인
  const sheetNames = workbook.worksheets.map((ws) => ws.name);
  expect(sheetNames).toContain("개요");
  expect(sheetNames).toContain("인증");
  expect(sheetNames).toContain("API 항목");

  // 개요 시트: API 제목 확인 (B2="속성"/C2="값" 헤더, B3="제목"/C3=title 데이터)
  const overviewSheet = workbook.getWorksheet("개요");
  expect(overviewSheet).toBeDefined();
  if (overviewSheet) {
    expect(overviewSheet.getCell("C3").value).toBe(fixture.expectedTitle);
  }

  verifyApiSheet(workbook, fixture);
}

function verifyApiSheet(
  workbook: ExcelJS.Workbook,
  fixture: Extract<Fixture, { shouldError: false }>
): void {
  const apiSheet = workbook.getWorksheet("API 항목");
  expect(apiSheet).toBeDefined();
  if (!apiSheet) return;

  // 헤더는 row 2, 데이터는 row 3부터
  let dataRowCount = 0;
  apiSheet.eachRow((_row, rowNumber) => {
    if (rowNumber >= 3 && apiSheet.getCell(`B${rowNumber}`).value !== null) {
      dataRowCount++;
    }
  });
  expect(dataRowCount).toBe(fixture.expectedEndpoints);

  // 첫 번째 엔드포인트 실제 값 확인
  if (fixture.expectedFirstEndpoint !== null) {
    expect(apiSheet.getCell("B3").value).toBe(fixture.expectedFirstEndpoint.method);
    expect(apiSheet.getCell("C3").value).toBe(fixture.expectedFirstEndpoint.path);
  }
}

async function verifyPreview(
  page: import("playwright").Page,
  fixture: Extract<Fixture, { shouldError: false }>
): Promise<void> {
  // 미리 보기 컨테이너가 표시되어야 한다
  const isPreviewVisible = await page.evaluate(() => {
    const el = document.getElementById("preview");
    return el !== null && !el.hidden;
  });
  expect(isPreviewVisible).toBe(true);

  // 최소 3개의 탭 버튼(개요, 인증, API 항목)이 있어야 한다
  const tabCount = await page.evaluate(() => document.querySelectorAll(".preview-tab-btn").length);
  expect(tabCount).toBeGreaterThanOrEqual(3);

  // "API 항목" 탭 클릭 후 엔드포인트 행 수 검증
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>(".preview-tab-btn"));
    const apiTab = tabs.find((t) => t.textContent?.trim() === "API 항목");
    apiTab?.click();
  });

  if (fixture.expectedEndpoints === 0) {
    const emptyText = await page.evaluate(() => {
      const panels = Array.from(document.querySelectorAll(".preview-panel"));
      const activePanel = panels.find((p) => p.classList.contains("active"));
      return activePanel?.textContent ?? "";
    });
    expect(emptyText).toContain("정의된 API 항목이 없습니다");
  } else {
    const rowCount = await page.evaluate(() => {
      const panels = Array.from(document.querySelectorAll(".preview-panel"));
      const activePanel = panels.find((p) => p.classList.contains("active"));
      return activePanel?.querySelectorAll("tbody tr").length ?? 0;
    });
    expect(rowCount).toBe(fixture.expectedEndpoints);
  }
}
