/**
 * リリースタグの表記。
 *
 * @remarks
 * `v` 付きの 3 桁だけをリリースとして数えます。前リリース版(`v1.2.3-rc.1`)や版を持たないタグを
 * 拾うと、次の版を数える [bump.ts](bump.ts) が読めない値を受け取ります。
 */
const RELEASE_TAG_PATTERN = /^v(\d+)\.(\d+)\.(\d+)$/;

/** 比較のために割った版。major / minor / patch の順。 */
type VersionParts = readonly [number, number, number];

/**
 * タグの全数から、最新のリリースタグを選ぶ。1 本も無ければ null。
 *
 * @remarks
 * **並べ替えを git へ委ねません。** `git tag --sort=-v:refname` の前後は git の版と
 * `versionsort.suffix` の設定で変わり得ますが、ここが返す 1 本はリリースを切る基準そのもの
 * なので、環境ごとに違う答えを取れません。取り違えると既に在る版を打ち直すか、版が巻き戻ります。
 *
 * 桁は数として比べます。文字列として比べると `v0.9.0` が `v0.10.0` より後ろに来ます。
 */
export function selectLatestVersion(tags: readonly string[]): string | null {
  let latest: { readonly tag: string; readonly parts: VersionParts } | null = null;

  for (const tag of tags) {
    // 読み取りの行を丸ごと渡されるので、ここで端を落とす。落とさずに返すと、次の版を数える側が
    // 同じタグを「読めない表記」として弾く。
    const trimmed = tag.trim();
    const parts = parseReleaseTag(trimmed);

    if (parts === null) {
      continue;
    }

    if (latest === null || compareVersions(parts, latest.parts) > 0) {
      latest = { tag: trimmed, parts };
    }
  }

  return latest === null ? null : latest.tag;
}

function parseReleaseTag(tag: string): VersionParts | null {
  const matched = RELEASE_TAG_PATTERN.exec(tag);

  return matched === null ? null : [Number(matched[1]), Number(matched[2]), Number(matched[3])];
}

function compareVersions(left: VersionParts, right: VersionParts): number {
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2];
}
