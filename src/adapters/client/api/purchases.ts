import {
  getPurchasesQueryDaysMax,
  getPurchasesQueryMonthRegExp,
} from "../../gen/api/endpoints.zod";

/**
 * 暦月の書式。
 *
 * @remarks
 * 契約が定めた形をそのまま出します。期間を組み立てる画面が、送る前に確かめるために参照します。
 * 書式を書き写すと、契約が変わっても古い形で弾き続けます。
 */
export const PURCHASE_MONTH_PATTERN = getPurchasesQueryMonthRegExp;

/** 直近 N 日で遡れる日数の上限。理由は {@link PURCHASE_MONTH_PATTERN} と同じ。 */
export const PURCHASE_MAX_RECENT_DAYS = getPurchasesQueryDaysMax;
