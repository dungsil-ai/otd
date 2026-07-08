# openapi-to-document Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-01-15

## Active Technologies

- TypeScript 5.x (strict mode)

## Project Structure

```text
src/
tests/
```

## Commands

npm test; npm run lint

## Code Style

TypeScript 5.x (strict mode): Follow standard conventions

## Recent Changes

- 001-openapi-xlsx-export: Added TypeScript 5.x (strict mode)

<!-- MANUAL ADDITIONS START -->

## Build Number

- 커밋 시 항상 `src/cli/commands.ts`의 `BUILD_DATE`를 커밋 날짜(YYYY-MM-DD)로 업데이트해야 합니다.

## 미리보기 일관성

- 미리보기 HTML(`src/static/openapi-preview.ts`)은 실제 XLSX 출력(`src/writer/xlsx-writer.ts`)의 시트 구성과 표시 조건을 동일하게 유지해야 합니다.
- XLSX 시트 추가/제거 또는 표시 조건 변경 시 미리보기 탭 구성과 관련 테스트도 함께 갱신해야 합니다.

<!-- MANUAL ADDITIONS END -->
