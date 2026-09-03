// E2E の spec が指す経路と、実在する route を突き合わせる判定。走査と宣言は
// [`../e2e-routes.gate.test.ts`](../e2e-routes.gate.test.ts) が持つ。
//
// spec は経路を文字列で書くため、指す先が消えても型検査には掛からない。E2E を回せば落ちるが、
// **同梱サンプルを破棄した木で E2E は回らない**（`purge-verify` が回すのは lint / typecheck /
// build / test だけで、E2E は費用のため deferred check に置いてある）。破棄で画面が消えたことに
// 気づける唯一の場所がここになる。

/** route を持つ特殊ファイルと、名前だけで決まる配信経路。空文字はディレクトリから決まる側。 */
const ROUTE_FILES: ReadonlyMap<string, string> = new Map([
  ["page.tsx", ""],
  // 開発と CI の build にだけ含まれる route segment（`next.config.ts` の `pageExtensions`）。
  ["page.dev.tsx", ""],
  ["route.ts", ""],
  ["robots.ts", "/robots.txt"],
  ["sitemap.ts", "/sitemap.xml"],
  ["icon.tsx", "/icon"],
  ["apple-icon.tsx", "/apple-icon"],
  ["opengraph-image.tsx", "/opengraph-image"],
]);

/** route segment の置き場。 */
export const APP_DIR = "src/app";

/** 正規表現の中でリテラルとして扱うための逃がし。 */
function escapeForRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/** 引用符で囲まれた文字列を読む。閉じずに行が終わったものは拾わない。 */
function readQuoted(source: string, start: number, quote: string): { value: string; next: number } {
  let value = "";
  let index = start + 1;

  while (index < source.length) {
    const char = source[index];

    if (char === "\\") {
      value += source[index + 1] ?? "";
      index += 2;
      continue;
    }

    if (char === quote) {
      return { value, next: index + 1 };
    }

    if (char === "\n") {
      return { value: "", next: index + 1 };
    }

    value += char;
    index += 1;
  }

  return { value: "", next: index };
}

/**
 * テンプレート文字列を読み、**最初の `${` より前だけ**を返す。
 *
 * @remarks
 * 差し込みの後ろは値が実行時にしか決まらないので、経路として読めません。差し込みで始まる
 * ものは頭が空になり、拾われません（別 origin を組み立てる綴りがこれに当たります）。
 */
function readTemplate(source: string, start: number): { value: string; next: number } {
  let value = "";
  let index = start + 1;
  let inHead = true;
  let depth = 0;

  while (index < source.length) {
    const char = source[index];

    if (depth > 0) {
      // 差し込みの内側は式なので、中身は拾わずに対応する括弧まで送る。
      if (char === "{") {
        depth += 1;
      } else if (char === "}") {
        depth -= 1;
      } else if (char === '"' || char === "'") {
        index = readQuoted(source, index, char).next;
        continue;
      } else if (char === "`") {
        index = readTemplate(source, index).next;
        continue;
      }

      index += 1;
      continue;
    }

    if (char === "\\") {
      if (inHead) {
        value += source[index + 1] ?? "";
      }

      index += 2;
      continue;
    }

    if (char === "`") {
      return { value, next: index + 1 };
    }

    if (char === "$" && source[index + 1] === "{") {
      inHead = false;
      depth = 1;
      index += 2;
      continue;
    }

    if (inHead) {
      value += char;
    }

    index += 1;
  }

  return { value: "", next: index };
}

/** コメントの終わりまで送る。閉じていなければ末尾まで。 */
function skipTo(source: string, start: number, terminator: string): number {
  const end = source.indexOf(terminator, start);

  return end === -1 ? source.length : end + terminator.length;
}

/**
 * ソースから、経路の形をした文字列リテラルを拾う。
 *
 * @remarks
 * **コメントは読みません。** 散文の中でバッククォートに包んだ経路（`` `/maintenance` `` のような
 * 引用）まで拾うと、書き方を変えただけで検査が落ちます。
 *
 * 正規表現リテラルは式として素通りします。中に引用符を含むものは文字列の開始と読み違えますが、
 * その場合に出るのは経路の形をしない値なので、判定には現れません。
 *
 * @param source - spec 1 本のソース
 * @returns `/` で始まるリテラルの中身。問い合わせと素片は付いたまま
 */
export function listRouteLiterals(source: string): string[] {
  const found: string[] = [];
  let index = 0;

  while (index < source.length) {
    const char = source[index];

    if (char === "/" && source[index + 1] === "/") {
      index = skipTo(source, index + 2, "\n");
      continue;
    }

    if (char === "/" && source[index + 1] === "*") {
      index = skipTo(source, index + 2, "*/");
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      const literal = char === "`" ? readTemplate(source, index) : readQuoted(source, index, char);

      if (literal.value.startsWith("/")) {
        found.push(literal.value);
      }

      index = literal.next;
      continue;
    }

    index += 1;
  }

  return found;
}

