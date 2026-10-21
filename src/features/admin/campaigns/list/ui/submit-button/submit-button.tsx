"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/design-system/action/button/button";

/**
 * 配布の停止を送る操作。
 *
 * @remarks
 * `form` の子として切り出すのは、`useFormStatus` が親の `form` の送信状態を読むためです。同じ
 * component の中で読むと、自分自身の送信を観測できません。
 */
export function SuspendSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button pending={pending} pendingLabel="停止しています…" type="submit" variant="destructive">
      停止する
    </Button>
  );
}
