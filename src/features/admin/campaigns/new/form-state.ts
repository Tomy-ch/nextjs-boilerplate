import type { ActionState } from "@/model/action-state";

import type { CouponDiscountField } from "../../coupon-discount";
import type { CouponScopeField } from "./coupon-scope";

/** キャンペーン自身の入力欄のうち、入力した人が直せる項目。 */
export type CampaignOwnField =
  | "code"
  | "startsAt"
  | "endsAt"
  | "couponExpiresAt"
  | "usableFrom"
  | "totalLimit"
  | "perUserLimit"
  | "minPurchaseAmount";

/** キャンペーン自身の入力欄の項目の一覧。 */
export const CAMPAIGN_OWN_FIELDS = [
  "code",
  "startsAt",
  "endsAt",
  "couponExpiresAt",
  "usableFrom",
  "totalLimit",
  "perUserLimit",
  "minPurchaseAmount",
] as const satisfies readonly CampaignOwnField[];

/** キャンペーンの定義の送信のうち、入力した人が直せる項目。 */
export type CreateCampaignField = CampaignOwnField | CouponDiscountField | CouponScopeField;

/** キャンペーンの定義の送信の結果。成立すると一覧へ移るため、成功値を持たない。 */
export type CreateCampaignState = ActionState<never, CreateCampaignField>;

/** キャンペーンを定義する送信先。 */
export type CreateCampaignAction = (
  state: CreateCampaignState,
  formData: FormData,
) => Promise<CreateCampaignState>;

/**
 * 入力欄の項目名。接続先に弾かれた項目を、項目名を主語にして伝えるために使う。
 *
 * @remarks
 * 接続先が名指しできるのはキャンペーン自身の欄だけです。値引きと範囲は入れ子の欄で、名指しの
 * 綴りが契約に宣言されていないため、ここには持ちません。
 */
export const CAMPAIGN_FIELD_LABELS: Readonly<Record<CampaignOwnField, string>> = {
  code: "キャンペーンコード",
  startsAt: "配布開始",
  endsAt: "配布終了",
  couponExpiresAt: "クーポンの有効期限",
  usableFrom: "クーポンの利用開始",
  totalLimit: "総枚数の上限",
  perUserLimit: "1 人あたりの上限",
  minPurchaseAmount: "最低購入額",
};

/** 冪等キーか確認の合図が送られてこなかったときの文言。 */
export const CAMPAIGN_TARGET_LOST_MESSAGE =
  "送信の内容が揃っていません。画面を開き直してから、もう一度お試しください。";

/**
 * コードが既に使われていて拒まれたときの文言。
 *
 * @remarks
 * 冪等キーを初めて載せた送信への 409 にだけ使います。そのキーの送信が先に走っていないので、
 * 409 はコードの重複に限られます。
 */
export const CAMPAIGN_CODE_CONFLICT_MESSAGE =
  "このキャンペーンコードは既に使われています。別のコードを入力してください。";

/**
 * 結果が分からないまま送り直した送信が、409 で拒まれたときの文言。
 *
 * @remarks
 * 接続先は、同じ冪等キーの送信がまだ処理中のときもコードの重複と同じ 409 を返し、契約からは
 * 区別がつきません。前回の送信が成立している場合があるため、別のコードで送り直させません。
 */
export const CAMPAIGN_RESEND_CONFLICT_MESSAGE =
  "前回の定義がまだ処理中か、このキャンペーンコードが既に使われています。しばらくしてから同じ内容でもう一度定義するか、一覧で定義されたかを確かめてください。";
