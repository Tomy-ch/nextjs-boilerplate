"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/design-system/action/button/button";

/** `ProductSubmitButton` の props。 */
export type ProductSubmitButtonProps = {
  /** 押せるときの文言。 */
  label: string;
  /** 送信中の文言。 */
  pendingLabel: string;
  /** 送信を止める理由があるか。 */
  blocked: boolean;
};

/**
 * 商品を送る操作。
 *
 * @remarks
 * `form` の子として切り出すのは、`useFormStatus` が親の `form` の送信状態を読むためです。同じ
 * component の中で読むと、自分自身の送信を観測できません。
 *
 * 送信中の見せ方は `Button` が持ちます。文言を差し替えると幅が動くため、ここでは文言を渡すだけで
 * 差し替えません。
 */
export function ProductSubmitButton({ blocked, label, pendingLabel }: ProductSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={blocked} pending={pending} pendingLabel={pendingLabel} type="submit">
      {label}
    </Button>
  );
}
