import { setupWorker } from "msw/browser";

import { shouldWarnUnhandled } from "../lib/unhandled-request";
import { handlers } from "./handlers";

const worker = setupWorker(...handlers);

let started: Promise<unknown> | undefined;

/**
 * 取得を横取りする service worker を立てる。
 *
 * @remarks
 * story を描く前に待ちます。登録の完了を待たずに描き始めると、最初の取得だけが横取りされずに
 * 出ていき、その story だけが失敗した経路の見え方になります。
 *
 * worker の配信元を相対で指すのは、カタログが公開時に下位のパスへ置かれるためです。絶対パスで
 * 指すと、`/storybook/` の下では見つかりません。service worker が持ち場にするのは配信元の
 * ディレクトリで、story を描いている頁がその中に入っていれば、頁が出す要求は宛先を問わず通ります。
 *
 * `/api/*` 以外の宛先は素通しします。カタログ自身の資材とドキュメントの取得までは横取りしません。
 *
 * 立てられなかったときは記録だけして先へ進みます。ここで失敗を投げると、待っているのは全 story
 * 共通の loader なので、`/api/*` に触れない story まで描かれなくなります。横取りを必要とする
 * story は、応答が返らなかったときの見え方へ落ちます。
 */
export function startMockWorker(): Promise<unknown> {
  started ??= worker
    .start({
      serviceWorker: { url: "./mockServiceWorker.js" },
      onUnhandledRequest: (request, print) => {
        if (shouldWarnUnhandled(request.url)) {
          print.warning();
        }
      },
      quiet: true,
    })
    .catch((error: unknown) => {
      console.error("[storybook] 取得を横取りする service worker を立てられませんでした", error);
    });

  return started;
}
