import { describe, expect, it } from "vitest";

import { SESSION_ROLE } from "@/model/session";

import { parseDevSessionForm } from "./parse-session-form";

function formDataOf(overrides: Readonly<Record<string, string>> = {}): FormData {
  const formData = new FormData();

  formData.set("subject", "dev-user");
  formData.set("role", SESSION_ROLE.user);
  formData.set("expiresInSeconds", "3600");
  formData.set("accessToken", "");
  formData.set("issuerUrl", "https://idp.example.test");

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
      input: {
        subject: "dev-user",
        role: SESSION_ROLE.user,
        expiresInSeconds: 3600,
        issueAccessToken: false,
      },
    });
  });

  it("貼られたトークンを載せる", () => {
    const result = parseDevSessionForm(formDataOf({ accessToken: " real-token " }));

    expect(result).toMatchObject({ ok: true, input: { accessToken: "real-token" } });
  });

  it("取りに行く指定と、その接続先を伝える", () => {
    const result = parseDevSessionForm(formDataOf({ issueAccessToken: "on" }));

    expect(result).toMatchObject({
      ok: true,
      input: { issueAccessToken: true, issuer: "https://idp.example.test" },
    });
  });

  it("取りに行くときは、切り替える前に打たれた値を捨てる", () => {
    const result = parseDevSessionForm(
      formDataOf({ issueAccessToken: "on", accessToken: "stale-token" }),
    );

    expect(result).toMatchObject({ ok: true, input: { issueAccessToken: true } });
    expect(result).not.toMatchObject({ input: { accessToken: expect.anything() } });
  });

  it("取りに行かないときは、接続先を持ち回らない", () => {
    const result = parseDevSessionForm(formDataOf());

    expect(result).not.toMatchObject({ input: { issuer: expect.anything() } });
  });

  it("管理者としても発行できる", () => {
    const result = parseDevSessionForm(formDataOf({ role: SESSION_ROLE.admin }));

    expect(result).toMatchObject({ ok: true, input: { role: SESSION_ROLE.admin } });
  });

  // ----- 異常系 -----
  it("文字列で送られてこない項目は、未入力として扱う", () => {
    const formData = formDataOf();

    formData.set("subject", new File([], "subject.txt"));

    expect(parseDevSessionForm(formData)).toMatchObject({
      fieldErrors: { subject: ["誰として入るかを指定してください。"] },
      ok: false,
    });
  });

  it("誰として入るかが空なら受け付けない", () => {
    const result = parseDevSessionForm(formDataOf({ subject: "  " }));

    expect(result).toMatchObject({
      fieldErrors: { subject: ["誰として入るかを指定してください。"] },
      ok: false,
    });
  });

  it("取りに行くのに接続先が URL でなければ受け付けない", () => {
    const result = parseDevSessionForm(formDataOf({ issueAccessToken: "on", issuerUrl: "2013" }));

    expect(result).toMatchObject({
      fieldErrors: { issuerUrl: ["接続先を URL で指定してください。"] },
      ok: false,
    });
  });

  it("取りに行かないなら、接続先が空でも受け付ける", () => {
    expect(parseDevSessionForm(formDataOf({ issuerUrl: "" }))).toMatchObject({ ok: true });
  });

  it("役割が集合の外なら受け付けない", () => {
    expect(parseDevSessionForm(formDataOf({ role: "owner" }))).toMatchObject({
      fieldErrors: { role: expect.any(Array) },
      ok: false,
    });
  });

  it("秒数が整数でなければ受け付けない", () => {
    expect(parseDevSessionForm(formDataOf({ expiresInSeconds: "1.5" }))).toMatchObject({
      fieldErrors: { expiresInSeconds: ["秒数は整数で指定してください。"] },
      ok: false,
    });
  });

  it("秒数が 0 以下なら受け付けない", () => {
    expect(parseDevSessionForm(formDataOf({ expiresInSeconds: "0" }))).toMatchObject({
      fieldErrors: { expiresInSeconds: ["秒数は 1 以上で指定してください。"] },
      ok: false,
    });
  });

  it("開発機に長く残る長さは受け付けない", () => {
    expect(parseDevSessionForm(formDataOf({ expiresInSeconds: "86401" }))).toMatchObject({
      fieldErrors: { expiresInSeconds: ["秒数は 86400 以下で指定してください。"] },
      ok: false,
    });
  });
});
