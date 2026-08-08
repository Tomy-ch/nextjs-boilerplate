import { describe, expect, it } from "vitest";

import { ensureFourDigitYear, ensurePackageName, ensureRepositoryReference } from "./validators";

describe("ensureRepositoryReference", () => {
  // ----- 正常系 -----
  it("<owner>/<repo> 形式を受け入れる", () => {
    expect(() => ensureRepositoryReference("Tomy-ch/nextjs-boilerplate")).not.toThrow();
  });

  it("repo 側の . と _ を受け入れる", () => {
    expect(() => ensureRepositoryReference("owner/repo.name_v2")).not.toThrow();
  });

  // ----- 異常系 -----
  it("owner を欠いた参照を拒否する", () => {
    expect(() => ensureRepositoryReference("nextjs-boilerplate")).toThrow(
      "リポジトリ参照は <owner>/<repo> 形式で指定してください。",
    );
  });

  it("owner の先頭と末尾のハイフンを拒否する", () => {
    expect(() => ensureRepositoryReference("-owner/repo")).toThrow();
    expect(() => ensureRepositoryReference("owner-/repo")).toThrow();
  });

  it("階層を重ねた参照を拒否する", () => {
    expect(() => ensureRepositoryReference("owner/group/repo")).toThrow();
  });
});

describe("ensurePackageName", () => {
  // ----- 正常系 -----
  it("小文字英数字で始まる npm パッケージ名を受け入れる", () => {
    expect(() => ensurePackageName("nextjs-boilerplate")).not.toThrow();
    expect(() => ensurePackageName("a1._-")).not.toThrow();
  });

  // ----- 異常系 -----
  it("大文字を含む名前を拒否する", () => {
    expect(() => ensurePackageName("NextJS")).toThrow(
      "リポジトリ名は npm パッケージ名として使える形式（小文字英数字で始まり、以降は英数字と . _ - のみ）で指定してください。",
    );
  });

  it("記号で始まる名前を拒否する", () => {
    expect(() => ensurePackageName("-boilerplate")).toThrow();
  });

  it("空文字を拒否する", () => {
    expect(() => ensurePackageName("")).toThrow();
  });
});

describe("ensureFourDigitYear", () => {
  // ----- 正常系 -----
  it("4 桁の西暦を受け入れる", () => {
    expect(() => ensureFourDigitYear("2026")).not.toThrow();
  });

  // ----- 異常系 -----
  it("桁数が 4 でない値を拒否する", () => {
    expect(() => ensureFourDigitYear("26")).toThrow("--year は 4 桁の西暦で指定してください。");
    expect(() => ensureFourDigitYear("20260")).toThrow();
  });

  it("数字以外を含む値を拒否する", () => {
    expect(() => ensureFourDigitYear("20x6")).toThrow();
  });
});
