"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/design-system/action/button/button";

/** {@link ProfileSubmitButton} の props。 */
export type ProfileSubmitButtonProps = {
  /** 押せるときの文言。 */
  readonly label: string;
  /** 送信中の文言。 */
  readonly pendingLabel: string;
};

/**
 * 登録情報を送る操作。
 *
 * @remarks
 * `form` の子として切り出すのは、`useFormStatus` が親の `form` の送信状態を読むためです。同じ
 * component の中で読むと、自分自身の送信を観測できません。
 *
 * 送信中の見せ方は `Button` が持ちます。文言を差し替えると幅が動くため、ここでは待っている
 * あいだの名前を渡すだけです。
 */
export function ProfileSubmitButton({ label, pendingLabel }: ProfileSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button pending={pending} pendingLabel={pendingLabel} type="submit">
      {label}
    </Button>
  );
}
