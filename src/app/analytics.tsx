"use client";

import { GoogleTagManager, sendGTMEvent } from "@next/third-parties/google";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { GTM_CONTAINER_ID } from "@/config/analytics/analytics.client";
import { MEASUREMENT_ID_COOKIE_NAME } from "@/model/consent";

/**
 * 前捌きが配った計測 id。まだ配られていなければ `undefined`。
 *
 * @remarks
 * **同意した直後はまだ配られていません。** 発行するのは前捌きで、同意を書いた後の最初の要求から
 * 載ります（`docs/spec/route/layout.function.md`）。
 *
 * cookie の読み出しがここと `stores/consent-store` の 2 か所にあるのは、依存の許可がそれぞれ別だから
 * です —— `stores` は `capabilities` を引けないため、共通の読み手へ寄せられません。
 */
function readMeasurementId(): string | undefined {
  return document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${MEASUREMENT_ID_COOKIE_NAME}=`))
    ?.slice(MEASUREMENT_ID_COOKIE_NAME.length + 1);
}

/**
 * この読み込みのあいだに、すでに渡した計測 id。
 *
 * @remarks
 * 遷移のたびに {@link MeasurementId} を作り直すため、部品の中に控えると毎回消えます。同じ id を
 * 何度も渡すと、GTM 側では別々の出来事として並びます。
 */
let deliveredId: string | undefined;

/**
 * 配られている計測 id を GTM へ渡す。描くものは持たない。
 *
 * @remarks
 * **遷移のたびに作り直される前提です**（呼び出し元が `key` に経路を渡す）。mount の 1 回だけでは
 * 届きません —— 同意を押した時点では前捌きがまだ id を配っておらず、器は遷移で作り直されないため、
 * その後に配られた id を拾う機会がここにしか無いからです。
 */
function MeasurementId(): null {
  useEffect(() => {
    const measurementId = readMeasurementId();

    if (measurementId === undefined || measurementId === deliveredId) {
      return;
    }

    deliveredId = measurementId;
    sendGTMEvent({ [MEASUREMENT_ID_COOKIE_NAME]: measurementId });
  }, []);

  return null;
}

/**
 * 同意ゲートの裏で読み込むタグマネージャ。
 *
 * @remarks
 * **`Consent` の children として置きます。** 同意が得られていない間はこの要素そのものが描かれない
 * ので、DOM にも script が現れません（[0131](../../docs/adr/0131-cookie-consent.md) §2）。
 *
 * **容器 ID が空なら何も描きません。** 空は「未設定」ではなく「読み込まない」という指定で、fork が
 * Google への依存を外す口がこれです。外した配備では配信ヘッダも緩みません
 * （`config/security-headers`）。
 *
 * **`<noscript>` の iframe は置きません。** 提供元の導入手順は `<script>` と対で貼らせますが、あれは
 * ゲートへ掛けられません —— JS が無効な訪問者では尋ねる面が描かれず、同意を与える手段が無いので、
 * 置けば同意できない相手にだけ無条件で発火します（[0131](../../docs/adr/0131-cookie-consent.md) §2）。
 *
 * **この先は中継を通りません。** タグマネージャは各タグを Google と直接喋らせる仕組みで、
 * `/api/telemetry` の伏せ字が掛かる経路の外にあります（[0082](../../docs/adr/0082-client-observability.md)
 * 禁止事項の唯一の例外）。**容器へ何を入れるかが、そのまま何が外へ出るかになります。**
 *
 * 運用テレメトリ（`telemetry.tsx`）はここを通りません。同意の対象は行動の追跡であり、障害と性能の
 * 計測とは区別します（同 ADR §4）。**計測 id を渡すのもこの経路だけ**です —— 運用テレメトリへ同じ
 * id を載せると、区別しているはずの 2 つが同じ主体で繋がります。
 */
export function Analytics() {
  const pathname = usePathname();

  if (GTM_CONTAINER_ID === "") {
    return null;
  }

  return (
    <>
      <GoogleTagManager gtmId={GTM_CONTAINER_ID} />
      <MeasurementId key={pathname} />
    </>
  );
}
