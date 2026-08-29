"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { GTM_CONTAINER_ID } from "@/config/analytics/analytics.client";
import { MEASUREMENT_ID_COOKIE_NAME } from "@/model/consent";

/**
 * 前捌きが配る計測 id の形。
 *
 * @remarks
 * **渡す前に形を確かめます。** この値はライブラリの手で inline script へ文字列として埋め込まれ、
 * `JSON.stringify` は `</script` を綴り替えません。いまは島がブラウザ側でしか描かれないので HTML の
 * 解析を通りませんが、それは**偶然の性質**です —— 同意状態をサーバ側供給へ変えれば
 * （[0031](../../docs/adr/0031-policy-state-supply.md) の既定がまさにそれです）解析を通ります。
 * **自分が fork へ勧めている変更で崩れる前提に、守りを預けません。**
 *
 * 形から外れた値は渡しません。cookie は `httpOnly` を付けられないので、書ける相手が居ます。
 */
const MEASUREMENT_ID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * 前捌きが配った計測 id。形が合わなければ `undefined`。
 *
 * @remarks
 * **同意した直後はまだ配られていません。** 発行するのは前捌きで、同意を書いた後の最初の要求から
 * 載ります（`docs/spec/route/layout.function.md`）。
 *
 * cookie の読み出しがここと `stores/consent-store` の 2 か所にあるのは、依存の許可がそれぞれ別だから
 * です —— `stores` は `capabilities` を引けないため、共通の読み手へ寄せられません。
 */
function readMeasurementId(): string | undefined {
  const value = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${MEASUREMENT_ID_COOKIE_NAME}=`))
    ?.slice(MEASUREMENT_ID_COOKIE_NAME.length + 1);

  return value !== undefined && MEASUREMENT_ID_SHAPE.test(value) ? value : undefined;
}

/**
 * タグマネージャの読み込み口。
 *
 * @remarks
 * **動的に読みます。** 静的に import すると、容器 ID を空にした配備 —— Google への依存を外した
 * fork —— の初期 JS にもライブラリのコードが載ります。**拒否した相手にバイト数を運ばせない**のが
 * 同梱の条件です（[0131](../../docs/adr/0131-cookie-consent.md) §2）。
 *
 * 同意を得るまで取りに行かない、という性質も同時に付きます。ゲートの裏の資材は、要素だけでなく
 * 転送量も同意の前には発生しません。
 */
const GoogleTagManager = dynamic(() =>
  import("@next/third-parties/google").then((module) => module.GoogleTagManager),
);

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

    // 押す側も動的に読む。静的に import すると、同じ module から出ている読み込み口ごと
    // 初期 JS へ載り、容器 ID を空にした配備で動的化が効かなくなる。
    void import("@next/third-parties/google").then(({ sendGTMEvent }) => {
      sendGTMEvent({ [MEASUREMENT_ID_COOKIE_NAME]: measurementId });
    });
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
 * **読み込みの strategy は選べません。** `GoogleTagManager` は prop を公開しておらず、`next/script`
 * の既定（`afterInteractive`）が効きます。`docs/rules.md` #50 が求める「明示」を宣言では満たせない
 * ため、いま効いている値をテストで固定し、ライブラリが既定を変えた時点で落ちるようにしています。
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
