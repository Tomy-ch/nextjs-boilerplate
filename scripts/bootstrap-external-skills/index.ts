#!/usr/bin/env node

// 本リポジトリが前提にする外部スキルを導入する。冪等かつ非対話で、再実行は上書き。
//
// 実行: pnpm exec tsx scripts/bootstrap-external-skills
import { execFileSync } from "node:child_process";
import fs from "node:fs";

import { isCommandOnPath } from "../lib/command-presence.js";
import { errorMessage } from "../lib/error-message.js";
import { externalSkills } from "./skills.js";

function main(): void {
  const skills = externalSkills();
  const missing = [...new Set(skills.map((skill) => skill.command))].filter(
    (command) => !isCommandOnPath(command),
  );

  if (missing.length > 0) {
    console.error(`✘ bootstrap-external-skills: PATH に見つかりません: ${missing.join(", ")}`);
    console.error(
      "    対処: make install-tools を実行し、シェルで mise activate を済ませてください。",
    );
    process.exit(1);
  }

  for (const skill of skills) {
    // マーカー（`.graphify_version`）を見て skip する冪等化は採らない。install が成功すると
    // ディスク上にある全プラットフォーム分のマーカーが一括で書き換わるため、マーカーの一致は
    // スキル本体が更新された証明にならない。上書きは安価だが、古いスキルが残るのは安価ではない。
    console.log(`→ 導入: ${skill.label}`);
    execFileSync(skill.command, [...skill.args], { stdio: "inherit" });
  }

  let failed = false;

  for (const skill of skills) {
    const landed = fs.existsSync(skill.landing) && fs.statSync(skill.landing).size > 0;

    if (landed) {
      console.log(`✔ 解決: ${skill.label} (${skill.landing})`);
    } else {
      console.error(
        `✘ bootstrap-external-skills: 導入後も ${skill.label} が ${skill.landing} に居ません`,
      );
      failed = true;
    }
  }

  if (failed) {
    process.exit(1);
  }

  console.log("完了。導入したスキルは次のセッションから読み込まれます。");
}

try {
  main();
} catch (error) {
  // 子プロセスが非 0 で終わった場合はその終了コードをそのまま伝播させる。
  // それ以外の想定外エラーだけを 2 に丸める（bootstrap-plugins と同じ）。
  const status = (error as { status?: unknown }).status;

  if (typeof status === "number" && status !== 0) {
    console.error(`✘ bootstrap-external-skills: 外部コマンドが失敗しました (exit ${status})`);
    process.exit(status);
  }

  console.error(`✘ bootstrap-external-skills: 想定外のエラー\n    ${errorMessage(error)}`);
  process.exit(2);
}
