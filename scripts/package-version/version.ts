// リリース版を名乗るブランチ名から `package.json` の version を決める判断。
//
// 版の出所はブランチ名（= タグから数えた次の版）1 つで、`package.json` はそこから導かれる側に
// 置く。両方を人が書くと、出荷した版と名乗る版が黙ってずれる。

import { normalizeVersion } from "../semver/bump.js";

/**
 * リリース版を名乗るブランチ。
 *
 * @remarks
 * `release` と `hotfix` の双方を数えます。どちらも出荷される版であり、片方だけを数えると
 * hotfix で出した版だけが `package.json` に載らないまま残ります。
 *
 * 版として読めるかの判断は [bump.ts](../semver/bump.ts) へ委ねます。ここで綴り直すと、
 * リリースを切る側が読める表記とこちらが読める表記が別々に動きます。
 */
const RELEASE_BRANCH_PATTERN = /^(?:release|hotfix)\/(v.+)$/;

/**
 * `package.json` の version フィールド。桁は 2 で固定（最上位の直下）。
 *
 * @remarks
 * 値だけを捉えて前後をそのまま残します。JSON として組み直すと整形と鍵の並びが書き手の手を
 * 離れ、版以外の差分が出ます。
 */
const VERSION_FIELD = /^ {2}"version": "([^"]*)"/m;

/** 走らせ方。書き込むか、突き合わせるだけか。 */
export type StampMode = "stamp" | "check";

const STAMP_MODES: readonly StampMode[] = ["stamp", "check"];

/** 引数として渡された値が走らせ方の指定になっているか。 */
export function isStampMode(value: string): value is StampMode {
  return (STAMP_MODES as readonly string[]).includes(value);
}

/**
 * ブランチ名から焼き込むべき版を導く。
 *
 * @remarks
 * リリース版を名乗らない ref は「刻まない」であって「エラー」ではないため `null` を返し、
 * 落とすかどうかを呼び出し側に選ばせます。feature ブランチの PR でも同じ検査が走ります。
 */
export function deriveVersion(ref: string): string | null {
  const captured = RELEASE_BRANCH_PATTERN.exec(ref)?.[1];

  return captured === undefined ? null : normalizeVersion(captured);
}

/**
 * `package.json` の本文から現在の version を読む。
 *
 * @returns 該当行が無ければ `null`。
 */
export function readVersion(manifest: string): string | null {
  return VERSION_FIELD.exec(manifest)?.[1] ?? null;
}

/**
 * `package.json` の本文の version を差し替える。
 *
 * @remarks
 * 置換値は関数で渡します。版の文字列に `$&` のような置換パターンが混ざっても、文字列として
 * そのまま書き込むためです。
 */
export function replaceVersion(manifest: string, version: string): string {
  return manifest.replace(VERSION_FIELD, () => `  "version": "${version}"`);
}

/** 書き込む前に決まること。書き込まない 3 つを、理由ごとに分けて持つ。 */
export type StampPlan =
  | { readonly kind: "skip"; readonly ref: string }
  | { readonly kind: "unchanged"; readonly version: string }
  | { readonly kind: "missing" }
  | {
      readonly kind: "write";
      readonly from: string;
      readonly to: string;
      readonly content: string;
    };

/**
 * ref と現在の本文から、書き換えるべきかどうかを決める。
 *
 * @remarks
 * 「対象外の ref だから何もしない」「既に同じ版だから何もしない」「version が無くて書けない」は、
 * 書き込まない点では同じですが最後だけは失敗です。入口で畳むと、この 3 つを取り違えても
 * 誰も気づけません。
 *
 * 本文は `readManifest` から遅延で受け取ります。対象外の ref では読まずに終える必要があり、
 * その順序は呼び出し側の書き方ではなくここが持ちます。
 */
export function planStamp(ref: string, readManifest: () => string): StampPlan {
  const version = deriveVersion(ref);

  if (version === null) {
    return { kind: "skip", ref };
  }

  const manifest = readManifest();
  const current = readVersion(manifest);

  if (current === null) {
    return { kind: "missing" };
  }

  if (current === version) {
    return { kind: "unchanged", version };
  }

  return { kind: "write", from: current, to: version, content: replaceVersion(manifest, version) };
}

/** 人へ出す 1 件。落とすかどうかも併せて持つ。 */
export type StampReport = {
  readonly message: string;
  readonly failed: boolean;
};

/**
 * 決まったことを、走らせ方に応じた report へ落とす。
 *
 * @remarks
 * **同じ plan でも、書き込む側と突き合わせる側で意味が反転するのは `write` だけです。**
 * 書き込む側にとっては仕事そのもの、突き合わせる側にとっては「焼き込み忘れ」を意味します。
 * 反転をここに置くのは、CI が読む文面と手元で出る文面を 1 箇所から出すためです。
 */
export function reportPlan(plan: StampPlan, mode: StampMode): StampReport {
  if (plan.kind === "skip") {
    return {
      message: `⏭️ ${plan.ref} はリリース版を名乗らないので version は据え置きます`,
      failed: false,
    };
  }

  if (plan.kind === "missing") {
    return { message: "❌ package.json に version がありません", failed: true };
  }

  if (plan.kind === "unchanged") {
    return { message: `✅ version はブランチ名どおり ${plan.version} です`, failed: false };
  }

  if (mode === "stamp") {
    return { message: `✏️ version: ${plan.from} → ${plan.to}`, failed: false };
  }

  return {
    message: [
      `❌ version がブランチ名と食い違っています（package.json: ${plan.from} / ブランチ: ${plan.to}）`,
      "➡️ make version-stamp を実行し、差分をコミットしてください",
    ].join("\n"),
    failed: true,
  };
}
