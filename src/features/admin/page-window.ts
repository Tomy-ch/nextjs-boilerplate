/** ページ送りに並べる 1 つ。 */
export type PageWindowEntry =
  | { readonly kind: "page"; readonly page: number }
  | { readonly kind: "gap"; readonly after: number };

/** 現在ページの両隣を何ページぶん出すか。 */
const NEIGHBOR_SPAN = 1;

/**
 * 並べるページ番号を選ぶ。
 *
 * @remarks
 * 全ページを並べません。件数が増えるほど番号の列が伸び、狭い段では折り返して他の操作を押し下げ
 * ます。**常に出すのは先頭・末尾・現在の両隣**で、飛んだところに省略記号を挟みます。
 *
 * 省略記号が「どこを飛ばしたか」を持つのは、並びの中で一意な鍵が要るためです。前後の番号が
 * 判れば、飛ばした範囲は一意に決まります。
 *
 * 飛ばす対象が 1 ページしか無いときは省略記号を置かず、その番号をそのまま出します。記号と
 * 番号は同じ幅を占めるので、隠しても短くならないうえに 1 手増えます。
 *
 * @param current - いま見ているページ番号
 * @param pageCount - 全ページ数
 * @returns 並べるページ番号と省略記号
 */
export function toPageWindow(current: number, pageCount: number): readonly PageWindowEntry[] {
  const shown = new Set<number>([1, pageCount]);

  for (let page = current - NEIGHBOR_SPAN; page <= current + NEIGHBOR_SPAN; page += 1) {
    if (page >= 1 && page <= pageCount) shown.add(page);
  }

  const pages = [...shown].sort((left, right) => left - right);

  return pages.flatMap((page, index) => {
    const previous = pages[index - 1];

    if (previous === undefined || page - previous === 1) {
      return [{ kind: "page", page } as const];
    }

    if (page - previous === 2) {
      return [{ kind: "page", page: page - 1 } as const, { kind: "page", page } as const];
    }

    return [{ kind: "gap", after: previous } as const, { kind: "page", page } as const];
  });
}

/** ページ送りに並べる 1 つと、その行き先。 */
export type PageLinkEntry =
  | {
      readonly kind: "page";
      readonly page: number;
      readonly href: string;
      readonly current: boolean;
    }
  | { readonly kind: "gap"; readonly after: number };

/** ページ送りが描くものすべて。端では前後の行き先を持たない。 */
export type PageLinks = {
  readonly entries: readonly PageLinkEntry[];
  readonly previousHref?: string;
  readonly nextHref?: string;
};

/**
 * 並べるページ番号に行き先を添える。
 *
 * @param current - いま見ているページ番号
 * @param pageCount - 全ページ数
 * @param hrefOf - ページ番号から行き先を組む。画面が URL に持つほかの条件は、ここで保つ
 * @returns 並べる番号と行き先、前後の行き先
 */
export function toPageLinks(
  current: number,
  pageCount: number,
  hrefOf: (page: number) => string,
): PageLinks {
  return {
    entries: toPageWindow(current, pageCount).map((entry) =>
      entry.kind === "gap"
        ? entry
        : { ...entry, href: hrefOf(entry.page), current: entry.page === current },
    ),
    ...(current > 1 ? { previousHref: hrefOf(current - 1) } : {}),
    ...(current < pageCount ? { nextHref: hrefOf(current + 1) } : {}),
  };
}
