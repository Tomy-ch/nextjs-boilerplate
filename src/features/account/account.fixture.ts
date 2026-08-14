import type { PurchaseHistoryPage } from "@/model/purchase/purchase";
import type { AddressCandidate, Prefecture, PurchaseSummary, UserProfile } from "@/model/user/user";

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

/**
 * 購入がある場合の集計。
 *
 * @remarks
 * 内訳には出現したステータスだけが並びます。**キャンセルの行は置きません** —— 契約が集計から
 * キャンセル済みを除くと定めており、内訳にも現れないためです。
 */
export const PURCHASE_SUMMARY: PurchaseSummary = {
  totalCount: 11,
  totalAmount: 115_000,
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
  ],
};

/** 購入が 1 件も無い場合。契約はエラーではなくゼロ値を返す。 */
export const EMPTY_PURCHASE_SUMMARY: PurchaseSummary = {
  totalCount: 0,
  totalAmount: 0,
  breakdown: [],
};

const HISTORY_STATUS_NAMES = ["配達済み", "発送済み", "キャンセル"];

/**
 * 購入履歴の 1 ページ。
 *
 * @remarks
 * 局所スクロールが効く高さを超える件数を置きます。数件では、dialog の中で読み進められるか
 * どうかを確かめられません。
 */
export const PURCHASE_HISTORY: PurchaseHistoryPage = {
  items: Array.from({ length: 24 }, (_, index) => ({
    code: `0195f0c2-0000-7000-8000-${String(index + 1).padStart(12, "0")}`,
    totalAmount: 4_980 + index * 1_100,
    statusName: HISTORY_STATUS_NAMES[index % HISTORY_STATUS_NAMES.length] ?? "配達済み",
    orderedAt: new Date(Date.UTC(2026, 6, 1 + index, 3, 0, 0)),
  })),
  nextCursor: null,
};

/** 続きがある 1 ページ。表示しているのが全部ではないことを伝える経路。 */
export const TRUNCATED_PURCHASE_HISTORY: PurchaseHistoryPage = {
  ...PURCHASE_HISTORY,
  nextCursor: "0195f0c2-0000-7000-8000-000000000024",
};

/** 購入が 1 件も無い場合。 */
export const EMPTY_PURCHASE_HISTORY: PurchaseHistoryPage = { items: [], nextCursor: null };

/**
 * 郵便番号から引いた住所の候補。
 *
 * @remarks
 * 都道府県と市区町村が一致し、町域だけが割れる形にしてあります。1 つの郵便番号が複数の町域を
 * 指すのは実際に起きることで、**一致した項目だけを埋める**判定はこの形でしか確かめられません。
 */
export const ADDRESS_CANDIDATES: readonly AddressCandidate[] = [
  { prefecture: "東京都", city: "渋谷区", town: "神宮前" },
  { prefecture: "東京都", city: "渋谷区", town: "千駄ヶ谷" },
];

/** 町域まで 1 つに定まる候補。丁目・番地が空なら町域まで埋まる。 */
export const SINGLE_ADDRESS_CANDIDATE: readonly AddressCandidate[] = [
  { prefecture: "神奈川県", city: "横浜市西区", town: "みなとみらい" },
];
