"use client";

import {
  createContext,
  type ReactNode,
  useActionState,
  useContext,
  useMemo,
  useState,
} from "react";

import { idleActionState } from "@/model/action-state";
import type { CouponId } from "@/model/coupon/coupon";
import { placeOrderAction } from "../../../actions";
import { COUPON_ID_FIELD } from "../../../form-fields";
import type { PlaceOrderFormState } from "../../../form-state";

/** 確定の送信 1 つぶん。この画面のどの姿から送っても同じものを指す。 */
export type PlaceOrderState = {
  /** form へ渡す送信先。 */
  readonly formAction: (payload: FormData) => void;
  /** 直近の送信が返した結果。 */
  readonly state: PlaceOrderFormState;
  /** 送信の応答を待っているか。 */
  readonly isPending: boolean;
  /** この画面の確定 1 回ぶんを表す鍵。 */
  readonly idempotencyKey: string;
  /** 確定に載せるクーポン。使わなければ null。 */
  readonly couponId: CouponId | null;
  /** 確定に載せるクーポンを選び直す。 */
  readonly selectCoupon: (couponId: CouponId | null) => void;
  /** 直近の送信がクーポンについて返した文言。選び直した後は消える。 */
  readonly couponErrors: readonly string[] | undefined;
};

const PlaceOrderStateContext = createContext<PlaceOrderState | null>(null);

/** {@link PlaceOrderStateProvider} の props。 */
export type PlaceOrderStateProviderProps = {
  /** 画面を組み立てた地点が作った鍵。 */
  idempotencyKey: string;
  /** いま選べるクーポン。読めなかったときも空として渡す。 */
  couponIds: readonly CouponId[];
  /** 内側に描く木。 */
  children: ReactNode;
};

/**
 * 確定の送信状態を、画面に 1 つだけ置く。
 *
 * @remarks
 * **同じ集計を 2 か所に描くため**です（脇に貼り付く姿と、下端に固定する帯）。器の出し分けは CSS で
 * 行うので **DOM には両方が residing しています**。それぞれが自分の送信状態を持つと、狭い幅で送って
 * 待っている最中に `lg` の境界を跨いだとき、表に出る側は何も送っていない姿になり、**送信中の表示も
 * 失敗の文言も消えます**。
 *
 * 待っているかを `useFormStatus` ではなく `useActionState` から採るのはこのためです。`useFormStatus`
 * は自分が属する `form` しか見ないので、共有できるのは送信の状態そのものを持つ側だけです。
 *
 * 鍵は最初に受け取ったものを使い続けます（理由は `model/idempotency-key.ts`）。
 *
 * **選んだクーポンも同じ理由でここに置きます。** 確定は脇・下端の帯・金額の確かめの dialog の
 * どこからでも送られ、どこから送っても同じ選択が載らなければなりません。
 *
 * **候補から消えたクーポンは選んでいないものとして扱います。** 確定が拒まれると候補は取り直され、
 * 拒まれたクーポンはそこに並びません。選んだ値を持ち続けると、見えない選択が次の送信に載ります。
 *
 * @param props - {@link PlaceOrderStateProviderProps}。
 */
export function PlaceOrderStateProvider({
  idempotencyKey: initialIdempotencyKey,
  couponIds,
  children,
}: PlaceOrderStateProviderProps) {
  const [idempotencyKey] = useState(initialIdempotencyKey);
  const [state, formAction, isPending] = useActionState<PlaceOrderFormState, FormData>(
    placeOrderAction,
    idleActionState(),
  );
  const [selected, setSelected] = useState<CouponId | null>(null);
  const [answeredState, setAnsweredState] = useState<PlaceOrderFormState | null>(null);

  const couponId = selected !== null && couponIds.includes(selected) ? selected : null;
  const couponErrors =
    state.status === "error" && state !== answeredState
      ? state.fieldErrors?.[COUPON_ID_FIELD]
      : undefined;

  const value = useMemo(
    () => ({
      formAction,
      state,
      isPending,
      idempotencyKey,
      couponId,
      selectCoupon: (next: CouponId | null) => {
        setSelected(next);
        setAnsweredState(state);
      },
      couponErrors,
    }),
    [formAction, state, isPending, idempotencyKey, couponId, couponErrors],
  );

  return (
    <PlaceOrderStateContext.Provider value={value}>{children}</PlaceOrderStateContext.Provider>
  );
}

/**
 * 確定の送信状態を読む。
 *
 * @remarks
 * {@link PlaceOrderStateProvider} の外では使えません。器の外で送信の姿を描くと、画面に送信状態が
 * 2 つある状態へ戻ります。
 *
 * @throws 器の外で呼ばれたとき
 *
 * @returns 確定の送信状態。
 */
export function usePlaceOrderState(): PlaceOrderState {
  const found = useContext(PlaceOrderStateContext);

  if (found === null) {
    throw new Error("PlaceOrderStateProvider の外で確定の送信状態を読もうとしました");
  }

  return found;
}
