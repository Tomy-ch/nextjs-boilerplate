import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from "react";

import { PRIMITIVE_TOKEN, SEMANTIC_TOKEN } from "@/model/generated/design-token";

import { contrastRatio } from "./lib/contrast";

/** 変数 1 つの読み取り結果。宣言と、色として解決した結果の両方を持つ。 */
type Resolved = {
  /** SSOT に書かれている値。`color-mix()` のような組み立ても、そのまま見えるようにする。 */
  declared: string;
  /** 色として使ったときに実際に出る色。比を測れるのはこちらだけ。 */
  color: string;
};

/**
 * 実行時に解決した CSS 変数の値。
 *
 * @remarks
 * 読むのは mount のときだけです。配色と系統が変わったときは画面ごと作り直します（story 側の
 * `key`）。effect の依存に配色を並べても、読む変数の一覧は変わらないため依存として成立しません。
 */
function useResolved(variables: readonly string[]): Record<string, Resolved> {
  const [values, setValues] = useState<Record<string, Resolved>>({});

  useEffect(() => {
    const probe = document.createElement("div");
    probe.style.cssText = "position:absolute;visibility:hidden";
    document.body.append(probe);
    const resolved: Record<string, Resolved> = {};
    for (const variable of variables) {
      probe.style.setProperty("--probe", `var(${variable})`);
      probe.style.color = `var(${variable})`;
      resolved[variable] = {
        declared: getComputedStyle(probe).getPropertyValue("--probe").trim(),
        color: getComputedStyle(probe).color,
      };
    }
    probe.remove();
    setValues(resolved);
  }, [variables]);

  return values;
}

const cell: CSSProperties = {
  padding: "0.5rem 0.75rem",
  borderBottom: "1px solid var(--semantic-color-border)",
  textAlign: "left",
  verticalAlign: "middle",
};

const mono: CSSProperties = {
  ...cell,
  fontFamily: "var(--semantic-font-mono)",
  fontSize: "0.8125rem",
};

function Section({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section style={{ marginBlockEnd: "2.5rem" }}>
      <h2 style={{ fontWeight: "var(--semantic-font-weight-strong)", fontSize: "1.125rem" }}>
        {title}
      </h2>
      <p style={{ color: "var(--semantic-color-muted-foreground)", fontSize: "0.875rem" }}>
        {note}
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBlockStart: "0.75rem" }}>
        {children}
      </table>
    </section>
  );
}

function ColorRows({
  names,
  prefix,
  ground,
}: {
  names: readonly string[];
  prefix: string;
  /** 比を測る地。生スケールの表は地の token を含まないため、外から受け取る。 */
  ground: string;
}) {
  const variables = useMemo(() => names.map((name) => `${prefix}${name}`), [names, prefix]);
  const values = useResolved(variables);

  return (
    <tbody>
      {names.map((name, index) => {
        const variable = variables[index] as string;
        const resolved = values[variable];
        const ratio =
          ground === "" || resolved === undefined ? null : contrastRatio(resolved.color, ground);

        return (
          <tr key={name}>
            <td style={cell}>
              <div
                style={{
                  width: "3rem",
                  height: "1.75rem",
                  background: `var(${variable})`,
                  border: "1px solid var(--semantic-color-border)",
                  borderRadius: "var(--radius-sm)",
                }}
              />
            </td>
            <td style={cell}>{name}</td>
            <td style={mono}>{variable}</td>
            <td style={mono}>{resolved?.declared ?? ""}</td>
            <td style={mono}>{ratio === null ? "—" : `${ratio.toFixed(2)}:1`}</td>
          </tr>
        );
      })}
    </tbody>
  );
}

const HEAD = (labels: readonly string[]) => (
  <thead>
    <tr>
      {labels.map((label) => (
        <th
          key={label}
          style={{
            ...cell,
            color: "var(--semantic-color-muted-foreground)",
            fontWeight: "var(--semantic-font-weight-emphasis)",
            fontSize: "0.8125rem",
          }}
        >
          {label}
        </th>
      ))}
    </tr>
  </thead>
);

const GROUND_VARIABLES = ["--semantic-color-background"];
const FONT_VARIABLES = SEMANTIC_TOKEN.font.map((name) => `--semantic-font-${name}`);
const WEIGHT_VARIABLES = SEMANTIC_TOKEN["font-weight"].map(
  (name) => `--semantic-font-weight-${name}`,
);

