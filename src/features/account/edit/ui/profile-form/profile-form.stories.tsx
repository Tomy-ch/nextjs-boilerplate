import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent, within } from "storybook/test";

import type { AddressCandidate } from "@/model/user/user";

import {
  ADDRESS_CANDIDATES,
  PREFECTURES,
  PROFILE,
  SINGLE_ADDRESS_CANDIDATE,
} from "../../../account.fixture";
import { ProfileForm } from "./profile-form";

/**
 * カタログで引ける郵便番号。
 *
 * @remarks
 * 宣言に無い番号は「該当なし」になります。外部の lookup が落ちているときと同じ経路で、
 * どちらも手入力を続けさせます。
 */
const ADDRESS_BY_POSTAL_CODE: Readonly<Record<string, readonly AddressCandidate[]>> = {
  /** 町域が割れる。都道府県と市区町村だけが埋まる。 */
  "150-0001": ADDRESS_CANDIDATES,
  /** 町域まで 1 つに定まる。丁目・番地が空なら町域まで埋まる。 */
  "220-0012": SINGLE_ADDRESS_CANDIDATE,
};

/**
 * 住所補完の応答を差し替える。
 *
 * @remarks
 * 補完は同一オリジンの `/api/addresses` を叩きます。カタログには Route Handler が無いため、
 * 差し替えないと**常に「見つかりませんでした」しか出せません**。
 *
 * 固定値ではなく郵便番号で引き分けるのは、カタログを手で触って確かめられるようにするためです。
 * どの番号でも同じ応答を返すと、入力と結果が対応しているかを読み取れません。
 *
 * 差し替えを story の中に閉じるのは、カタログへネットワークを持ち込まないためです。取得を
 * 伴う部品を story にしない方針（`InfiniteList` に story が無いのと同じ）に沿えないのは、
 * 補完が入力欄と不可分だからで、代わりに応答の側を止めています。
 */
function stubAddressLookup(): () => void {
  const original = globalThis.fetch;

  globalThis.fetch = (input: RequestInfo | URL) => {
    const url = new URL(String(input instanceof Request ? input.url : input), "http://catalog");
    const candidates = ADDRESS_BY_POSTAL_CODE[url.searchParams.get("postalCode") ?? ""] ?? [];

    return Promise.resolve(new Response(JSON.stringify({ candidates }), { status: 200 }));
  };

  return () => {
    globalThis.fetch = original;
  };
}

/**
 * 検証に落ちた状態まで進める。
 *
 * @remarks
 * 検証は focus が外れた時点で走るため、値を書き換えたうえで別の項目へ移します。props では
 * 到達できない状態で、操作を経ないと出ません。
 *
 * 3 種類を混ぜるのは、必須・形式・桁数のどれも同じ見た目で出るかを 1 つの story で見るためです。
 */
async function showValidationErrors({
  canvasElement,
}: {
  canvasElement: HTMLElement;
}): Promise<void> {
  const canvas = within(canvasElement);

  await userEvent.clear(canvas.getByLabelText("姓"));
  await userEvent.tab();

  const email = canvas.getByLabelText("メールアドレス");
  await userEvent.clear(email);
  await userEvent.type(email, "not-an-email");
  await userEvent.tab();

  const phone = canvas.getByLabelText("電話番号");
  await userEvent.clear(phone);
  await userEvent.type(phone, "0901");
  await userEvent.tab();
}

/**
 * 補完まで進める。
 *
 * @remarks
 * 操作で呼ぶのは、blur では検証と混ざって何が起きたか読み取れないためです。
 *
 * 待つのは読み上げ領域の**中身**です。領域そのものは結果が出る前から在るので、要素の出現を
 * 待っても取得の完了を待ったことになりません。
 */
async function searchAddress({ canvasElement }: { canvasElement: HTMLElement }): Promise<void> {
  const canvas = within(canvasElement);

  await userEvent.click(canvas.getByRole("button", { name: "住所を検索" }));
  await canvas.findByText(/補完しました|見つかりませんでした/);
}

const meta = {
  title: "Features/Account/ProfileForm",
  component: ProfileForm,
  beforeEach: stubAddressLookup,
  parameters: {
    docs: {
      description: {
        component: [
          "プロフィールの入力欄です。検証は focus が外れた時点で走り、以後は誤りのあった項目だけを",
          "変更のたびに見ます。**保存はカタログでは動きません** —— 送信先は Server Action です。",
          "住所の補完は応答を差し替えてあり、`150-0001`（町域が割れる）と `220-0012`（町域まで定まる）",
          "が引けます。それ以外の番号は該当なしになります。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof ProfileForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 既定。全項目が埋まっている。 */
export const Default: Story = {
  args: { prefectures: PREFECTURES, profile: PROFILE },
};

/** 任意入力が空の場合。建物名だけが空欄で始まる。 */
export const WithoutBuilding: Story = {
  args: { prefectures: PREFECTURES, profile: { ...PROFILE, building: null } },
};

/**
 * 契約の上限いっぱいの値。姓名 50 / メール 100 / 市区町村 100 / 丁目番地 200 / 建物名 200 で、
 * 入力欄が横へ広がらず値が収まるかを見る。
 */
export const MaxLength: Story = {
  args: {
    prefectures: PREFECTURES,
    profile: {
      ...PROFILE,
      firstName: "太".repeat(50),
      lastName: "山".repeat(50),
      city: "渋".repeat(100),
      street: "神宮前".repeat(66),
      building: "パークサイドレジデンス".repeat(18),
    },
  },
};

/**
 * 検証に落ちた状態。必須・形式・桁数の 3 種類が同時に出る。項目名を主語にした文言と、
 * 赤くなる範囲（label・入力欄・文言）を見る。
 */
export const ValidationErrors: Story = {
  args: { prefectures: PREFECTURES, profile: PROFILE },
  play: showValidationErrors,
};

/** 検証に落ちた状態をスマホ幅で。文言が入力欄の幅で折り返しても、次の項目と混ざらないかを見る。 */
export const ValidationErrorsMobile: Story = {
  args: { prefectures: PREFECTURES, profile: PROFILE },
  globals: { viewport: { value: "mobile2", isRotated: false } },
  play: showValidationErrors,
};

/**
 * 住所を補完した状態。候補が割れた町域は埋めず、一致した都道府県と市区町村だけが入る。
 */
export const AddressCompleted: Story = {
  args: { prefectures: PREFECTURES, profile: { ...PROFILE, postalCode: "150-0001" } },
  play: searchAddress,
};

/** 候補が 1 つに定まる場合。丁目・番地が空なので町域まで埋まる。 */
export const AddressCompletedToTown: Story = {
  args: {
    prefectures: PREFECTURES,
    profile: { ...PROFILE, postalCode: "220-0012", street: "", building: null },
  },
  play: searchAddress,
};

/** 該当が無い場合。外部の lookup が落ちているときも同じ経路で、手入力を続けさせる。 */
export const AddressNotFound: Story = {
  args: { prefectures: PREFECTURES, profile: { ...PROFILE, postalCode: "999-9999" } },
  play: searchAddress,
};

/** タブレット幅。横並びにしていた組が縦へ落ちる境界を見る。 */
export const Tablet: Story = {
  args: { prefectures: PREFECTURES, profile: PROFILE },
  globals: { viewport: { value: "tablet", isRotated: false } },
};

/** スマホ幅。すべての項目が 1 列になる。 */
export const Mobile: Story = {
  args: { prefectures: PREFECTURES, profile: PROFILE },
  globals: { viewport: { value: "mobile2", isRotated: false } },
};
