// composite action の定義ファイルの列挙。`.github/actions/**` を走査する検査が複数あり、
// 対象の決め方（走査するディレクトリ・定義ファイル名・入れ子の扱い）はそのすべてで同一で
// なければならないため、ここが唯一の正となる。
import fs from "node:fs";
import path from "node:path";

export const COMPOSITE_ACTION_DIR = ".github/actions";
const ACTION_FILENAMES = ["action.yml", "action.yaml"];

// composite action は `uses: ./.github/actions/<group>/<name>` のように入れ子に置けるため
// 走査は再帰する。1 階層で打ち切ると入れ子の定義が検査されないまま通る。
export function collectActionDefinitions(dir: string, out: string[]): void {
  for (const entry of readDirOrEmpty(dir)) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectActionDefinitions(target, out);
    } else if (entry.isFile() && ACTION_FILENAMES.includes(entry.name)) {
      out.push(target);
    }
  }
}

// ディレクトリ不在は空として扱う（composite action を持たないリポジトリがあるため）。
// それ以外の読み取り失敗は握り潰さず呼び出し元へ投げる。
export function readDirOrEmpty(dir: string): fs.Dirent[] {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
}
