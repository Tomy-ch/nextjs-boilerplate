import { describe, expect, it } from "vitest";
import { parseDocsJson } from "../../docs-viewer/src/docs-json/docs-json";
import { autoTitle, buildDocsJson, type DiscoveredDocs, guideIdOf, slugify } from "./docs-json";

const empty: DiscoveredDocs = { directories: [], rootEnFiles: [], rootJaFiles: [] };

describe("autoTitle", () => {
  it("拡張子を落として語頭を大文字にする", () => {
    expect(autoTitle("cache-strategy.md")).toBe("Cache Strategy");
  });

  it("翻訳の接尾辞も落とす", () => {
    expect(autoTitle("cache-strategy.ja.md")).toBe("Cache Strategy");
  });

  it("下線も語の区切りとして扱う", () => {
    expect(autoTitle("make_commands")).toBe("Make Commands");
  });
});

describe("slugify", () => {
  it("空白と記号を繋ぎ文字へ倒す", () => {
    expect(slugify("Decisions (ADR)")).toBe("decisions-adr");
  });

  it("前後の繋ぎ文字を落とす", () => {
    expect(slugify("--Get Started--")).toBe("get-started");
  });
});

describe("guideIdOf", () => {
  it("翻訳と原文を同じ識別子へ寄せる", () => {
    expect(guideIdOf("docs/portal/guides/adr.ja.md")).toBe("adr");
    expect(guideIdOf("docs/portal/guides/adr.md")).toBe("adr");
  });

  it("拡張子を 1 段だけ落として別物の衝突を避ける", () => {
    expect(guideIdOf("foo.html.md")).toBe("foo.html");
    expect(guideIdOf("foo.html")).toBe("foo");
  });

  it("拡張子を持たない名前をそのまま使う", () => {
    expect(guideIdOf("coverage")).toBe("coverage");
  });
});

