# Integration Requirements Quality Checklist: OpenAPI to XLSX Export

**Purpose**: 모든 문서(spec, plan, contracts, data-model) 간 요구사항 일관성 및 완전성 검증
**Created**: 2026-01-15
**Feature**: [spec.md](../spec.md) | [plan.md](../plan.md) | [contracts/](../contracts/) | [data-model.md](../data-model.md)
**Focus**: 문서 간 일관성, 요구사항 추적성, 누락 항목 식별

## Spec ↔ Plan 일관성

- [x] CHK001 - spec.md의 FR-004(XLSX 포함 정보)와 xlsx-structure.md의 컬럼 정의가 일치하는가? [Consistency, Spec §FR-004 vs xlsx-structure]
- [x] CHK002 - spec.md의 성능 목표(SC-001: 5초 이내)와 plan.md의 Performance Goals가 동일한가? [Consistency, Spec §SC-001 vs Plan]
- [x] CHK003 - spec.md의 지원 버전(FR-001: 3.0.x, 3.1.x)과 plan.md의 의존성 라이브러리 지원 범위가 일치하는가? [Consistency, Spec §FR-001]
- [x] CHK004 - spec.md의 옵션 목록(FR-005~FR-016)과 cli-interface.md의 옵션 정의가 완전히 일치하는가? [Completeness]
- [x] CHK005 - spec.md의 종료 코드(FR-010)와 cli-interface.md의 종료 코드 테이블이 일치하는가? [Consistency, Spec §FR-010]

## Spec ↔ Data Model 일관성

- [x] CHK006 - spec.md의 Key Entities와 data-model.md의 도메인 엔티티가 1:1 매핑되는가? [Completeness]
- [x] CHK007 - spec.md의 "요청 매개변수" 정의와 data-model.md의 ParameterInfo 구조가 일치하는가? [Consistency]
- [x] CHK008 - spec.md의 "응답 상태 및 설명"과 data-model.md의 ResponseInfo 구조가 일치하는가? [Consistency]
- [x] CHK009 - data-model.md의 CliOptions에 spec.md의 모든 옵션(--force 포함)이 반영되어 있는가? [Gap, Spec §FR-013]
- [x] CHK010 - data-model.md의 ErrorCode에 모든 오류 시나리오가 포함되어 있는가? [Completeness]

## Spec ↔ XLSX Structure 일관성

- [x] CHK011 - spec.md FR-004의 "API 경로"가 xlsx-structure.md의 어느 시트/컬럼에 매핑되는지 명시되어 있는가? [Traceability]
- [x] CHK012 - spec.md FR-004의 "요청 방식"이 xlsx-structure.md의 메서드 컬럼과 일치하는가? [Consistency]
- [x] CHK013 - spec.md FR-004의 "요청 매개변수"가 xlsx-structure.md의 파라미터 섹션 구조와 일치하는가? [Consistency]
- [x] CHK014 - spec.md FR-004의 "요청 본문 구조"가 xlsx-structure.md의 요청 바디 섹션과 일치하는가? [Consistency]
- [x] CHK015 - spec.md FR-004의 "응답 상태 및 설명"이 xlsx-structure.md의 응답 섹션과 일치하는가? [Consistency]

## Plan ↔ Constitution 일관성

- [x] CHK016 - plan.md의 의존성(exceljs, swagger-parser)이 constitution의 "의존성 최소화" 원칙을 준수하는가? [Consistency, Constitution §I]
- [x] CHK017 - plan.md의 테스트 계획이 constitution의 "테스트 우선 개발" 원칙을 반영하는가? [Consistency, Constitution §II]
- [x] CHK018 - plan.md의 프로젝트 구조가 constitution의 "단일 책임 원칙"을 따르는가? [Consistency, Constitution §I]

## CLI Interface ↔ Data Model 일관성

