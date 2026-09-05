import { describe, expect, it } from "vitest";

import type { Change } from "../lib/numstat";
import { decideTrigger } from "./trigger";

/** 変更 1 件。 */
function change(path: string, changedLines = 1): Change {
  return { path, changedLines };
}

/** 器が動いたときの理由。 */
const SHELL_REASON =
  "器（layout と、それが組む shell の部品）が動いています。全ての画面がこれを通ります";

describe("decideTrigger", () => {
  // ----- 正常系 -----
  it("器が動いていれば、理由を添えて待たずに回す", () => {
    expect(decideTrigger([change("src/app/(main)/layout.tsx")])).toEqual({
      kind: "force",
      reasons: [SHELL_REASON],
    });
  });

  it("器を組む shell の部品が動いていても待たずに回す", () => {
    expect(decideTrigger([change("src/components/shell/app-shell/app-shell.tsx")])).toEqual({
      kind: "force",
      reasons: [SHELL_REASON],
    });
  });

  it("土台の CSS が動いていれば待たずに回す", () => {
    expect(decideTrigger([change("src/app/globals.css")])).toMatchObject({ kind: "force" });
  });

  it("foundation の CSS も土台として扱う", () => {
    expect(
      decideTrigger([change("src/components/design-system/foundation/reset/reset.css")]),
    ).toMatchObject({ kind: "force" });
  });

  it("画面の宣言が動いていれば待たずに回す", () => {
    expect(decideTrigger([change("e2e/lib/screens.ts")])).toMatchObject({
      kind: "force",
      reasons: ["画面の宣言が動いています。まだ基準画像を持たない画面があるかもしれません"],
    });
  });

  it("器が複数動いても理由は 1 つに畳む", () => {
    const trigger = decideTrigger([
      change("src/app/layout.tsx"),
      change("src/app/admin/layout.tsx"),
    ]);

    expect(trigger).toMatchObject({ kind: "force" });
    expect(trigger.kind === "force" && trigger.reasons).toHaveLength(1);
  });

  it("種類の違う 3 つが動けば理由を 3 つとも挙げる", () => {
    const trigger = decideTrigger([
      change("src/app/layout.tsx"),
      change("src/app/globals.css"),
      change("e2e/lib/screens.ts"),
    ]);

    expect(trigger.kind === "force" && trigger.reasons).toHaveLength(3);
  });

  it("器の 1 行だけの変更でも待たずに回す", () => {
    expect(decideTrigger([change("src/app/layout.tsx", 1)])).toMatchObject({ kind: "force" });
  });

  it("変更が 1 つも無ければ、保護ブランチの実行に任せる", () => {
    expect(decideTrigger([])).toEqual({ kind: "skip" });
  });

  // ----- 異常系 -----
  it("見た目から画面を動かすと分かる差分は、ラベルの側に残す", () => {
    expect(
      decideTrigger([
        change("mocks/handlers/reports.ts", 900),
        change("e2e/journeys/settings.spec.ts", 900),
        change("src/proxy.ts", 900),
      ]),
    ).toEqual({ kind: "skip" });
  });

  it("app 配下でも layout.tsx でなければ器として扱わない", () => {
    expect(decideTrigger([change("src/app/(main)/page.tsx", 900)])).toEqual({ kind: "skip" });
  });

  it("`layout` を名前に含むだけのファイルは器として扱わない", () => {
    expect(decideTrigger([change("src/app/report-layout.tsx", 500)])).toEqual({ kind: "skip" });
  });

  it("app の外に置かれた layout.tsx は器として扱わない", () => {
    expect(decideTrigger([change("src/components/layout.tsx", 500)])).toEqual({ kind: "skip" });
  });

  it("foundation の外の CSS は土台として扱わない", () => {
    expect(
      decideTrigger([change("src/components/design-system/overlay/sheet/sheet.css", 500)]),
    ).toEqual({ kind: "skip" });
  });

  it("末尾が一致するだけのパスは画面の宣言と見なさない", () => {
    expect(decideTrigger([change("packages/e2e/lib/screens.ts", 500)])).toEqual({ kind: "skip" });
  });
});
