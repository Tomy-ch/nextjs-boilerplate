import { z } from "zod";

import { type RawSearchParams, singleValue } from "@/model/search-params";

import { type AdminUserListLocation, FIRST_PAGE, USER_LIST_KEY, USER_SCOPE } from "./query";

/**
 * URL を読む側。**組む側（[`query.ts`](query.ts)）と分けてある。**
 *
 * @remarks
 * 読むのは画面を組み立てる地点だけで、組むのは選択欄やページ送りといった client の部品です。
 * 同じ module に置くと、スキーマを組み立てる module 直下の式が tree-shaking を妨げ、**検証
 * ライブラリごと client の束に載ります**（[0101](../../../../docs/adr/0101-performance-budget.md)）。
 * 境界を強制しているのは束であって、読みやすさではありません。
 */

/** 範囲を読むスキーマ。宣言に無い名前は既定へ倒す。 */
const scopeSchema = singleValue(z.enum(USER_SCOPE)).catch(USER_SCOPE.ALL);

/**
 * ページ番号を読むスキーマを、契約が許す上限つきで組む。
 *
 * @remarks
 * 上限は契約が決めるため、外から受け取ります（`adapters` が公開する）。ここで数字を持つと、契約を
 * 再生成しても画面側だけが古い範囲のまま残ります。**下限だけを見ると、上限を超えたページ番号が
 * そのまま取得へ渡り、一覧の代わりにエラー面が出ます。**
 */
function pageSchema(pageMax: number) {
  return singleValue(z.coerce.number().int().min(FIRST_PAGE).max(pageMax)).catch(FIRST_PAGE);
}

/**
 * 素の `searchParams` を、いま見ている場所として読む。
 *
 * @remarks
 * **URL は利用者が直接編集できます。** 読めない範囲・読めないページ番号は既定へ倒します。契約が
 * 拒む値をそのまま送っても得られるのは `400` だけで、押した人にできることがありません。
 *
 * 判定はスキーマが持ちます（`docs/rules.md` #42）。手で条件を並べると、契約が宣言している制約の
 * どれを見ていないのかが読み取れません。
 *
 * @param pageMax - 契約が許すページ番号の上限
 */
export function toAdminUserListLocation(
  params: RawSearchParams,
  pageMax: number,
): AdminUserListLocation {
  return {
    scope: scopeSchema.parse(params[USER_LIST_KEY.SCOPE]),
    page: pageSchema(pageMax).parse(params[USER_LIST_KEY.PAGE]),
  };
}
