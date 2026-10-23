// 書き換えずに止めるべき状態の判定。入口（index.ts）はここが返した文を出し、1 件でもあれば
// exit 1 にする。
import type { EgressReport } from "./apply-check.js";
import { DECLARATION_FILE } from "./declaration.js";

/**
 * 宣言と workflow の食い違いのうち、apply でも直らないもの。
 *
 * @param report - 全 workflow を走査した結果
 * @param orphans - 対応する workflow が無い宣言のキー
 * @param unknownSudo - 対応する job が無い sudo の例外（`<workflow>/<job>`）
 * @returns 人へ見せる文。空なら止める理由は無い
 *
 * @remarks
 * `drifted` は含めません。あれは apply で直る食い違いで、check だけが落とします。
 */
export function failures(
  report: Pick<EgressReport, "malformed" | "missing">,
  orphans: readonly string[],
  unknownSudo: readonly string[],
): string[] {
  return [
    ...report.malformed.map((at) => `❌ ${at}: bullfrog の形が想定と違うため書き換えられません。`),
    ...report.missing.map((job) => `❌ ${job}: bullfrog の step を持たない job です。`),
    ...orphans.map((key) => `❌ ${DECLARATION_FILE}: ${key} に対応する workflow がありません。`),
    ...unknownSudo.map((key) => `❌ ${DECLARATION_FILE}: sudo の ${key} に合う job がありません。`),
  ];
}
