# XLSX Output Structure: OpenAPI to XLSX Export

**Date**: 2026-01-15
**Reference**: fortlogic.v0.xlsx (12.9KB)
**Feature**: 001-openapi-xlsx-export

이 문서는 참조 템플릿(fortlogic.v0.xlsx)을 분석하여 출력 XLSX 파일의 시트 및 컬럼 구조를 정의합니다.

---

## 시트 구조 개요

| 시트 번호 | 시트명 | 목적 |
|----------|--------|------|
| 1 | 개요 | API 전체 정보 (제목, 버전, 서버, 설명) |
| 2 | 인증 | 보안 스키마 정의 (API 키, OAuth 등) |
| 3 | API 항목 | 모든 API 항목 목록 (요약 테이블) |
| 4+ | [태그명] API | 태그별 API 항목 상세 정보 |

---

## 시트 1: 개요

API 문서의 전체 메타정보를 표시합니다.

### 레이아웃

| 행 | 컬럼 B | 컬럼 C |
|----|--------|--------|
| 2 | 속성 | 값 |
| 3 | 제목 | {info.title} |
| 4 | 버전 | {info.version} |
| 5 | 서버 | {servers[0].url} - {servers[0].description} |
| 6 | 설명 | {info.description} (여러 줄 지원) |

### 컬럼 정의

| 컬럼 | 너비 | 내용 |
|------|------|------|
| A | 좁음 | 빈 열 (여백) |
| B | 중간 | 속성명 (라벨) |
| C | 넓음 | 값 (내용) |

### 스타일

- 헤더 행(행 2): 굵은 글씨, 배경색
- 값 셀: 줄바꿈 허용 (wrap text)
- 설명 필드: Markdown 텍스트 그대로 표시

---

## 시트 2: 인증

보안 스키마 정보를 표시합니다. OpenAPI의 `components.securitySchemes`에서 추출.

### 레이아웃

| 행 | 컬럼 B | 컬럼 C |
|----|--------|--------|
| 2 | {securityScheme.name} | |
| 3 | 유형 | {type} (예: API 키, OAuth2, Bearer) |
| 4 | 위치 | {in} (예: header, query, cookie) |
| 5 | 파라미터명 | {name} (예: API-Key, Authorization) |
| 6 | 설명 | {description} |

### 참고

- 여러 보안 스키마가 있는 경우 각각 별도 섹션으로 표시
- OAuth2의 경우 flows 정보 추가 필요

---

## 시트 3: API 항목

모든 API 항목의 요약 목록을 테이블 형태로 표시합니다.

### 레이아웃

| 행 | 컬럼 B | 컬럼 C | 컬럼 D |
|----|--------|--------|--------|
| 2 | 메서드 | 경로 | 요약 |
| 3 | {method} | {path} | {summary} |
| 4 | {method} | {path} | {summary} |
| ... | ... | ... | ... |

### 컬럼 정의

| 컬럼 | 너비 | 내용 | 소스 |
|------|------|------|------|
| A | 좁음 | 빈 열 (여백) | - |
| B | 좁음 | HTTP 메서드 | operation의 method (GET, POST, PUT, DELETE, PATCH) |
| C | 중간 | API 경로 | paths의 key (/api/deid 등) |
| D | 넓음 | 요약 설명 | operation.summary |

### 스타일

- 헤더 행: 굵은 글씨, 배경색, 첫 행 고정 (freeze)
- 메서드 셀: 대문자, 메서드별 색상 코딩 권장

---

## 시트 4+: [태그명] API

각 태그(또는 API 항목)별 상세 정보를 표시합니다. 여러 API 항목이 같은 태그를 공유하면 하나의 시트에 모두 표시.

### 시트명 규칙

- `{tag} API` 형식 (예: "비식별화 API (Deidentify)")
- 태그가 없는 경우: `기타 API` 또는 경로 기반 이름

### 레이아웃 구조

시트는 여러 섹션으로 구성됩니다:

```
[API 항목 기본 정보]
[파라미터 테이블]
[요청 바디 테이블] × Content-Type별
[응답 테이블] × 상태 코드별
```

---

### 섹션 1: API 항목 기본 정보

| 행 | 컬럼 B | 컬럼 C |
|----|--------|--------|
| 2 | {path} | |
| 3 | 메서드 | {method} |
| 4 | 요약 | {summary} |
| 5 | 설명 | {description} (여러 줄, Markdown) |
| 6 | 개발 서버 | {server.url}{path} |
| 7 | 보안 | {security[0]} |

---

### 섹션 2: 파라미터

