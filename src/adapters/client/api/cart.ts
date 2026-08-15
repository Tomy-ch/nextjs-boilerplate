import { putCartsMeItemBodyQuantityMax } from "../../gen/api/endpoints.zod";

/**
 * 1 つの明細に指定できる数量の上限。
 *
 * @remarks
 * 契約が定めた値をそのまま出します。数を書き写すと、契約が動いたときに古い上限で頭打ちになり、
 * 押せるのに通らない操作が画面に残ります。
 *
 * これは在庫の上限ではありません。在庫が足りるかどうかは明細の `issues` として返ります。
 */
export const CART_ITEM_MAX_QUANTITY = putCartsMeItemBodyQuantityMax;
