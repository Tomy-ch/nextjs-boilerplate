import type { Metadata } from "next";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import { MaintenanceView } from "@/features/maintenance/view";

/**
 * build 時に 1 度だけ描く。
 *
 * @remarks
 * **止めているかどうかをこの画面は読みません**（理由は
 * `docs/spec/route/maintenance/page.function.md` の「レンダリング」）。宣言と実態は build の
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
 * **器を通らないので `main` は自分で置きます**（[README](../README.md)）。header と nav を出さない
 * 理由は `docs/spec/route/maintenance/page.screen.md` の「器」。
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
