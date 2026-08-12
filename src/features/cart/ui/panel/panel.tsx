"use client";

import { useCartStore } from "@/stores/cart-store";

import { CartContents } from "../contents/contents";

/**
 * カートの中身を本文の脇に常設する領域。
 *
 * @remarks
 * カートが空の間は枠ごと描画しません。中身の無い枠が常に場所を取ると、本文の幅がカートの有無で
 * 変わらないぶん、空白だけが残ります。
 *
 * **`lg` 未満では出しません。** 本文の下へ積むと、内側のスクロールが外側のスクロールを奪い、本文へ
 * 戻れなくなります。タブレットもここに含めます。rail は 18rem を占めるため、`md`（768px）から出すと
 * 本文に 480px しか残りません。`lg` 未満は本文へ被せる `CartHeaderAction` が受け持ちます。
 *
 * 出し分けを CSS で行うのは、本文の幅がカートの有無で変わるためです（hydration を待つと幅が動きます）。
 */
export function CartPanel() {
  const lines = useCartStore((state) => state.lines);

  if (lines.length === 0) {
    return null;
  }

  return (
    <aside
      aria-label="カート"
      className="hidden lg:block lg:w-72 lg:shrink-0 lg:border-l"
      data-slot="cart-panel"
    >
      <div className="sticky top-14 flex max-h-[calc(100dvh-3.5rem)] flex-col gap-3 p-4">
        <CartContents />
      </div>
    </aside>
  );
}
