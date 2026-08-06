const COMPLETE_STEPPER_STATE = "complete";
const CURRENT_STEPPER_STATE = "current";
const UPCOMING_STEPPER_STATE = "upcoming";

/**
 * 段階が今どの位置にあるか。
 *
 * - `complete`: 通過済み
 * - `current`: 現在地。`ol` の中で 1 つだけにする
 * - `upcoming`: まだ到達していない
 *
 * 色と印だけでは支援技術へ伝わらないため、`Stepper` は各段階へ読み上げ用の語も添える。
 *
 * @see Storybook `Display/Stepper`
 */
export const STEPPER_STATE: Readonly<{
  COMPLETE: "complete";
  CURRENT: "current";
  UPCOMING: "upcoming";
}> = {
  COMPLETE: COMPLETE_STEPPER_STATE,
  CURRENT: CURRENT_STEPPER_STATE,
  UPCOMING: UPCOMING_STEPPER_STATE,
};

/** {@link STEPPER_STATE} のいずれか。 */
export type StepperState = (typeof STEPPER_STATE)[keyof typeof STEPPER_STATE];

/** 段階の状態を読み上げへ伝える語。印と色だけでは区別できないため、文言としても示す。 */
export const STEPPER_STATE_LABEL: Readonly<Record<StepperState, string>> = {
  [STEPPER_STATE.COMPLETE]: "完了",
  [STEPPER_STATE.CURRENT]: "現在の段階",
  [STEPPER_STATE.UPCOMING]: "未着手",
};
