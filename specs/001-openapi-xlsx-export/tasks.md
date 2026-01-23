# Tasks: OpenAPI to XLSX Export

**Input**: Design documents from `/specs/001-openapi-xlsx-export/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: 포함됨 (plan.md Constitution Check에서 테스트 우선 개발 명시)

**Organization**: 사용자 스토리(P1, P2, P3) 기준으로 태스크를 그룹화하여 독립적 구현 및 테스트 가능

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 병렬 실행 가능 (다른 파일, 의존성 없음)
- **[Story]**: 해당 태스크가 속한 사용자 스토리 (US1, US2, US3)
- 모든 태스크에 정확한 파일 경로 포함

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root (plan.md 구조 기준)

---

## Phase 1: Setup (공유 인프라)

**Purpose**: 프로젝트 초기화 및 기본 구조 설정

- [x] T001 Initialize Bun project with package.json configuration
- [x] T002 [P] Configure TypeScript 5.x strict mode in tsconfig.json
- [x] T003 [P] Configure Biome linter/formatter in biome.json
- [x] T004 Install dependencies: exceljs, @apidevtools/swagger-parser, openapi-types in package.json
- [x] T005 Create project directory structure per plan.md (src/cli/, src/parser/, src/transformer/, src/writer/, src/models/, src/utils/, tests/fixtures/)

---

## Phase 2: Foundational (차단 전제조건)

**Purpose**: 모든 사용자 스토리 구현 전 완료해야 하는 핵심 인프라

**CRITICAL**: 이 단계 완료 전까지 사용자 스토리 작업 시작 불가

- [x] T006 Define shared type definitions (EndpointInfo, ParameterInfo, RequestBodyInfo, ResponseInfo, CliOptions) in src/models/types.ts
- [x] T007 Define error types (AppError, ErrorCode) in src/models/types.ts
- [x] T008 Create CLI entry point with Bun.argv parsing skeleton in src/index.ts
- [x] T009 [P] Create test fixture: minimal valid OpenAPI 3.0 document in tests/fixtures/minimal.yaml
- [x] T010 [P] Create test fixture: OpenAPI 3.1 document with all features in tests/fixtures/complete.yaml

**Checkpoint**: 기반 구조 완료 - 사용자 스토리 구현 가능

---

## Phase 3: User Story 1 - 기본 변환 (Priority: P1) MVP

**Goal**: OpenAPI v3 문서를 테이블 형식의 XLSX API 명세서로 변환

**Independent Test**: `otd sample.yaml` 실행 시 동일 디렉토리에 `sample.xlsx` 생성, 스프레드시트 프로그램에서 정상 열림

### Tests for User Story 1

> **NOTE: 구현 전 테스트 작성, 테스트 실패 확인 후 구현**

- [x] T011 [P] [US1] Unit test for OpenAPI parser (YAML/JSON loading, $ref resolution) in tests/parser.test.ts
- [x] T012 [P] [US1] Unit test for endpoint extractor (EndpointInfo extraction) in tests/transformer.test.ts
- [x] T013 [P] [US1] Unit test for XLSX writer (sheet generation, styling) in tests/writer.test.ts
- [x] T014 [US1] Integration test for full pipeline (input → output XLSX) in tests/integration.test.ts

### Implementation for User Story 1

- [x] T015 [US1] Implement OpenAPI parser with swagger-parser (parse, dereference) in src/parser/openapi-parser.ts
- [x] T016 [US1] Implement endpoint extractor (paths iteration, method/parameter extraction) in src/transformer/endpoint-extractor.ts
- [x] T017 [US1] Implement XLSX writer - Sheet 1 개요 (info.title, version, servers, description) in src/writer/xlsx-writer.ts
- [x] T018 [US1] Implement XLSX writer - Sheet 2 인증 (securitySchemes) in src/writer/xlsx-writer.ts
- [x] T019 [US1] Implement XLSX writer - Sheet 3 API 항목 (method, path, summary table) in src/writer/xlsx-writer.ts
- [x] T020 [US1] Implement XLSX writer - Sheet 4+ 태그별 API 상세 (parameters, requestBody, responses) in src/writer/xlsx-writer.ts
- [x] T021 [US1] Apply XLSX styling (header colors, column widths, freeze pane) in src/writer/xlsx-writer.ts
- [x] T022 [US1] Integrate parser → transformer → writer pipeline in src/index.ts
- [x] T023 [US1] Implement default output path logic (same directory, .xlsx extension) in src/cli/commands.ts

**Checkpoint**: User Story 1 완료 - 기본 변환 기능 독립 테스트 가능

---

## Phase 4: User Story 2 - 출력 경로 지정 (Priority: P2)

**Goal**: 사용자가 출력 파일 위치와 이름을 자유롭게 지정 가능

**Independent Test**: `-o ./output/api-spec.xlsx` 옵션으로 지정 경로에 파일 생성 확인

### Tests for User Story 2

- [x] T024 [P] [US2] Unit test for output path resolution (extension auto-add, directory handling) in tests/cli.test.ts
- [x] T025 [US2] Integration test for --output option with various path formats in tests/integration.test.ts

### Implementation for User Story 2

- [x] T026 [US2] Implement --output option parsing in src/cli/commands.ts
- [x] T027 [US2] Implement path resolution: auto .xlsx extension in src/cli/commands.ts
- [x] T028 [US2] Implement path resolution: directory-only → use input filename in src/cli/commands.ts
- [x] T029 [US2] Implement --force option for file overwrite in src/cli/commands.ts
- [x] T030 [US2] Implement file existence check (error when exists without --force) in src/cli/commands.ts

**Checkpoint**: User Story 2 완료 - 출력 경로 지정 기능 독립 테스트 가능

---

## Phase 5: User Story 3 - 오류 처리 및 피드백 (Priority: P3)

**Goal**: 명확한 한국어 오류 메시지와 해결 안내 제공, 진행 상황 표시

**Independent Test**: 존재하지 않는 파일, 잘못된 형식 등 다양한 오류 시나리오에서 적절한 메시지 확인

### Tests for User Story 3

- [x] T031 [P] [US3] Unit test for error handler (error codes, messages) in tests/error-handler.test.ts
- [x] T032 [P] [US3] Unit test for CLI help/version output and priority handling (FR-016: --help/--version override other options) in tests/cli.test.ts
- [x] T033 [US3] Integration test for error scenarios (file not found, invalid format, permission) in tests/integration.test.ts

### Implementation for User Story 3

- [x] T034 [US3] Implement error handler with Korean messages per cli-interface.md in src/utils/error-handler.ts
- [x] T035 [US3] Implement file not found error (exit code 1) in src/utils/error-handler.ts
- [x] T036 [US3] Implement invalid OpenAPI error (exit code 2) in src/utils/error-handler.ts
- [x] T037 [US3] Implement write error (exit code 3) in src/utils/error-handler.ts
- [x] T038 [US3] Implement unsupported version (v2) error with migration hint in src/utils/error-handler.ts
- [x] T039 [US3] Implement --help option with Korean usage text (priority over other args per FR-016) in src/cli/commands.ts
- [x] T040 [US3] Implement --version option with version and build date (priority over other args per FR-016) in src/cli/commands.ts
- [x] T041 [US3] Implement missing argument error with usage hint in src/cli/commands.ts
- [x] T042 [US3] Implement unknown option error in src/cli/commands.ts
- [x] T043 [US3] Implement success message output to stdout in src/cli/commands.ts
- [x] T044 [US3] Implement progress indicator for large documents to stderr in src/cli/commands.ts

**Checkpoint**: User Story 3 완료 - 오류 처리 기능 독립 테스트 가능

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 전체 스토리에 영향을 미치는 개선 사항

- [x] T045 [P] Create test fixture: large OpenAPI document (100 endpoints) in tests/fixtures/large-100-endpoints.yaml
- [x] T046 Performance test: verify 100 API items processed under 5 seconds in tests/performance.test.ts
- [x] T047 [P] Create test fixture: edge cases (empty paths, special characters, external refs) in tests/fixtures/edge-cases.yaml
- [x] T048 Edge case tests (empty document, v2 document, malformed YAML) in tests/integration.test.ts
- [x] T049 Configure bun link for global CLI installation in package.json
- [x] T050 Run quickstart.md validation: (1) Excel/LibreOffice/Google Sheets에서 열기 확인 (SC-002), (2) 입력 API 항목 수 = 출력 행 수 검증 (SC-003), (3) quickstart 시나리오 실행
- [x] T051 Final code cleanup and JSDoc documentation for public functions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 의존성 없음 - 즉시 시작 가능
- **Foundational (Phase 2)**: Setup 완료 후 시작 - 모든 사용자 스토리 차단
- **User Stories (Phase 3-5)**: Foundational 완료 후 시작
  - 우선순위 순서: P1 → P2 → P3
  - 팀 구성 시 병렬 진행 가능
- **Polish (Phase 6)**: 모든 사용자 스토리 완료 후

### User Story Dependencies

- **User Story 1 (P1)**: Foundational 완료 후 시작 - 다른 스토리 의존 없음
- **User Story 2 (P2)**: Foundational 완료 후 시작 - US1의 기본 CLI 구조 필요하나 독립 테스트 가능
- **User Story 3 (P3)**: Foundational 완료 후 시작 - US1/US2와 통합되나 독립 테스트 가능

### Within Each User Story

- 테스트 작성 → 테스트 실패 확인 → 구현 → 테스트 통과
- Models → Services → Integration 순서
- 핵심 구현 완료 후 통합

### Parallel Opportunities

**Phase 1 병렬**:
- T002, T003 병렬 실행 가능

**Phase 2 병렬**:
- T006, T007, T009, T010 병렬 실행 가능

**User Story 1 테스트 병렬**:
- T011, T012, T013 병렬 실행 가능

**User Story 2 테스트 병렬**:
- T024 독립 실행 가능

**User Story 3 테스트 병렬**:
- T031, T032 병렬 실행 가능

**Phase 6 병렬**:
- T045, T047 병렬 실행 가능

---

## Parallel Example: User Story 1

```bash
# US1 테스트 병렬 실행:
Task: "Unit test for OpenAPI parser in tests/parser.test.ts"
Task: "Unit test for endpoint extractor in tests/transformer.test.ts"
Task: "Unit test for XLSX writer in tests/writer.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1: Setup 완료
2. Phase 2: Foundational 완료 (필수 - 모든 스토리 차단)
3. Phase 3: User Story 1 완료
4. **STOP and VALIDATE**: US1 독립 테스트 - `otd sample.yaml` 실행, XLSX 확인
5. 준비 완료 시 배포/데모

### Incremental Delivery

1. Setup + Foundational → 기반 준비
2. User Story 1 → 독립 테스트 → 배포 (MVP!)
3. User Story 2 → 독립 테스트 → 배포
4. User Story 3 → 독립 테스트 → 배포
5. 각 스토리는 이전 기능 유지하면서 가치 추가

### Parallel Team Strategy

다중 개발자 시:

1. 팀 전체: Setup + Foundational 완료
2. Foundational 완료 후:
   - 개발자 A: User Story 1
   - 개발자 B: User Story 2 (US1 기본 구조 대기 후)
   - 개발자 C: User Story 3
3. 각 스토리 독립 완료 및 통합

---

## Notes

- [P] 태스크 = 다른 파일, 의존성 없음, 병렬 가능
- [Story] 라벨 = 특정 사용자 스토리에 매핑, 추적성 확보
- 각 사용자 스토리는 독립적으로 완료 및 테스트 가능
- 구현 전 테스트 실패 확인 필수
- 태스크 또는 논리적 그룹 완료 후 커밋
- 각 체크포인트에서 스토리 독립 검증 가능
- 피해야 할 것: 모호한 태스크, 같은 파일 충돌, 독립성 깨는 크로스 스토리 의존성
