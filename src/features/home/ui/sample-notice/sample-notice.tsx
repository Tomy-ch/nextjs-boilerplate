import { AlertTriangleIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/design-system/status/alert/alert";

/**
 * このサイトがサンプルであることの断り書き。
 *
 * @remarks
 * 実在しそうな商品名と企業名を並べている以上、書かないと実在の取引と取り違えられます。伝える
 * べきは 3 つで、**サンプルであること・掲載物が実在しないこと・購入と決済が機能しないこと**です。
 * これらは並べる商品が変わっても要るため、一覧やカードの側ではなくここが持ちます。
 *
 * 取得を待たずに出します。断り書きが本文より後に現れると、待っている間は普通の EC に見えます。
 *
 * 閉じる操作を置きません。閉じられる断り書きは、閉じた利用者に対しては無いのと同じです。
 */
export function SampleNotice() {
  return (
    <Alert variant="warning">
      <AlertTriangleIcon />
      <AlertTitle>サンプルサイトです</AlertTitle>
      <AlertDescription>
        <p>
          Next.js Boilerplate
          のデモです。掲載している商品や企業は実在せず、購入・決済も機能しません。 同作者の Go
          Boilerplate と繋ぐと、一連のジャーニーを試せます。
        </p>
      </AlertDescription>
    </Alert>
  );
}
