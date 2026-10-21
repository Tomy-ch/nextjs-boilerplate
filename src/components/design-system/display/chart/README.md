# Chart

## Purpose

Displays trends and breakdowns of aggregated values with per-series color and shape. It complements trends and comparisons that number cards and tables do not reveal.

## Role and Public Components

| Component / Type | Role |
| --- | --- |
| `ChartContainer` | The client-side root that gives the series definitions and the drawing area to what is beneath it. It distributes colors as CSS variables. |
| `ChartTooltip` | The tooltip that shows the series values at the hover position. Its content is passed to `content`. |
| `ChartTooltipContent` | The tooltip's content. Lays out series names, color markers and values. |
| `ChartLegend` | The legend showing the mapping between series names and colors. Its content is passed to `content`. |
| `ChartLegendContent` | The legend's content. Lays out series markers and display names. |
| `ChartStyle` | The `style` element that distributes series colors as CSS variables. `ChartContainer` renders it internally. |
| `ChartConfig` | The definition of each series' display name, color and icon. |

`CHART_INDICATOR` / `ChartIndicator` and `CHART_THEME_SELECTORS` / `ChartTheme` are exported from `chart.definition.ts`. This definition owns the values that can be given to `indicator`, and callers do not write strings such as `"dashed"` directly.

## Use Cases

- Showing the trend of counts per period with lines or bars
- Comparing the magnitudes of several series side by side

## Responsibility Boundaries

recharts needs the actual DOM dimensions to render, so it is a client island that needs hydration. It cannot be rendered directly from a Server Component.

It does not own fetching, aggregating or sorting data. The caller passes an array already shaped for rendering. It does not own axis ticks or formats either, so pass dates and amounts as values formatted through the formatters in `model/`.

Each key of `config` matches a series name in the data. Colors are distributed beneath it as `--color-<key>` CSS variables, so on the recharts side they are referenced as `var(--color-<key>)`.

`ChartStyle` writes out a stylesheet with `dangerouslySetInnerHTML`. There is no other way to distribute series colors beneath it as CSS variables, and it assumes the colors in `config` are constants written by developers. **Do not pass user input or API responses as colors.**

### Do not make the chart the only means of conveying information

A chart conveys information through shape and color, so some users cannot read it from that alone. Always place alongside it a number table or summary that reaches the same content. The `WithDataTable` story is that composition.

`ChartTooltipContent` appears only while the pointer is over it, so touch environments and keyboard users cannot reach it. Do not put information that can be read only in the tooltip.

## When Not to Use It

If all you draw is a single series' bars starting at 0 and their axis, do not adopt this component; draw it with elements and CSS. Otherwise everyone who opens the screen pays for loading and evaluating recharts while none of the coordinate system, legend, tooltip or animation is used. Adopt it when the full plotting set is needed: overlaying series, reading values' positions against an axis, or pulling series values with the pointer.

## Storybook and Tests

Storybook checks a multi-series bar chart, a line chart, making the tooltip's marker dashed, and the composition with a number table of the same content placed alongside.

Tests check `ChartContainer` adding `data-chart` and reflecting `id`, `ChartStyle`'s CSS variable output and its split by color mode, the case with no series that has a color, `ChartTooltipContent`'s opening/closing, display names and values, digit grouping, each branch of `hideLabel` / `labelFormatter` / `formatter` / `hideIndicator` / `indicator`, resolving definitions by `nameKey` / `labelKey`, series with no value, series whose `type` is `none`, `ChartLegendContent`'s display names, `verticalAlign` and switching icons, the exception when used outside `ChartContainer`, and automated a11y checks.

jsdom always reports element dimensions as 0 and has no `ResizeObserver`, so recharts does not render children. The test side stubs a `ResizeObserver` and `getBoundingClientRect` that return actual dimensions. This is not addressed by removing that dependency from the implementation.
