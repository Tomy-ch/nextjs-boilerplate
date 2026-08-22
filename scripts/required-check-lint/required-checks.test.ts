import { describe, expect, it } from "vitest";

import {
  findViolations,
  readRequiredContexts,
  readWorkflowContexts,
  type WorkflowContexts,
} from "./required-checks";

/** 必須チェックの規則を 1 つ持つ ruleset の宣言。 */
function settings(contexts: unknown): string {
  return JSON.stringify({
    rules: [
      { type: "deletion" },
      { type: "required_status_checks", parameters: { required_status_checks: contexts } },
    ],
  });
}

/** すべての PR で報告する workflow。 */
function workflow(overrides: Partial<WorkflowContexts> = {}): WorkflowContexts {
  return {
    file: ".github/workflows/lint.yaml",
    jobs: [{ context: "lint", matrix: false, reusable: false }],
    pullRequest: { filters: [], types: null },
    ...overrides,
  };
}

describe("readRequiredContexts", () => {
  // ----- 正常系 -----
  it("必須チェックの規則から context 名を順に読む", () => {
    expect(readRequiredContexts(settings([{ context: "lint" }, { context: "test" }]))).toEqual([
      "lint",
      "test",
    ]);
  });

  // ----- 異常系 -----
  it("JSON として読めない宣言を落とす", () => {
    expect(() => readRequiredContexts("{")).toThrow("JSON として読めません");
  });

  it("rules が配列でない宣言を落とす", () => {
    expect(() => readRequiredContexts(JSON.stringify({ rules: "deletion" }))).toThrow(
      "rules: が配列として読めません",
    );
  });

  it("必須チェックの規則が無い宣言を落とす", () => {
    expect(() => readRequiredContexts(JSON.stringify({ rules: [{ type: "deletion" }] }))).toThrow(
      "required_status_checks の規則がありません",
    );
  });

  it("必須チェックが 0 件の宣言を、違反なしへ寄せずに落とす", () => {
    expect(() => readRequiredContexts(settings([]))).toThrow("required_status_checks が空です");
  });

  it("context を読み取れない要素の位置を示して落とす", () => {
    expect(() => readRequiredContexts(settings([{ context: "lint" }, { name: "test" }]))).toThrow(
      "required_status_checks[1]",
    );
  });
});

describe("readWorkflowContexts", () => {
  // ----- 正常系 -----
  it("job id を context 名として読む", () => {
    const parsed = readWorkflowContexts(
      "lint.yaml",
      "on:\n  pull_request:\njobs:\n  lint:\n    runs-on: ubuntu-latest\n",
    );

    expect(parsed.jobs).toEqual([{ context: "lint", matrix: false, reusable: false }]);
  });

  it("job の name: があればそちらを context 名として読む", () => {
    const parsed = readWorkflowContexts(
      "lint.yaml",
      "on:\n  pull_request:\njobs:\n  lint:\n    name: Lint everything\n",
    );

    expect(parsed.jobs[0].context).toBe("Lint everything");
  });

  it("matrix と reusable workflow の呼び出しを見分ける", () => {
    const parsed = readWorkflowContexts(
      "lint.yaml",
      [
        "on:",
        "  pull_request:",
        "jobs:",
        "  spread:",
        "    strategy:",
        "      matrix:",
        "        node: [22, 24]",
        "  delegated:",
        "    uses: ./.github/workflows/inner.yaml",
      ].join("\n"),
    );

    expect(parsed.jobs).toEqual([
      { context: "spread", matrix: true, reusable: false },
      { context: "delegated", matrix: false, reusable: true },
    ]);
  });

  it("pull_request のフィルタと types を読む", () => {
    const parsed = readWorkflowContexts(
      "lint.yaml",
      [
        "on:",
        "  pull_request:",
        "    paths:",
        "      - src/**",
        "    branches-ignore:",
        "      - production",
        "    types: [opened]",
        "jobs:",
        "  lint:",
      ].join("\n"),
    );

    expect(parsed.pullRequest).toEqual({
      filters: ["paths", "branches-ignore"],
      types: ["opened"],
    });
  });

  it("types を絞っていない pull_request を null で返す", () => {
    const parsed = readWorkflowContexts(
      "lint.yaml",
      "on:\n  pull_request:\n    paths:\n      - src/**\njobs:\n  lint:\n",
    );

    expect(parsed.pullRequest).toEqual({ filters: ["paths"], types: null });
  });

  it("トリガを配列で書いた workflow を読む", () => {
    const parsed = readWorkflowContexts("lint.yaml", "on: [pull_request, push]\njobs:\n  lint:\n");

    expect(parsed.pullRequest).toEqual({ filters: [], types: null });
  });

  it("トリガを文字列で書いた workflow を読む", () => {
    const parsed = readWorkflowContexts("lint.yaml", "on: pull_request\njobs:\n  lint:\n");

    expect(parsed.pullRequest).toEqual({ filters: [], types: null });
  });

  // ----- 異常系 -----
  it("pull_request で走らない workflow を null で返す", () => {
    const byString = readWorkflowContexts("d.yaml", "on: push\njobs:\n  build:\n");
    const bySequence = readWorkflowContexts("d.yaml", "on: [push]\njobs:\n  build:\n");
    const byMapping = readWorkflowContexts("d.yaml", "on:\n  push:\njobs:\n  build:\n");
    const byScalar = readWorkflowContexts("d.yaml", "on: 3\njobs:\n  build:\n");

    expect([byString, bySequence, byMapping, byScalar].map((parsed) => parsed.pullRequest)).toEqual(
      [null, null, null, null],
    );
  });

  it("YAML として読めない workflow を落とす", () => {
    expect(() => readWorkflowContexts("lint.yaml", "jobs: [lint")).toThrow("YAML として読めません");
  });

  it("マッピングでない workflow を落とす", () => {
    expect(() => readWorkflowContexts("lint.yaml", "- lint")).toThrow(
      "ワークフローがマッピングとして読めません",
    );
  });

  it("jobs: が読めない workflow を、job 0 件へ寄せずに落とす", () => {
    expect(() => readWorkflowContexts("lint.yaml", "on:\n  pull_request:\n")).toThrow(
      "jobs: がマッピングとして読めません",
    );
  });

  it("ジョブ名が文字列でない workflow を落とす", () => {
    expect(() => readWorkflowContexts("lint.yaml", "jobs:\n  2026:\n")).toThrow(
      "ジョブ名が文字列として読めません",
    );
  });
});

