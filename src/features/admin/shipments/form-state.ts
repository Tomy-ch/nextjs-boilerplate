import type { ActionState } from "@/model/action-state";

/**
 * 発送を指示した結果。
 *
 * @remarks
 * **通った件数と、いまの状況では通らなかった件数を持ちます。** 契約の発送は購入 1 件ずつなので、
 * 組をまとめて送ると途中まで通ることがあります。1 つの成否に畳むと、通った分がそのまま見えなく
 * なります。
 */
export type ShipmentState = ActionState<{
  readonly shipped: number;
  readonly refused: number;
}>;

/** 発送の送信先。 */
export type ShipmentAction = (state: ShipmentState, formData: FormData) => Promise<ShipmentState>;

/** 対象が送られてこなかったときの文言。 */
export const SHIPMENT_TARGET_LOST_MESSAGE = "対象の注文が判りません。画面を開き直してください。";

/**
 * 1 件も通らなかったときの文言。
 *
 * @remarks
 * カタログの既定文言は分類だけを伝えるもので、拒まれた理由が「読み込んでからの間に注文が進んだ」
 * ことであるのは、この画面でしか言えません。
 */
export const SHIPMENT_CONFLICT_MESSAGE =
  "いまの状況では発送できません。読み込んでからの間に注文が進んだか、すでに発送済みです。";