/**
 * `src/app` 配下のファイルを、配信される route へ写す。
 *
 * @remarks
 * route group（`(name)`）は URL に現れないので落とします。並列ルート（`@slot`）は自分の URL を
 * 持たないので、その配下ごと対象外です。
 *
 * @param relativePath - リポジトリルート相対のパス（`/` 区切り）
 * @returns route。route を作らないファイルは `null`
 */
export function toAppRoute(relativePath: string): string | null {
  if (!relativePath.startsWith(`${APP_DIR}/`)) {
    return null;
  }

  const withinApp = relativePath.slice(APP_DIR.length + 1);
  const lastSeparator = withinApp.lastIndexOf("/");
  const segments = lastSeparator === -1 ? [] : withinApp.slice(0, lastSeparator).split("/");
  const fixedPath = ROUTE_FILES.get(withinApp.slice(lastSeparator + 1));

  if (fixedPath === undefined || segments.some((segment) => segment.startsWith("@"))) {
    return null;
  }

  if (fixedPath !== "") {
    return fixedPath;
  }

  const joined = segments.filter((segment) => !segment.startsWith("(")).join("/");

  return joined === "" ? "/" : `/${joined}`;
}

/** route 1 つを、経路に当てる正規表現へ組み立てる。動的区間は中身を問わない。 */
export function toRoutePattern(route: string): RegExp {
  const body = route
    .split("/")
    .filter((segment) => segment !== "")
    .map((segment) => {
      if (segment.startsWith("[[...") && segment.endsWith("]]")) {
        return "(?:/[^/]+)*";
      }

      if (segment.startsWith("[...") && segment.endsWith("]")) {
        return "(?:/[^/]+)+";
      }

      if (segment.startsWith("[") && segment.endsWith("]")) {
        return "/[^/]+";
      }

      return `/${escapeForRegExp(segment)}`;
    })
    .join("");

  return new RegExp(`^${body === "" ? "/" : body}$`);
}

/**
 * リテラルを、route と突き合わせられる経路へ整える。
 *
 * @remarks
 * 問い合わせと素片は route を決めないので落とします。末尾の区切りも同じで、`/products/` と
 * `/products` は同じ画面です。
 */
export function toRoutePath(literal: string): string {
  const cut = literal.search(/[?#]/);
  const withoutQuery = cut === -1 ? literal : literal.slice(0, cut);
  const trimmed = withoutQuery.replace(/\/+$/, "");

  return trimmed === "" ? "/" : trimmed;
}

/** 経路が、実在する route のどれかに当たるか。 */
function isServed(routePath: string, routes: readonly string[]): boolean {
  return routes.some((route) => toRoutePattern(route).test(routePath));
}

/**
 * spec が指す経路のうち、実在せず、実在しない理由も宣言されていないものを洗い出す。
 *
 * @param literals - spec から拾った経路のリテラル
 * @param routes - `src/app` から採った実在する route
 * @param absentByDesign - 実在しないことが意図である経路の宣言
 */
export function findUnknownRoutes(
  literals: readonly string[],
  routes: readonly string[],
  absentByDesign: readonly string[],
): string[] {
  const unknown = literals
    .map(toRoutePath)
    .filter((routePath) => !absentByDesign.includes(routePath) && !isServed(routePath, routes));

  return [...new Set(unknown)].map(
    (routePath) => `指す先が実在しません: ${routePath}（画面を消したか、綴りが違う）`,
  );
}

/**
 * 実体を失った「実在しない」宣言を洗い出す。
 *
 * @remarks
 * 2 方向を見ます。**どの spec も指していない**宣言は、指していた spec が消えた跡です。
 * **実在するようになった**宣言は、その経路に画面が置かれた跡で、放っておくと以後その経路が
 * 検査を素通りします。宣言が実体を失ったまま居座らないのは、画面の宣言
 * （`e2e/lib/screens.ts`）と同じ規律です。
 *
 * @param literals - spec から拾った経路のリテラル
 * @param routes - `src/app` から採った実在する route
 * @param absentByDesign - 実在しないことが意図である経路の宣言
 */
export function findStaleAbsentDeclarations(
  literals: readonly string[],
  routes: readonly string[],
  absentByDesign: readonly string[],
): string[] {
  const referenced = new Set(literals.map(toRoutePath));

  return absentByDesign.flatMap((routePath) => {
    if (isServed(routePath, routes)) {
      return [`実在しないと宣言した経路に画面があります: ${routePath}`];
    }

    return referenced.has(routePath) ? [] : [`どの spec も指していない宣言です: ${routePath}`];
  });
}
