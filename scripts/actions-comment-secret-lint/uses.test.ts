import { describe, expect, it } from "vitest";

import { parseWorkflowDocument } from "../lib/workflow-files";
import { collectUses, collectUsesFromValue, toJS } from "./uses";

describe("toJS", () => {
  // ----- 正常系 -----
  it("alias を展開した JS 値を返す", () => {
    const source = [
      "defaults: &defaults",
      "  uses: owner/action@v1",
      "steps:",
      "  - *defaults",
    ].join("\n");

    expect(toJS("workflow.yaml", parseWorkflowDocument("workflow.yaml", source))).toEqual({
      defaults: { uses: "owner/action@v1" },
      steps: [{ uses: "owner/action@v1" }],
    });
  });

  // ----- 異常系 -----
  it("解決できない YAML にファイル名を添えて投げる", () => {
    const doc = parseWorkflowDocument("workflow.yaml", "steps: []");
    doc.toJS = () => {
      throw new Error("循環参照");
    };

    expect(() => toJS("workflow.yaml", doc)).toThrow(
      "workflow.yaml: YAML を解決できません: 循環参照",
    );
  });
});

describe("collectUses", () => {
  // ----- 正常系 -----
  it("階層の深さによらず uses の値を集める", () => {
    const source = [
      "jobs:",
      "  build:",
      "    steps:",
      "      - uses: actions/checkout@v7",
      "      - uses: ./.github/actions/setup",
    ].join("\n");

    expect(collectUses("workflow.yaml", source)).toEqual([
      "actions/checkout@v7",
      "./.github/actions/setup",
    ]);
  });

  it("マージキー経由で書かれた uses も集める", () => {
    const source = [
      "defaults: &defaults",
      "  uses: owner/action@v1",
      "jobs:",
      "  build:",
      "    steps:",
      "      - <<: *defaults",
    ].join("\n");

    expect(collectUses("workflow.yaml", source)).toEqual(["owner/action@v1", "owner/action@v1"]);
  });

  // ----- 異常系 -----
  it("uses を持たない定義では空を返す", () => {
    expect(
      collectUses("workflow.yaml", "jobs:\n  build:\n    steps:\n      - run: echo\n"),
    ).toEqual([]);
  });
});

describe("collectUsesFromValue", () => {
  // ----- 正常系 -----
  it("配列とオブジェクトを再帰して uses を集める", () => {
    const found: string[] = [];

    collectUsesFromValue([{ steps: [{ uses: "owner/a@v1" }, { uses: "owner/b@v2" }] }], found);

    expect(found).toEqual(["owner/a@v1", "owner/b@v2"]);
  });

  it("渡された配列へ追記する", () => {
    const found = ["既存"];

    collectUsesFromValue({ uses: "owner/a@v1" }, found);

    expect(found).toEqual(["既存", "owner/a@v1"]);
  });

  // ----- 異常系 -----
  it("uses の値が文字列でなければ集めない", () => {
    const found: string[] = [];

    collectUsesFromValue({ uses: { name: "owner/a@v1" } }, found);

    expect(found).toEqual([]);
  });

  it("null と原始値では何も集めない", () => {
    const found: string[] = [];

    collectUsesFromValue(null, found);
    collectUsesFromValue("uses", found);
    collectUsesFromValue(42, found);

    expect(found).toEqual([]);
  });
});
