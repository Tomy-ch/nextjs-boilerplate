import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  IMPLEMENTATION_TASK_HEADING,
  IMPLEMENTATION_TASK_LABEL,
  type IssueBody,
  missingRequiredFields,
  REQUIRED_HEADINGS,
} from "./required-fields";

function issue(overrides: Partial<IssueBody> = {}): IssueBody {
  return {
    number: 1,
    title: "何かを作る",
    body: "### 目的\n\nあれ\n\n### 強制手段\n\nテスト\n\n### 完了条件\n\n緑",
    labels: [IMPLEMENTATION_TASK_LABEL],
    ...overrides,
  };
}

describe("missingRequiredFields", () => {
  // ----- 正常系 -----
  it("必須の見出しが揃っていれば何も返さない", () => {
    expect(missingRequiredFields([issue()])).toEqual([]);
  });

  it("欠けている見出しを、issue と組にして返す", () => {
    expect(
      missingRequiredFields([issue({ body: "### 目的\n\nあれ\n\n### 完了条件\n\n緑" })]),
    ).toEqual([{ number: 1, title: "何かを作る", field: "強制手段" }]);
  });

  it("1 件が複数を欠けば、その数だけ返す", () => {
    expect(missingRequiredFields([issue({ body: "本文だけ" })])).toHaveLength(
      REQUIRED_HEADINGS.length,
    );
  });

  it("実装タスクのラベルが無いものは見ない。テンプレートが違えば必須も違う", () => {
    expect(missingRequiredFields([issue({ labels: ["bug"], body: "本文だけ" })])).toEqual([]);
  });

  it("ラベルが無くても、雛形の見出しを持つ本文は見る", () => {
    expect(
      missingRequiredFields([
        issue({ labels: [], body: `### ${IMPLEMENTATION_TASK_HEADING}\n\n- 0144` }),
      ]),
    ).toHaveLength(REQUIRED_HEADINGS.length);
  });

  it("タイトルの形では判定しない。ラベルが付いていれば見る", () => {
    expect(
      missingRequiredFields([issue({ title: "[bug] 何かを直す", body: "本文だけ" })]),
    ).toHaveLength(REQUIRED_HEADINGS.length);
  });

  it("issue が無ければ空を返す", () => {
    expect(missingRequiredFields([])).toEqual([]);
  });

  // ----- 異常系 -----
  it("見出しの綴りが違うものは、書かれていないものとして扱う", () => {
    // 「## 強制手段」（見出しの段が違う）はテンプレートが作る形ではない。
    expect(
      missingRequiredFields([issue({ body: "### 目的\n\n## 強制手段\n\n### 完了条件" })]),
    ).toEqual([{ number: 1, title: "何かを作る", field: "強制手段" }]);
  });
});

describe("IMPLEMENTATION_TASK_LABEL", () => {
  // ----- 正常系 -----
  it("雛形と workflow が同じラベル名と見出しを持つ", () => {
    const template = readFileSync(".github/ISSUE_TEMPLATE/implementation_task.yaml", "utf8");
    const workflow = readFileSync(".github/workflows/issue-field-lint.yaml", "utf8");

    expect(template).toContain(`labels: ["${IMPLEMENTATION_TASK_LABEL}"]`);
    expect(template).toContain(`label: ${IMPLEMENTATION_TASK_HEADING}`);
    expect(workflow).toContain(`'${IMPLEMENTATION_TASK_LABEL}'`);
    expect(workflow).toContain(`'### ${IMPLEMENTATION_TASK_HEADING}'`);
  });
});
