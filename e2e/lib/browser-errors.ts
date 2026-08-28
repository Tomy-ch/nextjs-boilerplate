// ブラウザが報告する異常の判定。何を異常と数えるかだけを持ち、購読そのものは
// [test.ts](test.ts) が張る。
//
// hydration の不一致は build も型検査も通り、**実機で描いたときにしか現れない**。React は
// これを console の error として報告するため、console を見ていない限り検出手段が無い。

/** ブラウザが報告した異常 1 件。 */
export type BrowserProblem = {
  /** どの経路から来たか。 */
  readonly kind: "console" | "exception" | "request" | "csp";
  /** 失敗メッセージへそのまま載せる説明。 */
  readonly detail: string;
};

/**
 * ブラウザが報告した CSP 違反 1 件。
 *
 * @remarks
 * `SecurityPolicyViolationEvent` のうち、直す場所を指すのに要る項目だけを持ちます。イベント
 * そのものはブラウザの外へ持ち出せないので、購読側が読み出して渡します。
 */
export type CspViolation = {
  /** 拒んだディレクティブ。 */
  readonly violatedDirective: string;
  /** 拒まれた読み込み先。inline なら `inline`、eval なら `eval`。 */
  readonly blockedURI: string;
  /** 違反を起こした文書か script。ブラウザが特定できなければ空。 */
  readonly sourceFile: string;
  /** その中の行。特定できなければ 0。 */
  readonly lineNumber: number;
};

/**
 * 通信失敗として数えない打ち切り。**描画エンジンごとに綴りが違う。**
 *
 * @remarks
 * 画面を離れた、条件が変わって取得をやめた、router が先読みを捨てた —— どれも正しく動いて
 * いるときほど出ます。数えると「正しい実装ほど落ちる」向きになります。
 *
 * 文言で見分けます。Playwright は打ち切りとそれ以外を区別して渡さず、残る手掛かりが
 * `errorText` しかないためです。**綴りを取りこぼしたときに出るのは偽陽性（赤くなる）であって、
 * 見逃し（緑のまま）ではありません。**沈黙に倒れない向きなので、ここは文言に頼れます。
 *
 * 一覧は回す描画エンジン（[browsers](browsers.ts)）に閉じます。増えるのはエンジンを足したとき
 * だけで、際限なく伸びる除外表にはなりません。
 */
const CANCELLED: ReadonlySet<string> = new Set([
  // Chromium
  "net::ERR_ABORTED",
  // Firefox
  "NS_BINDING_ABORTED",
  // WebKit
  "Load request cancelled",
]);

/**
 * 応答を異常として数える下限のステータス。
 *
 * @remarks
 * 4xx を数えないのは、それがアプリの**設計された結果**だからです。存在しない資源は 404 を返し、
 * 未認証は 401 を返します。どれも「そう返ること」を spec が名指しで確かめる対象であり、
 * 横断の見張りが一律に落とすと、確かめたい経路そのものを通せなくなります。
 *
 * 5xx と transport の失敗は設計された結果になり得ません。どの画面でも等しく異常なので、
 * 個別の spec ではなく見張りの側が持ちます。
 */
const SERVER_ERROR_STATUS = 500;

/** 打ち切りではない通信失敗か。 */
export function isTransportFailure(errorText: string | undefined): boolean {
  return errorText !== undefined && !CANCELLED.has(errorText);
}

/**
 * console へ書かれた 1 行を異常として数えるか。
 *
 * @remarks
 * 数えるのは `error` だけです。`warning` も `log` も、開発中に読むための出力であって、動かない
 * ことを表しません。数えると、どの画面でも鳴り続ける見張りになります。
 *
 * ブラウザは取得に失敗した副資源も自分で console の `error` へ書きます（"Failed to load
 * resource…"）。その判断は {@link isServerError} と {@link isTransportFailure} が既に持っているので、
 * ここでも数えると同じ出来事を 2 度数えるうえ、そこで外したはずの 4xx が裏口から戻ります。
 *
 * 見分けるのに文言を使いません。文言は描画エンジンごとに違い、増える一方の除外表になります。
 * 代わりに**引数を持つか**で分けます。`console.error(...)` は渡された値を引数として持ち、ブラウザ
 * 自身が書いた行は持ちません。React が hydration の不一致を報せるのは前者です。
 *
 * @param type - console のメソッド名（Playwright の `ConsoleMessage.type()`）
 * @param argumentCount - console へ渡された引数の数
 */
export function isReportableConsoleError(type: string, argumentCount: number): boolean {
  return type === "error" && argumentCount > 0;
}

/** 応答を異常として数えるか。 */
export function isServerError(status: number): boolean {
  return status >= SERVER_ERROR_STATUS;
}

/**
 * CSP 違反 1 件を、失敗メッセージへ載せる 1 行にする。
 *
 * @remarks
 * CSP の違反は、上の console の見張りには掛かりません。ブラウザ自身が書く行なので引数を持たず、
 * {@link isReportableConsoleError} が外します。document のイベントで受け、経路を分けて数えます。
 * 出所が採れないときは場所を省きます。空の括弧を出すと、採れなかったのか空だったのかが読めません。
 */
export function formatCspViolation(violation: CspViolation): string {
  const location =
    violation.sourceFile === "" ? "" : ` (${violation.sourceFile}:${violation.lineNumber})`;

  return `${violation.violatedDirective} が ${violation.blockedURI} を拒否${location}`;
}

/**
 * 集めた異常を、失敗メッセージ 1 本へ畳む。
 *
 * @remarks
 * 経路（console / 例外 / 通信）を頭に出すのは、同じ症状でも直す場所が違うためです。hydration の
 * 不一致は console に出て、描画中に投げた例外は例外として出ます。
 */
export function formatProblems(problems: readonly BrowserProblem[]): string {
  return problems.map((problem) => `[${problem.kind}] ${problem.detail}`).join("\n");
}
