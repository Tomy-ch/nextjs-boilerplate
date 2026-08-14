import type { KnipConfig } from "knip";

import { ENTRYPOINT_PATTERNS, GENERATED_MODULES } from "./scripts/lib/untested-modules";

/**
 * 未使用の file / export / dependency を検出する設定。
 *
 * @remarks
 * 1:1 ゲート（[`scripts/one-to-one.gate.test.ts`](scripts/one-to-one.gate.test.ts)）は export に
 * 対応する describe があるかを見ますが、その export をどこかが呼んでいるかは見ません。ここが
 * その隙間を埋めます。
 *
 * **公開面と内部で扱いを変えます。** boilerplate は fork 先が使う口を意図的に export するため、
 * `src/components/**` は内部から呼ばれないことが正常であり、未使用がそのまま欠陥になりません。
 * これらを入口として宣言し、export の未使用を問いません。それ以外の層（`features` / `app` /
 * `adapters` / `capabilities` / `stores` / `model` / `config` / `errors` / `logging` /
 * `observability` / `scripts`）は内部であり、どこからも呼ばれない export は死んだコードです。
 *
 * 入口と生成物の宣言は
 * [`scripts/lib/untested-modules.ts`](scripts/lib/untested-modules.ts) を読み直します。同じ事実を
 * 2 箇所に書くと、片方だけを直したときに黙ってずれます。
 */

/** fork 先が使う口。内部から呼ばれないことが正常な層。 */
const PUBLISHED_SURFACE = ["src/components/**/*.{ts,tsx}"];

/**
 * import では現れない依存。
 *
 * - `date-fns` — 日付演算の採用ライブラリ（[0120](docs/adr/0120-locale-aware-formatting.md)）。
 *   置いてあること自体が提供物で、fork 先が日付を扱い始めた時点で使われる。撤去条件は、採用
 *   そのものを取り下げたとき。
 * - `@commitlint/cli` — `make commitlint` が binary として起動する。knip は Makefile を読まない。
 *   撤去条件は、起動元が TypeScript 側へ移ったとき。
 * - `lefthook` — git hook から起動する。knip は `.git/hooks` の中身で使用を判定するため、hook を
 *   入れていないチェックアウト（CI）でだけ未使用に見える。撤去条件は、hook の導入が
 *   チェックアウトの時点で済むようになったとき。
 */
const NON_IMPORTED_DEPENDENCIES = ["date-fns", "@commitlint/cli", "lefthook"];

const config: KnipConfig = {
  // playwright.config.ts はコンテナ外で読み込むと落ちるため、knip の plugin では扱えない
  // (plugin は設定を読み込む)。spec と設定は root の entry が直接指す — 静的に辿るだけなら
  // 読み込みは起きない。ignore へ回すと、設定だけが使う宣言(撮る配色テーマなど)が
  // 未使用に見える。
  playwright: false,
  workspaces: {
    ".": {
      entry: [
        ...ENTRYPOINT_PATTERNS,
        ...PUBLISHED_SURFACE,
        "vrt/*.spec.ts",
        "playwright.config.ts",
        "e2e/**/*.spec.ts",
        "playwright.e2e.config.ts",
      ],
      ignore: [...GENERATED_MODULES],
      ignoreDependencies: NON_IMPORTED_DEPENDENCIES,
    },
    "docs-viewer": {
      // stylesheet が `@import "tailwindcss"` を辿るだけで、TypeScript には現れない。
      ignoreDependencies: ["tailwindcss"],
    },
  },
};

export default config;
