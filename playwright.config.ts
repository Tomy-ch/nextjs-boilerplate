import { defineConfig } from "@playwright/test";

/**
 * story 単位の visual regression の設定([0091](docs/adr/0091-test-verification-methods.md))。
 *
 * @remarks
 * 実行は必ず Playwright 公式イメージのコンテナ内で行います(`make vrt`)。フォントの
 * ラスタライズは OS と CPU アーキテクチャで変わるため、基準画像は「どの OS で撮ったか」
 * ではなく「どのイメージで撮ったか」で一意になります。ホスト直実行を許すと、撮った側の
 * 環境が基準になり、他の全員の手元と CI で全 story が差分になります。
 */

if (process.platform !== "linux") {
  throw new Error(
    "VRT はコンテナ内で実行してください(make vrt)。ホストで撮った基準画像は CI と一致しません。",
  );
}

export default defineConfig({
  testDir: "./vrt",
  testMatch: "**/*.spec.ts",
  // 生成物はすべて追跡対象外へ落とす。差分画像は基準画像と同じ拡張子で出るため、
  // 追跡下に置くと「更新済みの基準画像」と見分けが付かなくなる。
  outputDir: "tmp/vrt/results",
  // 系統 / テーマ / story の順に畳む。名前は spec が組み立てるため、ここは受け取るだけ。
  snapshotPathTemplate: "vrt/screenshots/{arg}{ext}",
  fullyParallel: true,
  // 1 件あたりの上限。撮影が収まるのを待つ猶予（下の expect）を内側に収める必要があり、
  // 既定の 30 秒だと待ち切る前に上限へ当たる。負荷が高いときに「揺らぎで落ちた」のか
  // 「順番待ちで落ちた」のか区別が付かなくなるため、外側を広く取る。
  timeout: 60_000,
  // 撮り直しで通る差分は無い。再試行は不安定な story を隠すだけで、隠れた分は基準画像の
  // 側へ蓄積する。
  retries: 0,
  // json は承認経路が読む。どの story がどれだけずれたかを機械可読で残しておかないと、
  // ラベルでの承認が「今落ちているもの全部」まで広がる。
  reporter: [
    ["list"],
    ["html", { outputFolder: "tmp/vrt/report", open: "never" }],
    ["json", { outputFile: "tmp/vrt/report.json" }],
  ],
  expect: {
    // 撮影は「同じ画面が 2 度続けて撮れる」まで待つ。既定の 5 秒では、描き終えるまでに
    // 間があるもの（mount 時に系列を描き足すグラフ、時間で閉じる通知）が収まりきらない。
    // 待つ時間を伸ばすのは差分を許すのとは別で、揺らぎが収まったことは同じ厳密さで見る。
    timeout: 20_000,
    toHaveScreenshot: {
      // 同一イメージ・同一アーキテクチャで撮る前提なので、許容する差分は置かない。
      // 閾値を持たせると、その幅に収まる退行(1px のずれ・わずかな色の変化)が通る。
      maxDiffPixels: 0,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },
  use: {
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    timezoneId: "Asia/Tokyo",
    locale: "ja-JP",
    contextOptions: {
      // Framer Motion の動きは CSS animation ではないため、撮影時の停止では止まらない
      // ([0051](docs/adr/0051-styling-system.md))。動きを求めない設定にして初期状態で撮る。
      reducedMotion: "reduce",
    },
  },
  // プロジェクト名がそのまま配色テーマであり、基準画像の置き場の一部になる。
  projects: [{ name: "light" }, { name: "dark" }],
});
