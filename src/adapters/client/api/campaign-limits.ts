/**
 * キャンペーンコードの、正規化した後の最短の文字数。
 *
 * @remarks
 * **契約は文章でしか宣言していません**（`CampaignsPostRequest.code` の description）。生成物に
 * 突き合わせる先が無いため、ここで宣言します。契約の文章が変わってもこの値は追従しないので、
 * 取り込みのたびに description と見比べます。
 */
export const CAMPAIGN_CODE_MIN_LENGTH = 8;

/** キャンペーンコードの、正規化した後の最長の文字数。宣言の扱いは {@link CAMPAIGN_CODE_MIN_LENGTH} と同じ。 */
export const CAMPAIGN_CODE_MAX_LENGTH = 32;

/** キャンペーンコードが取れる文字。英数字とハイフン。宣言の扱いは {@link CAMPAIGN_CODE_MIN_LENGTH} と同じ。 */
export const CAMPAIGN_CODE_PATTERN = /^[0-9A-Za-z-]+$/;

/**
 * 総枚数上限と 1 人あたり上限が取れる最小の数。
 *
 * @remarks
 * 生成スキーマは整数であることしか宣言していません。下限は description の文章にあるだけなので、
 * ここで宣言します。
 */
export const CAMPAIGN_LIMIT_MIN = 1;
