import { describe, expect, it } from "vitest";

import { errorKinds } from "./error-kind";

describe("errorKinds", () => {
  // ----- 正常系 -----
  it("定義されたプロトコルに依存しない分類だけを公開する", () => {
    expect(errorKinds).toEqual([
      "invalid-argument",
      "unauthenticated",
      "permission-denied",
      "not-found",
      "conflict",
      "validation",
      "unsupported-media-type",
      "payload-too-large",
      "uri-too-long",
      "too-many-requests",
      "canceled",
      "unavailable",
      "unimplemented",
      "internal",
    ]);
  });
});
