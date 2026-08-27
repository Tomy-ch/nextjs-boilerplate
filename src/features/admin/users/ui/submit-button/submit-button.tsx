"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/design-system/action/button/button";

/**
 * 退会を送る操作。
 *
 * @remarks
 * `form` の子として切り出すのは、`useFormStatus` が親の `form` の送信状態を読むためです。同じ
 * component の中で読むと、自分自身の送信を観測できません。
 */
export function WithdrawSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button pending={pending} pendingLabel="退会させています…" type="submit" variant="destructive">
      退会させる
    </Button>
  );
}
