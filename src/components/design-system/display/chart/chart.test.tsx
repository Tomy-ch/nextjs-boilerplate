// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { type ComponentProps, useId } from "react";
import * as RechartsPrimitive from "recharts";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  ChartTooltip,
  ChartTooltipContent,
} from "./chart";
import { CHART_INDICATOR } from "./chart.definition";

const CHART_WIDTH = 320;
const CHART_HEIGHT = 200;

beforeAll(() => {
  // recharts は描画領域の実寸を購読して初めて children を描画するが、jsdom は要素を常に 0 と
  // 報告し ResizeObserver も持たない。実寸を返す最小の実装をここで補う。
  vi.stubGlobal(
    "ResizeObserver",
    class {
      private readonly callback: (entries: unknown[], observer: unknown) => void;

      constructor(callback: (entries: unknown[], observer: unknown) => void) {
        this.callback = callback;
      }

      observe(target: Element) {
        this.callback(
          [{ target, contentRect: { width: CHART_WIDTH, height: CHART_HEIGHT } }],
          this,
        );
      }

      unobserve() {}
      disconnect() {}
    },
  );

  Element.prototype.getBoundingClientRect = () => new DOMRect(0, 0, CHART_WIDTH, CHART_HEIGHT);
});

const config = {
  opened: { label: "受付", color: "#111111" },
  closed: { label: "完了", color: "#222222" },
} satisfies ChartConfig;

const themedConfig = {
  opened: { label: "受付", theme: { light: "#111111", dark: "#eeeeee" } },
} satisfies ChartConfig;

const formatLabel = (value: unknown) => `${String(value)} の内訳`;
const formatItem = (value: unknown) => <span>整形済み {String(value)}</span>;

type TooltipItem = NonNullable<ComponentProps<typeof ChartTooltipContent>["payload"]>[number];

/** recharts の payload 要素。必須項目を補い、テストごとの差分だけを渡せるようにする。 */
function tooltipItem(values: Partial<TooltipItem>): TooltipItem {
  return { graphicalItemId: "series", ...values };
}

function tooltipPayload(): TooltipItem[] {
  return [tooltipItem({ dataKey: "opened", name: "opened", value: 186, color: "#111111" })];
}

function StyleFixture({ config: styleConfig }: { config: ChartConfig }) {
  const id = useId();

  return (
    <>
      <span data-generated-id={id} data-testid="generated-id" />
      <ChartStyle config={styleConfig} id={id} />
    </>
  );
}

function ContainerFixture({ children }: { children: React.ReactNode }) {
  const id = useId();

  return (
    <>
      <span data-generated-id={id} data-testid="generated-id" />
      <ChartContainer config={config} id={id}>
        {children}
      </ChartContainer>
    </>
  );
}

function generatedId() {
  return screen.getByTestId("generated-id").getAttribute("data-generated-id") ?? "";
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <ChartContainer config={config}>
      <div>{children}</div>
    </ChartContainer>
  );
}

describe("ChartContainer", () => {
  it("系列定義を受け取り、chart の枠として描画する", () => {
    const { container } = render(
      <ChartContainer config={config} data-testid="chart">
        <div>内容</div>
      </ChartContainer>,
    );

    const chart = container.querySelector("[data-slot='chart']");

    expect(chart).toHaveAttribute("data-testid", "chart");
    expect(chart?.getAttribute("data-chart")).toMatch(/^chart-/);
  });

  it("id を渡すと data-chart に反映する", () => {
    const { container } = render(
      <ContainerFixture>
        <div>内容</div>
      </ContainerFixture>,
    );

    expect(container.querySelector("[data-slot='chart']")).toHaveAttribute(
      "data-chart",
      `chart-${generatedId()}`,
    );
  });

  it("初期の描画領域を呼び出し元が指定できる", () => {
    const { container } = render(
      <ChartContainer config={config} initialDimension={{ width: 640, height: 360 }}>
        <div>内容</div>
      </ChartContainer>,
    );

    expect(container.querySelector("[data-slot='chart']")).toBeInTheDocument();
  });

  it("ChartContainer の外で使うと例外になる", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<ChartLegendContent payload={[]} />)).toThrow(
      "useChart は ChartContainer の配下でのみ使えます。",
    );

    consoleError.mockRestore();
  });
});

