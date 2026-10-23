// @vitest-environment jsdom

import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { ErrorKind } from "@/errors/error-kind";
import { failedActionState, succeededActionState } from "@/model/action-state";
import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";

const { newIdempotencyKey } = vi.hoisted(() => ({ newIdempotencyKey: vi.fn() }));

vi.mock("@/model/idempotency-key", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/model/idempotency-key")>()),
  newIdempotencyKey,
}));

import { SUSPEND_FORM_NAMES } from "../../form-names";
import { SUSPEND_CONFLICT_MESSAGE, type SuspendCampaignState } from "../../form-state";
import { ADMIN_CAMPAIGN_ROWS, UPCOMING_CAMPAIGN_ROW } from "../../list.fixture";
import type { AdminCampaignRow } from "../../row";
import { SuspendableCampaignList } from "./suspendable-list";

const TRIGGER_NAME = `${UPCOMING_CAMPAIGN_ROW.code} の操作`;

const OTHER_ROW = otherUnsuspendedRow();

function otherUnsuspendedRow(): AdminCampaignRow {
  const row = ADMIN_CAMPAIGN_ROWS.find(
    (item) => item.suspendedAt === null && item.id !== UPCOMING_CAMPAIGN_ROW.id,
  );

  if (row === undefined) throw new Error("fixture に停止していない別の行がありません");

  return row;
}

const idle = () => Promise.resolve<SuspendCampaignState>({ status: "idle" });

function renderList(suspendAction: () => Promise<SuspendCampaignState> = idle) {
  return render(
    <SuspendableCampaignList items={[UPCOMING_CAMPAIGN_ROW]} suspendAction={suspendAction} />,
  );
}

function RefetchingList() {
  const [items, setItems] = useState<readonly AdminCampaignRow[]>([UPCOMING_CAMPAIGN_ROW]);
  const suspendAction = useCallback(async () => {
    setItems([{ ...UPCOMING_CAMPAIGN_ROW, suspendedAt: "2025/12/22 12:30" }]);

    return succeededActionState({ code: UPCOMING_CAMPAIGN_ROW.code });
  }, []);

  return <SuspendableCampaignList items={items} suspendAction={suspendAction} />;
}

async function openConfirmation() {
  await userEvent.click(screen.getByRole("button", { name: TRIGGER_NAME }));
  await userEvent.click(await within(document.body).findByRole("menuitem", { name: "停止する" }));

  return screen.findByRole("alertdialog");
}

function renderTwoRows(
  suspendAction: (
    state: SuspendCampaignState,
    formData: FormData,
  ) => Promise<SuspendCampaignState> = idle,
) {
  return render(
    <SuspendableCampaignList
      items={[UPCOMING_CAMPAIGN_ROW, OTHER_ROW]}
      suspendAction={suspendAction}
    />,
  );
}

async function openConfirmationFor(row: AdminCampaignRow) {
  await userEvent.click(screen.getByRole("button", { name: `${row.code} の操作` }));
  await userEvent.click(await within(document.body).findByRole("menuitem", { name: "停止する" }));

  return screen.findByRole("alertdialog");
}

async function dismissConfirmation(dialog: HTMLElement) {
  await userEvent.click(within(dialog).getByRole("button", { name: "やめる" }));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
}

async function submitAndSettle(dialog: HTMLElement, action: unknown, calls: number) {
  await userEvent.click(within(dialog).getByRole("button", { name: "停止する" }));
  await waitFor(() => expect(action).toHaveBeenCalledTimes(calls));
  await waitFor(() =>
    expect(within(dialog).getByRole("button", { name: "停止する" })).toBeEnabled(),
  );
}

async function submitAndClose(dialog: HTMLElement, action: unknown, calls: number) {
  await userEvent.click(within(dialog).getByRole("button", { name: "停止する" }));
  await waitFor(() => expect(action).toHaveBeenCalledTimes(calls));
  await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
}

function sentForm(action: { mock: { calls: readonly unknown[][] } }, call: number): FormData {
  const formData = action.mock.calls[call]?.[1];

  if (!(formData instanceof FormData)) throw new Error(`${call + 1} 回目の送信がありません`);

  return formData;
}

beforeEach(() => {
  let issued = 0;

  newIdempotencyKey.mockReset();
  newIdempotencyKey.mockImplementation(() => {
    issued += 1;

    return `0195f0c2-0000-7000-8000-${String(issued).padStart(12, "0")}`;
  });
});

