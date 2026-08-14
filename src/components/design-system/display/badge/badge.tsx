import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/components/cn";

import { BADGE_VARIANT, type BadgeVariant } from "./badge.definition";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        [BADGE_VARIANT.DEFAULT]: "bg-foreground text-background",
        [BADGE_VARIANT.SECONDARY]: "bg-muted text-foreground",
        [BADGE_VARIANT.DESTRUCTIVE]: "bg-destructive text-destructive-foreground",
        // 縁だけで成り立つ variant なので、枠線は `border` ではなく `input` を取る
        // （`components/README.md`「境界を示す線」）。
        [BADGE_VARIANT.OUTLINE]:
          "border-input text-foreground hover:bg-foreground hover:text-background",
        [BADGE_VARIANT.GHOST]: "text-foreground hover:bg-foreground hover:text-background",
        [BADGE_VARIANT.LINK]: "text-foreground underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: BADGE_VARIANT.DEFAULT,
    },
  },
);

/** {@link Badge} の props。 */
export type BadgeProps = ComponentProps<"span"> &
  Omit<VariantProps<typeof badgeVariants>, "variant"> & {
    /** 短いラベルの優先度に対応する見た目。 */
    variant?: BadgeVariant;
    /** 子要素へ badge の見た目と props を合成するか。 */
    asChild?: boolean;
  };

/**
 * 状態や分類を短く表示する、小さなラベル。
 *
 * @remarks
 * `Badge` は業務上の status を解釈しない。たとえば処理状態の文言・色・許可される操作は
 * backend の状態遷移に依存するため、feature 側で `Badge` の `variant` を選んで合成する。
 *
 * 通常は非対話の `span` として使う。遷移先を示す短い link に見た目を付与するときだけ、
 * `asChild` と単一の anchor を組み合わせる。click handler を持つ badge は操作の意図が
 * 伝わりにくいため、`Button` を使う。
 *
 * @example
 * ```tsx
 * import Link from "next/link";
 *
 * <Badge>公開中</Badge>
 *
 * <Badge asChild variant={BADGE_VARIANT.LINK}>
 *   <Link href="/items?category=food">食品</Link>
 * </Badge>
 * ```
 *
 * @param props - native `span` 属性と表示用 props。
 * @param props.variant - ラベルの優先度に対応する見た目。
 * @param props.asChild - 子要素へ badge の見た目と props を合成するか。
 * @see Storybook `Display/Badge`
 */
export function Badge({ className, variant, asChild = false, ...props }: BadgeProps) {
  const Component = asChild ? Slot : "span";

  return (
    <Component
      className={cn(badgeVariants({ variant, className }))}
      data-slot="badge"
      data-variant={variant}
      {...props}
    />
  );
}
