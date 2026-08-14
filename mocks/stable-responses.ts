// 同じ要求には同じ応答を返させる。
//
// 契約から生成したハンドラは、応答を faker で組み立てる（`api/endpoints.msw.ts`）。seed を
// 与えない faker は呼ぶたび別の値を返すため、**同じ URL を 2 回叩くと中身も件数も変わる**。
// backend の振る舞いとしては誤りで、実物は書き込みが無ければ同じものを返す。
//
// 再現しないモックの上には、退行を判定する仕組みが載らない。画面の基準画像は撮るたび別の絵に
// なり（[0091](../docs/adr/0091-test-verification-methods.md) §3 は、そうなるものは比較そのものが
// 成立しないとしている）、E2E は表示された中身を名指しで確かめられなくなる。
import { faker } from "@faker-js/faker";
import type { HttpHandler } from "msw";

/** FNV-1a の offset basis と素数。文字列を 32bit へ畳む。 */
const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/**
 * 要求から seed を決める。
 *
 * @remarks
 * 要求を一意にするものだけから決めます。クエリ文字列を含めるのは、絞り込みの違う一覧が同じ中身に
 * なると、条件がどこにも効いていない状態を検知できなくなるためです。**本文も含めます** —— 作成と
 * 更新は URL が同じでも本文が違えば別の資源であり、同じ応答を返す backend は存在しません。
 *
 * 実行のたびに変わるもの（時刻・乱数・要求が届いた順序）を混ぜません。混ぜた時点で、同じ木から
 * 同じ絵が撮れるという前提が消えます。
 *
 * @param method - HTTP メソッド。綴りの大小は区別しない
 * @param url - クエリ文字列を含む要求先
 * @param body - 要求の本文。持たない要求は空文字
 */
export function seedFor(method: string, url: string, body = ""): number {
  let hash = FNV_OFFSET_BASIS;

  for (const character of `${method.toUpperCase()} ${url} ${body}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, FNV_PRIME);
  }

  return hash >>> 0;
}

/** 生成物が口ごとに公開するハンドラ生成関数の名前の末尾。 */
const HANDLER_SUFFIX = "MockHandler";

/** 同じ口の応答を組み立てる関数の名前の末尾。 */
const RESPONSE_SUFFIX = "ResponseMock";

/** 生成物が受け取る応答の差し替え。要求を受け取り、その口の応答本文を返す。 */
type ResponseOverride = (info: { request: Request }) => Promise<unknown>;

/** 生成物が公開する、口 1 つぶんのハンドラ生成関数。 */
type HandlerFactory = (overrideResponse?: ResponseOverride) => HttpHandler;

/**
 * 契約から生成したハンドラを、応答が再現する形で組み立てる。
 *
 * @remarks
 * 生成物が受け取る「応答の差し替え」に、**seed を与えてから生成物の応答を返す関数**を渡します。
 * 応答の形は生成物のままで、手で組み立てたものは 1 つもありません。契約が変われば応答も
 * 一緒に変わる、という一方向は保たれます。
 *
 * seed をハンドラの手前（別のハンドラや `request:start`）で与える形は成立しません。生成物の
 * resolver は非同期であり、要求を跨いで実行が混ざるため、A の seed で B の応答が組み立てられます。
 * **差し替えの中は resolver と同じ同期の区間**なので、割り込まれません。
 *
 * 同じ理由で、本文の読み取り（非同期）は seed より**前**に済ませます。seed と応答の組み立ての間に
 * `await` を挟むと、そこが割り込み点になります。
 *
 * 口と応答の対応は名前で決まります（`getGetProductsMockHandler` ↔ `getGetProductsResponseMock`）。
 * 応答本文を持たない口（204 を返すもの）には差し替えるものが無いため、生成物のまま使います。
 *
 * 並び順は名前順に固定します。**module の宣言順は使えません** —— `import * as` が返すのは
 * Module Namespace Exotic Object で、その文字列キーは仕様上ソート順で列挙されます。宣言順に
 * 見えるかどうかは、素の ESM で読むか bundler の変換を通すかで変わるため、宣言順に依存すると
 * 「テストでは通るが実行時は違う並び」を作れてしまいます。
 *
 * @param generated - 契約から生成したモックの module
 * @returns 口ごとのハンドラ。並び順は生成関数の名前順
 */
export function stableHandlers(generated: Readonly<Record<string, unknown>>): HttpHandler[] {
  const handlers: HttpHandler[] = [];
  const entries = Object.entries(generated).sort(([left], [right]) => (left < right ? -1 : 1));

  for (const [name, value] of entries) {
    if (!name.endsWith(HANDLER_SUFFIX) || typeof value !== "function") {
      continue;
    }

    const build = value as HandlerFactory;
    const respond = generated[`${name.slice(0, -HANDLER_SUFFIX.length)}${RESPONSE_SUFFIX}`];

    if (typeof respond !== "function") {
      handlers.push(build());
      continue;
    }

    handlers.push(
      build(async ({ request }) => {
        const body = await request.clone().text();

        faker.seed(seedFor(request.method, request.url, body));

        return (respond as () => unknown)();
      }),
    );
  }

  if (handlers.length === 0) {
    throw new Error("契約から生成したハンドラがありません");
  }

  return handlers;
}
