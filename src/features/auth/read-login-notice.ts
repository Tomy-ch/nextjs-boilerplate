import { z } from "zod";

import { type RawSearchParams, singleValue } from "@/model/search-params";

import { LOGIN_NOTICE, LOGIN_NOTICE_KEY, type LoginNotice } from "./login-notice";

/**
 * URL を読む側。**組む側（[`login-notice.ts`](login-notice.ts)）と分けてある。**
 *
 * @remarks
 * 読むのは画面を組み立てる地点だけで、組むのは行き先を返す Route Handler です。同じ module に
 * 置くと、スキーマを組み立てる module 直下の式が tree-shaking を妨げ、**語彙を参照しただけの
 * 画面が検証ライブラリごと client の束を太らせます**（[0101](../../../docs/adr/0101-performance-budget.md)）。
 */

/** 宣言に無い理由は、案内なしへ倒す。 */
const noticeSchema = singleValue(z.enum(LOGIN_NOTICE).nullable()).catch(null);

/**
 * 素の `searchParams` から、案内する理由を読む。
 *
 * @remarks
 * **知らない値は案内しません。** URL は利用者が直接編集できるため、載っている文字列を根拠に
 * 画面を変えると、任意の案内を出させる導線になります（`docs/rules.md` #42）。
 *
 * @returns 案内する理由。宣言に無い値・繰り返された値・未指定なら null
 */
export function readLoginNotice(params: RawSearchParams): LoginNotice | null {
  return noticeSchema.parse(params[LOGIN_NOTICE_KEY]);
}