describe("ChartStyle", () => {
  it("色を持つ系列を CSS 変数として配る", () => {
    const { container } = render(<StyleFixture config={config} />);

    const css = container.querySelector("[data-slot='chart-style']")?.innerHTML ?? "";

    expect(css).toContain(`[data-chart=${generatedId()}]`);
    expect(css).toContain("--color-opened: #111111;");
    expect(css).toContain("--color-closed: #222222;");
  });

  it("配色モードごとの色を対応する selector へ振り分ける", () => {
    const { container } = render(<StyleFixture config={themedConfig} />);

    const css = container.querySelector("[data-slot='chart-style']")?.innerHTML ?? "";
    const id = generatedId();

    expect(css).toContain(` [data-chart=${id}] {
  --color-opened: #111111;`);
    expect(css).toContain(`.dark [data-chart=${id}] {
  --color-opened: #eeeeee;`);
  });

  it("配色モードごとに色が空なら、その宣言を出さない", () => {
    const { container } = render(
      <StyleFixture
        config={{ opened: { label: "受付", theme: { light: "#111111", dark: "" } } }}
      />,
    );

    const css = container.querySelector("[data-slot='chart-style']")?.innerHTML ?? "";

    expect(css).toContain("--color-opened: #111111;");
    expect(css).toContain(`.dark [data-chart=${generatedId()}] {

}`);
  });

  it("色を持つ系列が無ければ何も描画しない", () => {
    const { container } = render(<StyleFixture config={{ opened: { label: "受付" } }} />);

    expect(container.querySelector("[data-slot='chart-style']")).not.toBeInTheDocument();
  });
});

