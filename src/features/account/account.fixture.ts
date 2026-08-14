import type { Prefecture, PurchaseSummary, UserProfile } from "@/model/user/user";

/**
 * JIS X 0401 の 47 件。
 *
 * @remarks
 * 全件を置くのは、選択部品の幅が最も長い名前で決まるためです。数件に間引くと、実物より狭い
 * 幅で確かめたことになります。並びは契約が返す `code` 昇順です。
 */
const PREFECTURE_NAMES: readonly string[] = [
  "北海道",
  "青森県",
  "岩手県",
  "宮城県",
  "秋田県",
  "山形県",
  "福島県",
  "茨城県",
  "栃木県",
  "群馬県",
  "埼玉県",
  "千葉県",
  "東京都",
  "神奈川県",
  "新潟県",
  "富山県",
  "石川県",
  "福井県",
  "山梨県",
  "長野県",
  "岐阜県",
  "静岡県",
  "愛知県",
  "三重県",
  "滋賀県",
  "京都府",
  "大阪府",
  "兵庫県",
  "奈良県",
  "和歌山県",
  "鳥取県",
  "島根県",
  "岡山県",
  "広島県",
  "山口県",
  "徳島県",
  "香川県",
  "愛媛県",
  "高知県",
  "福岡県",
  "佐賀県",
  "長崎県",
  "熊本県",
  "大分県",
  "宮崎県",
  "鹿児島県",
  "沖縄県",
];

/** 都道府県マスタ。 */
export const PREFECTURES: readonly Prefecture[] = PREFECTURE_NAMES.map((name, index) => ({
  id: `0195f0c2-0000-7000-8000-${String(index + 1).padStart(12, "0")}`,
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