- [x] CHK019 - cli-interface.md의 모든 옵션이 data-model.md의 CliOptions 인터페이스에 반영되어 있는가? [Completeness]
- [x] CHK020 - cli-interface.md의 오류 메시지 테이블과 data-model.md의 ErrorCode가 1:1 매핑되는가? [Consistency]
- [x] CHK021 - cli-interface.md의 종료 코드와 data-model.md의 오류 처리 로직이 일치하는가? [Consistency]

## XLSX Structure ↔ Data Model 일관성

- [x] CHK022 - xlsx-structure.md의 시트/컬럼 구조가 data-model.md의 XlsxRow 인터페이스로 표현 가능한가? [Consistency]
- [x] CHK023 - xlsx-structure.md의 OpenAPI 매핑 테이블이 data-model.md의 EndpointInfo 필드와 일치하는가? [Consistency]
- [x] CHK024 - xlsx-structure.md의 파라미터 컬럼이 data-model.md의 ParameterInfo와 일치하는가? [Consistency]

## 누락된 요구사항 (Gap Analysis)

- [x] CHK025 - spec.md에 정의된 Edge Cases가 cli-interface.md의 오류 메시지 테이블에 모두 포함되어 있는가? [Coverage]
- [x] CHK026 - spec.md의 Assumptions이 다른 문서들과 충돌하지 않는가? [Conflict → 충돌 없음]
- [x] CHK027 - xlsx-structure.md의 "인증 시트"가 spec.md FR-018에 반영됨 (보안 스키마 정보) [Gap → Resolved]
- [x] CHK028 - xlsx-structure.md의 "개요 시트"가 spec.md FR-017에 반영됨 (API 메타정보) [Gap → Resolved]
- [x] CHK029 - data-model.md에 xlsx-structure.md의 스타일 정보 반영 불필요 (렌더링 레이어에서 처리) [Gap → N/A]

## 측정 가능성 (Measurability)

- [x] CHK030 - spec.md SC-001의 "5초 이내"가 plan.md에서 테스트 가능한 방법으로 정의되어 있는가? [Measurability]
- [x] CHK031 - spec.md SC-002의 "주요 스프레드시트 프로그램"이 구체적으로 명시되어 있는가? (Excel, LibreOffice, Google Sheets) [Clarity, Spec §SC-002]
- [x] CHK032 - spec.md SC-003의 "손실 없이"가 검증 가능한 기준으로 정의되어 있는가? (FR-004 필드 완전성) [Measurability, Spec §SC-003]
- [x] CHK033 - plan.md의 "메모리 100MB 미만" 테스트 방법 생략 (런타임 환경 의존) [Gap → N/A]

## 요구사항 추적성 (Traceability)

- [x] CHK034 - 모든 spec.md의 FR이 plan.md의 프로젝트 구조에 매핑 가능한가? [Traceability]
- [x] CHK035 - 모든 spec.md의 User Story가 cli-interface.md의 사용 예시로 커버되는가? [Coverage]
- [x] CHK036 - data-model.md의 모든 인터페이스가 spec.md의 요구사항에서 도출 가능한가? [Traceability]
- [x] CHK037 - xlsx-structure.md의 모든 시트/컬럼이 spec.md 또는 참조 템플릿에서 근거를 찾을 수 있는가? [Traceability]

## 버전 및 형식 일관성

- [x] CHK038 - 모든 문서의 날짜 형식이 일관적인가? (YYYY-MM-DD) [Consistency]
- [x] CHK039 - 모든 문서에서 동일한 용어가 사용되는가? (API 항목으로 통일됨) [Consistency]
- [x] CHK040 - 모든 문서에서 CLI 명령어 구조가 `otd [옵션] <입력파일>`로 일관되게 사용되는가? [Consistency]

## Notes

- 이 체크리스트는 문서 간 요구사항의 일관성을 검증합니다
- `[Gap]`: 한 문서에만 있고 다른 문서에 누락된 정보
- `[Conflict]`: 문서 간 상충되는 정의
- `[Consistency]`: 동일 정보가 여러 문서에서 일치하는지 확인
- `[Traceability]`: 요구사항의 출처와 구현 연결 확인
