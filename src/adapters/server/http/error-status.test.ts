import { describe, expect, it } from "vitest";

import { ErrorKind, errorKinds } from "@/errors/error-kind";

import { toHttpStatus } from "./error-status";

describe("toHttpStatus", () => {
  // ----- 正常系 -----
  it.each([
    { kind: ErrorKind.INVALID_ARGUMENT, status: 400 },
    { kind: ErrorKind.UNAUTHENTICATED, status: 401 },
    { kind: ErrorKind.PERMISSION_DENIED, status: 403 },
    { kind: ErrorKind.NOT_FOUND, status: 404 },
    { kind: ErrorKind.CONFLICT, status: 409 },
    { kind: ErrorKind.PAYLOAD_TOO_LARGE, status: 413 },
    { kind: ErrorKind.UNSUPPORTED_MEDIA_TYPE, status: 415 },
    { kind: ErrorKind.VALIDATION, status: 422 },
    { kind: ErrorKind.TOO_MANY_REQUESTS, status: 429 },
    { kind: ErrorKind.CANCELED, status: 499 },
    { kind: ErrorKind.INTERNAL, status: 500 },
    { kind: ErrorKind.UNIMPLEMENTED, status: 501 },
    { kind: ErrorKind.UNAVAILABLE, status: 503 },
  ] as const)("$kind を $status へ写す", ({ kind, status }) => {
    expect(toHttpStatus(kind)).toBe(status);
  });

  it("errors カーネルが持つ全分類に status を持つ", () => {
    expect(errorKinds.map((kind) => toHttpStatus(kind))).not.toContain(undefined);
  });
});
