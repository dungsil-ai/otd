# OpenAPI to Document (OTD)

[![Release](https://github.com/dungsil-ai/otd/actions/workflows/release.yml/badge.svg)](https://github.com/dungsil-ai/otd/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

OpenAPI v3 문서를 XLSX 형식의 API 명세서로 변환하는 도구입니다. 별도 설치 없이 브라우저에서 바로 변환하는 정적 웹 변환기를 기본 사용 방법으로 제공합니다.

## 주요 기능

- OpenAPI 3.0.x와 3.1.x 문서 파싱 및 `$ref` 해소
- API 개요, 인증 정보, `API 항목`(전체 엔드포인트 목록), 태그별 엔드포인트 상세 시트가 포함된 XLSX 생성
- 요청/응답 파라미터와 스키마 속성을 표 형태로 정리
- 스키마 기반 요청/응답 예시 JSON 생성
- JSON, form-data, octet-stream 등 Content-Type별 요청/응답 분리
- multipart와 octet-stream 기반 파일 업로드 정보 표시
- 설치 없이 브라우저에서 사용하는 정적 웹 변환기 제공
- 자동화와 로컬 작업을 위한 CLI 지원

## 권장 사용: 정적 웹 변환기

가장 간편한 사용 방법은 정적 웹 변환기입니다. 별도 프로그램을 설치하거나 실행 파일을 다운로드하지 않고 브라우저에서 OpenAPI 문서를 XLSX로 변환할 수 있습니다.

- 정적 웹 변환기: <https://dungsil-ai.github.io/otd/>
- 파일 업로드 또는 문서 내용 붙여넣기로 변환
- 변환 결과를 브라우저에서 바로 `.xlsx` 파일로 저장

## CLI 설치

### 글로벌 설치

[Bun](https://bun.sh/) 런타임이 필요합니다.

```bash
bun install -g github:dungsil-ai/otd
otd openapi.yaml
```

### 설치 없이 실행

```bash
bunx github:dungsil-ai/otd openapi.yaml
bunx github:dungsil-ai/otd openapi.yaml -o api-spec.xlsx
```

### 실행 파일 다운로드

[GitHub Releases](https://github.com/dungsil-ai/otd/releases)에서 OS별 실행 파일을 다운로드할 수 있습니다. 실행 파일은 Bun 설치 없이 사용할 수 있습니다.

| 플랫폼 | 파일명 |
| --- | --- |
| Linux x64 | `otd-linux-x64` |
| Linux ARM64 | `otd-linux-arm64` |
| macOS x64 | `otd-darwin-x64` |
| macOS ARM64 | `otd-darwin-arm64` |
| Windows x64 | `otd-windows-x64.exe` |

## CLI 사용법

```bash
otd <openapi-file>
otd <openapi-file> -o <output-file>
otd <openapi-file> -o <output-directory>/ --force
```

예시:

```bash
otd openapi.yaml
otd openapi.json -o api-spec.xlsx
otd spec.yaml -o ./docs/ --force
```

## 옵션

| 옵션 | 단축 | 설명 |
| --- | --- | --- |
| `--output <경로>` | `-o` | 출력 파일 경로를 지정합니다. 디렉터리를 지정하려면 경로 끝에 `/`(또는 `\\`)를 붙이세요. 확장자가 없으면 `.xlsx`를 추가합니다. |
| `--force` | `-f` | 같은 이름의 출력 파일이 있으면 덮어씁니다. |
| `--help` | `-h` | 도움말을 표시합니다. |
| `--version` | `-v` | 버전과 빌드 날짜를 표시합니다. |

출력 경로를 지정하지 않으면 입력 파일과 같은 위치에 같은 파일명의 `.xlsx` 파일을 생성합니다.

## 출력 파일 구성

생성된 XLSX 파일은 다음 시트로 구성됩니다.

| 시트 | 내용 |
| --- | --- |
| `개요` | API 제목, 버전, 설명, 서버 정보, 태그별 엔드포인트 수 |
| `인증` | OpenAPI security scheme 정보 |
| `엔드포인트` | 전체 엔드포인트의 메서드, 경로, 설명, 파라미터, 요청 바디, 응답, 예시 JSON |
| 태그별 시트 | 각 태그에 속한 엔드포인트 상세 정보 |

## 개발

### 요구 사항

- Bun
- TypeScript

### 시작하기

```bash
git clone https://github.com/dungsil-ai/otd.git
cd otd
bun install
bun run dev -- openapi.yaml
```

### 스크립트

| 명령 | 설명 |
| --- | --- |
| `bun run dev -- <openapi-file>` | 소스에서 CLI를 실행합니다. |
| `bun test` | 테스트를 실행합니다. |
| `bun run lint` | Biome 검사와 포맷 검사를 실행합니다. |
| `bun run typecheck` | TypeScript 타입 검사를 실행합니다. |
| `bun run build` | Node 대상 CLI 번들과 정적 웹 변환기 파일(`dist/index.html`, `dist/openapi-to-document.js`)을 빌드합니다. |
| `bun run build:exe` | OS별 실행 파일을 `dist/exe/`에 빌드합니다. |
| `bun run format` | Biome으로 코드를 포맷합니다. |

## 프로젝트 구조

```text
src/
├── index.ts                 # CLI 진입점
├── cli/                     # CLI 인자, 도움말, 버전 처리
├── models/                  # 공통 타입과 애플리케이션 오류
├── parser/                  # OpenAPI 문서 파싱과 검증
├── static/                  # 정적 웹 변환기 소스
├── transformer/             # OpenAPI 문서를 XLSX 데이터 모델로 변환
├── utils/                   # 오류와 진행 메시지 처리
└── writer/                  # XLSX 워크북 생성
tests/                       # 단위, 통합, 성능, 웹 E2E 테스트
scripts/                     # 빌드 스크립트
```

## 라이선스

MIT License
