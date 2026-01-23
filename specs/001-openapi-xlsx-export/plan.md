# Implementation Plan: OpenAPI to XLSX Export

**Branch**: `001-openapi-xlsx-export` | **Date**: 2026-01-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-openapi-xlsx-export/spec.md`

## Summary

OpenAPI v3 문서를 테이블 형식의 API 명세서(XLSX)로 변환하는 CLI 도구를 개발한다.
사용자가 `otd [옵션] <입력파일>` 명령으로 OpenAPI 파일을 입력하면 동일한 디렉토리에 스프레드시트가 생성된다.
`-o, --output` 옵션으로 출력 경로를 지정할 수 있다.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode)
**Runtime**: Bun (latest LTS)
**Primary Dependencies**:
- `exceljs` - XLSX 파일 생성 및 스타일링
- `@apidevtools/swagger-parser` - OpenAPI v3 파싱 및 $ref 해소
- `openapi-types` - OpenAPI TypeScript 타입 정의

**Storage**: N/A (파일 입출력만)
**Testing**: Bun test (내장 테스트 러너)
**Target Platform**: Cross-platform CLI (Windows, macOS, Linux)
**Project Type**: Single project (CLI 도구)
**Performance Goals**: 100개 이하 API 항목 문서 5초 이내 변환
**Constraints**: 메모리 100MB 미만 사용
**Scale/Scope**: 단일 사용자 CLI 도구

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Code Quality ✅
- [x] 단일 책임 원칙: 파서, 변환기, XLSX 생성기 분리
- [x] 일관된 코드 스타일: Biome 린터/포매터 적용
- [x] 문서화 의무: 공개 함수에 JSDoc 주석
- [x] 의존성 최소화: 핵심 2개 라이브러리만 사용
- [x] 코드 중복 금지: 공통 유틸리티 추출

### II. Testing Standards ✅
- [x] 테스트 우선 개발: 각 모듈별 테스트 먼저 작성
- [x] 계층별 테스트: 단위(파서, 변환기), 통합(전체 파이프라인)
- [x] 테스트 커버리지: 핵심 로직 80% 이상
- [x] 경계 조건 테스트: 빈 문서, 대용량 문서, 잘못된 형식

### III. User Experience Consistency ✅
- [x] 일관된 CLI 인터페이스: `otd [옵션] <입력파일>`
- [x] 명확한 오류 메시지: 파일 없음, 형식 오류 등 구체적 안내
- [x] 진행 상황 표시: 대용량 문서 처리 시 표시
- [x] 예측 가능한 동작: 동일 입력 → 동일 출력

### IV. Performance Requirements ✅
- [x] 응답 시간 기준: 100개 API 항목 5초 이내
- [x] 메모리 효율성: 스트리밍 처리 불필요 (단일 파일)
- [x] 성능 측정: 처리 시간 로깅

### 성능 테스트 방법

**SC-001 검증**: 100개 API 항목 픽스처로 성능 테스트
```typescript
// tests/performance.test.ts
import { describe, it, expect } from "bun:test";

describe("성능 테스트", () => {
  it("100개 API 항목을 5초 이내에 변환해야 한다", async () => {
    const start = performance.now();
    await convert("tests/fixtures/large-100-endpoints.yaml");
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });
});
```

## Project Structure

### Documentation (this feature)

```text
specs/001-openapi-xlsx-export/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (CLI interface)
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
src/
├── index.ts             # CLI 진입점 (otd 명령어)
├── cli/
│   └── commands.ts      # CLI 명령어 및 옵션 처리
├── parser/
│   └── openapi-parser.ts  # OpenAPI 문서 파싱 및 $ref 해소
├── transformer/
│   └── endpoint-extractor.ts  # OpenAPI → 테이블 데이터 변환
├── writer/
│   └── xlsx-writer.ts   # ExcelJS 기반 XLSX 생성
├── models/
│   └── types.ts         # 공유 타입 정의
└── utils/
    └── error-handler.ts # 오류 처리 유틸리티

tests/
├── fixtures/            # 테스트용 OpenAPI 샘플 파일
├── parser.test.ts
├── transformer.test.ts
├── writer.test.ts
└── integration.test.ts
```

**Structure Decision**: Single project 구조 선택. CLI 도구로서 단일 진입점과 명확한 모듈 분리가 적합하다.

## Complexity Tracking

> **헌법 위반 없음** - 모든 원칙 준수