| 행 | 컬럼 B | 컬럼 C | 컬럼 D | 컬럼 E | 컬럼 F |
|----|--------|--------|--------|--------|--------|
| N | 파라미터 | | | | |
| N+1 | 이름 | 위치 | 타입 | 필수 | 설명 |
| N+2 | {name} | {in} | {schema.type} | {required} | {description} |

#### 컬럼 정의

| 컬럼 | 내용 | 소스 |
|------|------|------|
| B | 파라미터 이름 | parameter.name |
| C | 위치 | parameter.in (path, query, header, cookie) |
| D | 데이터 타입 | parameter.schema.type (string, integer, array 등) |
| E | 필수 여부 | parameter.required (O/빈칸) |
| F | 설명 | parameter.description |

---

### 섹션 3: 요청 바디 (Content-Type별)

각 Content-Type마다 별도 섹션으로 표시합니다.

#### 섹션 헤더

| 행 | 컬럼 B |
|----|--------|
| N | 요청 바디 ({contentType}) |

예시:
- `요청 바디 (text/plain)`
- `요청 바디 (application/json)`
- `요청 바디 (multipart/form-data)`
- `요청 바디 (application/octet-stream)`

#### 테이블 구조

| 행 | 컬럼 B | 컬럼 C | 컬럼 D | 컬럼 E | 컬럼 F |
|----|--------|--------|--------|--------|--------|
| N+1 | 속성명 | 타입 | 형식 | 필수 | 설명 |
| N+2 | {name} | {type} | {format} | {required} | {description} |

#### 컬럼 정의

| 컬럼 | 내용 | 소스 |
|------|------|------|
| B | 속성명 | schema.properties의 key (빈 값이면 전체 body) |
| C | 데이터 타입 | schema.type 또는 property.type |
| D | 형식 | schema.format (byte, binary, date-time 등) |
| E | 필수 여부 | schema.required 배열에 포함 시 O |
| F | 설명 | property.description |

#### 배열 타입 표현

배열 속성의 경우 아이템 타입을 별도 행으로 표시:

| 행 | 컬럼 B | 컬럼 C |
|----|--------|--------|
| N | entities | array |
| N+1 | entities[] | string |

---

### 섹션 4: 응답 (상태 코드별)

각 HTTP 상태 코드마다 별도 섹션으로 표시합니다.

#### 섹션 헤더

| 행 | 컬럼 B |
|----|--------|
| N | 응답 {statusCode} |

예시:
- `응답 200`
- `응답 400`
- `응답 500`

#### 테이블 구조

| 행 | 컬럼 B | 컬럼 C | 컬럼 D | 컬럼 E | 컬럼 F |
|----|--------|--------|--------|--------|--------|
| N+1 | 속성명 | 타입 | 형식 | 필수 | 설명 |
| N+2 | {name} | {type} | {format} | {required} | {description} |

#### 일반 오류 응답 구조

대부분의 오류 응답(4xx, 5xx)은 동일한 구조:

| 속성명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| code | string | O | 오류 코드 |
| message | string | | 오류 메시지 (없을 수 있음) |

---

## 스타일 가이드

### 열 너비

| 컬럼 | 용도 | 권장 너비 |
|------|------|----------|
| A | 여백 | 3 |
| B | 라벨/이름 | 15-20 |
| C | 값/타입 | 20-30 |
| D | 형식 | 10-15 |
| E | 필수 | 5-8 |
| F | 설명 | 50-80 |

### 셀 스타일

| 요소 | 스타일 |
|------|--------|
| 섹션 헤더 | 굵은 글씨, 배경색 (연한 파란색) |
| 테이블 헤더 | 굵은 글씨, 배경색 (진한 파란색), 흰 글씨 |
| 데이터 행 | 기본 스타일, 줄바꿈 허용 |
| 필수 여부 | 가운데 정렬 |

### 빈 행

- 섹션 사이: 빈 행 3개로 구분
- 테이블 내부: 빈 행 없음

---

## OpenAPI 매핑 요약

| XLSX 필드 | OpenAPI 소스 경로 |
|-----------|-------------------|
| 제목 | info.title |
| 버전 | info.version |
| 설명 | info.description |
| 서버 | servers[].url, servers[].description |
| 보안 스키마 | components.securitySchemes |
| 경로 | paths (key) |
| 메서드 | paths[path].{method} |
| 요약 | paths[path][method].summary |
| 상세 설명 | paths[path][method].description |
| 파라미터 | paths[path][method].parameters[] |
| 요청 바디 | paths[path][method].requestBody.content |
| 응답 | paths[path][method].responses |
| 태그 | paths[path][method].tags[] |
