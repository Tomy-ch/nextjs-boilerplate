import { describe, expect, it } from "vitest";

import { UPSERT_ACTION_DIR } from "./comment-actions";
import { localWorkflowFile, parseWorkflow } from "./workflow";

const commentDirs = new Set([UPSERT_ACTION_DIR]);

/** `${{ body }}` の式を組み立てる。 */
const expr = (body: string): string => `\${{ ${body} }}`;

/** 投稿ジョブ 1 本を持つワークフローを組み立てる。 */
const postingWorkflow = (...extra: string[]): string =>
  ["jobs:", "  report:", "    steps:", `      - uses: ./${UPSERT_ACTION_DIR}`, ...extra].join("\n");

describe("parseWorkflow", () => {
  // ----- 正常系 -----
  it("コメント投稿 action を呼ぶジョブを投稿ジョブとして同定する", () => {
    const workflow = parseWorkflow("w.yaml", postingWorkflow(), commentDirs);

    expect(workflow.file).toBe("w.yaml");
    expect(workflow.postingJobIds).toEqual(["report"]);
  });

  it("投稿しないジョブを投稿ジョブとして同定しない", () => {
    const source = "jobs:\n  build:\n    steps:\n      - uses: actions/checkout@v7\n";

    expect(parseWorkflow("w.yaml", source, commentDirs).postingJobIds).toEqual([]);
  });

  it("投稿するローカル reusable workflow を呼ぶジョブを投稿ジョブとして同定する", () => {
    const source = "jobs:\n  call:\n    uses: ./.github/workflows/notify.yaml\n";

    const workflow = parseWorkflow(
      "w.yaml",
      source,
      commentDirs,
      new Set([".github/workflows/notify.yaml"]),
    );

    expect(workflow.postingJobIds).toEqual(["call"]);
  });

  it("投稿しないローカル reusable workflow を呼ぶジョブは投稿ジョブとして同定しない", () => {
    const source = "jobs:\n  call:\n    uses: ./.github/workflows/notify.yaml\n";

    expect(parseWorkflow("w.yaml", source, commentDirs).postingJobIds).toEqual([]);
  });

  it("投稿する reusable workflow へ渡した secret を走査対象に含める", () => {
    const source = [
      "jobs:",
      "  call:",
      "    uses: ./.github/workflows/notify.yaml",
      "    secrets:",
      `      webhook: ${expr("secrets.SLACK_WEBHOOK_URL")}`,
    ].join("\n");

    const texts = parseWorkflow(
      "w.yaml",
      source,
      commentDirs,
      new Set([".github/workflows/notify.yaml"]),
    ).texts;

    expect(texts.some((scalar) => scalar.text.includes("secrets.SLACK_WEBHOOK_URL"))).toBe(true);
  });

  it("jobs の外に置いた値をワークフロー全体に及ぶ文字列として集める", () => {
    const source = ["env:", "  GLOBAL: 全体設定", postingWorkflow()].join("\n");

    const global = parseWorkflow("w.yaml", source, commentDirs).texts.filter(
      (scalar) => scalar.jobId === null,
    );

    expect(global.map((scalar) => scalar.text)).toContain("全体設定");
  });

  it("投稿ジョブの中の文字列にジョブ ID を添えて集める", () => {
    const source = postingWorkflow("      - run: echo ジョブ本文");

    const inJob = parseWorkflow("w.yaml", source, commentDirs).texts.filter(
      (scalar) => scalar.jobId === "report",
    );

    expect(inJob.map((scalar) => scalar.text)).toContain("echo ジョブ本文");
  });

  it("投稿しないジョブの中の文字列は集めない", () => {
    const source = [postingWorkflow(), "  build:", "    steps:", "      - run: echo 対象外"].join(
      "\n",
    );

    const texts = parseWorkflow("w.yaml", source, commentDirs).texts.map((scalar) => scalar.text);

    expect(texts).not.toContain("echo 対象外");
  });

  it("他のジョブへ退避させた anchor を alias 経由で辿る", () => {
    const source = ["shared: &shared 共有した本文", postingWorkflow("      - run: *shared")].join(
      "\n",
    );

    const inJob = parseWorkflow("w.yaml", source, commentDirs).texts.filter(
      (scalar) => scalar.jobId === "report",
    );

    expect(inJob.map((scalar) => scalar.text)).toContain("共有した本文");
  });

  it("リテラルのブロックスカラーは値の中の位置を行番号へ写す", () => {
    const source = postingWorkflow("      - run: |", "          先頭行", "          二行目");

    const block = parseWorkflow("w.yaml", source, commentDirs).texts.find((scalar) =>
      scalar.text.startsWith("先頭行"),
    );

    expect(block?.lineAt(0)).toBe(6);
    expect(block?.lineAt(block.text.indexOf("二行目"))).toBe(7);
  });

  it("値を持たないキーがあっても走査を続ける", () => {
    const source = postingWorkflow("    env:");

    const inJob = parseWorkflow("w.yaml", source, commentDirs).texts.filter(
      (scalar) => scalar.jobId === "report",
    );

    expect(inJob.map((scalar) => scalar.text)).toContain("env");
  });

  it("リテラル以外のスカラーはスカラーの開始行を指す", () => {
    const scalar = parseWorkflow("w.yaml", postingWorkflow(), commentDirs).texts.find(
      (found) => found.text === `./${UPSERT_ACTION_DIR}`,
    );

    expect(scalar?.lineAt(0)).toBe(scalar?.lineAt(5));
  });

  // ----- 異常系 -----
  it("YAML として読めない定義を落とす", () => {
    expect(() => parseWorkflow("w.yaml", "jobs:\n  - a\n b: c\n", commentDirs)).toThrow(
      /^w\.yaml: YAML として読めません: /,
    );
  });

  it("マッピングでない定義を落とす", () => {
    expect(() => parseWorkflow("w.yaml", "- 配列\n", commentDirs)).toThrow(
      "w.yaml: ワークフローがマッピングとして読めません",
    );
  });

  it("jobs がマッピングとして読めない定義を落とす", () => {
    expect(() => parseWorkflow("w.yaml", "jobs: []\n", commentDirs)).toThrow(
      "w.yaml: jobs: がマッピングとして読めません",
    );
  });

  it("ジョブ名が文字列として読めない定義を落とす", () => {
    expect(() => parseWorkflow("w.yaml", "jobs:\n  ? [a]\n  : {}\n", commentDirs)).toThrow(
      "w.yaml: ジョブ名が文字列として読めません",
    );
  });

  it("リモートの reusable workflow を呼ぶジョブがあれば未対応として落とす", () => {
    const source = "jobs:\n  call:\n    uses: owner/repo/.github/workflows/w.yaml@v1\n";

    expect(() => parseWorkflow("w.yaml", source, commentDirs)).toThrow(
      /ジョブ `call` はリモートの reusable workflow を呼び出しています/,
    );
  });

  it("ワークフロー定義の外を指すローカル参照もリモートとして落とす", () => {
    const source = "jobs:\n  call:\n    uses: ./.github/actions/x/action.yaml\n";

    expect(() => parseWorkflow("w.yaml", source, commentDirs)).toThrow(
      /ジョブ `call` はリモートの reusable workflow を呼び出しています/,
    );
  });

  it("参照先の無い alias を落とす", () => {
    const source = postingWorkflow("      - run: *missing");

    expect(() => parseWorkflow("w.yaml", source, commentDirs)).toThrow(
      /^w\.yaml: YAML を解決できません: /,
    );
  });
});

describe("localWorkflowFile", () => {
  // ----- 正常系 -----
  it("ローカル参照をリポジトリルート相対のパスへ正規化する", () => {
    expect(localWorkflowFile("  ./.github/workflows/notify.yaml  ")).toBe(
      ".github/workflows/notify.yaml",
    );
  });

  it("途中に . を挟んだローカル参照も同じパスへ畳む", () => {
    expect(localWorkflowFile("./.github/workflows/./notify.yaml")).toBe(
      ".github/workflows/notify.yaml",
    );
  });

  // ----- 異常系 -----
  it("リモート参照は解決しない", () => {
    expect(localWorkflowFile("owner/repo/.github/workflows/notify.yaml@v1")).toBeNull();
  });

  it("ワークフロー定義の置き場の外を指すローカル参照は解決しない", () => {
    expect(localWorkflowFile("./.github/actions/notify/action.yaml")).toBeNull();
  });
});
