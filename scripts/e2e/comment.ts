/**
 * 巡回が落ちたときに PR へ残す案内。
 *
 * @remarks
 * **1 回の実行は何種類もの落ち方を同時に持ちます。** 終了コードは 1 つしか無いので、種別は
 * ログの目印から立てます。種別ごとに次にやることが違い、撮り直しで直るものと直らないものが
 * 混ざるため、どれか 1 つに丸めると読み手を誤らせます。
 */

import { composeReviewCommand, REVIEW_KIND, REVIEW_WORKTREE_NOTE } from "../lib/review-command.js";

/** 落ち方の種別。同時に立ちうる。 */
export type FailureKinds = {
  /** 巡回の対象に、宣言の無い画面が現れた。 */
  readonly undeclared: boolean;
  /** ジャーニー・停止中の扱い・公開面のいずれかが落ちた。撮り直しでは直らない。 */
  readonly unretakable: boolean;
  /** 画面の見た目が基準画像と違う。 */
  readonly pixels: boolean;
};

/** 宣言の無い画面が現れたときに、突合が書く文言。 */
const UNDECLARED_MARK = "画面の宣言がありません";

/**
 * 撮り直しでは直らない失敗が出る置き場。
 *
 * @remarks
 * **3 つとも見ます。** 停止中の扱いと公開面はジャーニーと同じ落ち方をし、同じ直し方をします。
 * ジャーニーだけを名指しすると、残る 2 つの失敗が画素のずれと見分けられなくなります。
 */
const UNRETAKABLE_PATTERN = /✘.*e2e\/(journeys|maintenance|metadata)\//;

/** 画素の比較が落ちたときに Playwright が書く綴り。 */
const PIXEL_PATTERN = /toHaveScreenshot|A snapshot doesn't exist|@screen-baselines/;

/**
 * ログから落ち方の種別を立てる。
 *
 * @param log - 3 つの段を通したログの全文
 */
export function classifyFailure(log: string): FailureKinds {
  return {
    undeclared: log.includes(UNDECLARED_MARK),
    unretakable: UNRETAKABLE_PATTERN.test(log),
    pixels: PIXEL_PATTERN.test(log),
  };
}

const ARTIFACT_NOTE = "`e2e-diff` artifact に HTML レポートと、失敗した検証の trace が入っています。";

const UNDECLARED_NOTE = `### 画面の宣言が足りていません

\`e2e/lib/screens.ts\` へ宣言を足してください。巡回の対象は build の出力から取り、宣言と突き合わせています。**撮り直しでは直りません。**`;

const UNRETAKABLE_NOTE = `### 撮り直しでは直らない失敗があります

ジャーニー（\`e2e/journeys/\`）・停止中の扱い（\`e2e/maintenance/\`）・公開面（\`e2e/metadata/\`）のいずれかが落ちています。trace を開いて原因を特定してください。1 つの描画エンジンだけが落ちているなら、その engine 固有の挙動か実行環境のゆらぎです。落ちた検証を名指しで実行し直して切り分けてください。`;

const PIXEL_NOTE = `### 画面の見た目が基準画像と違います

変化が意図したものなら \`baseline-retake\` ラベルを付けてください。story と画面の基準画像をまとめて CI が撮り直します。手元で撮るなら \`make e2e-update\` → \`make baseline-push\` です。

- **ラベルは引き金ではありません。** VRT / E2E の完了時に読まれる条件なので、完了したあとに付けたなら再実行が要ります（\`gh run rerun <run-id>\`）
- **ラベルは撮り直しが置き場へ push した時点で外れます。** もう一度撮るには付け直してください
- **撮り直しは承認ではありません。** 画素を見て \`baseline-approve\` を付けるのが承認です（\`vrt/README.md\` の「撮り直しと承認は別の操作」）

**落ちた画面それぞれについて、なぜ変わったかを言えるまで撮り直さないでください。** 全画面が一度に落ちる形は原因が 1 つとは限らず、混ざっている不具合ごと撮り直すとそれが次の正になります（\`docs/design/vrt.md\` の「限界」）。`;

const REVIEW_LEAD =
  "落ちた画面を使い捨ての作業ツリーで開きます。手元の作業ツリーは動かしません。役割の要る画面は開発用 session の面を経由します。";

const UNKNOWN_NOTE = `### 種別を判定できませんでした

上のログと artifact を見てください。ここに案内が出ないのは、build か起動の段で落ちているか、判定に使っている目印が変わったときです。`;

/** {@link composeNotes} が受け取るもの。 */
export type NotesInput = {
  /** ログから立てた種別。 */
  readonly kinds: FailureKinds;
  /** 落ちた画面の名前をカンマで並べたもの。取れなければ空。 */
  readonly screenNames: string;
  /** 作業ツリーが指すブランチ。 */
  readonly headRef: string;
  /** 成果物を引く実行。 */
  readonly runId: string;
};

/**
 * 種別に応じた案内を組み立てる。
 *
 * @remarks
 * **どれも立たなければ、立たなかったこと自体を書きます。** 案内が空のコメントは「見るものが
 * 無い」と読めますが、実際には build か起動の段で落ちているか、目印の綴りが変わっています。
 *
 * @param input - 種別と、手元で開く節に差し込む値
 * @returns markdown の案内
 */
export function composeNotes(input: NotesInput): string {
  const blocks: string[] = [ARTIFACT_NOTE];

  if (input.kinds.undeclared) {
    blocks.push(UNDECLARED_NOTE);
  }

  if (input.kinds.unretakable) {
    blocks.push(UNRETAKABLE_NOTE);
  }

  if (input.kinds.pixels) {
    blocks.push(PIXEL_NOTE);

    const command = composeReviewCommand({
      kind: REVIEW_KIND.screen,
      ids: input.screenNames,
      headRef: input.headRef,
      runId: input.runId,
    });

    if (command !== null) {
      blocks.push(
        `#### 手元で見る\n\n${REVIEW_LEAD}\n\n\`\`\`bash\n${command}\n\`\`\`\n\n${REVIEW_WORKTREE_NOTE}`,
      );
    }
  }

  if (!(input.kinds.undeclared || input.kinds.unretakable || input.kinds.pixels)) {
    blocks.push(UNKNOWN_NOTE);
  }

  return `${blocks.join("\n\n")}\n`;
}
