import { withScreenSpan } from "@/observability/render-span";

/**
 * 配信を止めているあいだに見せる面。
 *
 * @remarks
 * **戻る導線と終了の予定は出しません。** 理由は [README](./README.md#what-does-not-belong-here)と
 * `docs/spec/route/maintenance/page.screen.md#what-not-to-write`。
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
