// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { Sheet, SheetTrigger } from "@/components/design-system/overlay/sheet/sheet";

import {
  FilterBar,
  FilterBarActiveFilters,
  FilterBarControls,
  FilterBarSummary,
  FilterBarTrigger,
  FilterChip,
} from "./filter-bar";

describe("FilterBar", () => {
  it("絞り込みへ直接移動できる landmark を作る", () => {
    render(<FilterBar />);

    expect(screen.getByRole("region", { name: "絞り込み" })).toBeInTheDocument();
  });

  it("landmark の名前を呼び出し元が差し替えられる", () => {
    render(<FilterBar label="一覧の絞り込み" />);

    expect(screen.getByRole("region", { name: "一覧の絞り込み" })).toBeInTheDocument();
  });

  it("検索欄を合成できる", () => {
    render(
      <FilterBarControls>
        <input aria-label="キーワード" type="search" />
      </FilterBarControls>,
    );

    expect(screen.getByLabelText("キーワード")).toBeInTheDocument();
  });

  describe("FilterBar 全体", () => {
    it("a11y 自動検査に違反しない", async () => {
      const { container } = render(
        <FilterBar>
          <FilterBarControls>
            <input aria-label="キーワード" type="search" />
            <FilterBarTrigger count={2} />
          </FilterBarControls>
          <FilterBarActiveFilters>
            <FilterChip label="状態" removeHref="/plans?price=1000" value="公開中" />
            <FilterChip label="価格帯" removeHref="/plans?status=published" value="1,000 円以上" />
          </FilterBarActiveFilters>
          <FilterBarSummary count={12} total={340}>
            <button type="button">条件をすべて解除</button>
          </FilterBarSummary>
        </FilterBar>,
      );

      const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

      expect(result.violations).toEqual([]);
    });
  });
});

describe("FilterBarTrigger", () => {
  it("条件の入力欄を開く操作を表示する", () => {
    render(<FilterBarTrigger />);

    expect(screen.getByRole("button", { name: /絞り込み/ })).toBeInTheDocument();
  });

  it("効いている条件の数を操作の中に示す", () => {
    render(<FilterBarTrigger count={3} />);

    expect(screen.getByLabelText("3 件の条件が有効")).toHaveTextContent("3");
  });

  it("条件が無いときは数を出さない", () => {
    render(<FilterBarTrigger />);

    expect(screen.queryByLabelText(/件の条件が有効/)).not.toBeInTheDocument();
  });

  it("overlay の trigger として使える", () => {
    render(
      <Sheet>
        <SheetTrigger asChild>
          <FilterBarTrigger count={2} />
        </SheetTrigger>
      </Sheet>,
    );

    expect(screen.getByRole("button", { name: /絞り込み/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});

describe("FilterBarSummary", () => {
  it("絞り込んだ結果の件数を伝える", () => {
    render(<FilterBarSummary count={12} />);

    expect(screen.getByText("12 件")).toBeInTheDocument();
  });

  it("総件数を渡すと母数を添える", () => {
    render(<FilterBarSummary count={12} total={340} />);

    expect(screen.getByText("全 340 件中 12 件")).toBeInTheDocument();
  });

  it("件数の変化を画面を見ていなくても受け取れる", () => {
    render(<FilterBarSummary count={12} />);

    expect(screen.getByText("12 件")).toHaveAttribute("aria-live", "polite");
  });

  it("すべての条件を解除する導線を合成できる", () => {
    render(
      <FilterBarSummary count={12}>
        <button type="button">条件をすべて解除</button>
      </FilterBarSummary>,
    );

    expect(screen.getByRole("button", { name: "条件をすべて解除" })).toBeInTheDocument();
  });
});

describe("FilterBarActiveFilters", () => {
  it("効いている条件を名前のある一覧として並べる", () => {
    render(
      <FilterBarActiveFilters>
        <FilterChip label="状態" value="公開中" />
        <FilterChip label="価格帯" value="1,000 円以上" />
      </FilterBarActiveFilters>,
    );

    const list = screen.getByRole("list", { name: "適用中の条件" });

    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });

  it("条件が無くなっても一覧は残る", () => {
    render(<FilterBarActiveFilters />);

    expect(screen.getByRole("list", { name: "適用中の条件" })).toBeEmptyDOMElement();
  });

  it("一覧の名前を呼び出し元が差し替えられる", () => {
    render(<FilterBarActiveFilters label="適用中の検索条件" />);

    expect(screen.getByRole("list", { name: "適用中の検索条件" })).toBeInTheDocument();
  });
});

describe("FilterChip", () => {
  it("条件の名前と値を表示する", () => {
    render(<FilterChip label="状態" value="公開中" />);

    expect(screen.getByText("状態: 公開中")).toBeInTheDocument();
  });

  it("URL に条件を載せる一覧では link で外す", () => {
    render(<FilterChip label="状態" removeHref="/plans?price=1000" value="公開中" />);

    expect(screen.getByRole("link", { name: "状態: 公開中 を解除" })).toHaveAttribute(
      "href",
      "/plans?price=1000",
    );
  });

  it("client 側で条件を持つ一覧では操作で外す", () => {
    const onRemove = vi.fn();
    render(<FilterChip label="状態" onRemove={onRemove} value="公開中" />);

    fireEvent.click(screen.getByRole("button", { name: "状態: 公開中 を解除" }));

    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("条件を外したあと focus が一覧に残る", () => {
    const onRemove = vi.fn();
    render(
      <FilterBarActiveFilters>
        <FilterChip label="状態" onRemove={onRemove} value="公開中" />
      </FilterBarActiveFilters>,
    );

    fireEvent.click(screen.getByRole("button", { name: "状態: 公開中 を解除" }));

    expect(screen.getByRole("list", { name: "適用中の条件" })).toHaveFocus();
  });

  it("一覧の外に置いても解除できる", () => {
    const onRemove = vi.fn();
    render(<FilterChip label="状態" onRemove={onRemove} value="公開中" />);

    fireEvent.click(screen.getByRole("button", { name: "状態: 公開中 を解除" }));

    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("解除の手段を渡さなければ表示だけになる", () => {
    render(<FilterChip label="状態" value="公開中" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("解除操作はどの条件を外すか単独で分かる名前を持つ", () => {
    render(
      <FilterBarActiveFilters>
        <FilterChip label="状態" removeHref="/plans" value="公開中" />
        <FilterChip label="価格帯" removeHref="/plans" value="1,000 円以上" />
      </FilterBarActiveFilters>,
    );

    const removeNames = screen.getAllByRole("link").map((link) => link.getAttribute("aria-label"));

    expect(removeNames).toEqual(["状態: 公開中 を解除", "価格帯: 1,000 円以上 を解除"]);
  });
});

describe("FilterBarControls", () => {
  // ----- 正常系 -----
  it("操作の枠として slot を持つ要素を描画する", () => {
    render(<FilterBarControls>操作</FilterBarControls>);

    expect(screen.getByText("操作")).toHaveAttribute("data-slot", "filter-bar-controls");
  });
});