describe("ChartTooltipContent", () => {
  it("閉じている間は何も描画しない", () => {
    render(
      <Wrapper>
        <ChartTooltipContent active={false} payload={tooltipPayload()} />
      </Wrapper>,
    );

    expect(screen.queryByText("受付")).not.toBeInTheDocument();
  });

  it("系列がひとつも無ければ何も描画しない", () => {
    render(
      <Wrapper>
        <ChartTooltipContent active payload={[]} />
      </Wrapper>,
    );

    expect(screen.queryByText("受付")).not.toBeInTheDocument();
  });

  it("系列の表示名と値を表示する", () => {
    render(
      <Wrapper>
        <ChartTooltipContent active label="opened" payload={tooltipPayload()} />
      </Wrapper>,
    );

    // 見出しと系列名の双方に定義の表示名が出る。
    expect(screen.getAllByText("受付")).toHaveLength(2);
    expect(screen.getByText("186")).toBeVisible();
  });

  it("数値は桁区切りで表示する", () => {
    render(
      <Wrapper>
        <ChartTooltipContent
          active
          payload={[
            tooltipItem({
              dataKey: "opened",
              name: "opened",
              value: 12345,
              color: "#111",
              payload: {},
            }),
          ]}
        />
      </Wrapper>,
    );

    expect(screen.getByText("12,345")).toBeVisible();
  });

  it("hideLabel で見出し行を省く", () => {
    render(
      <Wrapper>
        <ChartTooltipContent active hideLabel label="opened" payload={tooltipPayload()} />
      </Wrapper>,
    );

    expect(screen.getAllByText("受付")).toHaveLength(1);
  });

  it("labelFormatter で見出しを整形する", () => {
    render(
      <Wrapper>
        <ChartTooltipContent
          active
          label="opened"
          labelFormatter={formatLabel}
          payload={tooltipPayload()}
        />
      </Wrapper>,
    );

    expect(screen.getByText("受付 の内訳")).toBeVisible();
  });

  it("formatter を渡すと系列行の描画を委ねる", () => {
    render(
      <Wrapper>
        <ChartTooltipContent active formatter={formatItem} payload={tooltipPayload()} />
      </Wrapper>,
    );

    expect(screen.getByText("整形済み 186")).toBeVisible();
  });

  it("hideIndicator で系列の印を描画しない", () => {
    const { container } = render(
      <Wrapper>
        <ChartTooltipContent active hideIndicator payload={tooltipPayload()} />
      </Wrapper>,
    );

    expect(container.querySelector(".bg-\\(--color-bg\\)")).not.toBeInTheDocument();
  });

  it("indicator が dot 以外で系列がひとつなら見出しを系列行へ入れ子にする", () => {
    const { container } = render(
      <Wrapper>
        <ChartTooltipContent
          active
          indicator={CHART_INDICATOR.DASHED}
          label="opened"
          payload={tooltipPayload()}
        />
      </Wrapper>,
    );

    const content = container.querySelector("[data-slot='chart-tooltip-content']");

    expect(content?.firstElementChild?.className).toContain("grid gap-1.5");
  });

  it("定義にアイコンがあれば印の代わりに描画する", () => {
    render(
      <ChartContainer
        config={{ opened: { label: "受付", color: "#111", icon: () => <span>icon</span> } }}
      >
        <div>
          <ChartTooltipContent active payload={tooltipPayload()} />
        </div>
      </ChartContainer>,
    );

    expect(screen.getByText("icon")).toBeVisible();
  });

  it("nameKey で系列名として読む key を差し替える", () => {
    render(
      <Wrapper>
        <ChartTooltipContent
          active
          nameKey="closed"
          payload={[
            tooltipItem({
              dataKey: "opened",
              name: "opened",
              value: 1,
              color: "#111",
              payload: {},
            }),
          ]}
        />
      </Wrapper>,
    );

    expect(screen.getByText("完了")).toBeVisible();
  });

  it("payload の入れ子から定義名を解決する", () => {
    render(
      <Wrapper>
        <ChartTooltipContent
          active
          nameKey="series"
          payload={[
            tooltipItem({
              dataKey: "x",
              name: "x",
              value: 5,
              color: "#111",
              payload: { series: "closed" },
            }),
          ]}
        />
      </Wrapper>,
    );

    expect(screen.getByText("完了")).toBeVisible();
  });

  it("値が無い系列は数値を描画しない", () => {
    render(
      <Wrapper>
        <ChartTooltipContent
          active
          payload={[tooltipItem({ dataKey: "opened", name: "opened", color: "#111", payload: {} })]}
        />
      </Wrapper>,
    );

    expect(screen.getAllByText("受付").length).toBeGreaterThan(0);
    expect(screen.queryByText("186")).not.toBeInTheDocument();
  });

  it("type が none の系列は表示しない", () => {
    render(
      <Wrapper>
        <ChartTooltipContent
          active
          payload={[
            tooltipItem({
              dataKey: "opened",
              name: "opened",
              value: 1,
              color: "#111",
              payload: {},
            }),
            tooltipItem({
              dataKey: "closed",
              name: "closed",
              value: 2,
              color: "#222",
              payload: {},
              type: "none",
            }),
          ]}
        />
      </Wrapper>,
    );

    expect(screen.getAllByText("受付").length).toBeGreaterThan(0);
    expect(screen.queryByText("完了")).not.toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(
      <Wrapper>
        <ChartTooltipContent active label="opened" payload={tooltipPayload()} />
      </Wrapper>,
    );

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });

  it("見出しの文字列に対応する定義が無ければ、その文字列をそのまま見出しにする", () => {
    render(
      <Wrapper>
        <ChartTooltipContent
          active
          label="未定義の見出し"
          payload={[
            tooltipItem({
              dataKey: "opened",
              name: "opened",
              value: 1,
              color: "#111",
              payload: {},
            }),
          ]}
        />
      </Wrapper>,
    );

    expect(screen.getByText("未定義の見出し")).toBeVisible();
  });

  it("labelKey で見出しとして読む key を差し替える", () => {
    render(
      <Wrapper>
        <ChartTooltipContent
          active
          labelKey="closed"
          payload={[
            tooltipItem({
              dataKey: "opened",
              name: "opened",
              value: 1,
              color: "#111",
              payload: {},
            }),
          ]}
        />
      </Wrapper>,
    );

    expect(screen.getByText("完了")).toBeVisible();
  });

  it("見出しに対応する定義が無ければ見出し行を描画しない", () => {
    const { container } = render(
      <Wrapper>
        <ChartTooltipContent
          active
          labelKey="unknown"
          payload={[
            tooltipItem({
              dataKey: "opened",
              name: "opened",
              value: 1,
              color: "#111",
              payload: {},
            }),
          ]}
        />
      </Wrapper>,
    );

    expect(
      container.querySelector("[data-slot='chart-tooltip-content'] > .font-emphasis"),
    ).not.toBeInTheDocument();
  });

  it("indicator が line のときは細い縦線の印にする", () => {
    const { container } = render(
      <Wrapper>
        <ChartTooltipContent
          active
          indicator={CHART_INDICATOR.LINE}
          payload={[
            tooltipItem({
              dataKey: "opened",
              name: "opened",
              value: 1,
              color: "#111",
              payload: {},
            }),
          ]}
        />
      </Wrapper>,
    );

    expect(container.querySelector(".w-1")).toBeInTheDocument();
  });

  it("dashed かつ系列がひとつのときは印に上下の余白を足す", () => {
    const { container } = render(
      <Wrapper>
        <ChartTooltipContent
          active
          indicator={CHART_INDICATOR.DASHED}
          payload={[
            tooltipItem({
              dataKey: "opened",
              name: "opened",
              value: 1,
              color: "#111",
              payload: {},
            }),
          ]}
        />
      </Wrapper>,
    );

    expect(container.querySelector(".my-0\\.5")).toBeInTheDocument();
  });

  it("color を渡すと印の色を上書きする", () => {
    const { container } = render(
      <Wrapper>
        <ChartTooltipContent
          active
          color="#abcdef"
          payload={[
            tooltipItem({
              dataKey: "opened",
              name: "opened",
              value: 1,
              color: "#111",
              payload: {},
            }),
          ]}
        />
      </Wrapper>,
    );

    expect(container.querySelector("[style*='#abcdef']")).toBeInTheDocument();
  });

  it("payload の fill を印の色として使う", () => {
    const { container } = render(
      <Wrapper>
        <ChartTooltipContent
          active
          payload={[
            tooltipItem({
              dataKey: "opened",
              name: "opened",
              value: 1,
              payload: { fill: "#fedcba" },
            }),
          ]}
        />
      </Wrapper>,
    );

    expect(container.querySelector("[style*='#fedcba']")).toBeInTheDocument();
  });

  it("数値以外の値はそのまま文字列として表示する", () => {
    render(
      <Wrapper>
        <ChartTooltipContent
          active
          payload={[
            tooltipItem({
              dataKey: "opened",
              name: "opened",
              value: "未集計",
              color: "#111",
              payload: {},
            }),
          ]}
        />
      </Wrapper>,
    );

    expect(screen.getByText("未集計")).toBeVisible();
  });

  it("dataKey が無い系列は name を見出しの key として使う", () => {
    render(
      <Wrapper>
        <ChartTooltipContent
          active
          payload={[tooltipItem({ name: "closed", value: 1, color: "#111" })]}
        />
      </Wrapper>,
    );

    expect(screen.getAllByText("完了").length).toBeGreaterThan(0);
  });

  it("dataKey も name も無い系列は既定の key で定義を引く", () => {
    render(
      <ChartContainer config={{ value: { label: "既定", color: "#111" } }}>
        <div>
          <ChartTooltipContent
            active
            payload={[tooltipItem({ value: 1, color: "#111", payload: {} })]}
          />
        </div>
      </ChartContainer>,
    );

    expect(screen.getAllByText("既定").length).toBeGreaterThan(0);
  });

  it("payload の直下にある文字列を定義名として使う", () => {
    render(
      <Wrapper>
        <ChartTooltipContent
          active
          nameKey="dataKey"
          payload={[tooltipItem({ dataKey: "closed", name: "x", value: 3, color: "#111" })]}
        />
      </Wrapper>,
    );

    expect(screen.getAllByText("完了").length).toBeGreaterThan(0);
  });

  it("payload の要素が object でない場合は定義を解決しない", () => {
    const { container } = render(
      <Wrapper>
        <ChartTooltipContent active={false} payload={Array.from<never>({ length: 1 })} />
      </Wrapper>,
    );

    expect(container.querySelector("[data-slot='chart-tooltip-content']")).not.toBeInTheDocument();
  });

  it("定義に無い系列は表示名を持たず、payload の name を表示する", () => {
    render(
      <Wrapper>
        <ChartTooltipContent
          active
          payload={[
            tooltipItem({
              dataKey: "unknown",
              name: "unknown",
              value: 3,
              color: "#111",
              payload: {},
            }),
          ]}
        />
      </Wrapper>,
    );

    expect(screen.getByText("unknown")).toBeVisible();
  });
});

