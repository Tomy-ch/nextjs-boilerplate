import { describe, expect, it } from "vitest";

import {
  assertWritable,
  cloneUrl,
  DEFAULT_VISIBILITY,
  defaultImagesName,
  isAffirmative,
  looksLikePrivateKey,
  normalizeKeyPath,
  normalizeVisibility,
  parseAppId,
  renderReadme,
  splitRepository,
  targetRepository,
  VISIBILITIES,
  WRITABLE_PERMISSIONS,
  withDefault,
} from "./plan";

describe("splitRepository", () => {
  // ----- 正常系 -----
  it("owner と repo に割る", () => {
    expect(splitRepository("Tomy-ch/nextjs-boilerplate")).toEqual({
      owner: "Tomy-ch",
      name: "nextjs-boilerplate",
    });
  });

  // ----- 異常系 -----
  it.each([
    ["区切りが無い", "nextjs-boilerplate"],
    ["区切りが多い", "org/team/repo"],
    ["空白を含む", "org/my repo"],
    ["空文字", ""],
  ])("owner/repo の形でない %s を拒む", (_label, input) => {
    expect(() => splitRepository(input)).toThrow(/owner\/repo の形ではありません/);
  });
});

describe("defaultImagesName", () => {
  // ----- 正常系 -----
  it("親の名前から導く（owner は含めない）", () => {
    expect(defaultImagesName("Tomy-ch/nextjs-boilerplate")).toBe("nextjs-boilerplate-vrt-images");
  });
});

describe("targetRepository", () => {
  // ----- 正常系 -----
  it("親と同じ owner の下へ組み立てる", () => {
    expect(targetRepository("Tomy-ch/nextjs-boilerplate", "my-images")).toBe("Tomy-ch/my-images");
  });

  it("前後の空白を落とす", () => {
    expect(targetRepository("Tomy-ch/nextjs-boilerplate", "  my-images  ")).toBe(
      "Tomy-ch/my-images",
    );
  });

  // ----- 異常系 -----
  it("空の名前を拒む", () => {
    expect(() => targetRepository("Tomy-ch/x", "   ")).toThrow(/リポジトリ名が空です/);
  });

  it("owner 付きの入力を拒み、既存指定の経路へ誘導する", () => {
    expect(() => targetRepository("Tomy-ch/x", "other/images")).toThrow(/owner は含めません/);
  });
});

describe("assertWritable", () => {
  // ----- 正常系 -----
  it.each(WRITABLE_PERMISSIONS)("%s は書き込みができる", (permission) => {
    expect(() => assertWritable("o/r", permission)).not.toThrow();
  });

  // ----- 異常系 -----
  it("READ を拒む", () => {
    expect(() => assertWritable("o/r", "READ")).toThrow(/書き込み権限がありません（現在: READ）/);
  });

  it("権限を取れなかったときも書ける側へ倒さない", () => {
    expect(() => assertWritable("o/r", "")).toThrow(/現在: 不明/);
  });
});

describe("normalizeVisibility", () => {
  // ----- 正常系 -----
  it.each(VISIBILITIES)("%s をそのまま通す", (visibility) => {
    expect(normalizeVisibility(visibility)).toBe(visibility);
  });

  it("gh が返す大文字を揃える", () => {
    expect(normalizeVisibility("PUBLIC")).toBe("public");
  });

  // ----- 異常系 -----
  it("知らない公開範囲を拒む", () => {
    expect(() => normalizeVisibility("secret")).toThrow(/公開範囲は/);
  });
});

describe("DEFAULT_VISIBILITY", () => {
  // ----- 正常系 -----
  it("指定できる公開範囲のひとつである", () => {
    expect(VISIBILITIES).toContain(DEFAULT_VISIBILITY);
  });

  // ----- 異常系 -----
  it("公開側へ倒れない（基準画像は画面の見た目そのもの）", () => {
    expect(DEFAULT_VISIBILITY).not.toBe("public");
  });
});

describe("cloneUrl", () => {
  // ----- 正常系 -----
  it("HTTPS の URL を組み立てる", () => {
    expect(cloneUrl("Tomy-ch/images")).toBe("https://github.com/Tomy-ch/images.git");
  });
});

