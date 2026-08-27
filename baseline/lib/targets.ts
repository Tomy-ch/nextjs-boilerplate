// 撮り直しが置き場へ積んだ差分から、撮り直した対象の名前を取り出す。
//
// 撮り直しのコメントは「手元で見る 1 行」を出す。その引数は見直しの入口（`make vrt-review` /
// `make e2e-review`）が取る名前であって、置き場のパスではない。在るべきパスの組み立ては撮影の
// 数え方ごとに分かれる（[vrt](../../vrt/lib/expected-baselines.ts) /
// [e2e](../../e2e/lib/screen-baselines.ts)）が、その逆は区画割りだけで決まるのでここが持つ。

import { EXTENSION } from "./orphans";
import { SCREEN_AREA } from "./store";

/** 消えた画像を表す状態。`git diff --name-status` が行頭に置く。 */
const DELETED = "D";

/**
 * 前の一式に同じパスが無いことを表す状態。
 *
 * @remarks
 * `A` は初めて置かれたもの、`R` は行き先のパスが新しいもの。**改名を新規と同じ側に置きます** ——
 * 絵そのものは前の一式にも在りますが、在るのは改名前のパスなので、行き先のパスで前を引くと
 * 存在しない先を指します。
 */
const WITHOUT_PREVIOUS = ["A", "R"];

/** 撮り直した対象。見直しの入口が種類ごとに分かれているので、ここでも分けて返す。 */
export type RetakenTargets = {
  /** story の id。`make vrt-review` の `VRT_ONLY` に渡せる形。 */
  readonly stories: readonly string[];
  /** 画面の名前。`make e2e-review` の `E2E_ONLY` に渡せる形。 */
  readonly screens: readonly string[];
  /**
   * 動いた画像の置き場相対のパス。畳まずに 1 枚ずつ持つ。
   *
   * @remarks
   * 名前の側（`stories` / `screens`）はテーマ違い・帯違いを 1 つに畳むので、枚数を数える器には
   * なりません。**撮り直しのコメントが数えるのも並べるのもここです。**
   */
  readonly images: readonly string[];
  /**
   * そのうち、前の一式に同じパスが無いもの。
   *
   * @remarks
   * **前を引ける先がありません。** 初めて置かれたものと、改名で行き先のパスが変わったものが
   * 入ります。前後を並べる側は、この集合を「前」の無いものとして扱う必要があります。
   */
  readonly unpaired: readonly string[];
};

/**
 * 置き場へ積んだ差分を、見直しの入口が取る名前へ畳む。
 *
 * @remarks
 * **消えた画像は落とします。**全数の撮り直しは story の区画を先に空にするので
 * （[store](store.ts) の `clearableStoryEntries`）、改名・削除された story は削除として差分に
 * 載ります。開けない id を案内に並べないため、ここで外します。**改名は行き先で数えます** ——
 * 絵が変わらない改名は git が改名として畳むので、消えた側だけを見ると対象ごと落ちます。
 *
 * 状態ごと受け取るのは、何を含めるかの判定を `git` の旗ではなくここへ置くためです。
 *
 * **同じ対象が複数の画像を持ちます。** story はテーマごと、画面は帯ごとに 1 枚ずつなので、
 * 畳まないと同じ名前が並びます。重複は最初の 1 つだけ残し、順序は受け取ったままにします。
 * 畳むのは名前の側だけです（{@link RetakenTargets.images}）。
 *
 * 画像以外は落とします。置き場は根に説明と絵を決める入力のハッシュを持つためです。
 *
 * @param entries - `git diff --name-status` の各行（`<状態>\t<パス>`、改名は行き先が最後の欄）
 */
export function retakenTargets(entries: readonly string[]): RetakenTargets {
  const stories = new Set<string>();
  const screens = new Set<string>();
  const images: string[] = [];
  const unpaired: string[] = [];

  for (const entry of entries) {
    const field = entry.indexOf("\t");

    if (field < 0 || entry.startsWith(DELETED)) continue;

    const image = entry.slice(entry.lastIndexOf("\t") + 1);
    const separator = image.lastIndexOf("/");

    if (separator < 0 || !image.endsWith(EXTENSION)) continue;

    const name = image.slice(separator + 1, -EXTENSION.length);
    const area = image.slice(0, image.indexOf("/"));

    (area === SCREEN_AREA ? screens : stories).add(name);
    images.push(image);
    if (WITHOUT_PREVIOUS.some((status) => entry.startsWith(status))) unpaired.push(image);
  }

  return { stories: [...stories], screens: [...screens], images, unpaired };
}
