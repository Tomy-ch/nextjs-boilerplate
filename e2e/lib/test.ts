// 全ての spec が使う test。ブラウザが報告する異常の見張りと、ログイン済みの状態を作る手立てを
// 積んである。
//
// 見張りを spec ごとに書かせない。書き忘れた spec だけが「異常があっても緑」になり、その状態は
// 見た目にも結果にも現れない。
import { test as base, expect } from "@playwright/test";

import type { SessionRole } from "@/model/session";

import {
  type BrowserProblem,
  formatProblems,
  isReportableConsoleError,
  isServerError,
  isTransportFailure,
} from "./browser-errors";

/**
 * 画像の代わりに返す 1×1 の PNG。
 *
 * @remarks
 * mock で動かす以上、配信元（`MEDIA_ORIGIN`）は在りません。素通しにすると `next/image` の
 * 最適化が取得に失敗して 500 を返し、見張りが全ての画面で鳴ります。
 *
 * **画像の取得経路は E2E の射程外です。** ここで確かめられるのは配信元が在るときの挙動では
 * ないので、代わりの絵を返して、比較の対象を配信元によらない形に固定します。
 */
const PLACEHOLDER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/** テスト専用の session を発行する口（`src/app/api/auth/test-session/route.ts`）。 */
const TEST_SESSION_PATH = "/api/auth/test-session";

type Fixtures = {
  /** ログイン済みの状態を作る。役割を省くと一般利用者になる。 */
  signIn: (role?: SessionRole) => Promise<void>;
};

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

    await page.route("**/_next/image**", (route) =>
      route.fulfill({ contentType: "image/png", body: PLACEHOLDER_PNG }),
    );

    await use(page);

    // 画面の検証が通ったあとに見る。先に見ると、確かめたかった失敗が異常の報告に覆われる。
    expect(
      formatProblems(problems),
      "ブラウザが異常を報告しました。hydration の不一致・描画中の例外・通信の失敗のいずれかです",
    ).toBe("");
  },

  signIn: async ({ page }, use) => {
    await use(async (role) => {
      const response = await page.request.post(TEST_SESSION_PATH, {
        data: role === undefined ? {} : { role },
      });

      // 開いていない環境では 404 が返る。ログインできないまま先へ進むと、保護ルートの検証が
      // 「ログインへ飛ばされた」を正常として読んでしまう。
      expect(response.status(), `${TEST_SESSION_PATH} が session を発行しませんでした`).toBe(204);
    });
  },
});

export { expect };
