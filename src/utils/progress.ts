/**
 * 진행률 표시 유틸리티
 * stderr로 처리 상태를 출력
 * @module utils/progress
 */

/**
 * 진행 단계
 */
export type ProgressStep = "parse" | "extract" | "write";

/**
 * 진행률 메시지
 */
const PROGRESS_MESSAGES: Record<ProgressStep, { start: string; done: string }> = {
  parse: {
    start: "OpenAPI 문서 파싱 중...",
    done: "OpenAPI 문서 파싱 완료",
  },
  extract: {
    start: "엔드포인트 추출 중...",
    done: "엔드포인트 추출 완료",
  },
  write: {
    start: "XLSX 파일 생성 중...",
    done: "XLSX 파일 생성 완료",
  },
};

/**
 * 진행률 표시기 클래스
 */
export class Progress {
  private enabled: boolean;

  /**
   * @param enabled 진행률 표시 활성화 여부
   */
  constructor(enabled = true) {
    this.enabled = enabled;
  }

  /**
   * 단계 시작 메시지 출력
   */
  start(step: ProgressStep): void {
    if (!this.enabled) return;
    console.error(`[진행] ${PROGRESS_MESSAGES[step].start}`);
  }

  /**
   * 단계 완료 메시지 출력
   */
  done(step: ProgressStep, detail?: string): void {
    if (!this.enabled) return;
    const message = PROGRESS_MESSAGES[step].done;
    const suffix = detail ? ` (${detail})` : "";
    console.error(`[완료] ${message}${suffix}`);
  }

  /**
   * 정보 메시지 출력
   */
  info(message: string): void {
    if (!this.enabled) return;
    console.error(`[정보] ${message}`);
  }
}

/**
 * 기본 진행률 표시기 인스턴스 생성
 */
export function createProgress(enabled = true): Progress {
  return new Progress(enabled);
}
