// ロックファイル（tag → SHA の SSOT）の読み書き。
//
// 形式は TOML の妥当な部分集合（`"owner/repo@<tag>" = "<40hex>"` の行だけ）に限定し、
// 読み書きとも自前の正規表現で行う。パーサを入れないのは、書き出す側と読む側が同じ制約を
// 共有していれば依存なしで往復でき、想定外の TOML 構文が紛れ込む余地も同時に消えるため。
import fs from "node:fs";

export const LOCK_FILE = ".github/actions-pin.toml";

const FILE_MODE = 0o644;
const ENTRY_PATTERN = /^"([^"]+)"[ \t]*=[ \t]*"([^"]*)"$/;
const SHA_PATTERN = /^[0-9a-f]{40}$/;

const HEADER = [
  "# GitHub Actions の pin 対象 SHA（SSOT）。",
  "# make actions-pin-resolve で解決し、make actions-pin-apply で workflow へ反映する。",
];

// ロックファイルを読む。コメント行と空行以外が代入形でない、または SHA が 40 桁の 16 進で
// ない場合は例外を投げる。壊れた行を読み飛ばすと、そのエントリが未登録として扱われるか、
// 不正な値がそのまま `uses:` へ書き込まれる。
export function readLock(file: string): Map<string, string> {
  const lines = fs.readFileSync(file, "utf8").split("\n");
  const lock = new Map<string, string>();
  for (const [index, raw] of lines.entries()) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const entry = ENTRY_PATTERN.exec(line);
    if (!entry) {
      throw new Error(
        `${file}:${index + 1} 形式が不正です（"<owner>/<repo>@<tag>" = "<40hex>"）: ${raw}`,
      );
    }
    if (!SHA_PATTERN.test(entry[2])) {
      throw new Error(`${file}:${index + 1} SHA が 40 桁の 16 進ではありません: ${entry[2]}`);
    }
    // 後勝ちで上書きすると、どちらの SHA が実際に使われるかが行順に依存する。
    // マージ衝突を機械的に解消すると同一キーが 2 行残るため、現実に起こりうる破損。
    if (lock.has(entry[1])) {
      throw new Error(`${file}:${index + 1} キーが重複しています: ${entry[1]}`);
    }
    lock.set(entry[1], entry[2]);
  }
  return lock;
}

// 初回 resolve のためにファイル不在だけを空として許容する。権限エラーや壊れた行は
// 握り潰さない（既存ピンが黙って脱落すると検疫の「既存ピンを維持」が働かなくなる）。
export function readLockOrEmpty(file: string): Map<string, string> {
  try {
    return readLock(file);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return new Map();
    throw e;
  }
}

export function writeLock(file: string, lock: Map<string, string>): void {
  const entries = [...lock.keys()].sort().map((key) => `"${key}" = "${lock.get(key)}"\n`);
  fs.writeFileSync(file, `${HEADER.join("\n")}\n${entries.join("")}`, { mode: FILE_MODE });
}
