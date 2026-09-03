import { describe, expect, it } from "vitest";

import {
  findStaleAbsentDeclarations,
  findUnknownRoutes,
  listRouteLiterals,
  toAppRoute,
  toRoutePath,
  toRoutePattern,
} from "./e2e-routes";

describe("listRouteLiterals", () => {
  // ----- 正常系 -----
  it("二重引用符と単引用符の経路を拾う", () => {
    expect(listRouteLiterals(`goto("/about"); goto('/terms');`)).toEqual(["/about", "/terms"]);
  });

  it("経路の形をしない文字列は拾わない", () => {
    expect(listRouteLiterals('const origin = "https://example.test/x";')).toEqual([]);
  });

  it("逃がした引用符を含む経路を、閉じたものとして読む", () => {
    expect(listRouteLiterals(String.raw`goto("/a\"b");`)).toEqual(['/a"b']);
  });

  it("テンプレート文字列は、差し込みより前だけを拾う", () => {
    expect(listRouteLiterals(`goto(\`/login?returnUrl=\${url}\`);`)).toEqual(["/login?returnUrl="]);
  });

  it("差し込みで始まるテンプレート文字列は拾わない", () => {
    expect(listRouteLiterals(`goto(\`\${origin}/api/products\`);`)).toEqual([]);
  });

  it("差し込みの内側にある文字列と入れ子の括弧を、経路として読まない", () => {
    expect(listRouteLiterals(`goto(\`/a\${ { k: "/inner" }.k }/b\`);`)).toEqual(["/a"]);
  });

  it("差し込みの内側にあるテンプレート文字列も読まない", () => {
    expect(listRouteLiterals(`goto(\`/a\${\`/inner\`}\`);`)).toEqual(["/a"]);
  });

  it("逃がした文字をテンプレート文字列の頭でも読む", () => {
    expect(listRouteLiterals(`goto(\`/a\\\`b\`);`)).toEqual(["/a`b"]);
  });

  it("差し込みより後ろの逃がした文字は拾わない", () => {
    expect(listRouteLiterals(`goto(\`/a\${x}\\n/b\`);`)).toEqual(["/a"]);
  });

  // ----- 異常系 -----
  it("行コメントの中の経路は拾わない", () => {
    expect(listRouteLiterals('// "/about" を開く\ngoto("/terms");')).toEqual(["/terms"]);
  });

  it("ブロックコメントの中の経路は拾わない", () => {
    expect(listRouteLiterals('/* "/about" */ goto("/terms");')).toEqual(["/terms"]);
  });

  it("閉じないブロックコメントは末尾まで読み飛ばす", () => {
    expect(listRouteLiterals('goto("/terms"); /* "/about"')).toEqual(["/terms"]);
  });

  it("行の途中で閉じない引用符を落とし、次の行から読み直す", () => {
    expect(listRouteLiterals('goto("/about\ngoto("/terms");')).toEqual(["/terms"]);
  });

  it("閉じないまま末尾へ達した引用符は拾わない", () => {
    expect(listRouteLiterals('goto("/about')).toEqual([]);
  });

  it("末尾が逃がし記号で終わる引用符も拾わない", () => {
    expect(listRouteLiterals('goto("/about\\')).toEqual([]);
  });

  it("閉じないまま末尾へ達したテンプレート文字列は拾わない", () => {
    expect(listRouteLiterals(`goto(\`/about`)).toEqual([]);
  });

  it("末尾が逃がし記号で終わるテンプレート文字列も拾わない", () => {
    expect(listRouteLiterals(`goto(\`/about\\`)).toEqual([]);
  });
});

describe("toAppRoute", () => {
  // ----- 正常系 -----
  it("根の画面を `/` にする", () => {
    expect(toAppRoute("src/app/page.tsx")).toBe("/");
  });

  it("route group を URL から落とす", () => {
    expect(toAppRoute("src/app/(shop)/products/page.tsx")).toBe("/products");
  });

  it("動的区間を綴りのまま残す", () => {
    expect(toAppRoute("src/app/(shop)/products/[id]/page.tsx")).toBe("/products/[id]");
  });

  it("Route Handler も route として数える", () => {
    expect(toAppRoute("src/app/api/health/route.ts")).toBe("/api/health");
  });

  it("開発だけに含まれる画面も数える", () => {
    expect(toAppRoute("src/app/dev/session/page.dev.tsx")).toBe("/dev/session");
  });

  it("名前で配信経路が決まる特殊ファイルを、その経路にする", () => {
    expect(toAppRoute("src/app/robots.ts")).toBe("/robots.txt");
    expect(toAppRoute("src/app/sitemap.ts")).toBe("/sitemap.xml");
    expect(toAppRoute("src/app/icon.tsx")).toBe("/icon");
    expect(toAppRoute("src/app/apple-icon.tsx")).toBe("/apple-icon");
    expect(toAppRoute("src/app/opengraph-image.tsx")).toBe("/opengraph-image");
  });

  // ----- 異常系 -----
  it("`src/app` の外は route にしない", () => {
    expect(toAppRoute("src/features/home/view.tsx")).toBeNull();
  });

  it("route を作らないファイルは数えない", () => {
    expect(toAppRoute("src/app/not-found.tsx")).toBeNull();
  });

  it("並列ルートは自分の URL を持たないので数えない", () => {
    expect(toAppRoute("src/app/admin/@breadcrumb/users/page.tsx")).toBeNull();
  });
});

