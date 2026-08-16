// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode, useCallback } from "react";
import { describe, expect, it } from "vitest";

import {
  CartDisplayedOrder,
  CartRemovalNoticeProvider,
  type RemovedCartLine,
  useCartRemovalNotice,
  useDisplayedOrder,
  usePendingRemovals,
} from "./removal-memory";

const EARPHONE: RemovedCartLine = { productId: "p-1", name: "ワイヤレスイヤホン", quantity: 2 };
const KEYBOARD: RemovedCartLine = { productId: "p-2", name: "キーボード", quantity: 1 };

/** 取り除きを知らせる引き手。押した時点の並びを渡す。 */
function NotifyButton({
  line,
  displayedOrder,
}: {
  line: RemovedCartLine;
  displayedOrder: readonly string[];
}) {
  const notice = useCartRemovalNotice();
  const notify = useCallback(
    () => notice?.notify(line, displayedOrder),
    [notice, line, displayedOrder],
  );

  return (
    <button type="button" onClick={notify}>
      {`${line.name}を ${line.quantity} 個で取り除く`}
    </button>
  );
}

/** 器が配っている並びを出す。 */
function DisplayedOrderProbe() {
  return <p data-testid="displayed">{useDisplayedOrder().join(",")}</p>;
}

/** 器が覚えている並びを出す。 */
function OrderProbe() {
  const notice = useCartRemovalNotice();

  return <p data-testid="order">{(notice?.order ?? []).join(",")}</p>;
}

/** いま戻せる明細を出す。 */
function PendingProbe({ present }: { present: readonly string[] }) {
  const pending = usePendingRemovals(present);

  return (
    <p data-testid="pending">
      {[...pending.values()].map((line) => `${line.name}:${line.quantity}`).join(",")}
    </p>
  );
}

function withProvider(children: ReactNode) {
  return render(<CartRemovalNoticeProvider>{children}</CartRemovalNoticeProvider>);
}

describe("CartRemovalNoticeProvider", () => {
  it("取り除いた明細を、消える前に居た場所へ残す", async () => {
    const user = userEvent.setup();

    withProvider(
      <>
        <NotifyButton line={KEYBOARD} displayedOrder={["p-1", "p-3"]} />
        <OrderProbe />
      </>,
    );
    await user.click(screen.getByRole("button"));

    expect(screen.getByTestId("order")).toHaveTextContent("p-1,p-3");
  });

  it("続けて取り除いた明細を、どちらも覚えておく", async () => {
    const user = userEvent.setup();

    withProvider(
      <>
        <NotifyButton line={EARPHONE} displayedOrder={["p-1", "p-2"]} />
        <NotifyButton line={KEYBOARD} displayedOrder={["p-2"]} />
        <PendingProbe present={[]} />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "ワイヤレスイヤホンを 2 個で取り除く" }));
    await user.click(screen.getByRole("button", { name: "キーボードを 1 個で取り除く" }));

    expect(screen.getByTestId("pending")).toHaveTextContent("ワイヤレスイヤホン:2,キーボード:1");
  });

  it("後から入った明細を並びの末尾へ回す", async () => {
    const user = userEvent.setup();

    withProvider(
      <>
        <NotifyButton line={EARPHONE} displayedOrder={["p-1", "p-2"]} />
        <NotifyButton line={KEYBOARD} displayedOrder={["p-2", "p-9"]} />
        <OrderProbe />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "ワイヤレスイヤホンを 2 個で取り除く" }));
    await user.click(screen.getByRole("button", { name: "キーボードを 1 個で取り除く" }));

    expect(screen.getByTestId("order")).toHaveTextContent("p-1,p-2,p-9");
  });

  it("同じ商品を取り除き直したとき、新しい数量で覚え直す", async () => {
    const user = userEvent.setup();

    withProvider(
      <>
        <NotifyButton line={EARPHONE} displayedOrder={["p-1"]} />
        <NotifyButton line={{ ...EARPHONE, quantity: 5 }} displayedOrder={["p-1"]} />
        <PendingProbe present={[]} />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "ワイヤレスイヤホンを 2 個で取り除く" }));
    await user.click(screen.getByRole("button", { name: "ワイヤレスイヤホンを 5 個で取り除く" }));

    expect(screen.getByTestId("pending")).toHaveTextContent("ワイヤレスイヤホン:5");
  });
});

describe("useCartRemovalNotice", () => {
  it("器の中では知らせる口を返す", async () => {
    const user = userEvent.setup();

    withProvider(
      <>
        <NotifyButton line={EARPHONE} displayedOrder={["p-1"]} />
        <PendingProbe present={[]} />
      </>,
    );
    await user.click(screen.getByRole("button"));

    expect(screen.getByTestId("pending")).toHaveTextContent("ワイヤレスイヤホン:2");
  });

  it("器の外では null を返し、押しても何も起きない", async () => {
    const user = userEvent.setup();

    render(
      <>
        <NotifyButton line={EARPHONE} displayedOrder={["p-1"]} />
        <PendingProbe present={[]} />
      </>,
    );
    await user.click(screen.getByRole("button"));

    expect(screen.getByTestId("pending")).toBeEmptyDOMElement();
  });
});

describe("CartDisplayedOrder", () => {
  it("配った並びを中の部品へ渡す", () => {
    render(
      <CartDisplayedOrder order={["p-1", "p-2"]}>
        <DisplayedOrderProbe />
      </CartDisplayedOrder>,
    );

    expect(screen.getByTestId("displayed")).toHaveTextContent("p-1,p-2");
  });
});

describe("useDisplayedOrder", () => {
  it("器の外では空を返す", () => {
    render(<DisplayedOrderProbe />);

    expect(screen.getByTestId("displayed")).toBeEmptyDOMElement();
  });
});

describe("usePendingRemovals", () => {
  it("カートに戻っている商品を、戻せる明細から外す", async () => {
    const user = userEvent.setup();

    withProvider(
      <>
        <NotifyButton line={EARPHONE} displayedOrder={["p-1"]} />
        <PendingProbe present={["p-1"]} />
      </>,
    );
    await user.click(screen.getByRole("button"));

    expect(screen.getByTestId("pending")).toBeEmptyDOMElement();
  });

  it("器の外では常に空を返す", () => {
    render(<PendingProbe present={[]} />);

    expect(screen.getByTestId("pending")).toBeEmptyDOMElement();
  });
});
