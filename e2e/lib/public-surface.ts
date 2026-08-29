/**
 * 公開面（クローラが読むもの）の応答から、確かめたい値を取り出す。
 *
 * @remarks
 * 文書を DOM に組み立てず文字列のまま読むのは、確かめる相手が**配信された文字列そのもの**である
 * ためです。metadata は殻の後から流れて `<body>` の末尾に足されることがあり
 * （`generateMetadata` のストリーミング）、`<head>` だけを見ると取りこぼします。
 */

/** `<loc>` の中身を XML の実体から戻す。sitemap が持つのは URL なので、この 5 つで足りる。 */
function unescapeXml(value: string): string {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

/**
 * sitemap が挙げる URL を、書かれた順に返す。
 *
 * @param xml - `sitemap.xml` の本文
 */
export function listSitemapLocations(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => unescapeXml(match[1]));
}

/** タグの属性を、名前を小文字にして並べる。 */
function attributesOf(tag: string): Map<string, string> {
  const attributes = new Map<string, string>();

  for (const match of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*"([^"]*)"/g)) {
    attributes.set(match[1].toLowerCase(), match[2]);
  }

  return attributes;
}

/** 文書中の `<link>` を、属性の並びで返す。 */
function listLinks(html: string): Map<string, string>[] {
  return [...html.matchAll(/<link\b[^>]*>/g)].map((match) => attributesOf(match[0]));
}

/** 文書中の `<meta>` を、属性の並びで返す。 */
function listMetas(html: string): Map<string, string>[] {
  return [...html.matchAll(/<meta\b[^>]*>/g)].map((match) => attributesOf(match[0]));
}

/**
 * 文書が名乗る正規 URL。無ければ null。
 *
 * @param html - 画面の本文
 */
export function findCanonicalHref(html: string): string | null {
  const canonical = listLinks(html).find((link) => link.get("rel") === "canonical");

  return canonical?.get("href") ?? null;
}

/**
 * 文書が名乗る OG 画像の URL。無ければ null。
 *
 * @param html - 画面の本文
 */
export function findOpenGraphImage(html: string): string | null {
  const image = listMetas(html).find((meta) => meta.get("property") === "og:image");

  return image?.get("content") ?? null;
}

/** アイコンとして読まれる `rel`。 */
const ICON_RELS: ReadonlySet<string> = new Set(["icon", "apple-touch-icon"]);

/**
 * 文書が名乗るアイコンの URL を、書かれた順に返す。
 *
 * @param html - 画面の本文
 */
export function listIconHrefs(html: string): string[] {
  return listLinks(html)
    .filter((link) => ICON_RELS.has(link.get("rel") ?? ""))
    .map((link) => link.get("href") ?? "")
    .filter((href) => href !== "");
}

/**
 * 文書が索引を断っているか（`<meta name="robots">` に `noindex` を含むか）。
 *
 * @param html - 画面の本文
 */
export function isNoindex(html: string): boolean {
  return listMetas(html).some(
    (meta) =>
      meta.get("name") === "robots" &&
      (meta.get("content") ?? "")
        .split(",")
        .map((directive) => directive.trim())
        .includes("noindex"),
  );
}

/**
 * `robots.txt` の本文から、指定した field の値を書かれた順に返す。
 *
 * @param text - `robots.txt` の本文
 * @param field - `Disallow` / `Allow` / `Sitemap` など。綴りの大小は区別しない
 */
export function listRobotsDirectives(text: string, field: string): string[] {
  const wanted = field.toLowerCase();

  return text
    .split(/\r?\n/)
    .map((line) => line.split("#")[0])
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .flatMap((line) => {
      const separator = line.indexOf(":");

      if (separator === -1 || line.slice(0, separator).trim().toLowerCase() !== wanted) {
        return [];
      }

      return [line.slice(separator + 1).trim()];
    });
}
