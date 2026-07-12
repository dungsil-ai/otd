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

## Springdoc Gradle 자동 변환

`gradle-plugin/`의 플러그인은 Springdoc Gradle Plugin이 생성한 OpenAPI JSON/YAML을 받아 XLSX 명세서까지 연속으로 생성합니다. `generateApiDocument` 태스크 하나로 다음 작업을 실행합니다.

1. `generateOpenApiDocs`를 실행해 Spring Boot 애플리케이션에서 OpenAPI 문서를 생성합니다.
2. 현재 OS/아키텍처에 맞는 OTD 실행 파일을 Gradle 사용자 홈 캐시에 한 번 다운로드합니다.
3. OpenAPI 파일마다 XLSX 명세서를 생성합니다.

Gradle Plugin Portal 배포 전에는 이 저장소를 composite build로 연결합니다. `includeBuild` 경로는 소비 프로젝트의 `settings.gradle.kts`를 기준으로 실제 OTD 저장소 위치에 맞게 조정해야 합니다.

```kotlin
// settings.gradle.kts
pluginManagement {
    includeBuild("<path-to-otd>/gradle-plugin")
    repositories {
        gradlePluginPortal()
        mavenCentral()
    }
}
```

Spring Boot 3와 Spring MVC를 사용하는 프로젝트의 Kotlin DSL 설정 예시:

```kotlin
// build.gradle.kts
plugins {
    java
    id("org.springframework.boot") version "3.5.16"
    id("org.springdoc.openapi-gradle-plugin") version "1.9.0"
    id("io.github.dungsil-ai.openapi-to-document")
}

dependencies {
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-api:2.8.17")
}

openApi {
    outputDir.set(layout.buildDirectory.dir("openapi"))
    outputFileName.set("openapi.json")
    waitTimeInSeconds.set(30)

    customBootRun {
        args.set(listOf("--spring.profiles.active=openapi"))
    }
}

openApiDocument {
    outputDirectory.set(layout.buildDirectory.dir("api-specification"))
    outputFileName.set("service-api.xlsx")
}
```

WebFlux 프로젝트에서는 MVC 의존성 대신 다음 의존성을 사용합니다.

```kotlin
implementation("org.springdoc:springdoc-openapi-starter-webflux-api:2.8.17")
```

실행:

```bash
./gradlew generateApiDocument
```

기본 출력은 `<buildDirectory>/api-document/<OpenAPI 파일명>.xlsx`이며, Gradle 기본 설정에서는 `build/api-document/<OpenAPI 파일명>.xlsx`입니다. `openApiDocument.outputFileName`은 입력이 하나일 때만 지정할 수 있습니다. Springdoc의 `groupedApiMappings`를 사용하면 각 매핑의 출력 파일명에 대응하는 XLSX를 각각 생성합니다.

지원하는 자동 다운로드 대상은 Linux x64/ARM64, macOS x64/ARM64, Windows x64입니다. 사내 미러나 직접 설치한 실행 파일을 사용하려면 다음 속성을 설정합니다.

직접 설치한 실행 파일:

```kotlin
openApiDocument {
    executable.set(file("/opt/otd/bin/otd"))
}
```

GitHub Releases와 같은 `<base>/v<version>/<asset>` 구조의 사내 미러:

```kotlin
openApiDocument {
    downloadBaseUrl.set("https://artifacts.example.com/otd")
    otdVersion.set("1.0.0")
}
```

`openApiDocument.openApiFiles`에 파일을 직접 추가하면 Springdoc 없이도 같은 변환 태스크를 사용할 수 있습니다.

## 출력 파일 구성

생성된 XLSX 파일은 다음 시트로 구성됩니다.

| 시트 | 내용 |
| --- | --- |
| `개요` | API 제목, 버전, 설명, 서버 정보, 태그별 엔드포인트 수 |
| `인증` | OpenAPI security scheme 정보 |
| `API 항목` | 전체 엔드포인트의 메서드, 경로, 요약 |
| 태그별 시트 | 각 태그(첫 번째 태그 기준)에 속한 엔드포인트 상세 정보(파라미터, 요청 바디, 응답, 예시 JSON) |

## 개발

### 요구 사항

- Bun
- TypeScript
- Java 17 이상(Gradle 플러그인 개발)

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
| `gradle-plugin/gradlew -p gradle-plugin check` | Gradle 플러그인 단위/기능 테스트와 플러그인 검증을 실행합니다. |
| `bun run format` | Biome으로 코드를 포맷합니다. |

## 프로젝트 구조

```text
gradle-plugin/                   # Springdoc 연동 Gradle 플러그인
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