describe("renderReadme", () => {
  // ----- 正常系 -----
  it("置き場と親の名前を差し込む", () => {
    expect(
      renderReadme("# {{REPO_NAME}}\n\n{{PARENT_REPO}} の {{REPO_NAME}}", {
        repositoryName: "images",
        parentRepository: "Tomy-ch/app",
      }),
    ).toBe("# images\n\nTomy-ch/app の images");
  });

  // ----- 異常系 -----
  it("差し込めない箇所が残ったら拒む", () => {
    expect(() =>
      renderReadme("{{UNKNOWN}}", { repositoryName: "images", parentRepository: "o/r" }),
    ).toThrow(/差し込めない箇所があります: \{\{UNKNOWN\}\}/);
  });
});

describe("withDefault", () => {
  // ----- 正常系 -----
  it("入力があればそれを使う", () => {
    expect(withDefault(" answer ", "fallback")).toBe("answer");
  });

  // ----- 異常系 -----
  it("空白だけの入力は既定値へ落とす", () => {
    expect(withDefault("   ", "fallback")).toBe("fallback");
  });
});

describe("isAffirmative", () => {
  // ----- 正常系 -----
  it.each(["y", "Y", "yes", "YES"])("%s を肯定と読む", (answer) => {
    expect(isAffirmative(answer)).toBe(true);
  });

  // ----- 異常系 -----
  it.each(["", "n", "ye", "はい"])("%s は肯定と読まない", (answer) => {
    expect(isAffirmative(answer)).toBe(false);
  });
});

describe("parseAppId", () => {
  // ----- 正常系 -----
  it("数字をそのまま受ける", () => {
    expect(parseAppId("2168345")).toBe("2168345");
  });

  it.each([
    ["前後の空白", "  2168345  "],
    ["ラベルごと", "App ID: 2168345"],
    ["全角コロン", "App ID： 2168345"],
    ["コロン無し", "App ID 2168345"],
  ])("%s の貼り付けからも取り出す", (_label, input) => {
    expect(parseAppId(input)).toBe("2168345");
  });

  // ----- 異常系 -----
  it.each([
    ["空文字", ""],
    ["slug", "nextjs-boilerplate-vrt-images-app"],
    ["General ページの URL", "https://github.com/settings/apps/my-app"],
    ["数字を含む文字列", "app-2168345"],
  ])("App ID でない %s を拒む", (_label, input) => {
    expect(() => parseAppId(input)).toThrow(/App ID（General ページに出ている数字）/);
  });
});

describe("normalizeKeyPath", () => {
  // ----- 正常系 -----
  it("そのままのパスを受ける", () => {
    expect(normalizeKeyPath("/tmp/app.pem", "/Users/me")).toBe("/tmp/app.pem");
  });

  it.each([
    ["引用符で囲まれた形", "'/tmp/my app.pem'"],
    ["空白を逃がした形", "/tmp/my\\ app.pem"],
  ])("端末へドラッグした %s を均す", (_label, input) => {
    expect(normalizeKeyPath(input, "/Users/me")).toBe("/tmp/my app.pem");
  });

  it("~ を展開する", () => {
    expect(normalizeKeyPath("~/Downloads/app.pem", "/Users/me")).toBe(
      "/Users/me/Downloads/app.pem",
    );
  });

  it("~ 単体も展開する", () => {
    expect(normalizeKeyPath("~", "/Users/me")).toBe("/Users/me");
  });

  // ----- 異常系 -----
  it("先頭が ~ でも別名なら展開しない", () => {
    expect(normalizeKeyPath("~other/app.pem", "/Users/me")).toBe("~other/app.pem");
  });

  it.each([
    ["空文字", ""],
    ["空白だけ", "   "],
  ])("%s を拒む", (_label, input) => {
    expect(() => normalizeKeyPath(input, "/Users/me")).toThrow(/パスを入力してください/);
  });
});

describe("looksLikePrivateKey", () => {
  // ----- 正常系 -----
  it.each([
    ["PKCS#1", "-----BEGIN RSA PRIVATE KEY-----\nMIIE"],
    ["PKCS#8", "-----BEGIN PRIVATE KEY-----\nMIIE"],
    ["先頭に空行", "\n-----BEGIN RSA PRIVATE KEY-----"],
  ])("%s を鍵と見なす", (_label, head) => {
    expect(looksLikePrivateKey(head)).toBe(true);
  });

  // ----- 異常系 -----
  it.each([
    ["公開鍵", "-----BEGIN PUBLIC KEY-----"],
    ["証明書", "-----BEGIN CERTIFICATE-----"],
    ["別のファイル", '{"name": "app"}'],
    ["空", ""],
  ])("%s を鍵と見なさない", (_label, head) => {
    expect(looksLikePrivateKey(head)).toBe(false);
  });
});
