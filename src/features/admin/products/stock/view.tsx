"use client";

import Link from "next/link";
import { useActionState, useCallback, useId, useState } from "react";

import { FormFeedback } from "@/components/app-starter/form-feedback/form-feedback";
import { Button } from "@/components/design-system/action/button/button";
import { ErrorKind } from "@/errors/error-kind";
import { idleActionState } from "@/model/action-state";
import type { Product } from "@/model/product/product";

import { ADMIN_PRODUCT_LIST_PATH, adminProductStockPath } from "../../paths";
import { ProductSubmitButton } from "../ui/submit-button/submit-button";
import { ProductTextField } from "../ui/text-field/text-field";
import { STOCK_FORM_NAMES } from "./form-names";
import type { AdjustProductStockAction, StockFormState } from "./form-state";
import { DEFAULT_STOCK_DIRECTION, type StockDirection } from "./stock-direction";
import { StockCurrentAmount } from "./ui/current-stock/current-stock";
import { StockDirectionField } from "./ui/direction-field/direction-field";
import { StockProjection } from "./ui/projection/projection";

/** 打ちかけの入力を、見込みが読める数へ直す。読めなければ null。 */
function toProjectableQuantity(value: string): number | null {
  const parsed = Number(value);

  return value !== "" && Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

/** `AdminProductStockView` の props。 */
export type AdminProductStockViewProps = {
  /** 在庫を動かす対象。読み込んだ時点の在庫数を含む。 */
  product: Product;
  /** 在庫を動かす送信先。 */
  adjustAction: AdjustProductStockAction;
};

/**
 * 在庫を補充する画面。
 *
 * @remarks
 * **在庫だけを動かします。**他の項目は編集の画面が持ちます。分けてあるのは更新の仕方が違う
 * ためで、在庫は相対値で加算し、他の項目は読んだ内容を書き戻します
 * （[`ProductEdit`](../../../../model/product/product.ts)）。
 *
 * **符号を画面が組み立てます。**入力する人が選ぶのは向きと量で、契約が受け取る符号付きの数へ
 * 畳むのは送信を読む側です（[`parseStockForm`](./parse-stock-form.ts)）。
 *
 * **誤りの要約を置きません。**入力欄が 1 つしかないため、要約は欄のそばの文言と同じことを
 * もう一度言うだけになります（要約が要るのは、どこがいくつ誤っているかを辿れない量の
 * ときです）。
 *
 * `409` にだけ読み込み直す導線を添えます。並行して動かされたときに要求が拒まれる分類で、
 * 取り直せば送り直せます。権限や通信の失敗に添えると、やり直せば直るものとして読めます。
 */
export function AdminProductStockView({ adjustAction, product }: AdminProductStockViewProps) {
  const idPrefix = useId();
  const [state, formAction] = useActionState<StockFormState, FormData>(
    adjustAction,
    idleActionState(),
  );
  const [direction, setDirection] = useState<StockDirection>(DEFAULT_STOCK_DIRECTION);
  const [quantity, setQuantity] = useState("");
  const [dismissed, setDismissed] = useState(false);

  const dismiss = useCallback(() => setDismissed(true), []);

  const changeDirection = useCallback(
    (next: StockDirection) => {
      setDirection(next);
      dismiss();
    },
    [dismiss],
  );

  const conflicted = state.status === "error" && state.kind === ErrorKind.CONFLICT;
  const quantityControlId = `${idPrefix}quantity`;

  return (
    <form action={formAction} className="grid gap-6" onInput={dismiss}>
      <input name={STOCK_FORM_NAMES.productId} type="hidden" value={product.id} />

      {dismissed || state.status !== "error" || state.formError === null ? null : (
        <FormFeedback
          description={state.formError}
          title="在庫を更新できませんでした"
          variant="destructive"
        >
          {conflicted ? (
            <Button asChild size="sm" variant="outline">
              <Link href={adminProductStockPath(product.id)}>読み込み直す</Link>
            </Button>
          ) : null}
        </FormFeedback>
      )}

      <StockCurrentAmount
        productName={product.name}
        quantity={product.quantity}
        reloadHref={adminProductStockPath(product.id)}
      />

      <StockDirectionField onValueChange={changeDirection} value={direction} />

      <div className="grid gap-2 sm:max-w-xs">
        <ProductTextField
          controlId={quantityControlId}
          inputMode="numeric"
          label="数量"
          min={1}
          name={STOCK_FORM_NAMES.quantity}
          onLeave={dismiss}
          onValueChange={setQuantity}
          required={true}
          step={1}
          type="number"
          value={quantity}
          {...(state.status === "error" && state.fieldErrors?.quantity?.[0] !== undefined
            ? { message: state.fieldErrors.quantity[0] }
            : {})}
        />
        <StockProjection
          current={product.quantity}
          direction={direction}
          quantity={toProjectableQuantity(quantity)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ProductSubmitButton blocked={false} label="在庫を更新" pendingLabel="更新しています…" />
        <Button asChild variant="ghost">
          <Link href={ADMIN_PRODUCT_LIST_PATH}>キャンセル</Link>
        </Button>
      </div>
    </form>
  );
}
