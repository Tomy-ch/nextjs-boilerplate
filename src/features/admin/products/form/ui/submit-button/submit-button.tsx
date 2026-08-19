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
 */
export function ProductSubmitButton({ blocked, label, pendingLabel }: ProductSubmitButtonProps) {
  const { pending } = useFormStatus();
  const caption = pending ? pendingLabel : label;

  return (
    <Button disabled={pending || blocked} type="submit">
      {caption}
    </Button>
  );
}
