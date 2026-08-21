"use client";

import { createContext, type ReactNode, useActionState, useContext, useState } from "react";

import { idleActionState } from "@/model/action-state";
import { placeOrderAction } from "../../../actions";
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
};

const PlaceOrderStateContext = createContext<PlaceOrderState | null>(null);

/** `PlaceOrderStateProvider` の props。 */
export type PlaceOrderStateProviderProps = {
  /** 画面を組み立てた地点が作った鍵。 */
  idempotencyKey: string;
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
 */
export function PlaceOrderStateProvider({
  idempotencyKey: initialIdempotencyKey,
  children,
}: PlaceOrderStateProviderProps) {
  const [idempotencyKey] = useState(initialIdempotencyKey);
  const [state, formAction, isPending] = useActionState<PlaceOrderFormState, FormData>(
    placeOrderAction,
    idleActionState(),
  );

  return (
    <PlaceOrderStateContext.Provider value={{ formAction, state, isPending, idempotencyKey }}>
      {children}
    </PlaceOrderStateContext.Provider>
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
 */
export function usePlaceOrderState(): PlaceOrderState {
  const found = useContext(PlaceOrderStateContext);

  if (found === null) {
    throw new Error("PlaceOrderStateProvider の外で確定の送信状態を読もうとしました");
  }

  return found;
}
