# Gradle 플러그인 샘플

`spring-boot-webmvc`는 Spring Boot 애플리케이션에 Springdoc과 OpenAPI to Document Gradle 플러그인을 함께 적용한 실행 가능한 예제입니다. 샘플의 `settings.gradle.kts`는 `includeBuild("../..")`로 현재 저장소의 플러그인 소스를 직접 사용하므로 플러그인을 먼저 배포할 필요가 없습니다.

## 실행

저장소 루트에서 Java 17 이상으로 다음 명령을 실행합니다.

```bash
./gradle-plugin/gradlew -p gradle-plugin/samples/spring-boot-webmvc generateApiDocument
```

Windows PowerShell 또는 명령 프롬프트에서는 다음 명령을 사용합니다.

```text
.\gradle-plugin\gradlew.bat -p gradle-plugin\samples\spring-boot-webmvc generateApiDocument
```

실행 결과:

- `gradle-plugin/samples/spring-boot-webmvc/build/openapi/openapi.json`: Springdoc이 생성한 OpenAPI 문서
- `gradle-plugin/samples/spring-boot-webmvc/build/api-specification/sample-api.xlsx`: OTD가 변환한 XLSX 명세서

`generateApiDocument`는 `generateOpenApiDocs`를 자동으로 선행 실행합니다. OpenAPI 생성까지만 확인하려면 `generateOpenApiDocs` 태스크를 직접 실행할 수 있습니다.

## 실제 프로젝트에 적용

샘플에서 다음 부분을 프로젝트에 맞게 복사합니다.

1. `settings.gradle.kts`의 `pluginManagement.includeBuild` 설정. Plugin Portal 배포본을 사용할 때는 제거하고 플러그인 버전을 지정합니다.
2. `build.gradle.kts`의 Spring Boot, Springdoc, `io.github.dungsil-ai.openapi-to-document` 플러그인 선언.
3. Springdoc 런타임 의존성과 `openApi`, `openApiDocument` 설정.

기본 설정을 사용하면 XLSX는 `build/api-document/<OpenAPI 파일명>.xlsx`에 생성됩니다. 샘플은 출력 위치와 파일명 설정 방법을 보여주기 위해 `build/api-specification/sample-api.xlsx`로 변경합니다.

## 회귀 테스트

플러그인의 `check` 태스크는 샘플 프로젝트의 실제 소스와 빌드 스크립트를 임시 프로젝트에서 실행합니다. 테스트에서는 네트워크로 OTD 실행 파일을 받는 대신 테스트용 변환기를 주입하고 다음 계약을 검증합니다.

- Spring Boot 애플리케이션을 실행해 `/api/greetings/{name}` OpenAPI 경로를 생성한다.
- `generateApiDocument`가 Springdoc 태스크를 선행 실행한다.
- 생성된 OpenAPI를 `sample-api.xlsx` 출력으로 전달한다.
