"use server";

import { shipPurchase } from "@/adapters/server/api/purchases";
import { verifySession } from "@/adapters/server/auth/session";
import { createAppError, findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import { SHIPMENT_FORM_NAMES } from "@/features/admin/shipments/form-names";
import {
  SHIPMENT_CONFLICT_MESSAGE,
  SHIPMENT_TARGET_LOST_MESSAGE,
  type ShipmentState,
} from "@/features/admin/shipments/form-state";
import {
  actionStateFromError,
  failedActionState,
  succeededActionState,
} from "@/model/action-state";
import { isAdmin } from "@/model/authz";

/** 役割を持たない主体の要求をここで止める。 */
async function assertAdmin(): Promise<void> {
  if (!isAdmin(await verifySession())) {
    throw createAppError(ErrorKind.PERMISSION_DENIED, {
      cause: new Error("管理の操作に必要な役割がありません"),
    });
  }
}

/** 送信から発送する購入を取り出す。1 件も載っていなければ空の並び。 */
function readPurchaseCodes(formData: FormData): readonly string[] {
  return formData
    .getAll(SHIPMENT_FORM_NAMES.purchaseCode)
    .flatMap((value) => (typeof value === "string" && value !== "" ? [value] : []));
}

/**
 * 受け取った購入を順に発送済みにする。
 *
 * @remarks
 * **1 件ずつ順に送ります。** 契約の発送が購入 1 件ずつで、まとめて指示する口が無いためです。
 * 並行に送らないのは、途中で拒まれたときにどこまで通ったのかを数えられなくするためです。
 *
 * **いまの状況で通らなかったものは数えて先へ進みます。** 組の中の 1 件が先に発送済みになって
 * いても、残りは発送できます。ここで止めると、通るはずの注文が押し直しのたびに 1 件ずつしか
 * 進みません。
 *
 * **それ以外の失敗では止めます。** 役割が無い・接続先が落ちているといった失敗は次の 1 件でも
 * 同じように起きるため、送り続けても数が増えるだけです。止めた時点までに通った分は成立して
 * おり、一覧を取り直せばその結果が出ます。
 */
async function shipEach(
  purchaseCodes: readonly string[],
): Promise<ShipmentState | { shipped: number; refused: number }> {
  let shipped = 0;
  let refused = 0;

  for (const purchaseCode of purchaseCodes) {
    try {
      await shipPurchase(purchaseCode);
      shipped += 1;
    } catch (error) {
      if (findAppError(error)?.kind !== ErrorKind.CONFLICT) {
        return actionStateFromError(error);
      }

      refused += 1;
    }
  }

  return { shipped, refused };
}

/**
 * 発送を指示する。
 *
 * @remarks
 * 1 件ずつの発送も、組をまとめた発送も、同じ送信で受けます（{@link SHIPMENT_FORM_NAMES}）。
 *
 * **1 件も通らなかったときだけ失敗にします。** 途中まで通った送信を失敗として返すと、通った分の
 * 発送がなかったことになります。
 *
 * 一覧を取り直させません。発送した注文は次の取得で発送待ちから外れますが、それを見るのは利用者が
 * 読み込み直したときで十分です。結果の件数が、何件通って何件通らなかったかを伝えます。
 *
 * 置き場の判断（主体の断言が要る action は app 層）は
 * [0025](../../../../docs/adr/0025-app-layer-elements.md) の `app/server-action`。
 */
export async function shipPurchasesAction(
  _previous: ShipmentState,
  formData: FormData,
): Promise<ShipmentState> {
  try {
    await assertAdmin();
  } catch (error) {
    return actionStateFromError(error);
  }

  const purchaseCodes = readPurchaseCodes(formData);

  if (purchaseCodes.length === 0) {
    return failedActionState({ formError: SHIPMENT_TARGET_LOST_MESSAGE });
  }

  const result = await shipEach(purchaseCodes);

  if ("status" in result) {
    return result;
  }

  if (result.shipped === 0) {
    return failedActionState({ formError: SHIPMENT_CONFLICT_MESSAGE, kind: ErrorKind.CONFLICT });
  }

  return succeededActionState(result);
}
