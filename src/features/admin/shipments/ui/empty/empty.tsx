/**
 * 発送を待っている注文が無いときの表示。
 *
 * @remarks
 * 契約は発送待ちが無いことを失敗ではなく空の並びで返すので、この画面もそれを平常として出します。
 * 支払いを終えて未発送の注文が現れれば、読み込み直したときに並びます。
 */
export function ShipmentQueueEmpty() {
  return (
    <div className="py-8">
      <p className="text-muted-foreground">発送を待っている注文はありません。</p>
    </div>
  );
}
