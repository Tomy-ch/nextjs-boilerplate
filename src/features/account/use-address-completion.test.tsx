// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useCallback } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchAddressCandidates } = vi.hoisted(() => ({ fetchAddressCandidates: vi.fn() }));

vi.mock("@/adapters/client/api/addresses", () => ({ fetchAddressCandidates }));

import { ADDRESS_CANDIDATES, SINGLE_ADDRESS_CANDIDATE } from "./account.fixture";
import type { AddressCompletion } from "./use-address-completion";
import { useAddressCompletion } from "./use-address-completion";

/** 郵便番号を渡して補完を走らせ、結果と進行中かどうかを描画する。 */
function Probe({
  onCompleted,
  postalCode = "150-0001",
}: {
  onCompleted: (completion: AddressCompletion) => void;
  postalCode?: string;
}) {
  const { complete, loading, result } = useAddressCompletion(onCompleted);
  const onBlurLike = useCallback(() => void complete(postalCode), [complete, postalCode]);
  const onForce = useCallback(
    () => void complete(postalCode, { force: true }),
    [complete, postalCode],
  );

  return (
    <div>
      <button onClick={onBlurLike} type="button">
        blur で引く
      </button>
      <button onClick={onForce} type="button">
        操作で引く
      </button>
      <p data-testid="result">{result}</p>
      <p data-testid="loading">{loading ? "取得中" : "待機"}</p>
    </div>
  );
}

beforeEach(() => {
  fetchAddressCandidates.mockReset();
  fetchAddressCandidates.mockResolvedValue(ADDRESS_CANDIDATES);
});

describe("useAddressCompletion", () => {
  it("引く前は何も起きていない状態を返す", () => {
    render(<Probe onCompleted={vi.fn()} />);

    expect(screen.getByTestId("result")).toHaveTextContent("idle");
    expect(screen.getByTestId("loading")).toHaveTextContent("待機");
  });

  it("取得の最中は進行中であることを返し、応答が返ったら戻す", async () => {
    const user = userEvent.setup();
    let settle: (() => void) | undefined;

    fetchAddressCandidates.mockReturnValue(
      new Promise((resolve) => {
        settle = () => resolve(ADDRESS_CANDIDATES);
      }),
    );

    render(<Probe onCompleted={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "blur で引く" }));

    expect(screen.getByTestId("loading")).toHaveTextContent("取得中");

    settle?.();

    expect(await screen.findByTestId("result")).toHaveTextContent("filled");
    expect(screen.getByTestId("loading")).toHaveTextContent("待機");
  });

  it("すべての候補で一致した項目を埋める値として渡す", async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();

    render(<Probe onCompleted={onCompleted} />);
    await user.click(screen.getByRole("button", { name: "blur で引く" }));

    expect(onCompleted).toHaveBeenCalledWith({
      prefecture: "東京都",
      city: "渋谷区",
      town: undefined,
    });
  });

  it("候補が 1 件なら町域まで埋める値として渡す", async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();

    fetchAddressCandidates.mockResolvedValue(SINGLE_ADDRESS_CANDIDATE);
    render(<Probe onCompleted={onCompleted} postalCode="220-0012" />);
    await user.click(screen.getByRole("button", { name: "blur で引く" }));

    expect(onCompleted).toHaveBeenCalledWith({
      prefecture: "神奈川県",
      city: "横浜市西区",
      town: "みなとみらい",
    });
  });

  it("引けたことを結果として返す", async () => {
    const user = userEvent.setup();

    render(<Probe onCompleted={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "blur で引く" }));

    expect(screen.getByTestId("result")).toHaveTextContent("filled");
  });

  it("該当が無いとき何も埋めず、見つからなかったことだけを返す", async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();

    fetchAddressCandidates.mockResolvedValue([]);
    render(<Probe onCompleted={onCompleted} />);
    await user.click(screen.getByRole("button", { name: "blur で引く" }));

    expect(onCompleted).not.toHaveBeenCalled();
    expect(screen.getByTestId("result")).toHaveTextContent("empty");
  });

  it("同じ郵便番号では 2 度引かない", async () => {
    const user = userEvent.setup();

    render(<Probe onCompleted={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "blur で引く" }));
    await user.click(screen.getByRole("button", { name: "blur で引く" }));

    expect(fetchAddressCandidates).toHaveBeenCalledOnce();
  });

  it("操作で呼ばれたときは同じ郵便番号でも引き直す", async () => {
    const user = userEvent.setup();

    render(<Probe onCompleted={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "blur で引く" }));
    await user.click(screen.getByRole("button", { name: "操作で引く" }));

    expect(fetchAddressCandidates).toHaveBeenCalledTimes(2);
  });

  it("郵便番号を渡し、打ち切れる signal を添えて引く", async () => {
    const user = userEvent.setup();

    render(<Probe onCompleted={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "blur で引く" }));

    expect(fetchAddressCandidates).toHaveBeenCalledWith("150-0001", expect.any(AbortSignal));
  });

  it("引き直すと前の取得を打ち切り、古い応答で結果を上書きしない", async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();
    let firstSignal: AbortSignal | undefined;

    fetchAddressCandidates.mockImplementationOnce(async (_code: string, signal: AbortSignal) => {
      firstSignal = signal;

      return ADDRESS_CANDIDATES;
    });

    render(<Probe onCompleted={onCompleted} />);
    await user.click(screen.getByRole("button", { name: "blur で引く" }));
    onCompleted.mockClear();
    await user.click(screen.getByRole("button", { name: "操作で引く" }));

    expect(firstSignal?.aborted).toBe(true);
    expect(onCompleted).toHaveBeenCalledOnce();
  });

  it("打ち切られた取得の応答では結果を書き換えない", async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();

    fetchAddressCandidates.mockImplementation(async (_code: string, signal: AbortSignal) => {
      // 応答が返る直前に打ち切られた状況。遅れて返った古い応答が新しい入力を上書きしない。
      Object.defineProperty(signal, "aborted", { get: () => true });

      return ADDRESS_CANDIDATES;
    });

    render(<Probe onCompleted={onCompleted} />);
    await user.click(screen.getByRole("button", { name: "blur で引く" }));

    expect(onCompleted).not.toHaveBeenCalled();
    expect(screen.getByTestId("result")).toHaveTextContent("idle");
  });

  it("画面を離れたら進行中の取得を打ち切る", async () => {
    const user = userEvent.setup();
    let signal: AbortSignal | undefined;

    fetchAddressCandidates.mockImplementation(async (_code: string, given: AbortSignal) => {
      signal = given;

      return ADDRESS_CANDIDATES;
    });

    const { unmount } = render(<Probe onCompleted={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "blur で引く" }));
    unmount();

    expect(signal?.aborted).toBe(true);
  });
});