describe("toRoutePattern", () => {
  // ----- 正常系 -----
  it("`/` に当たる", () => {
    expect(toRoutePattern("/").test("/")).toBe(true);
    expect(toRoutePattern("/").test("/about")).toBe(false);
  });

  it("静的な区間は綴りごと当てる", () => {
    expect(toRoutePattern("/api/health").test("/api/health")).toBe(true);
    expect(toRoutePattern("/api/health").test("/api/healthy")).toBe(false);
  });

  it("動的区間は 1 区間の中身を問わない", () => {
    const pattern = toRoutePattern("/products/[id]");

    expect(pattern.test("/products/abc")).toBe(true);
    expect(pattern.test("/products")).toBe(false);
    expect(pattern.test("/products/a/b")).toBe(false);
  });

  it("catch-all は 1 区間以上に当たる", () => {
    const pattern = toRoutePattern("/docs/[...slug]");

    expect(pattern.test("/docs/a")).toBe(true);
    expect(pattern.test("/docs/a/b")).toBe(true);
    expect(pattern.test("/docs")).toBe(false);
  });

  it("任意の catch-all は 0 区間にも当たる", () => {
    const pattern = toRoutePattern("/docs/[[...slug]]");

    expect(pattern.test("/docs")).toBe(true);
    expect(pattern.test("/docs/a/b")).toBe(true);
  });

  it("正規表現の記号を含む区間を、綴りとして当てる", () => {
    const pattern = toRoutePattern("/a.b");

    expect(pattern.test("/a.b")).toBe(true);
    expect(pattern.test("/axb")).toBe(false);
  });
});

describe("toRoutePath", () => {
  // ----- 正常系 -----
  it("そのままの経路を返す", () => {
    expect(toRoutePath("/products")).toBe("/products");
  });

  it("問い合わせを落とす", () => {
    expect(toRoutePath("/login?returnUrl=%2Fmypage")).toBe("/login");
  });

  it("素片を落とす", () => {
    expect(toRoutePath("/about#history")).toBe("/about");
  });

  it("末尾の区切りを落とす", () => {
    expect(toRoutePath("/products/")).toBe("/products");
  });

  it("`/` は `/` のまま返す", () => {
    expect(toRoutePath("/")).toBe("/");
  });

  it("問い合わせだけの経路も `/` にする", () => {
    expect(toRoutePath("/?first=1")).toBe("/");
  });
});

describe("findUnknownRoutes", () => {
  // ----- 正常系 -----
  it("実在する route に着く経路を報告しない", () => {
    expect(findUnknownRoutes(["/products/abc"], ["/products/[id]"], [])).toEqual([]);
  });

  it("実在しないと宣言した経路を報告しない", () => {
    expect(findUnknownRoutes(["/account"], ["/login"], ["/account"])).toEqual([]);
  });

  // ----- 異常系 -----
  it("実在しない経路を報告する", () => {
    expect(findUnknownRoutes(["/about"], ["/login"], [])).toEqual([
      "指す先が実在しません: /about（画面を消したか、綴りが違う）",
    ]);
  });

  it("同じ経路を何度指していても 1 度だけ報告する", () => {
    expect(findUnknownRoutes(["/about", "/about?x=1"], ["/login"], [])).toHaveLength(1);
  });
});

describe("findStaleAbsentDeclarations", () => {
  // ----- 正常系 -----
  it("spec が指していて実在しない宣言を報告しない", () => {
    expect(findStaleAbsentDeclarations(["/account"], ["/login"], ["/account"])).toEqual([]);
  });

  // ----- 異常系 -----
  it("どの spec も指していない宣言を報告する", () => {
    expect(findStaleAbsentDeclarations(["/login"], ["/login"], ["/account"])).toEqual([
      "どの spec も指していない宣言です: /account",
    ]);
  });

  it("実在するようになった宣言を報告する", () => {
    expect(findStaleAbsentDeclarations(["/account"], ["/account"], ["/account"])).toEqual([
      "実在しないと宣言した経路に画面があります: /account",
    ]);
  });
});
