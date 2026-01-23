/**
 * 통합 테스트
 * @module tests/integration.test
 */

import { afterAll, describe, expect, it } from "bun:test";
import { existsSync, unlinkSync } from "node:fs";
import { $ } from "bun";

describe("Integration Tests", () => {
  const testOutputs: string[] = [];

  afterAll(() => {
    // 테스트 파일 정리
    for (const file of testOutputs) {
      if (existsSync(file)) {
        unlinkSync(file);
      }
    }
  });

  describe("기본 변환 (User Story 1)", () => {
    it("minimal.yaml을 XLSX로 변환해야 한다", async () => {
      const output = "tests/fixtures/minimal-output.xlsx";
      testOutputs.push(output);

      const result =
        await $`bun run src/index.ts tests/fixtures/minimal.yaml -o ${output} -f`.quiet();

      expect(result.exitCode).toBe(0);
      expect(existsSync(output)).toBe(true);
    });

    it("complete.yaml을 XLSX로 변환해야 한다", async () => {
      const output = "tests/fixtures/complete-output.xlsx";
      testOutputs.push(output);

      const result =
        await $`bun run src/index.ts tests/fixtures/complete.yaml -o ${output} -f`.quiet();

      expect(result.exitCode).toBe(0);
      expect(existsSync(output)).toBe(true);

      // 파일 크기 확인 (합리적인 크기)
      const file = Bun.file(output);
      expect(file.size).toBeGreaterThan(5000); // 최소 5KB 이상
    });
  });

  describe("출력 경로 지정 (User Story 2)", () => {
    it("--output 옵션으로 출력 경로를 지정할 수 있어야 한다", async () => {
      const output = "tests/fixtures/custom-path.xlsx";
      testOutputs.push(output);

      const result =
        await $`bun run src/index.ts tests/fixtures/minimal.yaml --output ${output} -f`.quiet();

      expect(result.exitCode).toBe(0);
      expect(existsSync(output)).toBe(true);
    });

    it("확장자 없이 지정해도 .xlsx가 자동 추가되어야 한다", async () => {
      const outputBase = "tests/fixtures/auto-ext";
      const output = `${outputBase}.xlsx`;
      testOutputs.push(output);

      const result =
        await $`bun run src/index.ts tests/fixtures/minimal.yaml -o ${outputBase} -f`.quiet();

      expect(result.exitCode).toBe(0);
      expect(existsSync(output)).toBe(true);
    });

    it("기존 파일이 있고 --force 없으면 오류가 발생해야 한다", async () => {
      const output = "tests/fixtures/force-test.xlsx";
      testOutputs.push(output);

      // 먼저 파일 생성
      await $`bun run src/index.ts tests/fixtures/minimal.yaml -o ${output} -f`.quiet();
      expect(existsSync(output)).toBe(true);

      // --force 없이 다시 실행
      const result = await $`bun run src/index.ts tests/fixtures/minimal.yaml -o ${output}`
        .quiet()
        .nothrow();

      expect(result.exitCode).toBe(1);
    });
  });

  describe("오류 처리 (User Story 3)", () => {
    it("존재하지 않는 파일에 대해 오류 코드 1을 반환해야 한다", async () => {
      const result = await $`bun run src/index.ts nonexistent.yaml`.quiet().nothrow();

      expect(result.exitCode).toBe(1);
      expect(result.stderr.toString()).toContain("파일을 찾을 수 없습니다");
    });

    it("--help 옵션이 도움말을 표시하고 종료 코드 0을 반환해야 한다", async () => {
      const result = await $`bun run src/index.ts --help`.quiet();

      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain("사용법:");
      expect(result.stdout.toString()).toContain("otd");
    });

    it("--version 옵션이 버전 정보를 표시하고 종료 코드 0을 반환해야 한다", async () => {
      const result = await $`bun run src/index.ts --version`.quiet();

      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toMatch(/otd v\d+\.\d+\.\d+/);
    });

    it("인자 없이 실행하면 도움말을 표시하고 종료 코드 0을 반환해야 한다", async () => {
      const result = await $`bun run src/index.ts`.quiet();

      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain("사용법:");
    });

    it("알 수 없는 옵션에 대해 오류를 반환해야 한다", async () => {
      const result = await $`bun run src/index.ts --unknown-option file.yaml`.quiet().nothrow();

      expect(result.exitCode).toBe(1);
      expect(result.stderr.toString()).toContain("알 수 없는 옵션");
    });

    it("--help가 다른 옵션과 함께 있어도 도움말만 표시해야 한다 (FR-016)", async () => {
      const result = await $`bun run src/index.ts --help -o output.xlsx`.quiet();

      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain("사용법:");
    });
  });

  describe("엣지 케이스 테스트 (T048)", () => {
    it("엣지 케이스 문서를 정상적으로 변환해야 한다", async () => {
      const output = "tests/fixtures/edge-cases-integration.xlsx";
      testOutputs.push(output);

      const result =
        await $`bun run src/index.ts tests/fixtures/edge-cases.yaml -o ${output} -f`.quiet();

      expect(result.exitCode).toBe(0);
      expect(existsSync(output)).toBe(true);
    });

    it("OpenAPI v2 (Swagger) 문서에 대해 오류를 반환해야 한다", async () => {
      const result = await $`bun run src/index.ts tests/fixtures/swagger-v2.yaml`.quiet().nothrow();

      expect(result.exitCode).toBe(2);
      expect(result.stderr.toString()).toContain("v2");
    });

    it("빈 paths 객체를 가진 문서도 처리해야 한다", async () => {
      const output = "tests/fixtures/empty-paths-output.xlsx";
      testOutputs.push(output);

      const result =
        await $`bun run src/index.ts tests/fixtures/empty-paths.yaml -o ${output} -f`.quiet();

      expect(result.exitCode).toBe(0);
      expect(existsSync(output)).toBe(true);
    });

    it("paths가 없는 문서도 처리해야 한다", async () => {
      const output = "tests/fixtures/no-paths-output.xlsx";
      testOutputs.push(output);

      const result =
        await $`bun run src/index.ts tests/fixtures/no-paths.yaml -o ${output} -f`.quiet();

      expect(result.exitCode).toBe(0);
      expect(existsSync(output)).toBe(true);
    });
  });
});
