import Link from "next/link";

import { Button } from "@/components/design-system/action/button/button";
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
} from "@/components/design-system/action/button/button.definition";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/design-system/display/card/card";
import {
  KeyValueItem,
  KeyValueLabel,
  KeyValueList,
  KeyValueValue,
} from "@/components/design-system/display/key-value-list/key-value-list";
import type { UserProfile } from "@/model/user/user";

import { PROFILE_EDIT_PATH } from "../../../paths";

/** `ShippingCard` の props。 */
export type ShippingCardProps = {
  /** 届け先として使う登録情報。 */
  profile: UserProfile;
};

/** 住所を 1 つの文字列へ組む。建物名は任意入力なので、無ければ区切りごと落とす。 */
function formatAddress(profile: UserProfile): string {
  const lines = [profile.prefecture, profile.city, profile.street, profile.building ?? ""];

  return `〒${profile.postalCode} ${lines.filter((line) => line !== "").join(" ")}`;
}

/**
 * 届け先の確認。
 *
 * @remarks
 * **この画面では編集しません。** 購入の作成が受け取るのは商品と数量だけで、届け先は登録情報から
 * 決まります。ここに入力欄を置くと、送っていない値を編集させることになります。変更は登録情報の
 * 側で行い、この画面はその導線だけを持ちます。
 */
export function ShippingCard({ profile }: ShippingCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>お届け先</CardTitle>
        <CardAction>
          <Button asChild size={BUTTON_SIZE.SMALL} variant={BUTTON_VARIANT.OUTLINE}>
            <Link href={PROFILE_EDIT_PATH}>変更する</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <KeyValueList>
          <KeyValueItem>
            <KeyValueLabel>氏名</KeyValueLabel>
            <KeyValueValue>{`${profile.lastName} ${profile.firstName}`}</KeyValueValue>
          </KeyValueItem>
          <KeyValueItem>
            <KeyValueLabel>住所</KeyValueLabel>
            <KeyValueValue>{formatAddress(profile)}</KeyValueValue>
          </KeyValueItem>
          <KeyValueItem>
            <KeyValueLabel>電話番号</KeyValueLabel>
            <KeyValueValue>{profile.phone}</KeyValueValue>
          </KeyValueItem>
        </KeyValueList>
      </CardContent>
    </Card>
  );
}
