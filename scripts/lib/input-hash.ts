// 「前に通った時点と同じ入力か」を答えるための、入力の畳み方。
//
// 重い検査を持つ側が、自分の結果を決める入力を挙げてこれに渡す。挙げる中身は検査ごとに違う
// （絵を決めるものと数値を決めるものは別物である）が、畳み方と突き合わせ方は同じなので
// ここに置く。
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * 入力に当たるファイルをリポジトリルート相対で列挙する。
 *
 * @param root - リポジトリルート
 * @param entries - 入力の起点。ファイルでもディレクトリでもよい
 * @param isInput - 列挙から外すものを決める述語。`false` を返したものは畳まれない
 * @returns 並びの決まったファイルの一覧
 *
 * @remarks
 * 起点が 1 つでも見つからなければ例外を投げます。欠けたまま算出すると、別の状態が同じ
 * ハッシュを持ち得ます。
 */
export function collectInputs(
  root: string,
  entries: readonly string[],
  isInput: (relative: string) => boolean,
): string[] {
  return entries
    .flatMap((entry) => walk(root, entry))
    .filter(isInput)
    .sort();
}

/** 列挙したファイルのパスと中身から 1 つのハッシュを作る。 */
export function inputsHash(root: string, files: readonly string[]): string {
  const digest = createHash("sha256");

  for (const file of files) {
    digest.update(file);
    digest.update(readFileSync(path.join(root, file)));
  }

  return digest.digest("hex");
}

/**
 * 記録された値と現在の値から、検査を省いてよいかを決める。
 *
 * @remarks
 * 記録は複数受け取り、1 つでも一致すれば省きます。同じ入力状態でも「基準画像を撮った時点」と
 * 「検査が通った時点」は別々に記録されるためです。
 *
 * 記録が 1 つも無いときは省きません。判定できないことを「変わっていない」と読むと、結果が
 * 変わったまま緑で通ります。
 */
export function decideGate(recorded: readonly (string | null)[], current: string): "skip" | "run" {
  return recorded.some((value) => value !== null && value.trim() === current) ? "skip" : "run";
}

function walk(root: string, entry: string): string[] {
  const absolute = path.join(root, entry);

  if (!statSync(absolute).isDirectory()) return [entry];

  return readdirSync(absolute, { recursive: true })
    .map((found) => path.join(entry, found.toString()))
    .filter((relative) => statSync(path.join(root, relative)).isFile());
}
