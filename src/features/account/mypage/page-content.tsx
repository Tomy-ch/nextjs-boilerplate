import { getMyProfile, getMyPurchaseSummary } from "@/adapters/server/api/users";

import { MypageView } from "./view";

/**
 * マイページの取得と組み立て。
 *
 * @remarks
 * 2 系統を並行で取ります。互いに依存しないので、順に待つと遅いほうの後ろに速いほうが並ぶだけです。
 *
 * 部分的な失敗を許しません。プロフィールも購入の集計も自分自身の情報で、片方だけが出ている画面は
 * 「何かが壊れている」以上のことを伝えないためです。失敗は route の `error` 境界が受けます
 * （[0080](../../../../docs/adr/0080-error-handling.md)）。
 */
export async function MypagePageContent() {
  const [profile, summary] = await Promise.all([getMyProfile(), getMyPurchaseSummary()]);

  return <MypageView profile={profile} summary={summary} />;
}
