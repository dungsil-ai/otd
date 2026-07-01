# OpenAPI to Document (OTD)

[![Release](https://github.com/dungsil-ai/otd/actions/workflows/release.yml/badge.svg)](https://github.com/dungsil-ai/otd/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> OpenAPI v3 문서를 테이블 형식의 API 명세서(XLSX)로 변환하는 CLI 도구

## 주요 기능

- ✅ **OpenAPI v3 지원**: OpenAPI 3.0.x 문서 파싱 및 변환
- ✅ **XLSX 출력**: Excel 형식의 깔끔한 API 명세서 생성
- ✅ **정적 웹 변환기 배포**: 바이너리 없이 브라우저에서 XLSX 명세서 생성
- ✅ **샘플 데이터 자동 생성**: 스키마 기반 요청/응답 예시 JSON 생성
- ✅ **다중 Content-Type 지원**: JSON, form-data, octet-stream 등 별도 분리
- ✅ **파일 업로드 인식**: multipart, octet-stream은 첨부파일로 표시
- ✅ **서버 URL 분류**: 개발/운영 서버 자동 분류

## 설치

### 글로벌 설치 (권장)

> [!NOTE]
> 글로벌 설치를 위해 [Bun](https://bun.sh/) 런타임이 필요합니다.

```bash
# GitHub에서 직접 글로벌 설치
bun install -g github:dungsil-ai/otd

# 설치 후 어디서든 사용 가능
otd openapi.yaml
```

### 설치 없이 바로 실행

```bash
# bunx로 설치 없이 바로 실행
bunx github:dungsil-ai/otd openapi.yaml
bunx github:dungsil-ai/otd openapi.yaml -o api-spec.xlsx
```

### 실행 파일 다운로드

[GitHub Releases](https://github.com/dungsil-ai/otd/releases)에서 OS별 실행 파일을 다운로드할 수 있습니다. Bun 설치가 필요 없습니다.

| 플랫폼 | 파일명 |
|--------|--------|
| Linux x64 | `otd-linux-x64` |
| Linux ARM64 | `otd-linux-arm64` |
| macOS x64 (Intel) | `otd-darwin-x64` |
| macOS ARM64 (Apple Silicon) | `otd-darwin-arm64` |
| Windows x64 | `otd-windows-x64.exe` |
| Static Web Converter | `index.html`, `openapi-to-document.js` |

### 소스에서 설치 (개발용)

```bash
# 저장소 클론
git clone https://github.com/dungsil-ai/otd.git
cd otd

# 의존성 설치
bun install

# 로컬에서 글로벌로 링크
bun link
```

## 사용법

### 기본 사용

```bash
# 글로벌 설치 후
otd <openapi-file>

# 예시
otd api.yaml

# 또는 개발 모드로 실행
bun run dev -- <openapi-file>
```

### 옵션

```bash
# 출력 파일명 지정
otd api.yaml -o my-api-spec.xlsx

# 기존 파일 덮어쓰기
otd api.yaml -o spec.xlsx -f

# 도움말
otd --help
```

### 옵션 목록

| 옵션 | 단축 | 설명 |
|------|------|------|
| `--output` | `-o` | 출력 파일 경로 지정 |
| `--force` | `-f` | 기존 파일 강제 덮어쓰기 |
| `--help` | `-h` | 도움말 표시 |
| `--version` | `-v` | 버전 정보 표시 |

## 출력 형식

### XLSX 구조

생성된 XLSX 파일은 다음 구조로 구성됩니다:

```
📊 API 명세서.xlsx
├── 요약 시트
│   ├── API 제목/버전/설명
│   ├── 서버 정보
│   └── 태그별 엔드포인트 수
│
└── 엔드포인트 시트
    ├── 기본 정보 (메서드, 경로, 설명)
    ├── 파라미터 테이블
    ├── 요청 바디 (Content-Type별)
    │   ├── 속성 테이블
    │   └── 요청 예시 (JSON)
    ├── 응답 (Status Code별)
    │   ├── 속성 테이블
    │   └── 응답 예시 (JSON)
    └── ...
```

### 스타일

- **헤더**: 파란색 배경, 볼드체
- **속성 테이블**: 테두리, wrapText 적용
- **예시 JSON**: 자동 줄바꿈, 동적 행 높이

## 개발

### 스크립트

```bash
# 개발 실행
bun run dev

# 테스트
bun test

# 타입 체크
bun run typecheck

# 린트
bun run lint

# 포맷
bun run format

# 빌드
bun run build
```

### 프로젝트 구조

```
src/
├── index.ts              # CLI 진입점
├── cli/                  # CLI 파서
├── error/                # 에러 핸들러
├── models/               # 타입 정의
├── transformer/          # OpenAPI → 내부 모델 변환
└── writer/               # XLSX 생성
```

## 기술 스택

- **Runtime**: [Bun](https://bun.sh/)
- **Language**: TypeScript
- **OpenAPI Parser**: [@apidevtools/swagger-parser](https://github.com/APIDevTools/swagger-parser)
- **Excel 생성**: [ExcelJS](https://github.com/exceljs/exceljs)
- **샘플 생성**: [openapi-sampler](https://github.com/Redocly/openapi-sampler)

## 라이선스

MIT License - 자유롭게 사용, 수정, 배포할 수 있습니다.
