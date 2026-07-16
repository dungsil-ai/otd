import { describe, expect, it } from "bun:test";
import {
  buildEndpointUrl,
  formatSampleTitle,
  getDirectory,
  getFileNameWithoutExt,
  isFileContentType,
  resolveOutputPath,
  sanitizeSheetName,
} from "../../src/utils/common";

describe("resolveOutputPath", () => {
  it("출력 경로가 지정되면 그대로 반환해야 한다", () => {
    expect(resolveOutputPath("input.yaml", "output.xlsx")).toBe("output.xlsx");
  });

  it("확장자가 없으면 .xlsx를 추가해야 한다", () => {
    expect(resolveOutputPath("input.yaml", "output")).toBe("output.xlsx");
  });

  it("대소문자 구분 없이 .xlsx 확장자를 인식해야 한다", () => {
    expect(resolveOutputPath("input.yaml", "output.XLSX")).toBe("output.XLSX");
  });

  it("디렉토리 경로면 입력 파일명을 사용해야 한다", () => {
    expect(resolveOutputPath("input.yaml", "./docs/")).toBe("./docs/input.xlsx");
  });

  it("출력 경로가 없으면 입력 파일명 기반으로 생성해야 한다", () => {
    expect(resolveOutputPath("input.yaml")).toBe("input.xlsx");
  });

  it("입력 경로에 디렉토리가 있으면 해당 디렉토리에 생성해야 한다", () => {
    expect(resolveOutputPath("./specs/input.yaml")).toBe("./specs/input.xlsx");
  });
});

describe("getFileNameWithoutExt", () => {
  it("단일 확장자를 제거해야 한다", () => {
    expect(getFileNameWithoutExt("file.yaml")).toBe("file");
  });

  it("마지막 확장자만 제거해야 한다", () => {
    expect(getFileNameWithoutExt("spec.v1.yaml")).toBe("spec.v1");
  });

  it("확장자가 없으면 파일명을 그대로 반환해야 한다", () => {
    expect(getFileNameWithoutExt("README")).toBe("README");
  });

  it("슬래시 종류와 관계없이 파일명만 반환해야 한다", () => {
    expect(getFileNameWithoutExt("./docs/spec.yaml")).toBe("spec");
    expect(getFileNameWithoutExt("..\\docs\\spec.yaml")).toBe("spec");
  });
});

describe("getDirectory", () => {
  it("파일 경로에서 디렉토리를 반환해야 한다", () => {
    expect(getDirectory("./docs/spec.yaml")).toBe("./docs");
  });

  it("디렉토리가 없으면 빈 문자열을 반환해야 한다", () => {
    expect(getDirectory("spec.yaml")).toBe("");
  });
});

describe("isFileContentType", () => {
  it("application/octet-stream을 파일로 인식해야 한다", () => {
    expect(isFileContentType("application/octet-stream")).toBe(true);
  });

  it("대소문자와 관계없이 파일 타입을 인식해야 한다", () => {
    expect(isFileContentType("Application/Octet-Stream")).toBe(true);
  });

  it("multipart 타입을 파일로 인식해야 한다", () => {
    expect(isFileContentType("multipart/form-data")).toBe(true);
  });

  it("일반 JSON 타입을 파일로 인식하지 않아야 한다", () => {
    expect(isFileContentType("application/json")).toBe(false);
  });

  it("이름 일부만 포함한 타입을 파일로 오인하지 않아야 한다", () => {
    expect(isFileContentType("application/x-octet-stream")).toBe(false);
  });
});

describe("buildEndpointUrl", () => {
  it("기본 URL과 엔드포인트 경로를 결합해야 한다", () => {
    expect(buildEndpointUrl("https://api.example.com", "/users")).toBe(
      "https://api.example.com/users"
    );
  });

  it("중복 슬래시 없이 결합해야 한다", () => {
    expect(buildEndpointUrl("https://api.example.com/", "users")).toBe(
      "https://api.example.com/users"
    );
  });

  it("기본 URL이 없으면 엔드포인트 경로를 반환해야 한다", () => {
    expect(buildEndpointUrl("", "/users")).toBe("/users");
  });
});

describe("formatSampleTitle", () => {
  it("summary를 우선해 제목에 추가해야 한다", () => {
    expect(
      formatSampleTitle("요청 예시", {
        name: "named",
        summary: "요약",
        value: "{}",
      })
    ).toBe("요청 예시: 요약");
  });

  it("summary가 없으면 기본값이 아닌 name을 추가해야 한다", () => {
    expect(formatSampleTitle("요청 예시", { name: "named", value: "{}" })).toBe("요청 예시: named");
  });

  it("이름이 default이면 기본 제목을 반환해야 한다", () => {
    expect(formatSampleTitle("요청 예시", { name: "default", value: "{}" })).toBe("요청 예시");
  });
});

describe("sanitizeSheetName", () => {
  it("금지 문자를 공백으로 치환해야 한다", () => {
    expect(sanitizeSheetName("users:*?/\\[]admin", new Set())).toBe("users admin");
  });

  it("앞뒤 작은따옴표를 제거해야 한다", () => {
    expect(sanitizeSheetName("''Users API''", new Set())).toBe("Users API");
  });

  it("31자를 초과하는 이름을 잘라야 한다", () => {
    expect(sanitizeSheetName("a".repeat(32), new Set())).toBe("a".repeat(31));
  });

  it("중복 이름에 번호 접미사를 붙여야 한다", () => {
    const usedNames = new Set(["Users API".toLowerCase()]);
    expect(sanitizeSheetName("Users API", usedNames)).toBe("Users API (2)");
  });

  it("31자가 같은 접두사를 가진 이름의 충돌을 구분해야 한다", () => {
    const prefix = "a".repeat(31);
    const usedNames = new Set<string>();
    expect(sanitizeSheetName(`${prefix}A`, usedNames)).toBe(prefix);
    expect(sanitizeSheetName(`${prefix}B`, usedNames)).toBe(`${"a".repeat(27)} (2)`);
  });

  it("빈 이름에 기본 이름을 사용해야 한다", () => {
    expect(sanitizeSheetName("   ", new Set())).toBe("Untitled");
  });

  it("대소문자와 관계없이 중복을 감지해야 한다", () => {
    const usedNames = new Set(["users api"]);
    expect(sanitizeSheetName("Users API", usedNames)).toBe("Users API (2)");
  });
});
