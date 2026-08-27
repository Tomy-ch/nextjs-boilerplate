"use client";

import { AlertDialog as Primitive } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "@/components/cn";
import { Button, type ButtonProps } from "../../action/button/button";
import { useOverlayHistory } from "../use-overlay-history";

/**
 * 確認 dialog の開閉状態を提供する client island root。
 *
 * @see Storybook `Overlay/AlertDialog`
 */
export function AlertDialog({
  open,
  defaultOpen,
  onOpenChange,
  ...props
}: ComponentProps<typeof Primitive.Root>) {
  const history = useOverlayHistory({ defaultOpen, onOpenChange, open });

  return <Primitive.Root onOpenChange={history.setOpen} open={history.open} {...props} />;
}
/**
 * dialog を開く操作を包む trigger。
 *
 * @see Storybook `Overlay/AlertDialog`
 */
export const AlertDialogTrigger = Primitive.Trigger;
/**
 * dialog を document body 側へ描画する Portal。
 *
 * @see Storybook `Overlay/AlertDialog`
 */
export const AlertDialogPortal = Primitive.Portal;

/**
 * dialog の背面を覆う overlay。
 *
 * @see Storybook `Overlay/AlertDialog`
 */
export function AlertDialogOverlay({
  className,
  ...props
}: ComponentProps<typeof Primitive.Overlay>) {
  return (
    <Primitive.Overlay
      className={cn("fixed inset-0 z-50 bg-black/50", className)}
      data-slot="alert-dialog-overlay"
      {...props}
    />
  );
}
/**
 * overlay・Portal とともに dialog 本体を描画する。
 *
 * @remarks
 * アクセシブルな名前として `AlertDialogTitle` を必ず子に置く。説明が要る場合は
 * `AlertDialogDescription` を添え、不要な場合は `aria-describedby={undefined}` を明示する。
 * どちらも無いと Radix が警告する。
 *
 * @see Storybook `Overlay/AlertDialog`
 */
export function AlertDialogContent({
  className,
  ...props
}: ComponentProps<typeof Primitive.Content>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <Primitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-border bg-background p-6 text-foreground shadow-lg",
          className,
        )}
        data-slot="alert-dialog-content"
        {...props}
      />
    </AlertDialogPortal>
  );
}
/**
 * title と説明をまとめる領域。
 *
 * @see Storybook `Overlay/AlertDialog`
 */
export function AlertDialogHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("space-y-2 text-center sm:text-left", className)}
      data-slot="alert-dialog-header"
      {...props}
    />
  );
}
/**
 * cancel と action を並べる操作領域。
 *
 * @see Storybook `Overlay/AlertDialog`
 */
export function AlertDialogFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      data-slot="alert-dialog-footer"
      {...props}
    />
  );
}
/**
 * dialog の名称を提供する title。
 *
 * @remarks
 * Radix が `aria-labelledby` を自動で結び付けるため、`id` を手で振る必要はない。
 *
 * @see Storybook `Overlay/AlertDialog`
 */
export function AlertDialogTitle({ className, ...props }: ComponentProps<typeof Primitive.Title>) {
  return (
    <Primitive.Title
      className={cn("text-lg font-emphasis", className)}
      data-slot="alert-dialog-title"
      {...props}
    />
  );
}
/**
 * dialog の影響と次の操作を説明する本文。
 *
 * @remarks
 * Radix が `aria-describedby` を自動で結び付けるため、`id` を手で振る必要はない。
 *
 * @see Storybook `Overlay/AlertDialog`
 */
export function AlertDialogDescription({
  className,
  ...props
}: ComponentProps<typeof Primitive.Description>) {
  return (
    <Primitive.Description
      className={cn("text-sm text-muted-foreground", className)}
      data-slot="alert-dialog-description"
      {...props}
    />
  );
}
/**
 * 確認済みの操作を完了して dialog を閉じる Button 合成。
 *
 * @see Storybook `Overlay/AlertDialog`
 */
export function AlertDialogAction({
  className,
  variant = "default",
  size = "default",
  ...props
}: ComponentProps<typeof Primitive.Action> & Pick<ButtonProps, "variant" | "size">) {
  return (
    <Button asChild className={className} size={size} variant={variant}>
      <Primitive.Action data-slot="alert-dialog-action" {...props} />
    </Button>
  );
}
/**
 * 操作を取り消して dialog を閉じる Button 合成。
 *
 * @see Storybook `Overlay/AlertDialog`
 */
export function AlertDialogCancel({
  className,
  variant = "outline",
  size = "default",
  ...props
}: ComponentProps<typeof Primitive.Cancel> & Pick<ButtonProps, "variant" | "size">) {
  return (
    <Button asChild size={size} variant={variant}>
      <Primitive.Cancel className={className} data-slot="alert-dialog-cancel" {...props} />
    </Button>
  );
}
