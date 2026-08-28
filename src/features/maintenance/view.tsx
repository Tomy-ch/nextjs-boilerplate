import { withScreenSpan } from "@/observability/render-span";

/**
 * 配信を止めているあいだに見せる面。
 *
 * @remarks
 * **戻る導線を置きません。** 止めているのは全ルートなので、どこへ送っても同じ画面が返ります。
 * 押せる物を出すと、押した結果が変わらないことを利用者が確かめて初めて判ります。
 *
 * **終了の予定を書きません。** 予定を出すには運用がそれを供給する必要があり、供給が無いまま
 * 文面へ書くと、当たらない予定が画面に残ります。
 */
export const MaintenanceView = withScreenSpan("features/maintenance/view", () => {
  return (
    <div className="flex max-w-3xl flex-col gap-4 text-sm leading-relaxed">
      <h1 className="text-xl font-emphasis">ただいまメンテナンス中です</h1>
      <p>システムのメンテナンスのため、現在ご利用いただけません。</p>
      <p>終了の予定はお知らせしていません。しばらく経ってから、もう一度お試しください。</p>
    </div>
  );
});
