import { describe, expect, it } from "vitest";

import { SESSION_ROLE } from "@/model/session";

import { parseDevSessionForm } from "./parse-session-form";

function formDataOf(overrides: Readonly<Record<string, string>> = {}): FormData {
  const formData = new FormData();

  formData.set("subject", "dev-user");
  formData.set("role", SESSION_ROLE.user);
  formData.set("expiresInSeconds", "3600");
  formData.set("accessToken", "");

  for (const [key, value] of Object.entries(overrides)) {
    formData.set(key, value);
  }

  return formData;
}

describe("parseDevSessionForm", () => {
  // ----- 正常系 -----
  it("発行に渡せる形へ解く", () => {
    expect(parseDevSessionForm(formDataOf())).toEqual({
      ok: true,
      input: { subject: "dev-user", role: SESSION_ROLE.user, expiresInSeconds: 3600 },
    });
  });

  it("貼られたトークンを載せる", () => {
    const result = parseDevSessionForm(formDataOf({ accessToken: " real-token " }));

    expect(result).toMatchObject({ ok: true, input: { accessToken: "real-token" } });
  });

  it("管理者としても発行できる", () => {
    const result = parseDevSessionForm(formDataOf({ role: SESSION_ROLE.admin }));

    expect(result).toMatchObject({ ok: true, input: { role: SESSION_ROLE.admin } });
  });

  // ----- 異常系 -----
  it("文字列で送られてこない項目は、未入力として扱う", () => {
    const formData = formDataOf();

    formData.set("subject", new File([], "subject.txt"));

    expect(parseDevSessionForm(formData)).toMatchObject({ ok: false });
  });

  it("誰として入るかが空なら受け付けない", () => {
    const result = parseDevSessionForm(formDataOf({ subject: "  " }));

    expect(result).toMatchObject({ ok: false });
  });

  it("役割が集合の外なら受け付けない", () => {
    expect(parseDevSessionForm(formDataOf({ role: "owner" }))).toMatchObject({ ok: false });
  });

  it("秒数が整数でなければ受け付けない", () => {
    expect(parseDevSessionForm(formDataOf({ expiresInSeconds: "1.5" }))).toMatchObject({
      ok: false,
    });
  });

  it("秒数が 0 以下なら受け付けない", () => {
    expect(parseDevSessionForm(formDataOf({ expiresInSeconds: "0" }))).toMatchObject({ ok: false });
  });

  it("開発機に長く残る長さは受け付けない", () => {
    expect(parseDevSessionForm(formDataOf({ expiresInSeconds: "86401" }))).toMatchObject({
      ok: false,
    });
  });
});
