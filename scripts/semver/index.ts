#!/usr/bin/env node

// 版の読み取りと進め方の入口。
//
//   latest                          手元のタグから最新のリリースタグを出す
//   <version> <patch|minor|major>   渡した版を 1 段進めて出す
import { execFileSync } from "node:child_process";

import { bumpVersion, isBumpType, normalizeVersion } from "./bump.js";
import { selectLatestVersion } from "./latest.js";

function main(): void {
  const [version, type] = process.argv.slice(2);

  if (version === "latest") {
    printLatest();

    return;
  }

  if (version === undefined || type === undefined) {
    console.error("usage: semver latest | semver <version> <patch|minor|major>");
    process.exit(1);
  }

  if (!isBumpType(type)) {
    console.error("type must be patch | minor | major");
    process.exit(1);
  }

  const normalized = normalizeVersion(version);

  if (normalized === null) {
    console.error("version must be in the format X.Y.Z or vX.Y.Z");
    process.exit(1);
  }

  console.log(bumpVersion(normalized, type));
}

/**
 * 手元のタグから最新のリリースタグを出す。1 本も無ければ何も出さない。
 *
 * 呼び出し側は空の出力を「まだ 1 本も打っていない」として読む。取り込みはここでは行わない
 * ——「いつ取り込むか」は呼び出し側の手順の一部で、ここが勝手に走らせると取り込みの向きが
 * 見えなくなる。
 */
function printLatest(): void {
  const latest = selectLatestVersion(
    execFileSync("git", ["tag"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split("\n"),
  );

  if (latest !== null) {
    console.log(latest);
  }
}

main();
