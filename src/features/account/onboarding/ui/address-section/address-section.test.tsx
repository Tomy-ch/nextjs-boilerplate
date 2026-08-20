// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { idleActionState } from "@/model/action-state";

const { fetchAddresses } = vi.hoisted(() => ({ fetchAddresses: vi.fn() }));

vi.mock("@/adapters/client/api/addresses", () => ({ fetchAddresses }));

import {
  ADDRESS_LOOKUP,
  EMPTY_ADDRESS_LOOKUP,
  PREFECTURES,
  UNAVAILABLE_ADDRESS_LOOKUP,
} from "../../../account.fixture";
import { useProfileFields } from "../../../use-profile-fields";
import { RegistrationAddressSection } from "./address-section";

/** 入力欄の配線と補完を実物のまま通す。 */
function Probe() {
  const fields = useProfileFields(null, idleActionState());

  return <RegistrationAddressSection fields={fields} prefectures={PREFECTURES} />;
}

async function searchWith(postalCode: string) {
  const user = userEvent.setup();

  render(<Probe />);
  await user.type(screen.getByLabelText("郵便番号"), postalCode);
  await user.click(screen.getByRole("button", { name: "住所を検索" }));
}

beforeEach(() => {
  fetchAddresses.mockReset();
  fetchAddresses.mockResolvedValue(ADDRESS_LOOKUP);
});

describe("RegistrationAddressSection", () => {
  // ----- 正常系 -----
  it("届け先の項目を、項目名で引ける形で並べる", () => {
    render(<Probe />);

    for (const label of ["郵便番号", "都道府県", "市区町村", "丁目・番地", "建物名・部屋番号"]) {
      expect(screen.getByLabelText(label)).toBeVisible();
    }
  });

  it("都道府県は渡された候補から選ばせる", () => {
    render(<Probe />);

    expect(screen.getByRole("option", { name: "東京都" })).toBeInTheDocument();
  });

  it("郵便番号から引いた住所を、割れていない項目だけ埋める", async () => {
    await searchWith("150-0001");

    expect(await screen.findByLabelText("市区町村")).toHaveValue("渋谷区");
    expect(screen.getByLabelText("丁目・番地")).toHaveValue("");
  });

  it("補完が起きたことを読み上げの領域で伝える", async () => {
    await searchWith("150-0001");

    expect(await screen.findByRole("status")).toHaveTextContent("郵便番号から住所を補完しました");
  });

  // ----- 異常系 -----
  it("該当が無いときは手入力を促し、検索の操作は残す", async () => {
    fetchAddresses.mockResolvedValue(EMPTY_ADDRESS_LOOKUP);
    await searchWith("999-9999");

    expect(await screen.findByRole("status")).toHaveTextContent("見つかりませんでした");
    expect(screen.getByRole("button", { name: "住所を検索" })).toBeEnabled();
  });

  it("補完の機構が動いていないときは検索の操作を閉じる", async () => {
    fetchAddresses.mockResolvedValue(UNAVAILABLE_ADDRESS_LOOKUP);
    await searchWith("000-0000");

    expect(await screen.findByRole("status")).toHaveTextContent("いま使えません");
    expect(screen.getByRole("button", { name: "住所を検索" })).toBeDisabled();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<Probe />);

    expect((await axe(container)).violations).toEqual([]);
  });
});
