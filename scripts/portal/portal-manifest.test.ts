import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertWithinOutputRoot,
  assertWithinRepositoryRoot,
  resolveCopyEntries,
} from "./portal-manifest";

describe("resolveCopyEntries", () => {
  // ----- 正常系 -----
  it("section ごとのコピー対を section 名を添えて取り出す", () => {
    const entries = resolveCopyEntries({
      adr: [{ src: "docs/adr/0001.md", dst: "docs/portal/guides/0001.md" }],
    });

    expect(entries).toEqual([
      { section: "adr", src: "docs/adr/0001.md", dst: "docs/portal/guides/0001.md" },
    ]);
  });

  it("meta を複製対象から外す", () => {
    const entries = resolveCopyEntries({
      meta: { groups: [{ title: "Architecture", sections: ["adr"] }] },
      adr: [{ src: "docs/adr/0001.md", dst: "docs/portal/guides/0001.md" }],
    });

    expect(entries.map((entry) => entry.section)).toEqual(["adr"]);
  });

  it("複数の section を順に並べる", () => {
    const entries = resolveCopyEntries({
      adr: [{ src: "a.md", dst: "docs/portal/guides/a.md" }],
      plan: [{ src: "b.md", dst: "docs/portal/guides/b.md" }],
    });

    expect(entries.map((entry) => entry.section)).toEqual(["adr", "plan"]);
  });

  it("空の manifest を空の結果にする", () => {
    expect(resolveCopyEntries({})).toEqual([]);
  });
  // ----- 異常系 -----
  it("meta 以外に map を置いた manifest を拒否する", () => {
    expect(() => resolveCopyEntries({ adr: { src: "a.md" } })).toThrow(
      "adr は section の配列である必要があります",
    );
  });

  it("dst を欠いたコピー対を、欠けた項目が分かる形で拒否する", () => {
    expect(() => resolveCopyEntries({ adr: [{ src: "a.md" }] })).toThrow(/dst/);
  });

  it("src を欠いたコピー対を、欠けた項目が分かる形で拒否する", () => {
    expect(() => resolveCopyEntries({ adr: [{ dst: "docs/portal/guides/a.md" }] })).toThrow(/src/);
  });
});

describe("assertWithinOutputRoot", () => {
  // ----- 正常系 -----
  it("出力ディレクトリ配下の複製先を通す", () => {
    expect(() =>
      assertWithinOutputRoot(
        [{ section: "adr", src: "a.md", dst: "docs/portal/guides/a.md" }],
        "docs/portal/guides",
        resolve,
      ),
    ).not.toThrow();
  });

  it("出力ディレクトリそのものを指す複製先を通す", () => {
    expect(() =>
      assertWithinOutputRoot(
        [{ section: "adr", src: "a.md", dst: "docs/portal/guides" }],
        "docs/portal/guides",
        resolve,
      ),
    ).not.toThrow();
  });
  // ----- 異常系 -----
  it("親を辿って外へ出る複製先を拒否する", () => {
    expect(() =>
      assertWithinOutputRoot(
        [{ section: "adr", src: "a.md", dst: "docs/portal/guides/../../../etc/passwd" }],
        "docs/portal/guides",
        resolve,
      ),
    ).toThrow("dst が出力ディレクトリ");
  });

  it("接頭辞が一致するだけの別ディレクトリを拒否する", () => {
    expect(() =>
      assertWithinOutputRoot(
        [{ section: "adr", src: "a.md", dst: "docs/portal/guides-backup/a.md" }],
        "docs/portal/guides",
        resolve,
      ),
    ).toThrow("dst が出力ディレクトリ");
  });
});

describe("assertWithinRepositoryRoot", () => {
  // ----- 正常系 -----
  it("リポジトリ配下の複製元を通す", () => {
    expect(() =>
      assertWithinRepositoryRoot(
        [{ section: "adr", src: "docs/adr/0001.md", dst: "docs/portal/guides/a.md" }],
        ".",
        resolve,
      ),
    ).not.toThrow();
  });
  // ----- 異常系 -----
  it("親を辿ってリポジトリ外へ出る複製元を拒否する", () => {
    expect(() =>
      assertWithinRepositoryRoot(
        [{ section: "adr", src: "../../../../etc/hosts", dst: "docs/portal/guides/a.md" }],
        ".",
        resolve,
      ),
    ).toThrow("src がリポジトリの外を指しています");
  });

  it("リポジトリルートそのものを指す複製元を拒否する", () => {
    expect(() =>
      assertWithinRepositoryRoot(
        [{ section: "adr", src: ".", dst: "docs/portal/guides/a.md" }],
        ".",
        resolve,
      ),
    ).toThrow("src がリポジトリの外を指しています");
  });
});