describe("buildDocsJson", () => {
  it("manifest の複製先を portal からの相対経路にする", () => {
    const { docs } = buildDocsJson(
      {
        meta: { groups: [{ title: "Architecture", sections: ["adr"] }] },
        adr: [{ src: "docs/adr/0001.md", dst: "docs/portal/guides/0001.md" }],
      },
      empty,
    );

    expect(docs.groups[0]?.sections[0]?.items[0]).toEqual({
      name: "0001",
      path: "./guides/0001.md",
      source: "docs/adr/0001.md",
      lang: "en",
    });
  });

  it("翻訳の複製先を ja として扱う", () => {
    const { docs } = buildDocsJson(
      {
        meta: { groups: [{ title: "Architecture", sections: ["adr"] }] },
        adr: [{ src: "docs/adr/0001.ja.md", dst: "docs/portal/guides/0001.ja.md" }],
      },
      empty,
    );

    expect(docs.groups[0]?.sections[0]?.items[0]?.lang).toBe("ja");
  });

  it("ディレクトリ直下の Markdown を section として発見する", () => {
    const { docs } = buildDocsJson(
      { meta: { groups: [{ title: "Architecture", sections: ["adr"] }] } },
      {
        ...empty,
        directories: [{ name: "adr", hasIndexHtml: false, enFiles: ["0001.md"], jaFiles: [] }],
      },
    );

    expect(docs.groups[0]?.sections[0]?.items[0]?.path).toBe("../adr/0001.md");
  });

  it("翻訳ツリーの Markdown を同じ section へ入れる", () => {
    const { docs } = buildDocsJson(
      { meta: { groups: [{ title: "Architecture", sections: ["adr"] }] } },
      {
        ...empty,
        directories: [{ name: "adr", hasIndexHtml: false, enFiles: [], jaFiles: ["0001.ja.md"] }],
      },
    );

    expect(docs.groups[0]?.sections[0]?.items[0]).toMatchObject({
      path: "../ja/adr/0001.ja.md",
      lang: "ja",
    });
  });

  it("生成 HTML を言語によらず出す項目として扱う", () => {
    const { docs } = buildDocsJson(
      { meta: { groups: [{ title: "Build", sections: ["coverage"] }] } },
      {
        ...empty,
        directories: [{ name: "coverage", hasIndexHtml: true, enFiles: [], jaFiles: [] }],
      },
    );

    expect(docs.groups[0]?.sections[0]?.items[0]).toMatchObject({
      path: "../coverage/index.html",
      lang: "all",
    });
  });

  it("中身の無いディレクトリを section にしない", () => {
    const { docs } = buildDocsJson(
      {},
      {
        ...empty,
        directories: [{ name: "empty", hasIndexHtml: false, enFiles: [], jaFiles: [] }],
      },
    );

    expect(docs.groups).toEqual([]);
  });

  it("ルート直下の Markdown を overview へ集約する", () => {
    const { docs } = buildDocsJson(
      { meta: { groups: [{ title: "Get Started", sections: ["overview"] }] } },
      { ...empty, rootEnFiles: ["playbook.md"], rootJaFiles: ["rules.ja.md"] },
    );

    expect(docs.groups[0]?.sections[0]?.items.map((item) => item.path)).toEqual([
      "../playbook.md",
      "../ja/rules.ja.md",
    ]);
  });

  it("EN を先、JA を後にして名前順へ並べる", () => {
    const { docs } = buildDocsJson(
      { meta: { groups: [{ title: "Architecture", sections: ["adr"] }] } },
      {
        ...empty,
        directories: [
          {
            name: "adr",
            hasIndexHtml: true,
            enFiles: ["b.md", "a.md"],
            jaFiles: ["c.ja.md"],
          },
        ],
      },
    );

    expect(docs.groups[0]?.sections[0]?.items.map((item) => item.lang)).toEqual([
      "en",
      "en",
      "ja",
      "all",
    ]);
    expect(docs.groups[0]?.sections[0]?.items.slice(0, 2).map((item) => item.name)).toEqual([
      "A",
      "B",
    ]);
  });

  it("同じ経路の項目を二重に出さない", () => {
    const { docs, warnings } = buildDocsJson(
      {
        meta: { groups: [{ title: "Architecture", sections: ["adr"] }] },
        adr: [
          { src: "docs/adr/0001.md", dst: "docs/portal/guides/0001.md" },
          { src: "docs/adr/0001.md", dst: "docs/portal/guides/0001.md" },
        ],
      },
      empty,
    );

    expect(docs.groups[0]?.sections[0]?.items).toHaveLength(1);
    expect(warnings[0]).toContain("重複した項目");
  });

  it("section の表示名を meta で上書きする", () => {
    const { docs } = buildDocsJson(
      {
        meta: {
          groups: [{ title: "Architecture", sections: ["adr"] }],
          section_titles: { adr: "設計判断" },
        },
        adr: [{ src: "a.md", dst: "docs/portal/guides/a.md" }],
      },
      empty,
    );

    expect(docs.groups[0]?.sections[0]?.title).toBe("設計判断");
  });

  it("題と副題を meta から採る", () => {
    const { docs } = buildDocsJson({ meta: { title: "T", subtitle: "S" } }, empty);

    expect(docs).toMatchObject({ title: "T", subtitle: "S" });
  });

  it("meta が無い manifest でも既定の題で組む", () => {
    const { docs } = buildDocsJson({}, empty);

    expect(docs.title).toBe("Documentation");
  });

  it("group に入らなかった section を Uncategorized へまとめる", () => {
    const { docs, warnings } = buildDocsJson(
      { adr: [{ src: "a.md", dst: "docs/portal/guides/a.md" }] },
      empty,
    );

    expect(docs.groups[0]?.title).toBe("Uncategorized");
    expect(warnings.some((warning) => warning.includes("Uncategorized"))).toBe(true);
  });

  it("存在しない section を指す group を飛ばす", () => {
    const { docs, warnings } = buildDocsJson(
      { meta: { groups: [{ title: "Architecture", sections: ["missing"] }] } },
      empty,
    );

    expect(docs.groups).toEqual([]);
    expect(warnings[0]).toContain('section id "missing" は存在しません');
  });

  it("同じ section を二つの group に置いた場合は後ろを飛ばす", () => {
    const { docs, warnings } = buildDocsJson(
      {
        meta: {
          groups: [
            { title: "First", sections: ["adr"] },
            { title: "Second", sections: ["adr"] },
          ],
        },
        adr: [{ src: "a.md", dst: "docs/portal/guides/a.md" }],
      },
      empty,
    );

    expect(docs.groups.map((group) => group.title)).toEqual(["First"]);
    expect(warnings[0]).toContain("複数の group");
  });

  it("section を役割で subgroup へ分ける", () => {
    const { docs } = buildDocsJson(
      {
        meta: {
          groups: [{ title: "Architecture", sections: ["adr"] }],
          subgroups: { adr: [{ title: "Core", items: ["a"] }] },
        },
        adr: [
          { src: "a.md", dst: "docs/portal/guides/a.md" },
          { src: "b.md", dst: "docs/portal/guides/b.md" },
        ],
      },
      empty,
    );

    const section = docs.groups[0]?.sections[0];

    expect(section?.subgroups?.map((subgroup) => subgroup.title)).toEqual(["Core", "Other"]);
    expect(section?.subgroups?.[0]?.items.map((item) => item.name)).toEqual(["A"]);
    expect(section?.subgroups?.[1]?.items.map((item) => item.name)).toEqual(["B"]);
  });

  it("全ての項目を割り当てたら Other を作らない", () => {
    const { docs } = buildDocsJson(
      {
        meta: {
          groups: [{ title: "Architecture", sections: ["adr"] }],
          subgroups: { adr: [{ title: "Core", items: ["a"] }] },
        },
        adr: [{ src: "a.md", dst: "docs/portal/guides/a.md" }],
      },
      empty,
    );

    expect(docs.groups[0]?.sections[0]?.subgroups?.map((subgroup) => subgroup.title)).toEqual([
      "Core",
    ]);
  });

  it("項目が一つも無い section には subgroup を付けない", () => {
    const { docs } = buildDocsJson(
      {
        meta: {
          groups: [{ title: "Architecture", sections: ["adr"] }],
          subgroups: { adr: [{ title: "Core", items: [] }] },
        },
        adr: [],
      },
      empty,
    );

    expect(docs.groups[0]?.sections[0]?.subgroups).toBeUndefined();
  });

  it("存在しない section の subgroup 指定を飛ばす", () => {
    const { warnings } = buildDocsJson(
      { meta: { subgroups: { missing: [{ title: "Core", items: [] }] } } },
      empty,
    );

    expect(warnings[0]).toContain('meta.subgroups: section id "missing" は存在しません');
  });

  it("存在しない guide id の指定を飛ばす", () => {
    const { warnings } = buildDocsJson(
      {
        meta: {
          groups: [{ title: "Architecture", sections: ["adr"] }],
          subgroups: { adr: [{ title: "Core", items: ["missing"] }] },
        },
        adr: [{ src: "a.md", dst: "docs/portal/guides/a.md" }],
      },
      empty,
    );

    expect(warnings[0]).toContain('guide id "missing" は存在しません');
  });

  it("section id を指した常設リンクを代表項目へ向ける", () => {
    const { docs } = buildDocsJson(
      { meta: { reference_links: ["coverage"] } },
      {
        ...empty,
        directories: [{ name: "coverage", hasIndexHtml: true, enFiles: [], jaFiles: [] }],
      },
    );

    expect(docs.referenceLinks).toEqual([
      { sectionId: "coverage", title: "Coverage", path: "../coverage/index.html" },
    ]);
  });

  it("常設リンクへ指定した section を group の未配置扱いにしない", () => {
    const { docs } = buildDocsJson(
      { meta: { reference_links: ["coverage"] } },
      {
        ...empty,
        directories: [{ name: "coverage", hasIndexHtml: true, enFiles: [], jaFiles: [] }],
      },
    );

    expect(docs.groups).toEqual([]);
  });

  it("経路を直接書いた常設リンクをそのまま出す", () => {
    const { docs } = buildDocsJson(
      { meta: { reference_links: [{ title: "Storybook", path: "../storybook/" }] } },
      empty,
    );

    expect(docs.referenceLinks).toEqual([
      { sectionId: "storybook", title: "Storybook", path: "../storybook/" },
    ]);
  });

  it("存在しない section を指した常設リンクを飛ばす", () => {
    const { docs, warnings } = buildDocsJson({ meta: { reference_links: ["missing"] } }, empty);

    expect(docs.referenceLinks).toEqual([]);
    expect(warnings[0]).toContain('meta.reference_links: section id "missing" は存在しません');
  });

  it("項目を持たない section を指した常設リンクを飛ばす", () => {
    const { docs } = buildDocsJson({ meta: { reference_links: ["adr"] }, adr: [] }, empty);

    expect(docs.referenceLinks).toEqual([]);
  });

  it("group に入らなかった section が複数あれば表示名の順に並べる", () => {
    const { docs } = buildDocsJson(
      {
        zebra: [{ src: "z.md", dst: "docs/portal/guides/z.md" }],
        alpha: [{ src: "a.md", dst: "docs/portal/guides/a.md" }],
      },
      empty,
    );

    expect(docs.groups[0]?.sections.map((section) => section.id)).toEqual(["alpha", "zebra"]);
  });

  it("meta 以外に map を置いた section を複製対象から外す", () => {
    const { docs } = buildDocsJson({ broken: { note: "map" } }, empty);

    expect(docs.groups).toEqual([]);
  });

  it("ビューアーが読める形の生成物を出す", () => {
    const { docs } = buildDocsJson(
      {
        meta: {
          title: "nextjs-boilerplate Documentation",
          subtitle: "実装ドキュメント",
          groups: [{ title: "Architecture", sections: ["adr"] }],
          reference_links: [{ title: "Storybook", path: "../storybook/" }],
        },
        adr: [{ src: "docs/adr/0001.md", dst: "docs/portal/guides/0001.md" }],
      },
      {
        ...empty,
        directories: [{ name: "adr", hasIndexHtml: false, enFiles: ["0002.md"], jaFiles: [] }],
      },
    );

    expect(() => parseDocsJson(docs)).not.toThrow();
  });
});
