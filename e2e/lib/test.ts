// 全ての spec が使う test。ブラウザが報告する異常の見張りと、ログイン済みの状態を作る手立てを
// 積んである。
//
// 見張りを spec ごとに書かせない。書き忘れた spec だけが「異常があっても緑」になり、その状態は
// 見た目にも結果にも現れない。
import { test as base, expect } from "@playwright/test";

import type { SessionRole } from "@/model/session";

import {
  type BrowserProblem,
  type CspViolation,
  formatCspViolation,
  formatProblems,
  isReportableConsoleError,
  isServerError,
  isTransportFailure,
} from "./browser-errors";
import { TEST_SESSION_ISSUED_STATUS, TEST_SESSION_PATH } from "./dev-session.js";

/**
 * 画像の代わりに返す 1×1 の PNG。
 *
 * @remarks
 * mock で動かす以上、配信元（`MEDIA_ORIGIN`）は在りません。素通しにすると `next/image` の
 * 最適化が取得に失敗して 500 を返し、縮小表示のように最適化を通さない経路は取得を拒まれます。
 * どちらも見張りが鳴り、画面ではなく配信元の不在で落ちます。
 *
 * **画像の取得経路は E2E の射程外です。** ここで確かめられるのは配信元が在るときの挙動では
 * ないので、代わりの絵を返して、比較の対象を配信元によらない形に固定します。
 */
const PLACEHOLDER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

type Fixtures = {
  /** ログイン済みの状態を作る。役割を省くと一般利用者になる。 */
  signIn: (role?: SessionRole) => Promise<void>;
};

declare global {
  interface Window {
    /** ブラウザ側の購読が違反を渡してくる口。初期化 script の中から呼ぶため window に置く。 */
    readonly __reportCspViolation?: (violation: CspViolation) => void;
  }
}

/**
 * 違反を受け取る口の名前。
 *
 * @remarks
 * 初期化 script は文字列化してブラウザへ渡されるため、その中では定数を参照できず名前を直接書く。
 * `satisfies` で window の宣言と同じ綴りであることを型に確かめさせる。
 */
const CSP_VIOLATION_BINDING = "__reportCspViolation" satisfies keyof Window;

export const test = base.extend<Fixtures>({
  page: async ({ page }, use) => {
    const problems: BrowserProblem[] = [];

    page.on("console", (message) => {
      if (isReportableConsoleError(message.type(), message.args().length)) {
        problems.push({ kind: "console", detail: message.text() });
      }
    });
    page.on("pageerror", (error) => {
      problems.push({ kind: "exception", detail: error.stack ?? error.message });
    });
    page.on("requestfailed", (request) => {
      const errorText = request.failure()?.errorText;

      if (isTransportFailure(errorText)) {
        problems.push({
          kind: "request",
          detail: `${request.method()} ${request.url()} — ${errorText}`,
        });
      }
    });
    page.on("response", (response) => {
      if (isServerError(response.status())) {
        problems.push({ kind: "request", detail: `${response.status()} ${response.url()}` });
      }
    });

    // CSP の違反はブラウザ自身が console へ書くため、上の console の見張りには掛からない。
    // document のイベントで受ける。購読は文書ごとに張り直す必要があり、Playwright の
    // 初期化 script がそれを持つ。
    await page.exposeBinding(CSP_VIOLATION_BINDING, (_source, violation: CspViolation) => {
      problems.push({ kind: "csp", detail: formatCspViolation(violation) });
    });
    await page.addInitScript(() => {
      document.addEventListener("securitypolicyviolation", (event) => {
        window.__reportCspViolation?.({
          violatedDirective: event.violatedDirective,
          blockedURI: event.blockedURI,
          sourceFile: event.sourceFile,
          lineNumber: event.lineNumber,
        });
      });
    });

    // 宛先ではなく**絵であること**で判る。配信元は設定の値で、ここへ書き写すと変えたときに
    // 古い宛先だけを見張り続ける。最適化を通す経路も通さない経路も同じ扱いになる。
    await page.route("**/*", (route) =>
      route.request().resourceType() === "image"
        ? route.fulfill({ contentType: "image/png", body: PLACEHOLDER_PNG })
        : route.continue(),
    );

    await use(page);

    // 画面の検証が通ったあとに見る。先に見ると、確かめたかった失敗が異常の報告に覆われる。
    expect(
      formatProblems(problems),
      "ブラウザが異常を報告しました。hydration の不一致・描画中の例外・通信の失敗・CSP 違反のいずれかです",
    ).toBe("");
  },

  signIn: async ({ page }, use) => {
    await use(async (role) => {
      const response = await page.request.post(TEST_SESSION_PATH, {
        data: role === undefined ? {} : { role },
      });

      // 開いていない環境では 404 が返る。ログインできないまま先へ進むと、保護ルートの検証が
      // 「ログインへ飛ばされた」を正常として読んでしまう。
      expect(response.status(), `${TEST_SESSION_PATH} が session を発行しませんでした`).toBe(
        TEST_SESSION_ISSUED_STATUS,
      );
    });
  },
});

export { expect };