describe("ChartLegendContent", () => {
  it("系列が無ければ何も描画しない", () => {
    const { container } = render(
      <Wrapper>
        <ChartLegendContent payload={[]} />
      </Wrapper>,
    );

    expect(container.querySelector("[data-slot='chart-legend-content']")).not.toBeInTheDocument();
  });

  it("系列の表示名を並べる", () => {
    render(
      <Wrapper>
        <ChartLegendContent
          payload={[
            { dataKey: "opened", value: "opened", color: "#111" },
            { dataKey: "closed", value: "closed", color: "#222" },
          ]}
        />
      </Wrapper>,
    );

    expect(screen.getByText("受付")).toBeVisible();
    expect(screen.getByText("完了")).toBeVisible();
  });

  it("verticalAlign が top のときは下側に余白を置く", () => {
    const { container } = render(
      <Wrapper>
        <ChartLegendContent
          payload={[{ dataKey: "opened", value: "opened", color: "#111" }]}
          verticalAlign="top"
        />
      </Wrapper>,
    );

    expect(container.querySelector("[data-slot='chart-legend-content']")?.className).toContain(
      "pb-3",
    );
  });

  it("定義のアイコンを描画し、hideIcon で色の印へ戻す", () => {
    const iconConfig = {
      opened: { label: "受付", color: "#111", icon: () => <span>icon</span> },
    } satisfies ChartConfig;

    const { rerender } = render(
      <ChartContainer config={iconConfig}>
        <div>
          <ChartLegendContent payload={[{ dataKey: "opened", value: "opened", color: "#111" }]} />
        </div>
      </ChartContainer>,
    );

    expect(screen.getByText("icon")).toBeVisible();

    rerender(
      <ChartContainer config={iconConfig}>
        <div>
          <ChartLegendContent
            hideIcon
            payload={[{ dataKey: "opened", value: "opened", color: "#111" }]}
          />
        </div>
      </ChartContainer>,
    );

    expect(screen.queryByText("icon")).not.toBeInTheDocument();
  });

  it("type が none の系列は表示しない", () => {
    render(
      <Wrapper>
        <ChartLegendContent
          payload={[
            { dataKey: "opened", value: "opened", color: "#111" },
            { dataKey: "closed", value: "closed", color: "#222", type: "none" },
          ]}
        />
      </Wrapper>,
    );

    expect(screen.getByText("受付")).toBeVisible();
    expect(screen.queryByText("完了")).not.toBeInTheDocument();
  });

  it("nameKey で系列名として読む key を差し替える", () => {
    render(
      <Wrapper>
        <ChartLegendContent
          nameKey="closed"
          payload={[{ dataKey: "opened", value: "opened", color: "#111" }]}
        />
      </Wrapper>,
    );

    expect(screen.getByText("完了")).toBeVisible();
  });

  it("dataKey が無い系列は既定の key で定義を引く", () => {
    render(
      <ChartContainer config={{ value: { label: "既定", color: "#111" } }}>
        <div>
          <ChartLegendContent payload={[{ value: "x", color: "#111" }]} />
        </div>
      </ChartContainer>,
    );

    expect(screen.getByText("既定")).toBeVisible();
  });
});

describe("ChartTooltip", () => {
  it("Recharts の Tooltip をそのまま提供する", () => {
    expect(ChartTooltip).toBe(RechartsPrimitive.Tooltip);
  });
});

describe("ChartLegend", () => {
  it("Recharts の Legend をそのまま提供する", () => {
    expect(ChartLegend).toBe(RechartsPrimitive.Legend);
  });
});
