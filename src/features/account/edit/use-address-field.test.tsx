// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchAddressCandidates } = vi.hoisted(() => ({ fetchAddressCandidates: vi.fn() }));

vi.mock("@/adapters/client/api/addresses", () => ({ fetchAddressCandidates }));

import { idleActionState } from "@/model/action-state";
import type { ProfileField } from "@/model/user/profile-schema";
import type { UserProfile } from "@/model/user/user";

import { ADDRESS_CANDIDATES, PROFILE, SINGLE_ADDRESS_CANDIDATE } from "../account.fixture";
import { useAddressField } from "./use-address-field";
import { useProfileFields } from "./use-profile-fields";

const FILLED_FIELDS = ["prefecture", "city", "street"] as const satisfies readonly ProfileField[];

/**
 * 郵便番号の欄と検索の操作、補完が書き込む 3 項目を出す。
 *
 * @remarks
 * `useProfileFields` を実物のまま使います。この hook が持つのは「補完をフォームへどう当てるか」
 * なので、当てる先を差し替えると検証したいものが残りません。
 */
function Probe({ profile }: { profile: UserProfile }) {
  const fields = useProfileFields(profile, idleActionState());
  const address = useAddressField(fields);
  const postalCode = fields.fieldOf("postalCode");

  return (
    <div>
      <label htmlFor={postalCode.controlId}>郵便番号</label>
      <input id={postalCode.controlId} {...address.registration} />
      <p data-testid="postalCode-message">{postalCode.message ?? ""}</p>
      <button disabled={address.searching} onClick={address.onSearch} type="button">
        住所を検索
      </button>
      {FILLED_FIELDS.map((field) => {
        const props = fields.fieldOf(field);

        return (
          <div key={field}>
            <label htmlFor={props.controlId}>{field}</label>
            <input id={props.controlId} {...props.registration} />
          </div>
        );
      })}
      <p data-testid="message">{address.message}</p>
    </div>
  );
}

function renderProbe(overrides: Partial<UserProfile> = {}) {
  return render(
    <Probe profile={{ ...PROFILE, prefecture: "", city: "", street: "", ...overrides }} />,
  );
}

beforeEach(() => {
  fetchAddressCandidates.mockReset();
  fetchAddressCandidates.mockResolvedValue(ADDRESS_CANDIDATES);
});

describe("useAddressField", () => {
  it("何も起きていないうちは読み上げる文言を持たない", () => {
    renderProbe();

    expect(screen.getByTestId("message")).toBeEmptyDOMElement();
  });

  it("焦点が外れたとき、検証を落とさずに補完も走らせる", async () => {
    const user = userEvent.setup();

    renderProbe({ postalCode: "" });
    await user.click(screen.getByLabelText("郵便番号"));
    await user.tab();

    expect(await screen.findByTestId("postalCode-message")).toHaveTextContent(
      "郵便番号を入力してください。",
    );
    expect(fetchAddressCandidates).toHaveBeenCalledWith("", expect.any(AbortSignal));
  });

  it("一致した都道府県と市区町村をフォームへ書き込む", async () => {
    const user = userEvent.setup();

    renderProbe();
    await user.click(screen.getByRole("button", { name: "住所を検索" }));

    expect(await screen.findByTestId("message")).not.toBeEmptyDOMElement();
    expect(screen.getByLabelText("prefecture")).toHaveValue("東京都");
    expect(screen.getByLabelText("city")).toHaveValue("渋谷区");
  });

  it("候補が割れた町域を書き込まない", async () => {
    const user = userEvent.setup();

    renderProbe();
    await user.click(screen.getByRole("button", { name: "住所を検索" }));

    expect(await screen.findByTestId("message")).not.toBeEmptyDOMElement();
    expect(screen.getByLabelText("street")).toHaveValue("");
  });

  it("丁目・番地が空のときだけ町域を書き込む", async () => {
    const user = userEvent.setup();

    fetchAddressCandidates.mockResolvedValue(SINGLE_ADDRESS_CANDIDATE);
    renderProbe({ postalCode: "220-0012" });
    await user.click(screen.getByRole("button", { name: "住所を検索" }));

    expect(await screen.findByTestId("message")).not.toBeEmptyDOMElement();
    expect(screen.getByLabelText("street")).toHaveValue("みなとみらい");
  });

  it("丁目・番地が書いてあるとき町域で上書きしない", async () => {
    const user = userEvent.setup();

    fetchAddressCandidates.mockResolvedValue(SINGLE_ADDRESS_CANDIDATE);
    renderProbe({ postalCode: "220-0012", street: "みなとみらい 2-2-1" });
    await user.click(screen.getByRole("button", { name: "住所を検索" }));

    expect(await screen.findByTestId("message")).not.toBeEmptyDOMElement();
    expect(screen.getByLabelText("street")).toHaveValue("みなとみらい 2-2-1");
  });

  it("都道府県と市区町村まで割れているとき、どちらも書き込まない", async () => {
    const user = userEvent.setup();

    fetchAddressCandidates.mockResolvedValue([
      { prefecture: "東京都", city: "渋谷区", town: "神宮前" },
      { prefecture: "神奈川県", city: "横浜市西区", town: "みなとみらい" },
    ]);
    renderProbe();
    await user.click(screen.getByRole("button", { name: "住所を検索" }));

    expect(await screen.findByTestId("message")).not.toBeEmptyDOMElement();
    expect(screen.getByLabelText("prefecture")).toHaveValue("");
    expect(screen.getByLabelText("city")).toHaveValue("");
  });

  it("補完が起きたことを読み上げ用の文言で伝える", async () => {
    const user = userEvent.setup();

    renderProbe();
    await user.click(screen.getByRole("button", { name: "住所を検索" }));

    expect(await screen.findByTestId("message")).toHaveTextContent(
      "郵便番号から住所を補完しました。番地から先を入力してください。",
    );
  });

  it("該当が無いとき手入力を続けるよう伝える", async () => {
    const user = userEvent.setup();

    fetchAddressCandidates.mockResolvedValue([]);
    renderProbe();
    await user.click(screen.getByRole("button", { name: "住所を検索" }));

    expect(await screen.findByTestId("message")).toHaveTextContent(
      "この郵便番号に該当する住所が見つかりませんでした。手入力を続けてください。",
    );
  });

  it("待機中の文言を挟まず、結果の文言を 1 度だけ変える", async () => {
    const user = userEvent.setup();

    renderProbe();

    const message = screen.getByTestId("message");
    const changes: string[] = [];
    const observer = new MutationObserver(() => changes.push(message.textContent ?? ""));

    observer.observe(message, { characterData: true, childList: true, subtree: true });
    await user.click(screen.getByRole("button", { name: "住所を検索" }));
    observer.disconnect();

    expect(changes).toHaveLength(1);
  });

  it("操作で引き直すとき、同じ郵便番号でも引き直す", async () => {
    const user = userEvent.setup();

    renderProbe();
    await user.click(screen.getByRole("button", { name: "住所を検索" }));
    await user.click(screen.getByRole("button", { name: "住所を検索" }));

    expect(fetchAddressCandidates).toHaveBeenCalledTimes(2);
  });
});
