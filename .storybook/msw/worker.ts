import { setupWorker } from "msw/browser";

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
 */
export function startMockWorker(): Promise<unknown> {
  started ??= worker.start({
    serviceWorker: { url: "./mockServiceWorker.js" },
    onUnhandledRequest: (request, print) => {
      if (new URL(request.url).pathname.startsWith("/api/")) {
        print.warning();
      }
    },
    quiet: true,
  });

  return started;
}
