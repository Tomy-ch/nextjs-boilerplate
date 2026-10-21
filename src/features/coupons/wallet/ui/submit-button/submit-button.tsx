"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/design-system/action/button/button";

const LABEL = "受け取る";

const PENDING_LABEL = "受け取っています";

/**
 * 受け取りを送る操作。
 *
 * @remarks
 * `form` の子として切り出すのは、`useFormStatus` が親の `form` の送信状態を読むためです。同じ
 * component の中で読むと、自分自身の送信を観測できません。
 */
export function ClaimSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button pending={pending} pendingLabel={PENDING_LABEL} type="submit">
      {LABEL}
    </Button>
  );
}
