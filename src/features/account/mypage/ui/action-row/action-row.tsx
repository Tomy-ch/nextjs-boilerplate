import Link from "next/link";

import { Button } from "@/components/design-system/action/button/button";
import { BUTTON_VARIANT } from "@/components/design-system/action/button/button.definition";
import { ABOUT_PATH, PRIVACY_PATH } from "@/features/site-info/facade/paths/paths";

import { WithdrawButton } from "../withdraw-button/withdraw-button";

/**
 * マイページ下端の操作の並び。
 *
 * @remarks
 * 読むための内容から切り離して置きます。退会は戻せない操作なので、情報を確かめに来た視線の
 * 流れの中に入れません。一方で隠しもしません。探し回る形にすると、退会したい利用者が
 * 問い合わせでしか辿り着けなくなります。
 *
 * サイトの説明を同じ並びに置くのは、どちらも「この画面の内容そのものではないが、ここから
 * 辿れてほしいもの」だからです。
 *
 * 幅で並べ方を変えます。横に並べられる幅では 1 行に収め、収まらない幅では縦に積んで区切り線で
 * 分けます。縦に積んだだけでは、隣り合ったボタンが 1 つの群に見えて押し間違えます。区切り線は
 * 幅の判定と対で効くため、ここで持ちます。
 */
export function MypageActionRow() {
  return (
    <nav
      aria-label="このサイトについての案内と退会"
      className="flex flex-col divide-y divide-border sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 sm:divide-y-0"
    >
      <div className="py-3 sm:py-0">
        <Button asChild variant={BUTTON_VARIANT.OUTLINE}>
          <Link href={ABOUT_PATH}>このサイトについて</Link>
        </Button>
      </div>
      <div className="py-3 sm:py-0">
        <Button asChild variant={BUTTON_VARIANT.OUTLINE}>
          <Link href={PRIVACY_PATH}>プライバシーポリシー</Link>
        </Button>
      </div>
      <div className="flex flex-col gap-3 py-3 sm:ms-auto sm:py-0">
        <WithdrawButton />
      </div>
    </nav>
  );
}
