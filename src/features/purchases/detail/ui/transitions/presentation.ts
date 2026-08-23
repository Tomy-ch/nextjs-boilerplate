import type { ButtonVariant } from "@/components/design-system/action/button/button.definition";
import { BUTTON_VARIANT } from "@/components/design-system/action/button/button.definition";
import { PURCHASE_TRANSITION, type PurchaseTransition } from "../../available-transitions";

/** 遷移 1 つ分の、利用者へ見せる言葉と見た目。 */
export type TransitionPresentation = {
  readonly label: string;
  readonly pendingLabel: string;
  readonly confirmTitle: string;
  readonly confirmDescription: string;
  readonly failureTitle: string;
  readonly successTitle: string;
  readonly variant: ButtonVariant;
  readonly confirmVariant: ButtonVariant;
};

/**
 * 遷移ごとの言葉。
 *
 * @remarks
 * **開く操作と確定する操作で見た目を分けます。** 開く側は並んだ操作の中でどれを主に見せるかを表し、
 * 確定する側は起きることの重さを表します。取り消しを縁だけにするのは進む操作に前を譲るためで、
 * 戻せないことは確認の中の実行ボタンが赤で伝えます。
 */
export const PRESENTATIONS: Readonly<Record<PurchaseTransition, TransitionPresentation>> = {
  [PURCHASE_TRANSITION.PAY]: {
    label: "支払う",
    pendingLabel: "支払っています…",
    confirmTitle: "この注文を支払いますか？",
    confirmDescription:
      "この注文のお支払いを確定します。支払い方法の入力はなく、この操作だけで支払い済みになります。" +
      "確定した後も、発送されるまではキャンセルできます。",
    failureTitle: "支払えませんでした",
    successTitle: "お支払いを受け付けました",
    variant: BUTTON_VARIANT.DEFAULT,
    confirmVariant: BUTTON_VARIANT.DEFAULT,
  },
  [PURCHASE_TRANSITION.CANCEL]: {
    label: "キャンセルする",
    pendingLabel: "キャンセルしています…",
    confirmTitle: "この注文をキャンセルしますか？",
    confirmDescription:
      "この注文を取り消します。元に戻すことはできません。" +
      "取り消した商品は在庫へ戻るため、同じ内容で買うには改めて注文が必要です。",
    failureTitle: "キャンセルできませんでした",
    successTitle: "キャンセルを受け付けました",
    variant: BUTTON_VARIANT.OUTLINE,
    confirmVariant: BUTTON_VARIANT.DESTRUCTIVE,
  },
};
