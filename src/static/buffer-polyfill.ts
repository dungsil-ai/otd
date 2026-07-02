/// <reference lib="dom" />

// ExcelJS와 json-schema-ref-parser는 전역 Buffer를 참조합니다.
// 브라우저 빌드에서 정상 동작하도록 최소한의 Buffer 폴리필을 제공합니다.
if (typeof (globalThis as Record<string, unknown>).Buffer === "undefined") {
  (globalThis as Record<string, unknown>).Buffer = {
    isBuffer(v: unknown): boolean {
      return v != null && (v as Record<string, unknown>)._isBuffer === true;
    },
    from(d: string | ArrayLike<number> | ArrayBuffer, _encoding?: string): Uint8Array {
      if (typeof d === "string") {
        return new TextEncoder().encode(d);
      }
      if (d instanceof ArrayBuffer) {
        return new Uint8Array(d);
      }
      return d instanceof Uint8Array ? d : new Uint8Array(d as ArrayLike<number>);
    },
    alloc(n: number): Uint8Array {
      return new Uint8Array(n);
    },
    concat(list: Uint8Array[]): Uint8Array {
      const total = list.reduce((s: number, b: Uint8Array) => s + b.length, 0);
      const out = new Uint8Array(total);
      let off = 0;
      for (const b of list) {
        out.set(b, off);
        off += b.length;
      }
      return out;
    },
  };
}
