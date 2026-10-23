import { type Campaign, toCampaignId } from "@/model/campaign/campaign";
import { type AdminCampaignRow, toAdminCampaignRows } from "./row";

/**
 * fixture の行の状態を決める「いま」。
 *
 * @remarks
 * 検証の時計（`CLOCK_FIXED_NOW`）と同じ瞬間に揃えてあります。行は時計を読まず、この時刻を基準に
 * 状態が決まった形で story へ渡ります。
 */
const CAMPAIGN_FIXTURE_NOW = new Date("2026-01-01T00:00:00.000Z");

/** 長いコードの文字数。契約は長さの上限を宣言していないため、折り返しが要る長さを選ぶ。 */
const LONG_CODE_LENGTH = 32;

/** 配布前のキャンペーン。確認の面の既定の相手にも使う。 */
const UPCOMING_CAMPAIGN: Campaign = {
  id: toCampaignId("0195f0c2-0000-7000-8000-0000000000c1"),
  code: "SPRING2026",
  discount: { kind: "rate", value: "0.10", maxAmount: 500 },
  scopeKind: "all",
  startsAt: "2026-03-01T00:00:00.000Z",
  endsAt: "2026-03-31T15:00:00.000Z",
  couponExpiresAt: "2026-04-30T15:00:00.000Z",
  totalLimit: 1000,
  issuedCount: 0,
  suspendedAt: null,
};

/**
 * 一覧に並ぶキャンペーン。
 *
 * @remarks
 * **4 つの状態と、配りきった行がそろうように選んであります。** 状態ごとに色と操作の有無が
 * 変わるため、混ざった並びこそがこの一覧で確かめたい姿です。値引きは定額・上限つき定率・
 * 上限なし定率を散らし、適用範囲も 3 つを散らしてあります。並びは契約と同じく配布期間の開始が
 * 新しい順です。
 */
const CAMPAIGNS: readonly Campaign[] = [
  UPCOMING_CAMPAIGN,
  {
    id: toCampaignId("0195f0c2-0000-7000-8000-0000000000c2"),
    code: "NEWYEAR2026",
    discount: { kind: "flat", value: "5.00" },
    scopeKind: "category",
    startsAt: "2025-12-25T00:00:00.000Z",
    endsAt: "2026-01-10T15:00:00.000Z",
    couponExpiresAt: "2026-02-28T15:00:00.000Z",
    totalLimit: 500,
    issuedCount: 128,
    suspendedAt: null,
  },
  {
    id: toCampaignId("0195f0c2-0000-7000-8000-0000000000c5"),
    code: "FLASH1225",
    discount: { kind: "rate", value: "0.15", maxAmount: 1000 },
    scopeKind: "category",
    startsAt: "2025-12-20T00:00:00.000Z",
    endsAt: "2026-01-20T15:00:00.000Z",
    couponExpiresAt: "2026-02-20T15:00:00.000Z",
    totalLimit: 100,
    issuedCount: 42,
    suspendedAt: "2025-12-22T03:30:00.000Z",
  },
  {
    id: toCampaignId("0195f0c2-0000-7000-8000-0000000000c3"),
    code: "WINTERSALE",
    discount: { kind: "rate", value: "0.20", maxAmount: null },
    scopeKind: "product",
    startsAt: "2025-12-01T00:00:00.000Z",
    endsAt: "2026-01-31T15:00:00.000Z",
    couponExpiresAt: "2026-03-31T15:00:00.000Z",
    totalLimit: 300,
    issuedCount: 300,
    suspendedAt: null,
  },
  {
    id: toCampaignId("0195f0c2-0000-7000-8000-0000000000c4"),
    code: "AUTUMN2025",
    discount: { kind: "flat", value: "10.00" },
    scopeKind: "all",
    startsAt: "2025-09-01T00:00:00.000Z",
    endsAt: "2025-11-30T15:00:00.000Z",
    couponExpiresAt: "2025-12-31T15:00:00.000Z",
    totalLimit: 2000,
    issuedCount: 1874,
    suspendedAt: null,
  },
];

/** 停止済みだけの並び。どの行にも操作が出ないことを見るために置く。 */
const SUSPENDED_CAMPAIGNS: readonly Campaign[] = [
  ...CAMPAIGNS.filter((campaign) => campaign.suspendedAt !== null),
  {
    id: toCampaignId("0195f0c2-0000-7000-8000-0000000000c6"),
    code: "SUMMER2025",
    discount: { kind: "flat", value: "3.00" },
    scopeKind: "product",
    startsAt: "2025-07-01T00:00:00.000Z",
    endsAt: "2025-08-31T15:00:00.000Z",
    couponExpiresAt: "2025-09-30T15:00:00.000Z",
    totalLimit: 50,
    issuedCount: 50,
    suspendedAt: "2025-08-01T00:00:00.000Z",
  },
];

/** 長いコードのキャンペーン。表が自分の領域の中で折り返すかを見るために置く。 */
const LONG_CODE_CAMPAIGN: Campaign = {
  id: toCampaignId("0195f0c2-0000-7000-8000-0000000000c7"),
  code: "WELCOMEBACKCUSTOMERAPPRECIATION2026".slice(0, LONG_CODE_LENGTH),
  discount: { kind: "flat", value: "5.00" },
  scopeKind: "all",
  startsAt: "2025-12-25T00:00:00.000Z",
  endsAt: "2026-01-10T15:00:00.000Z",
  couponExpiresAt: "2026-02-28T15:00:00.000Z",
  totalLimit: 500,
  issuedCount: 12,
  suspendedAt: null,
};

/**
 * 1 件を行へ写す。
 *
 * @param campaign - 写すキャンペーン
 * @returns 写した行
 */
function rowOf(campaign: Campaign): AdminCampaignRow {
  const [row] = toAdminCampaignRows([campaign], CAMPAIGN_FIXTURE_NOW);

  if (row === undefined) throw new Error("1 件を写した結果が空です");

  return row;
}

/** 一覧に並ぶ行。4 つの状態と、配りきった行を含む。 */
export const ADMIN_CAMPAIGN_ROWS: readonly AdminCampaignRow[] = toAdminCampaignRows(
  CAMPAIGNS,
  CAMPAIGN_FIXTURE_NOW,
);

/** 停止済みだけの行。 */
export const SUSPENDED_CAMPAIGN_ROWS: readonly AdminCampaignRow[] = toAdminCampaignRows(
  SUSPENDED_CAMPAIGNS,
  CAMPAIGN_FIXTURE_NOW,
);

/** 長いコードの行。 */
export const LONG_CODE_CAMPAIGN_ROW: AdminCampaignRow = rowOf(LONG_CODE_CAMPAIGN);

/** 配布前の行。停止の操作が出る行として、確認の面の既定の相手に使う。 */
export const UPCOMING_CAMPAIGN_ROW: AdminCampaignRow = rowOf(UPCOMING_CAMPAIGN);
