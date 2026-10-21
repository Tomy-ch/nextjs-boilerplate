import { z } from "zod";

import { type RawSearchParams, repeatedValues, singleValue } from "@/model/search-params";

import {
  type AdminProductListLocation,
  CURSOR_KEY,
  DISCONTINUED_FILTER,
  FILTER_KEY,
  TRAIL_KEY,
} from "./query";

/**
 * URL を読む側。**組む側（[`query.ts`](query.ts)）と分けてある。**
 *
 * @remarks
 * 読むのは画面を組み立てる地点だけで、組むのは絞り込みの入力欄といった client の部品です。
 */

/** 1 つしか受け取らない条件。読めなければ未指定（空文字）として扱う。 */
const textSchema = singleValue(z.string()).catch("");

/**
 * 複数を選べる条件。
 *
 * @remarks
 * **重複を畳みます。** 契約は重複の無い並びとして宣言しており、同じ値が 2 度届くのは URL を直接
 * 編集したときで、指している条件は 1 度のときと同じです。畳まないと、意味の同じ条件が契約を外れた
 * 要求として backend まで届きます。並び順は最初に現れた位置を保ちます。
 */
const codesSchema = repeatedValues(
  z.array(z.string()).transform((values): readonly string[] => [...new Set(values)]),
).catch([]);

/**
 * 通ってきたページの起点。
 *
 * @remarks
 * **重複を畳みません。** 並びの長さがそのまま戻れる段数で、`toPreviousPageHref` が末尾から 1 つずつ
 * 取り出します。同じ起点が 2 度並ぶのは 2 段ぶんであり、畳むと戻れる回数が変わります。
 */
const cursorsSchema = repeatedValues(z.array(z.string())).catch([]);

/**
 * 廃番で絞り込む条件。
 *
 * @remarks
 * 読めた綴りだけを条件として持ちます。読めない綴りは {@link readDiscontinuedSpelling} が取り出し、
 * 取得の口の検証へ回します。
 */
const discontinuedSchema = singleValue(
  z.enum([DISCONTINUED_FILTER.ONLY, DISCONTINUED_FILTER.EXCLUDED]).nullable(),
).catch(null);

/**
 * 廃番の条件として届いた綴りを、読めるかどうかに関わらず取り出す。
 *
 * @remarks
 * **読めない綴りを未指定へ倒しません。** 取得の口の検証へそのまま渡し、写せなかった条件として
 * 一覧の代わりに伝えます。倒すと、絞り込んだつもりの人に絞り込んでいない一覧が出ます。
 *
 * @param params - 生の searchParams
 * @returns 届いた綴り。届いていなければ null
 */
export function readDiscontinuedSpelling(params: RawSearchParams): string | null {
  const spelling = textSchema.parse(params[FILTER_KEY.DISCONTINUED]);

  return spelling === "" ? null : spelling;
}

/**
 * 素の `searchParams` を、いま見ている場所として読む。
 *
 * @remarks
 * **URL は利用者が直接編集できます。** 起点が消えているのに通ってきた道だけが残った URL も届き得る
 * ため、先頭ページでは道を捨てます。捨てないと、先頭ページで「前へ」が押せる状態になります。
 *
 * 1 つしか受け取らない条件が繰り返されていたら未指定として扱い、複数を選べる条件だけが並びのまま残ります。
 *
 * @param params - 生の searchParams
 * @returns いま見ている場所
 */
export function toAdminProductListLocation(params: RawSearchParams): AdminProductListLocation {
  const cursor = textSchema.parse(params[CURSOR_KEY]);

  return {
    keyword: textSchema.parse(params[FILTER_KEY.KEYWORD]),
    categoryCodes: codesSchema.parse(params[FILTER_KEY.CATEGORY]),
    statusCodes: codesSchema.parse(params[FILTER_KEY.STATUS]),
    discontinued: discontinuedSchema.parse(params[FILTER_KEY.DISCONTINUED]),
    cursor: cursor === "" ? null : cursor,
    trail: cursor === "" ? [] : cursorsSchema.parse(params[TRAIL_KEY]),
  };
}
