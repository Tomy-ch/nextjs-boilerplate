import { describe, expect, it } from "vitest";

import { type Change, decideTrigger, parseNumstat } from "./trigger";

/** 変更 1 件。既定は量に数えられるパス。 */
function change(path: string, changedLines = 1): Change {
  return { path, changedLines };
}

describe("decideTrigger", () => {
  // ----- 正常系 -----
  it("画面の宣言が動いていれば、理由を添えて待たずに測る", () => {
    expect(decideTrigger([change("e2e/lib/screens.ts")], 100)).toEqual({
      kind: "force",
      reasons: ["画面の宣言が動いています。まだ一度も測られていない画面があるかもしれません"],
    });
  });

  it("器が動いていれば、理由を添えて待たずに測る", () => {
    expect(decideTrigger([change("src/app/(shop)/layout.tsx")], 100)).toMatchObject({
      kind: "force",
      reasons: ["器（layout）が動いています。全ての画面がこれを通ります"],
    });
  });

  it("器が複数動いても理由は 1 つに畳む", () => {
    const trigger = decideTrigger(
      [change("src/app/layout.tsx"), change("src/app/admin/layout.tsx")],
      100,
    );

    expect(trigger).toMatchObject({ kind: "force" });
    expect(trigger.kind === "force" && trigger.reasons).toHaveLength(1);
  });

  it("宣言と器の両方が動けば理由を 2 つとも挙げる", () => {
    const trigger = decideTrigger(
      [change("e2e/lib/screens.ts"), change("src/app/layout.tsx")],
      100,
    );

    expect(trigger.kind === "force" && trigger.reasons).toHaveLength(2);
  });

  it("量が線に届かなければ、保護ブランチの計測に任せる", () => {
    expect(decideTrigger([change("src/features/cart/cart.ts", 99)], 100)).toEqual({ kind: "skip" });
  });

  it("量が線に届けば知らせる", () => {
    expect(decideTrigger([change("src/features/cart/cart.ts", 100)], 100)).toEqual({
      kind: "alert",
      changedLines: 100,
    });
  });

  it("量は token とロジックを合わせて数える", () => {
    expect(
      decideTrigger(
        [change("tokens/primitives.json", 60), change("src/app/(shop)/page.tsx", 40)],
        100,
      ),
    ).toEqual({ kind: "alert", changedLines: 100 });
  });

  it("描かれるものを変えないファイルは量に数えない", () => {
    expect(
      decideTrigger(
        [
          change("src/features/cart/cart.test.ts", 500),
          change("src/features/cart/cart.stories.tsx", 500),
          change("src/features/cart/README.md", 500),
        ],
        100,
      ),
    ).toEqual({ kind: "skip" });
  });

  it("描画に届かない場所の変更は、どれだけ大きくても数えない", () => {
    expect(decideTrigger([change("docs/adr/0101-performance-budget.md", 900)], 100)).toEqual({
      kind: "skip",
    });
  });

  it("強制は量より優先する", () => {
    expect(decideTrigger([change("src/app/layout.tsx", 1)], 100)).toMatchObject({ kind: "force" });
  });

  it("変更が 1 つも無ければ、保護ブランチの計測に任せる", () => {
    expect(decideTrigger([], 100)).toEqual({ kind: "skip" });
  });
});

describe("parseNumstat", () => {
  // ----- 正常系 -----
  it("増えた行と減った行を足して数える", () => {
    expect(parseNumstat("12\t3\tsrc/app/page.tsx")).toEqual([
      { path: "src/app/page.tsx", changedLines: 15 },
    ]);
  });

  it("複数行を読む", () => {
    expect(parseNumstat("1\t0\ta.ts\n2\t2\tb.ts")).toEqual([
      { path: "a.ts", changedLines: 1 },
      { path: "b.ts", changedLines: 4 },
    ]);
  });

  it("行数を持たない二進ファイルは 0 として数える", () => {
    expect(parseNumstat("-\t-\tpublic/logo.png")).toEqual([
      { path: "public/logo.png", changedLines: 0 },
    ]);
  });

  // ----- 異常系 -----
  it("列の揃わない行は落とす", () => {
    expect(parseNumstat("こわれた行\n1\t0\ta.ts\n")).toEqual([{ path: "a.ts", changedLines: 1 }]);
  });

  it("空の出力なら空を返す", () => {
    expect(parseNumstat("")).toEqual([]);
  });
});
