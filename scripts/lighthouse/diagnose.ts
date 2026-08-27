#!/usr/bin/env node
// 直前の計測が残した LHR から、値の理由を引いて出す（make lighthouse-report）。
//
// 予算が落ちたとき、判定は「どの指標が超えたか」までしか言わない。どの要素が動いたか、どの
// script が実行を占めたかは LHR の中にあり、手元で開くには viewer へ落とす必要があった。
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { formatDiagnosis, readDiagnosis } from "./diagnosis";

const OUTPUT_DIR = "tmp/lighthouse";

// 1 画面につき試行の数だけ LHR が残る。同じ話を試行ぶん繰り返さないよう、先頭だけを読む。
const FIRST_RUN = /^(.+)-1\.json$/;

const files = readdirSync(OUTPUT_DIR).filter((name) => FIRST_RUN.test(name));

if (files.length === 0) {
  process.stderr.write(
    `❌ ${OUTPUT_DIR} に結果がありません。make lighthouse を実行してください。\n`,
  );
  process.exitCode = 1;
} else {
  const reports = files.toSorted().map((name) => {
    const screen = FIRST_RUN.exec(name)?.[1] ?? name;

    return formatDiagnosis(
      readDiagnosis(screen, JSON.parse(readFileSync(join(OUTPUT_DIR, name), "utf8"))),
    );
  });

  process.stdout.write(`${reports.join("\n\n")}\n`);
}
