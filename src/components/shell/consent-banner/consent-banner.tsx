"use client";

import Link from "next/link";
import { Dialog as DialogPrimitive } from "radix-ui";

import { Button } from "@/components/design-system/action/button/button";
import { BUTTON_VARIANT } from "@/components/design-system/action/button/button.definition";
import { CONSENT_CHOICE, type ConsentChoice } from "@/model/consent";
import { CONSENT_BANNER_COPY } from "./consent-banner.definition";

/** `ConsentBanner` の props。 */
export type ConsentBannerProps = {
  /** 尋ねている最中か。閉じている間は何も描かない。 */
  open: boolean;
  /** どちらかが選ばれたときに、その意思を受け取る callback。 */
  onDecide: (choice: ConsentChoice) => void;
  /** 判断の材料を示す文書の行き先。省略すると導線を出さない。 */
  policyHref?: string;
};

/**
 * 任意の用途に cookie を使ってよいかを、選び終えるまで尋ね続ける面。
 *
 * @remarks
 * **同意状態を持ちません。** いま尋ねているかどうかは `open` で渡され、選ばれた意思は
 * `onDecide` で呼び出し元へ返ります。判定と保存は供給側が持ちます
 * （[0031](../../../../docs/adr/0031-policy-state-supply.md)）。
 *
 * **閉じる手段を置きません。** Escape も、面の外を押す操作も、右上の × も受け付けません。
 * 選ばずに閉じられると「尋ねたが選ばれていない」状態が残り、次の描画でまた出ます。閉じる操作は
 * 選ぶことだけです。
 *
 * **背面を操作させません。** 選び終えるまで focus は面の中を回り、支援技術からも背面が読めなく
 * なります。焦点だけを閉じ込めて見た目の背面を開けておくと、見えている人と読み上げる人で操作
 * できる範囲が食い違います。
 *
 * **2 つの選択肢を同じ重さで並べます。** 拒否だけを目立たない見た目にすると、同意が自由に
 * 与えられたものではなくなります。
 *
 * @param props.open - 尋ねている最中か
 * @param props.onDecide - 選ばれた意思を受け取る callback
 * @param props.policyHref - 判断の材料を示す文書の行き先
 *
 * @see Storybook `Feedback/ConsentBanner`
 */
export function ConsentBanner({ open, onDecide, policyHref }: ConsentBannerProps) {
  return (
    <DialogPrimitive.Root modal open={open}>
      <DialogPrimitive.Overlay
        className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0"
        data-slot="consent-banner-overlay"
      />
      <DialogPrimitive.Content
        // Radix は背面へ `aria-hidden` を立てるだけで、この属性を出さない。標準の属性で modal だと
        // 名乗れないと、`aria-modal` を目印にしている部品（`pull-to-refresh`）から見えなくなる。
        aria-modal
        className="fixed inset-x-0 bottom-0 z-50 border-border border-t bg-background p-6 text-foreground shadow-lg data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-4"
        data-slot="consent-banner"
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <DialogPrimitive.Title className="font-semibold text-base">
              {CONSENT_BANNER_COPY.title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-muted-foreground text-sm">
              {CONSENT_BANNER_COPY.description}
              {policyHref ? (
                <>
                  {" "}
                  <Link
                    className="underline underline-offset-4 hover:text-foreground"
                    href={policyHref}
                  >
                    {CONSENT_BANNER_COPY.policy}
                  </Link>
                </>
              ) : null}
            </DialogPrimitive.Description>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <Button
              onClick={() => onDecide(CONSENT_CHOICE.denied)}
              variant={BUTTON_VARIANT.OUTLINE}
            >
              {CONSENT_BANNER_COPY.reject}
            </Button>
            <Button onClick={() => onDecide(CONSENT_CHOICE.granted)}>
              {CONSENT_BANNER_COPY.accept}
            </Button>
          </div>
        </div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Root>
  );
}