describe("findViolations", () => {
  // ----- 正常系 -----
  it("すべての PR で報告される context に違反を報告しない", () => {
    expect(findViolations(["lint"], [workflow()])).toEqual([]);
  });

  it("必須でない job のフィルタや衝突を咎めない", () => {
    const filtered = workflow({
      file: ".github/workflows/deploy-docs.yaml",
      jobs: [{ context: "docs-build", matrix: false, reusable: false }],
      pullRequest: { filters: ["paths"], types: null },
    });

    expect(findViolations(["lint"], [workflow(), filtered])).toEqual([]);
  });

  it("types を絞っていても opened と synchronize があれば通す", () => {
    const labelled = workflow({
      pullRequest: { filters: [], types: ["opened", "synchronize", "reopened", "labeled"] },
    });

    expect(findViolations(["lint"], [labelled])).toEqual([]);
  });

  // ----- 異常系 -----
  it("宣言する job が無い context を落とす", () => {
    const violations = findViolations(["e2e"], [workflow()]);

    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("この名前を宣言する job がありません");
  });

  it("同じ名前を宣言する workflow が複数あれば、どちらかを見ずに落とす", () => {
    const collided = workflow({
      file: ".github/workflows/deploy-docs.yaml",
      pullRequest: { filters: ["paths"], types: null },
    });
    const violations = findViolations(["lint"], [workflow(), collided]);

    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("2 個の job が同じ名前を宣言しています");
    expect(violations[0]).toContain("deploy-docs.yaml");
  });

  it("1 つの workflow の中で名前が重なっていても落とす", () => {
    const collided = workflow({
      jobs: [
        { context: "lint", matrix: false, reusable: false },
        { context: "lint", matrix: true, reusable: false },
      ],
    });
    const violations = findViolations(["lint"], [collided]);

    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("2 個の job が同じ名前を宣言しています");
  });

  it("重なっている場所を、同じファイル名を並べずに示す", () => {
    const collided = workflow({
      jobs: [
        { context: "lint", matrix: false, reusable: false },
        { context: "lint", matrix: false, reusable: false },
      ],
    });

    expect(findViolations(["lint"], [collided])[0]).toContain("（.github/workflows/lint.yaml）");
  });

  it("pull_request で走らない workflow の context を落とす", () => {
    const violations = findViolations(["lint"], [workflow({ pullRequest: null })]);

    expect(violations).toEqual([
      "`lint`: .github/workflows/lint.yaml が pull_request で走りません。PR で報告されない context は永久に待たれます",
    ]);
  });

  it("paths で絞られた workflow の context を落とす", () => {
    const filtered = workflow({ pullRequest: { filters: ["paths"], types: null } });
    const violations = findViolations(["lint"], [filtered]);

    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("paths で絞られています");
  });

  it("types に opened と synchronize が無い workflow の context を落とす", () => {
    const labelled = workflow({ pullRequest: { filters: [], types: ["labeled"] } });
    const violations = findViolations(["lint"], [labelled]);

    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("opened / synchronize を含みません");
  });

  it("matrix を持つ job の context を落とす", () => {
    const spread = workflow({ jobs: [{ context: "lint", matrix: true, reusable: false }] });
    const violations = findViolations(["lint"], [spread]);

    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("matrix を持ちます");
  });

  it("reusable workflow を呼び出す job の context を落とす", () => {
    const delegated = workflow({ jobs: [{ context: "lint", matrix: false, reusable: true }] });
    const violations = findViolations(["lint"], [delegated]);

    expect(violations).toHaveLength(1);
    expect(violations[0]).toContain("reusable workflow を呼び出しています");
  });

  it("1 つの context が複数の理由で報告されないとき、理由を並べて報告する", () => {
    const broken = workflow({
      jobs: [{ context: "lint", matrix: true, reusable: true }],
      pullRequest: { filters: ["paths", "branches"], types: ["labeled"] },
    });

    expect(findViolations(["lint"], [broken])).toHaveLength(4);
  });
});
