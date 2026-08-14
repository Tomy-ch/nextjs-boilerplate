// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ToastProvider } from "@/components/shell/toaster/toaster";
import { failedActionState, succeededActionState } from "@/model/action-state";

const { fetchAddressCandidates, updateProfileAction } = vi.hoisted(() => ({
  fetchAddressCandidates: vi.fn(),
  updateProfileAction: vi.fn<(previous: unknown, formData: FormData) => Promise<unknown>>(),
}));

vi.mock("@/adapters/client/api/addresses", () => ({ fetchAddressCandidates }));
vi.mock("../../../actions", () => ({ updateProfileAction }));

import { ADDRESS_CANDIDATES, PREFECTURES, PROFILE } from "../../../account.fixture";
import { MYPAGE_PATH } from "../../../paths";
import { ProfileForm } from "./profile-form";

const LABELS = [
  "姓",
  "名",
  "メールアドレス",
  "電話番号",
  "郵便番号",
  "都道府県",
  "市区町村",
  "丁目・番地",
  "建物名・部屋番号",
] as const;

function renderForm() {
  return render(
    <ToastProvider>
      <ProfileForm prefectures={PREFECTURES} profile={PROFILE} />
    </ToastProvider>,
  );
}

beforeEach(() => {
  fetchAddressCandidates.mockReset().mockResolvedValue(ADDRESS_CANDIDATES);
  updateProfileAction.mockReset().mockResolvedValue(succeededActionState(undefined));
});

describe("ProfileForm", () => {
  it("契約が要求する 9 項目を並べる", () => {
    renderForm();

    for (const label of LABELS) {
      expect(screen.getByLabelText(label)).toBeVisible();
    }
  });

  it("受け取ったプロフィールを初期値にする", () => {
    renderForm();

    expect(screen.getByLabelText("姓")).toHaveValue("山田");
    expect(screen.getByLabelText("メールアドレス")).toHaveValue(PROFILE.email);
  });

  it("項目を関心ごとに束ね、それぞれに名前を与える", () => {
    renderForm();

    for (const legend of ["基本情報", "連絡先", "住所"]) {
      expect(screen.getByRole("group", { name: legend })).toBeVisible();
    }
  });

  it("受け取った都道府県を選択肢にする", () => {
    renderForm();

    expect(within(screen.getByLabelText("都道府県")).getAllByRole("option")).toHaveLength(
      PREFECTURES.length,
    );
  });

  it("都道府県を検索つきの client island にせず、native の選択にする", () => {
    renderForm();

    expect(screen.getByLabelText("都道府県").tagName).toBe("SELECT");
  });

  it("郵便番号の欄の中に住所を検索する操作を置く", () => {
    renderForm();

    expect(screen.getByRole("button", { name: "住所を検索" })).toBeVisible();
  });

  it("補完が起きたことを読み上げる領域へ出す", async () => {
    const user = userEvent.setup();

    renderForm();
    await user.click(screen.getByRole("button", { name: "住所を検索" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "郵便番号から住所を補完しました。番地から先を入力してください。",
    );
  });

  it("補完した値を対応する入力欄へ入れる", async () => {
    const user = userEvent.setup();

    renderForm();
    await user.click(screen.getByRole("button", { name: "住所を検索" }));

    expect(await screen.findByRole("status")).not.toBeEmptyDOMElement();
    expect(screen.getByLabelText("市区町村")).toHaveValue("渋谷区");
  });

  it("送信すると更新を実行する", async () => {
    const user = userEvent.setup();

    renderForm();
    await user.click(screen.getByRole("button", { name: "保存する" }));

    expect(updateProfileAction).toHaveBeenCalledOnce();
  });

  it("入力した内容をそのまま送信へ載せる", async () => {
    const user = userEvent.setup();

    renderForm();
    await user.clear(screen.getByLabelText("市区町村"));
    await user.type(screen.getByLabelText("市区町村"), "港区");
    await user.click(screen.getByRole("button", { name: "保存する" }));

    expect(updateProfileAction.mock.calls[0]?.[1].get("city")).toBe("港区");
  });

  it("成功したとき画面を移さず toast で伝える", async () => {
    const user = userEvent.setup();

    renderForm();
    await user.click(screen.getByRole("button", { name: "保存する" }));

    expect(await screen.findByText("プロフィールを保存しました")).toBeVisible();
  });

  it("失敗したときフォームの先頭に理由を出す", async () => {
    const user = userEvent.setup();

    updateProfileAction.mockResolvedValue(
      failedActionState({ formError: "現在の状態ではこの操作を実行できません。" }),
    );
    renderForm();
    await user.click(screen.getByRole("button", { name: "保存する" }));

    expect(await screen.findByText("保存できませんでした")).toBeVisible();
    expect(screen.getByText("現在の状態ではこの操作を実行できません。")).toBeVisible();
  });

  it("送信していない間は失敗の文言を出さない", () => {
    renderForm();

    expect(screen.queryByText("保存できませんでした")).not.toBeInTheDocument();
  });

  it("server が返した項目の文言を対応する入力欄へ出す", async () => {
    const user = userEvent.setup();

    updateProfileAction.mockResolvedValue(
      failedActionState({
        formError: "入力内容を確認してください。",
        fieldErrors: { email: ["このメールアドレスは登録できません。"] },
      }),
    );
    renderForm();
    await user.click(screen.getByRole("button", { name: "保存する" }));

    expect(await screen.findByText("このメールアドレスは登録できません。")).toBeVisible();
  });

  it.each([
    { label: "郵便番号", message: "この郵便番号は登録できません。" },
    { label: "都道府県", message: "この都道府県は登録できません。" },
  ] as const)(
    "$label の誤りを、外枠を持たないその入力欄から指させる",
    async ({ label, message }) => {
      const user = userEvent.setup();
      const field = label === "郵便番号" ? "postalCode" : "prefecture";

      updateProfileAction.mockResolvedValue(
        failedActionState({
          formError: "入力内容を確認してください。",
          fieldErrors: { [field]: [message] },
        }),
      );
      renderForm();
      await user.click(screen.getByRole("button", { name: "保存する" }));

      const error = await screen.findByText(message);

      expect(screen.getByLabelText(label)).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByLabelText(label)).toHaveAttribute(
        "aria-describedby",
        error.getAttribute("id"),
      );
    },
  );

  it("送信を取りやめる導線をマイページへ向ける", () => {
    renderForm();

    expect(screen.getByRole("link", { name: "キャンセル" })).toHaveAttribute("href", MYPAGE_PATH);
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = renderForm();

    expect((await axe(container)).violations).toEqual([]);
  });
});
