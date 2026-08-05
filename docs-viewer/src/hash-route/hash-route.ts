import type { PortalGroup } from "../docs-json/docs-json";

/** `#/<group>/<section>` が指す位置。section 未指定なら group の先頭を見ている。 */
export type HashRoute = {
  groupSlug: string;
  sectionSlug: string | null;
};

/**
 * 位置ハッシュを解釈する。
 *
 * 静的配信されるため経路をサーバへ問い合わせられない。ハッシュだけが復元可能な状態で
 * あり、解釈できない入力は「未指定」として扱って空表示に落とさない。
 */
export function parseHashRoute(hash: string): HashRoute {
  const [groupSlug = "", sectionSlug = ""] = hash.replace(/^#\/?/, "").split("/");

  return { groupSlug, sectionSlug: sectionSlug || null };
}

export function formatHashRoute(groupSlug: string, sectionSlug?: string): string {
  return sectionSlug ? `#/${groupSlug}/${sectionSlug}` : `#/${groupSlug}`;
}

/**
 * 実際に表示する group の slug を決める。
 *
 * 要求された group が言語フィルタ後に消えている場合があるため、常に表示可能な group の
 * 中から選び直す。候補が無ければ `null`。
 */
export function resolveActiveGroupSlug(
  groups: readonly PortalGroup[],
  requestedSlug: string,
): string | null {
  const requested = groups.find((group) => group.slug === requestedSlug);

  return requested?.slug ?? groups[0]?.slug ?? null;
}
