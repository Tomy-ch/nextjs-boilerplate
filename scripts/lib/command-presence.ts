import { execFileSync } from "node:child_process";

/**
 * PATH 上にコマンドが居るかだけを見る。
 *
 * @remarks
 * `--version` が非ゼロで終わる状態（初回セットアップ待ちなど）を「居ない」とは扱いません。
 * シェルの `command -v` と挙動を揃え、`ENOENT` のときだけ false を返します。居るのに
 * 「居ない」と答えると、導入済みの環境で毎回セットアップ手順を促すことになります。
 */
export function isCommandOnPath(command: string): boolean {
  try {
    execFileSync(command, ["--version"], { stdio: "ignore" });

    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ENOENT";
  }
}