function Catalog() {
  const ground = useResolved(GROUND_VARIABLES)["--semantic-color-background"]?.color ?? "";
  const fonts = useResolved(FONT_VARIABLES);
  const weights = useResolved(WEIGHT_VARIABLES);

  return (
    <div
      style={{
        padding: "1.5rem",
        color: "var(--semantic-color-foreground)",
        background: "var(--semantic-color-background)",
        minHeight: "100vh",
      }}
    >
      <Section
        title="Tone（意味トークン）"
        note="部品が参照する層。地（background）に対する比を添えてある。"
      >
        {HEAD(["", "名前", "変数", "解決した値", "地との比"])}
        <ColorRows ground={ground} names={SEMANTIC_TOKEN.color} prefix="--semantic-color-" />
      </Section>

      <Section
        title="Palette（生スケール）"
        note="意味トークンが参照する側。部品からは直接参照しない。"
      >
        {HEAD(["", "名前", "変数", "解決した値", "地との比"])}
        <ColorRows ground={ground} names={PRIMITIVE_TOKEN.color} prefix="--color-" />
      </Section>

      <Section
        title="Typography"
        note="本文書体は系統で替わる。強調は段の名前で持つ。brand はラテンの字しか持たないため、見本の和文は次の書体へ落ちる。"
      >
        {HEAD(["見本", "名前", "変数", "解決した値"])}
        <tbody>
          {SEMANTIC_TOKEN.font.map((name) => (
            <tr key={name}>
              <td
                style={{
                  ...cell,
                  fontFamily: `var(--semantic-font-${name})`,
                  fontSize: "1.125rem",
                }}
              >
                Sample 見本 0123
              </td>
              <td style={cell}>{name}</td>
              <td style={mono}>{`--semantic-font-${name}`}</td>
              <td style={mono}>{fonts[`--semantic-font-${name}`]?.declared ?? ""}</td>
            </tr>
          ))}
          {SEMANTIC_TOKEN["font-weight"].map((name) => (
            <tr key={name}>
              <td
                style={{
                  ...cell,
                  fontWeight: `var(--semantic-font-weight-${name})`,
                  fontSize: "1.125rem",
                }}
              >
                Sample 見本 0123
              </td>
              <td style={cell}>{name}</td>
              <td style={mono}>{`--semantic-font-weight-${name}`}</td>
              <td style={mono}>{weights[`--semantic-font-weight-${name}`]?.declared ?? ""}</td>
            </tr>
          ))}
          {PRIMITIVE_TOKEN.tracking.map((name) => (
            <tr key={name}>
              <td
                style={{ ...cell, letterSpacing: `var(--tracking-${name})`, fontSize: "1.125rem" }}
              >
                Sample 見本
              </td>
              <td style={cell}>{`tracking / ${name}`}</td>
              <td style={mono}>{`--tracking-${name}`}</td>
              <td style={mono} />
            </tr>
          ))}
        </tbody>
      </Section>

      <Section
        title="Light（発光）"
        note="forced-colors では box-shadow が消えるため、状態の唯一の手掛かりにしない。"
      >
        {HEAD(["見本", "名前", "変数", ""])}
        <tbody>
          {SEMANTIC_TOKEN.shadow.map((name) => (
            <tr key={name}>
              <td style={cell}>
                <div
                  style={{
                    width: "6rem",
                    height: "2.5rem",
                    background: "var(--semantic-color-card)",
                    border: "1px solid var(--semantic-color-border)",
                    borderRadius: "var(--radius-md)",
                    boxShadow: `var(--semantic-shadow-${name})`,
                  }}
                />
              </td>
              <td style={cell}>{name}</td>
              <td style={mono}>{`--semantic-shadow-${name}`}</td>
              <td style={cell} />
            </tr>
          ))}
          {SEMANTIC_TOKEN["text-shadow"].map((name) => (
            <tr key={name}>
              <td
                style={{
                  ...cell,
                  textShadow: `var(--semantic-text-shadow-${name})`,
                  fontSize: "1.25rem",
                }}
              >
                Sample 見本
              </td>
              <td style={cell}>{name}</td>
              <td style={mono}>{`--semantic-text-shadow-${name}`}</td>
              <td style={cell} />
            </tr>
          ))}
        </tbody>
      </Section>

      <Section
        title="Shape"
        note="角丸は段を欠かさず定義する。欠けた段は Tailwind の既定へ落ちる。"
      >
        {HEAD(["見本", "名前", "変数", ""])}
        <tbody>
          {PRIMITIVE_TOKEN.radius.map((name) => (
            <tr key={name}>
              <td style={cell}>
                <div
                  style={{
                    width: "3rem",
                    height: "1.75rem",
                    background: "var(--semantic-color-accent)",
                    borderRadius: `var(--radius-${name})`,
                  }}
                />
              </td>
              <td style={cell}>{`radius / ${name}`}</td>
              <td style={mono}>{`--radius-${name}`}</td>
              <td style={cell} />
            </tr>
          ))}
        </tbody>
      </Section>
    </div>
  );
}

/**
 * いま効いている design token の全件。
 *
 * 名前は SSOT（`tokens/`）から生成された目録が持ち、値はこの画面が実行時に CSS から読みます。
 * 表に値を書き写していないので、token を足しても替えても、この画面は自動で追従します。
 *
 * ツールバーの **Theme**（配色）と **Surface**（系統）を切り替えると、同じ token が何に解決される
 * かが入れ替わります。4 通りすべてをここで見比べられます。
 */
const meta = {
  title: "Tokens/Catalog",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "いま効いている design token の全件。名前は SSOT から生成し、値は実行時に CSS から読む。",
      },
    },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

/** 現在の配色と系統で解決された token の全件。 */
export const Default: Story = {
  render: (_args, context) => (
    // 配色と系統が変わったら作り直す。解決済みの値を読むのは mount のときだけなので、同じ木を
    // 使い回すと切り替えても前の値が残る。
    <Catalog key={`${String(context.globals.theme)}/${String(context.globals.surface)}`} />
  ),
};
