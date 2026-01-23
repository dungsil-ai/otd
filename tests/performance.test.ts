/**
 * 성능 테스트
 * @module tests/performance.test
 */

import { afterAll, describe, expect, it } from "bun:test";
import { existsSync, unlinkSync } from "node:fs";
import { $ } from "bun";

describe("Performance Tests", () => {
  const testOutputs: string[] = [];

  afterAll(() => {
    // 테스트 파일 정리
    for (const file of testOutputs) {
      if (existsSync(file)) {
        unlinkSync(file);
      }
    }
  });

  describe("SC-001: 성능 요구사항", () => {
    it("100개 API 항목을 5초 이내에 변환해야 한다", async () => {
      const input = "tests/fixtures/large-100-endpoints.yaml";
      const output = "tests/fixtures/large-100-output.xlsx";
      testOutputs.push(output);

      // 파일 존재 확인
      expect(existsSync(input)).toBe(true);

      // 시작 시간 기록
      const startTime = performance.now();

      // 변환 실행
      const result = await $`bun run src/index.ts ${input} -o ${output} -f`.quiet();

      // 종료 시간 및 소요 시간 계산
      const endTime = performance.now();
      const elapsedMs = endTime - startTime;

      // 결과 검증
      expect(result.exitCode).toBe(0);
      expect(existsSync(output)).toBe(true);

      // 5초(5000ms) 이내 완료 확인
      expect(elapsedMs).toBeLessThan(5000);

      // 생성된 파일 크기 확인 (합리적인 크기)
      const file = Bun.file(output);
      expect(file.size).toBeGreaterThan(10000); // 최소 10KB 이상

      console.log(`✅ 100개 API 항목 변환 완료: ${elapsedMs.toFixed(2)}ms`);
    });

    it("메모리 집약적 작업 후에도 안정적으로 동작해야 한다", async () => {
      const input = "tests/fixtures/large-100-endpoints.yaml";
      const outputs: string[] = [];

      // 연속 3회 실행
      for (let i = 0; i < 3; i++) {
        const output = `tests/fixtures/stability-test-${i}.xlsx`;
        outputs.push(output);
        testOutputs.push(output);

        const result = await $`bun run src/index.ts ${input} -o ${output} -f`.quiet();
        expect(result.exitCode).toBe(0);
        expect(existsSync(output)).toBe(true);
      }

      console.log("✅ 안정성 테스트 통과: 연속 3회 실행 성공");
    });
  });

  describe("대용량 처리", () => {
    it("복잡한 스키마를 가진 문서를 처리할 수 있어야 한다", async () => {
      const input = "tests/fixtures/complete.yaml";
      const output = "tests/fixtures/complete-perf-output.xlsx";
      testOutputs.push(output);

      const startTime = performance.now();
      const result = await $`bun run src/index.ts ${input} -o ${output} -f`.quiet();
      const elapsedMs = performance.now() - startTime;

      expect(result.exitCode).toBe(0);
      expect(existsSync(output)).toBe(true);

      console.log(`✅ 복잡한 스키마 처리 완료: ${elapsedMs.toFixed(2)}ms`);
    });

    it("엣지 케이스 문서를 처리할 수 있어야 한다", async () => {
      const input = "tests/fixtures/edge-cases.yaml";
      const output = "tests/fixtures/edge-cases-output.xlsx";
      testOutputs.push(output);

      const startTime = performance.now();
      const result = await $`bun run src/index.ts ${input} -o ${output} -f`.quiet();
      const elapsedMs = performance.now() - startTime;

      expect(result.exitCode).toBe(0);
      expect(existsSync(output)).toBe(true);

      console.log(`✅ 엣지 케이스 처리 완료: ${elapsedMs.toFixed(2)}ms`);
    });
  });
});
