import type { ActionState } from "@/model/action-state";

import type { DevSessionField } from "./parse-session-form";

/**
 * session を発行した結果。
 *
 * @remarks
 * 成功値を持ちません。成立したら戻り先へ送るため、成功した状態がこの画面に現れないためです。
 */
export type DevSessionFormState = ActionState<void, DevSessionField>;

/**
 * session を捨てた結果。
 *
 * @remarks
 * 捨てた結果は、同じ画面が出し直す「いまの session」に現れます。
 */
export type DiscardSessionFormState = ActionState<void>;

/**
 * 発行の送信先。
 *
 * @remarks
 * **この画面は送信先を自分で決めません。** session の封緘は `adapters/server/auth` の領分で、
 * そこへ触れてよいのは app 層です（`architecture.ts` の `adapters-auth`）。したがって送信先は
 * route が渡します。
 */
export type IssueDevSessionAction = (
  state: DevSessionFormState,
  formData: FormData,
) => Promise<DevSessionFormState>;

/** 破棄の送信先。渡される理由は {@link IssueDevSessionAction} と同じ。 */
export type DiscardDevSessionAction = (
  state: DiscardSessionFormState,
  formData: FormData,
) => Promise<DiscardSessionFormState>;
