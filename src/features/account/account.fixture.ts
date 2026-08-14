import type { Prefecture, PurchaseSummary, UserProfile } from "@/model/user/user";

/**
 * 都道府県マスタ。
 *
 * @remarks
 * 契約は全 47 件を返しますが、ここは地方の散った 11 件に絞ります。モック（`orval.config.ts`）と
 * 同じ並びと同じ識別子にしてあり、`code` は JIS X 0401 の実際の値です。
 *
 * **間引いても選択部品の幅は変わりません** —— 47 件の最長は 4 文字で、残す中の神奈川県が同じ
 * 4 文字だからです。
 *
 * モック側と別に持つのは、`src` から `mocks` への import を境界検査が禁じているためです。
 */
export const PREFECTURES: readonly Prefecture[] = [
  { code: 1, name: "北海道" },
  { code: 4, name: "宮城県" },
  { code: 13, name: "東京都" },
  { code: 14, name: "神奈川県" },
  { code: 23, name: "愛知県" },
  { code: 26, name: "京都府" },
  { code: 27, name: "大阪府" },
  { code: 34, name: "広島県" },
  { code: 38, name: "愛媛県" },
  { code: 40, name: "福岡県" },
  { code: 47, name: "沖縄県" },
].map(({ code, name }) => ({
  id: `0195f0c2-0000-7000-8000-${String(code).padStart(12, "0")}`,
  name,
}));

/** 既定のプロフィール。 */
export const PROFILE: UserProfile = {
  firstName: "太郎",
  lastName: "山田",
  email: "taro.yamada@example.com",
  phone: "09012345678",
  postalCode: "150-0001",
  prefecture: "東京都",
  city: "渋谷区",
  street: "神宮前 1-2-3",
  building: "パークサイドレジデンス 1201",
};

/** 購入がある場合の集計。内訳には出現したステータスだけが並ぶ。 */
export const PURCHASE_SUMMARY: PurchaseSummary = {
  totalCount: 12,
  totalAmount: 124_000,
  breakdown: [
    {
      statusId: "0195f0c2-0000-7000-8000-0000000000a1",
      statusName: "配達済み",
      count: 8,
      totalAmount: 82_000,
    },
    {
      statusId: "0195f0c2-0000-7000-8000-0000000000a2",
      statusName: "発送済み",
      count: 3,
      totalAmount: 33_000,
    },
    {
      statusId: "0195f0c2-0000-7000-8000-0000000000a3",
      statusName: "キャンセル",
      count: 1,
      totalAmount: 9_000,
    },
  ],
};

/** 購入が 1 件も無い場合。契約はエラーではなくゼロ値を返す。 */
export const EMPTY_PURCHASE_SUMMARY: PurchaseSummary = {
  totalCount: 0,
  totalAmount: 0,
  breakdown: [],
};
