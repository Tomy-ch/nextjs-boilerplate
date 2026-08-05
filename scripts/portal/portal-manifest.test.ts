import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { assertWithinOutputRoot, resolveCopyEntries } from "./portal-manifest";

describe("resolveCopyEntries", () => {
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

  it("meta 以外に map を置いた manifest を拒否する", () => {
    expect(() => resolveCopyEntries({ adr: { src: "a.md" } })).toThrow(
      "adr は section の配列である必要があります",
    );
  });

  it("src や dst を欠いたコピー対を拒否する", () => {
    expect(() => resolveCopyEntries({ adr: [{ src: "a.md" }] })).toThrow();
  });
});

describe("assertWithinOutputRoot", () => {
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