describe("SuspendableCampaignList", () => {
  it("確認をやめたら、開いた行の操作へ focus を戻す", async () => {
    renderList();

    const dialog = await openConfirmation();

    await userEvent.click(within(dialog).getByRole("button", { name: "やめる" }));

    await waitFor(() => expect(screen.getByRole("button", { name: TRIGGER_NAME })).toHaveFocus());
  });

  it("Escape で確認を閉じたら、開いた行の操作へ focus を戻す", async () => {
    renderList();

    await openConfirmation();
    await userEvent.keyboard("{Escape}");

    await waitFor(() => expect(screen.getByRole("button", { name: TRIGGER_NAME })).toHaveFocus());
  });

  it("結果が返って確認が閉じたら、開いた行の操作へ focus を戻す", async () => {
    renderList(() =>
      Promise.resolve(
        failedActionState({
          formError: `${UPCOMING_CAMPAIGN_ROW.code} はすでに停止されています。`,
          kind: ErrorKind.CONFLICT,
        }),
      ),
    );

    const dialog = await openConfirmation();

    await userEvent.click(within(dialog).getByRole("button", { name: "停止する" }));

    await waitFor(() => expect(screen.getByRole("button", { name: TRIGGER_NAME })).toHaveFocus());
  });

  it("停止した行から操作が消えたら、その行を含む一覧へ focus を戻す", async () => {
    render(<RefetchingList />);

    const dialog = await openConfirmation();

    await userEvent.click(within(dialog).getByRole("button", { name: "停止する" }));

    await waitFor(() =>
      expect(screen.getByRole("region", { name: "キャンペーンの一覧" })).toHaveFocus(),
    );
    expect(screen.queryByRole("button", { name: TRIGGER_NAME })).not.toBeInTheDocument();
  });

  it("送る前は、結果も確認も出さない", () => {
    renderTwoRows();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("行から選んだ相手を確認の面へ渡す", async () => {
    renderTwoRows();

    expect(await openConfirmationFor(UPCOMING_CAMPAIGN_ROW)).toHaveAccessibleName(
      `${UPCOMING_CAMPAIGN_ROW.code} の配布を停止しますか？`,
    );
  });

  it("別の行を選び直したら、確認の相手もその行へ替わる", async () => {
    renderTwoRows();

    await dismissConfirmation(await openConfirmationFor(UPCOMING_CAMPAIGN_ROW));

    expect(await openConfirmationFor(OTHER_ROW)).toHaveAccessibleName(
      `${OTHER_ROW.code} の配布を停止しますか？`,
    );
  });

  it("停止の送信に、選んだ行の対象とコードを載せる", async () => {
    const suspendAction = vi.fn(idle);

    renderTwoRows(suspendAction);

    await submitAndSettle(await openConfirmationFor(OTHER_ROW), suspendAction, 1);

    const formData = sentForm(suspendAction, 0);

    expect(formData.get(SUSPEND_FORM_NAMES.campaignId)).toBe(OTHER_ROW.id);
    expect(formData.get(SUSPEND_FORM_NAMES.campaignCode)).toBe(OTHER_ROW.code);
  });

  it("送信中に閉じて別の行を開いても、先に送った行の結果ではその確認を閉じない", async () => {
    let settle: (state: SuspendCampaignState) => void = () => undefined;
    const suspendAction = vi.fn(
      () =>
        new Promise<SuspendCampaignState>((resolve) => {
          settle = resolve;
        }),
    );

    renderTwoRows(suspendAction);

    const first = await openConfirmationFor(UPCOMING_CAMPAIGN_ROW);

    await userEvent.click(within(first).getByRole("button", { name: "停止する" }));
    await waitFor(() => expect(suspendAction).toHaveBeenCalledTimes(1));
    await dismissConfirmation(first);
    await openConfirmationFor(OTHER_ROW);

    await act(async () => settle(succeededActionState({ code: UPCOMING_CAMPAIGN_ROW.code })));

    expect(screen.getByRole("alertdialog")).toHaveTextContent(OTHER_ROW.code);
  });

  it("停止の送信に、その行の試みの冪等キーを載せる", async () => {
    const suspendAction = vi.fn(idle);

    renderTwoRows(suspendAction);

    await submitAndSettle(await openConfirmationFor(UPCOMING_CAMPAIGN_ROW), suspendAction, 1);

    expect(sentForm(suspendAction, 0).get(IDEMPOTENCY_KEY_FIELD)).toBe(
      newIdempotencyKey.mock.results[0]?.value,
    );
  });

  it("別の行の確認を開いたら、別の冪等キーで送る", async () => {
    const suspendAction = vi.fn(idle);

    renderTwoRows(suspendAction);

    const first = await openConfirmationFor(UPCOMING_CAMPAIGN_ROW);

    await submitAndSettle(first, suspendAction, 1);
    await dismissConfirmation(first);
    await submitAndSettle(await openConfirmationFor(OTHER_ROW), suspendAction, 2);

    expect(newIdempotencyKey).toHaveBeenCalledTimes(2);
    expect(sentForm(suspendAction, 1).get(IDEMPOTENCY_KEY_FIELD)).not.toBe(
      sentForm(suspendAction, 0).get(IDEMPOTENCY_KEY_FIELD),
    );
  });

  it("停止が成立した後に同じ行の確認を開き直したら、新しい冪等キーで送る", async () => {
    const suspendAction = vi.fn(() =>
      Promise.resolve<SuspendCampaignState>(
        succeededActionState({ code: UPCOMING_CAMPAIGN_ROW.code }),
      ),
    );

    renderTwoRows(suspendAction);

    await submitAndClose(await openConfirmationFor(UPCOMING_CAMPAIGN_ROW), suspendAction, 1);
    await submitAndClose(await openConfirmationFor(UPCOMING_CAMPAIGN_ROW), suspendAction, 2);

    expect(newIdempotencyKey).toHaveBeenCalledTimes(2);
    expect(sentForm(suspendAction, 1).get(IDEMPOTENCY_KEY_FIELD)).not.toBe(
      sentForm(suspendAction, 0).get(IDEMPOTENCY_KEY_FIELD),
    );
  });

  it("結果が定まらない失敗の後に同じ行の確認を開き直したら、同じ冪等キーで送り直す", async () => {
    const suspendAction = vi.fn(() =>
      Promise.resolve<SuspendCampaignState>(failedActionState({ kind: ErrorKind.UNAVAILABLE })),
    );

    renderTwoRows(suspendAction);

    await submitAndClose(await openConfirmationFor(UPCOMING_CAMPAIGN_ROW), suspendAction, 1);
    await submitAndClose(await openConfirmationFor(UPCOMING_CAMPAIGN_ROW), suspendAction, 2);

    expect(newIdempotencyKey).toHaveBeenCalledTimes(1);
    expect(sentForm(suspendAction, 1).get(IDEMPOTENCY_KEY_FIELD)).toBe(
      sentForm(suspendAction, 0).get(IDEMPOTENCY_KEY_FIELD),
    );
  });

  it("開いたままの確認で押し直した送信は、同じ冪等キーで送る", async () => {
    const suspendAction = vi.fn(idle);

    renderTwoRows(suspendAction);

    const dialog = await openConfirmationFor(UPCOMING_CAMPAIGN_ROW);

    await submitAndSettle(dialog, suspendAction, 1);
    await submitAndSettle(dialog, suspendAction, 2);

    expect(newIdempotencyKey).toHaveBeenCalledTimes(1);
    expect(sentForm(suspendAction, 1).get(IDEMPOTENCY_KEY_FIELD)).toBe(
      sentForm(suspendAction, 0).get(IDEMPOTENCY_KEY_FIELD),
    );
  });

  it("成立したら確認を閉じ、結果を一覧の上に残す", async () => {
    renderTwoRows(() =>
      Promise.resolve(succeededActionState({ code: UPCOMING_CAMPAIGN_ROW.code })),
    );

    const dialog = await openConfirmationFor(UPCOMING_CAMPAIGN_ROW);

    await userEvent.click(within(dialog).getByRole("button", { name: "停止する" }));

    expect(
      within(await screen.findByRole("alert")).getByText(
        `${UPCOMING_CAMPAIGN_ROW.code} の配布を停止しました`,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(
      screen.getByRole("row", { name: new RegExp(UPCOMING_CAMPAIGN_ROW.code) }),
    ).toBeInTheDocument();
    expect(screen.getByRole("row", { name: new RegExp(OTHER_ROW.code) })).toBeInTheDocument();
  });

  it("既に停止されていて拒まれたら、確認を閉じ、理由を一覧の上に出す", async () => {
    const formError = `${UPCOMING_CAMPAIGN_ROW.code} は${SUSPEND_CONFLICT_MESSAGE}`;

    renderTwoRows(() =>
      Promise.resolve(failedActionState({ formError, kind: ErrorKind.CONFLICT })),
    );

    const dialog = await openConfirmationFor(UPCOMING_CAMPAIGN_ROW);

    await userEvent.click(within(dialog).getByRole("button", { name: "停止する" }));

    expect(within(await screen.findByRole("alert")).getByText(formError)).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("結果を伴わない応答では、確認を閉じない", async () => {
    const suspendAction = vi.fn(idle);

    renderTwoRows(suspendAction);

    await submitAndSettle(await openConfirmationFor(UPCOMING_CAMPAIGN_ROW), suspendAction, 1);

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("やめる操作では送らない", async () => {
    const suspendAction = vi.fn(idle);

    renderTwoRows(suspendAction);

    await dismissConfirmation(await openConfirmationFor(UPCOMING_CAMPAIGN_ROW));

    expect(suspendAction).not.toHaveBeenCalled();
  });

  it("下に置くページ送りをそのまま並べる", () => {
    render(
      <SuspendableCampaignList
        items={[UPCOMING_CAMPAIGN_ROW]}
        pagination={<nav aria-label="ページ送り" />}
        suspendAction={idle}
      />,
    );

    expect(screen.getByRole("navigation", { name: "ページ送り" })).toBeInTheDocument();
  });

  it("結果を出した状態で a11y 検査を通る", async () => {
    const { container } = renderTwoRows(() =>
      Promise.resolve(succeededActionState({ code: UPCOMING_CAMPAIGN_ROW.code })),
    );

    const dialog = await openConfirmationFor(UPCOMING_CAMPAIGN_ROW);

    await userEvent.click(within(dialog).getByRole("button", { name: "停止する" }));
    await screen.findByText(`${UPCOMING_CAMPAIGN_ROW.code} の配布を停止しました`);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
