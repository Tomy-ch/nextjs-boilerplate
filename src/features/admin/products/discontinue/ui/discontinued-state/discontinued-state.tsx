import { formatDateTime } from "@/model/datetime";
import { withPartSpan } from "@/observability/render-span";

/** `DiscontinuedState` の props。 */
export type DiscontinuedStateProps = {
  /** 廃番が確定した日時。 */
  discontinuedAt: Date;
};

/**
 * 既に廃番の商品であること。
 *
 * @remarks
 * **実行の入口も見積もりも出しません。** 廃番の商品へもう一度実行しても何も起きず、押せる操作を
 * 置くと何かが起きたように見えます。
 *
 * @see Storybook `Features/Admin/Products/Discontinue/DiscontinuedState`
 */
export const DiscontinuedState = withPartSpan(
  "features/admin/products/discontinue/ui/discontinued-state/discontinued-state",
  ({ discontinuedAt }: DiscontinuedStateProps) => {
    return (
      <section className="rounded-lg border p-4">
        <h2 className="font-emphasis text-base">廃番済み</h2>
        <p className="mt-1 text-sm">
          この商品は {formatDateTime(discontinuedAt)} に廃番になりました。
        </p>
      </section>
    );
  },
);
