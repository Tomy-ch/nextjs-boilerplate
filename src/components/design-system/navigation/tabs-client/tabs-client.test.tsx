// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  TabsClient,
  TabsClientContent,
  TabsClientList,
  TabsClientTrigger,
  tabsClientListVariants,
} from "./tabs-client";

function Fixture({ defaultValue = "summary" }: { defaultValue?: string }) {
  return (
    <TabsClient defaultValue={defaultValue}>
      <TabsClientList aria-label="表示する観点">
        <TabsClientTrigger value="summary">サマリ</TabsClientTrigger>
        <TabsClientTrigger value="detail">明細</TabsClientTrigger>
      </TabsClientList>
      <TabsClientContent value="summary">サマリの内容です。</TabsClientContent>
      <TabsClientContent value="detail">明細の内容です。</TabsClientContent>
    </TabsClient>
  );
}

describe("TabsClient", () => {
  it("tablist と tab の意味論を持ち、tablist に名前を与えられる", () => {
    render(<Fixture />);

    expect(screen.getByRole("tablist", { name: "表示する観点" })).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(2);
  });

  it("選択中の tab だけを aria-selected にする", () => {
    render(<Fixture />);

    expect(screen.getByRole("tab", { name: "サマリ" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "明細" })).toHaveAttribute("aria-selected", "false");
  });

  it("選択中のパネルだけを表示する", () => {
    render(<Fixture />);

    expect(screen.getByRole("tabpanel")).toHaveTextContent("サマリの内容です。");
    expect(screen.queryByText("明細の内容です。")).not.toBeInTheDocument();
  });

  it("tab を選ぶと表示するパネルが入れ替わる", () => {
    render(<Fixture />);

    fireEvent.mouseDown(screen.getByRole("tab", { name: "明細" }), { button: 0 });

    expect(screen.getByRole("tabpanel")).toHaveTextContent("明細の内容です。");
    expect(screen.getByRole("tab", { name: "明細" })).toHaveAttribute("aria-selected", "true");
  });

  it("矢印キーで隣の tab へ移動する", async () => {
    render(<Fixture />);

    const first = screen.getByRole("tab", { name: "サマリ" });
    fireEvent.focus(first);
    fireEvent.keyDown(first, { key: "ArrowRight" });

    await waitFor(() => expect(screen.getByRole("tab", { name: "明細" })).toHaveFocus());
  });

  it("URL 遷移を伴わないため link ではなく button として公開する", () => {
    render(<Fixture />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "サマリ" }).tagName).toBe("BUTTON");
  });

  it("disabled の tab は選択できない", () => {
    render(
      <TabsClient defaultValue="summary">
        <TabsClientList aria-label="表示する観点">
          <TabsClientTrigger value="summary">サマリ</TabsClientTrigger>
          <TabsClientTrigger disabled value="detail">
            明細
          </TabsClientTrigger>
        </TabsClientList>
        <TabsClientContent value="summary">サマリの内容です。</TabsClientContent>
        <TabsClientContent value="detail">明細の内容です。</TabsClientContent>
      </TabsClient>,
    );

    const disabledTab = screen.getByRole("tab", { name: "明細" });

    expect(disabledTab).toBeDisabled();

    fireEvent.mouseDown(disabledTab, { button: 0 });

    expect(screen.getByRole("tabpanel")).toHaveTextContent("サマリの内容です。");
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<Fixture />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});

describe("TabsClientList", () => {
  // ----- 正常系 -----
  it("tablist として名前と slot を持つ要素を描画する", () => {
    render(<Fixture />);

    const list = screen.getByRole("tablist", { name: "表示する観点" });

    expect(list).toHaveAttribute("data-slot", "tabs-list");
  });
});

describe("TabsClientTrigger", () => {
  // ----- 正常系 -----
  it("選択中の tab を選択状態として示す", () => {
    render(<Fixture />);

    expect(screen.getByRole("tab", { name: "サマリ" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "明細" })).toHaveAttribute("aria-selected", "false");
  });

  it("押すと対応する内容へ切り替える", () => {
    render(<Fixture />);

    fireEvent.mouseDown(screen.getByRole("tab", { name: "明細" }), { button: 0 });

    expect(screen.getByRole("tabpanel")).toHaveTextContent("明細の内容です。");
  });
});

describe("TabsClientContent", () => {
  // ----- 正常系 -----
  it("選択中の内容だけを tabpanel として描画する", () => {
    render(<Fixture />);

    const panel = screen.getByRole("tabpanel");

    expect(panel).toHaveAttribute("data-slot", "tabs-content");
    expect(panel).toHaveTextContent("サマリの内容です。");
  });
});

describe("tabsClientListVariants", () => {
  // ----- 正常系 -----
  it("tablist と同じ見た目の class を返す", () => {
    expect(tabsClientListVariants()).toContain("inline-flex");
  });
});
