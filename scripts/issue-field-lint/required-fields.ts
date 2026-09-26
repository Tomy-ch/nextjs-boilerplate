// 実装タスクの issue が、テンプレートの必須項目を実際に持っているかの判定。
//
// テンプレートの `required: true` が縛るのは GitHub の Web フォームだけで、
// `gh issue create --body-file` は素通りする。**そしてそれが AI が起票する経路である。**
// 起票の時点で欄を見る理由は ADR 0144 が持つ。

/** 検査する issue 1 件。 */
export type IssueBody = {
  /** issue 番号。報告でそのまま出す。 */
  readonly number: number;
  readonly title: string;
  readonly body: string;
  /** 付いているラベルの名前。実装タスクかどうかの判定に使う。 */
  readonly labels: readonly string[];
};

/** 欄を欠いている issue。 */
export type MissingField = {
  readonly number: number;
  readonly title: string;
  /** 欠けている見出し。 */
  readonly field: string;
};

/**
 * 実装タスクの issue が本文に持つべき見出し。
 *
 * @remarks
 * `.github/ISSUE_TEMPLATE/implementation_task.yaml` の必須欄のうち、この検査が見るものです。
 * **`.github/workflows/issue-field-lint.yaml` が走査する見出しと対で持ちます。** 片方だけ変えると、
 * issue へ付く指摘と手元の検査で欠けの集合が食い違います。
 */
export const REQUIRED_HEADINGS: readonly string[] = ["目的", "強制手段", "完了条件"];

/**
 * 実装タスクの issue に付くラベル。
 *
 * @remarks
 * **雛形の `labels:` と `.github/workflows/issue-field-lint.yaml` の `if:` が同じ名前を持ちます。**
 * どれか 1 つだけ変えると、検査は対象を見失ったまま緑を返します。
 */
export const IMPLEMENTATION_TASK_LABEL = "implementation-task";

/**
 * 必須の見出しを欠いている issue を選ぶ。
 *
 * @remarks
 * 見出しの有無だけを見て、中身の質は見ません。**空欄で起票できてしまうことがこの検査の対象**で、
 * 書かれた内容が妥当かはレビューが持ちます。
 *
 * @param issues - 検査する issue
 * @returns 欠けている組み合わせ。issue 1 件が複数の欄を欠けば、その数だけ返る
 */
export function missingRequiredFields(issues: readonly IssueBody[]): readonly MissingField[] {
  return issues
    .filter((issue) => issue.labels.includes(IMPLEMENTATION_TASK_LABEL))
    .flatMap((issue) =>
      REQUIRED_HEADINGS.filter((heading) => !issue.body.includes(`### ${heading}`)).map(
        (field) => ({ number: issue.number, title: issue.title, field }),
      ),
    );
}
