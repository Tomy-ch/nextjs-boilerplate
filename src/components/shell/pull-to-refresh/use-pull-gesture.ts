"use client";

import { useEffect, useRef, useState } from "react";

import {
  MAX_DISTANCE,
  PULL_STATE,
  type PullState,
  RESISTANCE,
  TRIGGER_DISTANCE,
} from "./pull-to-refresh.definition";

/** 引ける環境かどうかの判定。touch を持たない環境では出す意味が無い。 */
const COARSE_POINTER = "(pointer: coarse)";

/** 引っ張りの観測結果。 */
export type PullGesture = {
  /** この環境で引っ張り操作を受け付けるか。**サーバでは常に false**。 */
  readonly enabled: boolean;
  /** いまの段階。取り直し中かどうかは呼び出し元が持つ。 */
  readonly state: PullState;
  /** 引かれている量（px）。目印の移動量に使う。 */
  readonly distance: number;
};

/**
 * 画面の上端から引き下げる操作を観測する。
 *
 * @remarks
 * この器の中だけで使うため、`components` の内側に置いています。複数の feature から使う browser
 * 能力になった時点で `capabilities` へ上げます（[0021](../../../../docs/adr/0021-frontend-responsibility.md)
 * の昇格ルール）。いまの利用者は器 1 つなので、その基準を満たしません。
 *
 * **ブラウザ既定の引き下げ更新を、この観測が生きている間だけ止めます。** 静的な CSS へ
 * `overscroll-behavior` を書くと、この機構を載せていないページでも既定が消え、引いても何も
 * 起きない状態が残ります。要素の生存期間に紐付けて付け外しします。
 *
 * サーバでは `enabled` が false になり、何も描かれません。引くまで見えるものが無いので、
 * hydration の前後で配置は動きません（[rendering.md](../../../../docs/design/rendering.md)）。
 *
 * 引き量に抵抗を掛け、上限を設けています。等倍かつ無制限だと、指を少し動かしただけで実行の域に
 * 入り、引き続けるほど画面がずれ続けます。
 *
 * 監視は passive で登録します。`preventDefault` に頼らず `overscroll-behavior` で既定を止めて
 * いるため、scroll を止める必要がありません。
 *
 * modal が開いている間は拾いません。判定に `aria-modal` を使うのは、これが実装によらず立つ
 * 標準の属性だからです（[0010](../../../../docs/adr/0010-standards-and-non-lockin.md)）。特定の
 * overlay ライブラリが付ける印を見ると、部品を差し替えたときに黙って効かなくなります。
 *
 * @param onRelease - 実行の域まで引いた状態で指を離したときに呼ばれる
 */
export function usePullGesture(onRelease: () => void): PullGesture {
  const [enabled, setEnabled] = useState(false);
  const [state, setState] = useState<PullState>(PULL_STATE.IDLE);
  const [distance, setDistance] = useState(0);
  const originRef = useRef<number | null>(null);
  const distanceRef = useRef(0);
  const releaseRef = useRef(onRelease);

  useEffect(() => {
    releaseRef.current = onRelease;
  }, [onRelease]);

  useEffect(() => {
    const query = window.matchMedia(COARSE_POINTER);
    const sync = () => setEnabled(query.matches);

    sync();
    query.addEventListener("change", sync);

    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const root = document.documentElement;
    const previous = root.style.overscrollBehaviorY;

    root.style.overscrollBehaviorY = "contain";

    return () => {
      root.style.overscrollBehaviorY = previous;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const start = (event: TouchEvent) => {
      // 上端にいないときは通常の scroll。ここで拾うと途中から引き戻す操作を奪う。
      // modal が開いている間も拾わない。背面の取り直しは利用者が求めた操作ではない。
      const blocked = window.scrollY > 0 || document.querySelector('[aria-modal="true"]') !== null;

      originRef.current = blocked ? null : (event.touches[0]?.clientY ?? null);
    };

    const move = (event: TouchEvent) => {
      const origin = originRef.current;
      const current = event.touches[0]?.clientY;

      if (origin === null || current === undefined) {
        return;
      }

      const pulled = Math.max(Math.min((current - origin) * RESISTANCE, MAX_DISTANCE), 0);

      distanceRef.current = pulled;
      setDistance(pulled);

      if (pulled >= TRIGGER_DISTANCE) {
        setState(PULL_STATE.READY);
      } else if (pulled > 0) {
        setState(PULL_STATE.PULLING);
      } else {
        setState(PULL_STATE.IDLE);
      }
    };

    const end = () => {
      const reached = distanceRef.current >= TRIGGER_DISTANCE;

      originRef.current = null;
      distanceRef.current = 0;
      setDistance(0);
      setState(PULL_STATE.IDLE);

      if (reached) {
        releaseRef.current();
      }
    };

    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", end, { passive: true });
    window.addEventListener("touchcancel", end, { passive: true });

    return () => {
      window.removeEventListener("touchstart", start);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", end);
      window.removeEventListener("touchcancel", end);
    };
  }, [enabled]);

  return { enabled, state, distance };
}
