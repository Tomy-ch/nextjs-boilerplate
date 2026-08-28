import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type { Change } from "../lib/numstat";
import { CHECKS, pending, recommend } from "./recommend";

/** リポジトリが実際に作るラベルの名前。 */
function declaredLabels(): string[] {
  const declaration: unknown = JSON.parse(readFileSync(".github/settings/labels.json", "utf8"));

  return (declaration as { readonly name: string }[]).map((label) => label.name);
}

/** 変更 1 件。 */
function change(path: string, changedLines = 1): Change {
  return { path, changedLines };
}

/** 名指しされたラベル。 */
function labelsOf(changes: readonly Change[], labels: readonly string[] = []): string[] {
  return recommend(changes, labels).map((recommendation) => recommendation.label);
}

describe("CHECKS", () => {
  // ----- 正常系 -----
  it("勧めるラベルは 3 つで、宣言の順に並ぶ", () => {
    expect(CHECKS.map((check) => check.label)).toStrictEqual([
      "run-a11y",
      "run-e2e",
      "run-lighthouse",
    ]);
  });

  it("勧めるラベルは、リポジトリが実際に作るラベルとして宣言されている", () => {
    expect(declaredLabels()).toEqual(expect.arrayContaining(CHECKS.map((check) => check.label)));
  });

  it("表の升目に区切り文字を含まない", () => {
    for (const check of CHECKS) {
      expect(`${check.runs}${check.duration}`).not.toContain("|");

      for (const rule of check.rules) expect(rule.reason).not.toContain("|");
    }
  });
});

describe("recommend", () => {
  // ----- 正常系 -----
  it("story が動けば axe を勧める", () => {
    expect(labelsOf([change("src/features/cart/cart-view.stories.tsx")])).toStrictEqual([
      "run-a11y",
    ]);
  });

  it("全ての story が通る器が動けば axe を勧める", () => {
    expect(labelsOf([change(".storybook/preview.tsx")])).toStrictEqual(["run-a11y"]);
  });

  it("全てのリクエストが通る proxy が動けばジャーニーを勧める", () => {
    expect(labelsOf([change("src/proxy.ts")])).toStrictEqual(["run-e2e"]);
  });

  it("mock の応答が動けばジャーニーを勧める", () => {
    expect(labelsOf([change("mocks/api/products.ts")])).toStrictEqual(["run-e2e"]);
  });

  it("書体が動けば計測を勧める", () => {
    expect(labelsOf([change("src/app/fonts.ts")])).toStrictEqual(["run-lighthouse"]);
  });

  it("配色と寸法を兼ねる宣言は、axe と計測の両方を勧める", () => {
    expect(labelsOf([change("tokens/themes/user/color.json")])).toStrictEqual([
      "run-a11y",
      "run-lighthouse",
    ]);
  });

  it("理由が複数当たれば、宣言の順に並べて全て挙げる", () => {
    const [recommendation] = recommend(
      [change("src/proxy.ts"), change("e2e/lib/screens.ts")],
      ["run-a11y", "run-lighthouse"],
    );

    expect(recommendation?.reasons).toStrictEqual([
      "全てのリクエストが通る proxy が動いています",
      "ジャーニーと画面の宣言そのものが動いています",
    ]);
  });

  it("回るものと目安を、コメントが読める形で添える", () => {
    expect(recommend([change("src/proxy.ts")], [])).toStrictEqual([
      {
        label: "run-e2e",
        runs: "主要ジャーニーと画面の比較",
        duration: "約 5 分",
        reasons: ["全てのリクエストが通る proxy が動いています"],
      },
    ]);
  });

  it("story の並べ方を決める設定が動けば axe を勧める", () => {
    expect(labelsOf([change(".storybook/main.ts")])).toStrictEqual(["run-a11y"]);
    expect(labelsOf([change(".storybook/preview.css")])).toStrictEqual(["run-a11y"]);
  });

  it("カタログ自身が持つ story が動けば axe を勧める", () => {
    expect(labelsOf([change(".storybook/design-token.stories.tsx")])).toStrictEqual(["run-a11y"]);
  });

  it("ジャーニーの手順そのものが動けばジャーニーを勧める", () => {
    expect(labelsOf([change("e2e/journeys/browse.spec.ts")])).toStrictEqual(["run-e2e"]);
  });

  it("入れ子の画面の器が動けばジャーニーを勧める", () => {
    expect(labelsOf([change("src/app/(shop)/layout.tsx")])).toStrictEqual(["run-e2e"]);
  });

  it("配信ヘッダと画像・バンドルの既定を兼ねる設定は、ジャーニーと計測の両方を勧める", () => {
    expect(labelsOf([change("next.config.ts")])).toStrictEqual(["run-e2e", "run-lighthouse"]);
  });

  it("配信ヘッダの組み立てが動けばジャーニーを勧める", () => {
    expect(labelsOf([change("src/config/security-headers/security-headers.ts")])).toStrictEqual([
      "run-e2e",
    ]);
  });

  it("変更が 1 つも無ければ、どれも勧めない", () => {
    expect(labelsOf([])).toStrictEqual([]);
  });

  // ----- 異常系 -----
  it("挙げていないパスは、どれも勧めない", () => {
    expect(
      labelsOf([change("docs/adr/0153-ci-configuration.md"), change("Makefile")]),
    ).toStrictEqual([]);
  });

  it("単体テストと散文は、当たるパスにあっても勧めない", () => {
    expect(labelsOf([change("mocks/handlers.test.ts"), change("tokens/README.md")])).toStrictEqual(
      [],
    );
  });

  it("既に付いているラベルは、その検査だけを落とす", () => {
    const changes = [change("src/features/cart/cart-view.stories.tsx"), change("src/proxy.ts")];

    expect(labelsOf(changes)).toStrictEqual(["run-a11y", "run-e2e"]);
    expect(labelsOf(changes, ["run-a11y"])).toStrictEqual(["run-e2e"]);
  });

  it("器が動いて lighthouse が自分で測ると決めた差分では、計測のラベルを勧めない", () => {
    expect(labelsOf([change("src/app/layout.tsx"), change("src/app/fonts.ts")])).toStrictEqual([
      "run-e2e",
    ]);
  });
});

describe("pending", () => {
  // ----- 正常系 -----
  it("ラベルが 1 枚も無ければ 3 つとも挙げる", () => {
    expect(pending([]).map((check) => check.label)).toStrictEqual([
      "run-a11y",
      "run-e2e",
      "run-lighthouse",
    ]);
  });

  it("回るものと目安だけを渡し、理由は持たない", () => {
    expect(pending(["run-a11y", "run-lighthouse"])).toStrictEqual([
      { label: "run-e2e", runs: "主要ジャーニーと画面の比較", duration: "約 5 分" },
    ]);
  });

  // ----- 異常系 -----
  it("3 つとも付いていれば 1 つも挙げない", () => {
    expect(pending(["run-a11y", "run-e2e", "run-lighthouse"])).toStrictEqual([]);
  });
});
