#!/usr/bin/env node

// 画面単位の検証を挟む道具の入口。
//
//   names   <report.json>   基準画像と食い違った画面の名前（カンマ区切り）
//   orphans <report.json>   1 対 1 の対応が落ちたか（true / false）
//   clear-screens           全数撮り直しの前に、画面の基準画像を置き場から消す
//   serve-partner <host> <port>  宣言した別 origin の文書だけを返すサーバを、止められるまで立てる
//
// story 単位の側（`scripts/vrt`）と語彙を揃える。撮り直す範囲は報告した集合と同じ出所から取る
// —— 報告に出ていない差分を撮り直しの対象に入れないため（`vrt/README.md`）。
import { existsSync, readFileSync, rmSync } from "node:fs";

import { SCREEN_AREA, STORE_PATH } from "../../baseline/lib/store.js";
import { servePartnerOrigin } from "./partner-origin.js";
import { collectFailedScreens, formatScreenNames, hasScreenBaselineFailure } from "./report.js";

const USAGE =
  "usage: e2e <names <report.json>|orphans <report.json>|clear-screens|serve-partner <host> <port>>";

function main(): void {
  const [command, file, port] = process.argv.slice(2);

  if (command === "clear-screens") {
    clearScreens();

    return;
  }

  if (command === "serve-partner") {
    if (!file || !port) fail(USAGE);
    // 止めるのは起動側（`make` の trap）。ここは待ち受けたことを報せるだけでよい。
    void servePartnerOrigin(file, Number(port)).then(() => {
      console.log(`🤝 別 origin の文書を ${file}:${port} で返します。`);
    });

    return;
  }

  if (!file || (command !== "names" && command !== "orphans")) fail(USAGE);

  try {
    const json = readFileSync(file, "utf8");
    console.log(
      command === "names"
        ? formatScreenNames(collectFailedScreens(json))
        : String(hasScreenBaselineFailure(json)),
    );
  } catch (e) {
    fail(`レポートを読めません: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// 撮り直しは stale なファイルを消さない（`baseline/lib/store.ts`）。画面を改名・削除すると旧名の
// 画像が残り、対応の検査が孤児として落とす。全数のときだけ先に区画ごと消す。
function clearScreens(): void {
  if (!existsSync(`${STORE_PATH}/.git`)) {
    fail(
      `${STORE_PATH} が取り込まれていません。git submodule update --init ${STORE_PATH} を実行してください。`,
    );
  }

  rmSync(`${STORE_PATH}/${SCREEN_AREA}`, { force: true, recursive: true });
  console.log("🧹 画面の区画を消しました。撮り直しが書き直します。");
}

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

main();
