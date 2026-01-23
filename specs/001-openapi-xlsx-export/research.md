# Research: OpenAPI to XLSX Export

**Date**: 2026-01-15
**Feature**: 001-openapi-xlsx-export

## 1. XLSX 생성 라이브러리

### 결정: ExcelJS

**선택 이유**:
- Bun 런타임과 완벽 호환 (순수 JavaScript)
- 내장 TypeScript 타입 지원
- 다중 워크시트 및 풍부한 셀 스타일링 지원
- 활발한 유지보수 (GitHub 13k+ 스타)

**대안 검토**:

| 라이브러리 | 장점 | 단점 | 결론 |
|------------|------|------|------|
| ExcelJS | 스타일링 완벽 지원, TS 내장 | 번들 크기 큼 | ✅ 선택 |
| SheetJS (xlsx) | 가볍고 빠름 | 스타일링 미지원 | ❌ 제외 |
| xlsx-js-style | SheetJS + 스타일링 | 업데이트 느림 | ❌ 제외 |

**설치**:
```bash
bun add exceljs
```

## 2. OpenAPI 파서 라이브러리

### 결정: @apidevtools/swagger-parser

**선택 이유**:
- OpenAPI 3.0.x 및 3.1.x 완벽 지원
- YAML 및 JSON 모두 지원
- `$ref` 완전 해소 (`dereference`) 기능
- 외부 파일 참조 자동 해소
- 스키마 검증 기능 내장

**대안 검토**:

| 라이브러리 | 장점 | 단점 | 결론 |
|------------|------|------|------|
| swagger-parser | 완벽한 $ref 해소 | 없음 | ✅ 선택 |
| @redocly/openapi-core | 강력한 린팅 | API 복잡 | ❌ 과도함 |
| yaml + 수동 처리 | 의존성 최소 | $ref 처리 어려움 | ❌ 제외 |

**설치**:
```bash
bun add @apidevtools/swagger-parser
bun add -D openapi-types
```

## 3. CLI 인자 처리

### 결정: 네이티브 Bun.argv 사용

**선택 이유**:
- 의존성 최소화 원칙 준수 (헌법 I조)
- 간단한 CLI 구조: `otd [옵션] <입력파일>`
- Bun 내장 기능으로 충분

**대안 검토**:

| 방식 | 장점 | 단점 | 결론 |
|------|------|------|------|
| Bun.argv | 의존성 없음 | 직접 파싱 필요 | ✅ 선택 |
| commander | 풍부한 기능 | 과도한 의존성 | ❌ 제외 |
| yargs | 자동 help 생성 | 무거움 | ❌ 제외 |

## 4. XLSX 출력 구조 결정

### 결정: 다중 시트 구조

사용자 제공 템플릿(fortlogic.v0.xlsx)을 분석하여 최종 구조를 결정했습니다.

**최종 구조**는 [xlsx-structure.md](./contracts/xlsx-structure.md)에서 정의합니다.

**초기 아이디어** (참고용):
- 단일 시트 + 행별 API 항목 방식을 검토했으나
- 템플릿 분석 결과 다중 시트(개요, 인증, API 항목, 태그별 상세) 구조로 변경

**스타일링**:
- 헤더 행: 굵은 글씨, 배경색 (파란색)
- 열 너비 자동 조정
- 첫 행 고정 (freeze)

## 5. 오류 처리 전략

### 결정: 구조화된 오류 클래스

오류 유형별 종료 코드 및 메시지는 [cli-interface.md](./contracts/cli-interface.md#오류-메시지-상세)에서 정의합니다.

**종료 코드 분류**:
- 1: 파일 시스템 오류 (파일 없음, 권한 없음, 파일 이미 존재)
- 2: OpenAPI 파싱 오류 (잘못된 형식, 지원하지 않는 버전)
- 3: 출력 오류 (쓰기 실패)

## 6. 최종 의존성 목록

```json
{
  "dependencies": {
    "exceljs": "^4.4.0",
    "@apidevtools/swagger-parser": "^10.1.0"
  },
  "devDependencies": {
    "openapi-types": "^12.1.3",
    "@biomejs/biome": "^1.9.0",
    "typescript": "^5.7.0"
  }
}
```

## 7. 미해결 사항

없음 - 모든 기술적 결정 완료
