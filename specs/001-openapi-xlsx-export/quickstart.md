# Quickstart: OpenAPI to XLSX Export

**Date**: 2026-01-15
**Feature**: 001-openapi-xlsx-export

## 전제 조건

- Bun 런타임 설치 (v1.0 이상)
- OpenAPI v3 문서 파일 (YAML 또는 JSON)

## 설치

```bash
# 저장소 클론 후
bun install

# 글로벌 설치 (선택)
bun link
```

## 빠른 시작

### 1. 기본 변환

```bash
# YAML 파일 변환
otd petstore.yaml

# JSON 파일 변환
otd petstore.json
```

출력: 입력 파일과 동일한 디렉토리에 `petstore.xlsx` 생성

### 2. 출력 경로 지정

```bash
otd petstore.yaml -o ./output/api-spec.xlsx
```

### 3. 도움말 확인

```bash
otd --help
```

## 입력 형식

지원하는 OpenAPI 버전:
- OpenAPI 3.0.x
- OpenAPI 3.1.x

지원하는 파일 형식:
- YAML (.yaml, .yml)
- JSON (.json)

## 출력 형식

생성되는 XLSX 파일 구조:

| 컬럼 | 설명 |
|------|------|
| Method | HTTP 메서드 (GET, POST 등) |
| Path | API 경로 |
| Summary | 요약 설명 |
| Description | 상세 설명 |
| Parameters | 요청 매개변수 |
| Request Body | 요청 본문 |
| Responses | 응답 정의 |
| Tags | 태그 |

## 예제

### 샘플 OpenAPI 문서

```yaml
# sample.yaml
openapi: 3.0.0
info:
  title: Sample API
  version: 1.0.0
paths:
  /users:
    get:
      summary: Get all users
      responses:
        '200':
          description: Success
```

### 변환 실행

```bash
otd sample.yaml
```

### 결과

`sample.xlsx` 파일이 생성되며, 다음 내용 포함:

| Method | Path | Summary | Responses |
|--------|------|---------|-----------|
| GET | /users | Get all users | 200: Success |

## 문제 해결

### 파일을 찾을 수 없음

```
오류: 파일을 찾을 수 없습니다: openapi.yaml
```
→ 파일 경로를 확인하세요.

### 유효하지 않은 OpenAPI 문서

```
오류: 유효하지 않은 OpenAPI 문서입니다
```
→ OpenAPI v3 형식인지 확인하세요. v2(Swagger)는 지원하지 않습니다.

### 출력 파일 저장 실패

```
오류: 출력 파일을 저장할 수 없습니다
```
→ 출력 디렉토리의 쓰기 권한을 확인하세요.
