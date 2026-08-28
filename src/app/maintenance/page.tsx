import type { Metadata } from "next";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import { MaintenanceView } from "@/features/maintenance/view";

/**
 * build 時に 1 度だけ描く。
 *
 * @remarks
 * 止めているかどうかは入口（`src/proxy.ts`）が判定するので、この画面自身は何も読みません。
 * ここで判定を持つと、止まっているあいだ**全ルートが動的になります**。宣言と実態は build の
 * 成果物と突き合わせます（`scripts/render-mode`）。
 */
export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "メンテナンス中",
  description: "システムのメンテナンスのため、現在ご利用いただけません。",
  robots: { index: false },
};

/**
 * 配信を止めているあいだの画面。
 *
 * @remarks
 * **器を通りません。** 入口が全ルートをここへ差し替えるため、route group の layout は挟まりません。
 * したがって `main` はこの画面が自分で置きます（[README](../README.md)）。
 *
 * 出す先が停止中の面だけであるにもかかわらず header と nav を出すと、押した先がすべてこの画面へ
 * 戻ります。
 */
export default function MaintenancePage() {
  return (
    <main>
      <ContentContainer className="py-16">
        <MaintenanceView />
      </ContentContainer>
    </main>
  );
}
