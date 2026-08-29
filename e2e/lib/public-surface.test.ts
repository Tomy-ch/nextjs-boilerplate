import { describe, expect, it } from "vitest";

import {
  findCanonicalHref,
  findOpenGraphImage,
  isNoindex,
  isSameLocation,
  listIconHrefs,
  listRobotsDirectives,
  listSitemapLocations,
} from "./public-surface";

describe("listSitemapLocations", () => {
  // ----- 正常系 -----
  it("loc を書かれた順に返す", () => {
    const xml =
      '<?xml version="1.0"?><urlset><url><loc>https://a.test/</loc></url><url><loc>https://a.test/b</loc></url></urlset>';

    expect(listSitemapLocations(xml)).toEqual(["https://a.test/", "https://a.test/b"]);
  });

  it("XML の実体を戻す", () => {
    expect(listSitemapLocations("<loc>https://a.test/?x=1&amp;y=2</loc>")).toEqual([
      "https://a.test/?x=1&y=2",
    ]);
  });

  it("5 つの実体をすべて戻し、&amp; を最後に戻す", () => {
    expect(listSitemapLocations("<loc>a&lt;b&gt;c&quot;d&apos;e&amp;lt;</loc>")).toEqual([
      "a<b>c\"d'e&lt;",
    ]);
  });

  it("loc が無ければ空を返す", () => {
    expect(listSitemapLocations("<urlset></urlset>")).toEqual([]);
  });
});

describe("findCanonicalHref", () => {
  // ----- 正常系 -----
  it("rel が canonical の link の href を返す", () => {
    expect(findCanonicalHref('<link rel="canonical" href="https://a.test/b"/>')).toBe(
      "https://a.test/b",
    );
  });

  it("属性の並びに依らない", () => {
    expect(findCanonicalHref('<link href="https://a.test/b" rel="canonical">')).toBe(
      "https://a.test/b",
    );
  });

  it("属性名の大文字小文字を区別しない", () => {
    expect(findCanonicalHref('<link REL="canonical" HREF="/b">')).toBe("/b");
  });

  it("body の末尾に足されたものも読む", () => {
    const html = '<html><head></head><body><p>x</p><link rel="canonical" href="/c"></body></html>';

    expect(findCanonicalHref(html)).toBe("/c");
  });

  it("無ければ null", () => {
    expect(findCanonicalHref('<link rel="icon" href="/icon">')).toBeNull();
  });

  it("href を持たない canonical は null", () => {
    expect(findCanonicalHref('<link rel="canonical">')).toBeNull();
  });
});

describe("findOpenGraphImage", () => {
  // ----- 正常系 -----
  it("og:image の content を返す", () => {
    expect(findOpenGraphImage('<meta property="og:image" content="https://a.test/og"/>')).toBe(
      "https://a.test/og",
    );
  });

  it("無ければ null", () => {
    expect(findOpenGraphImage('<meta property="og:title" content="t"/>')).toBeNull();
  });

  it("content を持たない og:image は null", () => {
    expect(findOpenGraphImage('<meta property="og:image"/>')).toBeNull();
  });
});

describe("listIconHrefs", () => {
  // ----- 正常系 -----
  it("icon と apple-touch-icon の href を書かれた順に返す", () => {
    const html = [
      '<link rel="icon" href="/favicon.ico" sizes="any">',
      '<link rel="icon" href="/icon?abc" type="image/png" sizes="32x32">',
      '<link rel="apple-touch-icon" href="/apple-icon?abc">',
      '<link rel="stylesheet" href="/x.css">',
    ].join("");

    expect(listIconHrefs(html)).toEqual(["/favicon.ico", "/icon?abc", "/apple-icon?abc"]);
  });

  it("無ければ空を返す", () => {
    expect(listIconHrefs("<html></html>")).toEqual([]);
  });

  it("rel を持たない link と href を持たないアイコンは数えない", () => {
    expect(listIconHrefs('<link href="/x.css"><link rel="icon">')).toEqual([]);
  });
});

describe("isNoindex", () => {
  // ----- 正常系 -----
  it("robots に noindex を含めば真", () => {
    expect(isNoindex('<meta name="robots" content="noindex, nofollow"/>')).toBe(true);
  });

  it("robots が index なら偽", () => {
    expect(isNoindex('<meta name="robots" content="index, follow"/>')).toBe(false);
  });

  it("robots が無ければ偽", () => {
    expect(isNoindex('<meta name="description" content="noindex"/>')).toBe(false);
  });

  it("noindex が先頭でなくても前後の空白を落として読む", () => {
    expect(isNoindex('<meta name="robots" content="nofollow, noindex"/>')).toBe(true);
  });

  it("content を持たない robots は偽", () => {
    expect(isNoindex('<meta name="robots"/>')).toBe(false);
  });
});

describe("isSameLocation", () => {
  // ----- 正常系 -----
  it("root の末尾の区切りの有無を区別しない", () => {
    expect(isSameLocation("https://a.test/", "https://a.test")).toBe(true);
  });

  it("経路が違えば別の場所", () => {
    expect(isSameLocation("https://a.test/a", "https://a.test/b")).toBe(false);
  });

  it("origin が違えば別の場所", () => {
    expect(isSameLocation("https://a.test/", "https://b.test/")).toBe(false);
  });
});

describe("listRobotsDirectives", () => {
  const text = [
    "User-Agent: *",
    "Allow: /",
    "Disallow: /account",
    "disallow: /admin # 管理",
    "",
    "Sitemap: https://a.test/sitemap.xml",
  ].join("\n");

  // ----- 正常系 -----
  it("指定した field の値を書かれた順に返す", () => {
    expect(listRobotsDirectives(text, "Disallow")).toEqual(["/account", "/admin"]);
  });

  it("field の綴りの大小を区別しない", () => {
    expect(listRobotsDirectives(text, "sitemap")).toEqual(["https://a.test/sitemap.xml"]);
  });

  it("無ければ空を返す", () => {
    expect(listRobotsDirectives(text, "Crawl-delay")).toEqual([]);
  });

  it("区切りの無い行は読み飛ばす", () => {
    expect(listRobotsDirectives("Malformed line\nAllow: /", "Allow")).toEqual(["/"]);
  });
});
