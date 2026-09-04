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

/**
 * 日付の基準時刻。
 *
 * @remarks
 * faker の日付生成は「いま」を基準に前後へ振ります。seed は振れ幅を決めるだけなので、基準が
 * 実行時刻のままだと、同じ要求でも撮る時刻がずれた分だけ日付と時刻が動きます。基準まで固定して
 * はじめて、同じ木から同じ絵が撮れます。
 */
const REFERENCE_DATE = new Date("2026-01-01T00:00:00.000Z");

/** 生成物が口ごとに公開するハンドラ生成関数の名前の末尾。 */
const HANDLER_SUFFIX = "MockHandler";

/**
 * パスが持つパラメータ区間の数。少ないほど具体的なパス。
 *
 * @remarks
 * `/x/latest` は 0、`/x/:id` は 1 で、前者は後者にも一致します。
 *
 * パスは常に文字列です。生成物は契約のパスをリテラルで渡すため、`HttpHandler` の `info` が
 * 許す `RegExp` の形は現れません。防御を足すと、到達しない分岐が残ります。
 */
function parameterCount(handler: HttpHandler): number {
  return (String(handler.info.path).match(/:/g) ?? []).length;
}

/** 同じ口の応答を組み立てる関数の名前の末尾。 */
const RESPONSE_SUFFIX = "ResponseMock";

/** 生成物が受け取る応答の差し替え。要求を受け取り、その口の応答本文を返す。 */
type ResponseOverride = (info: { request: Request }) => Promise<unknown>;

/** 生成物が公開する、口 1 つぶんのハンドラ生成関数。 */
type HandlerFactory = (overrideResponse?: ResponseOverride) => HttpHandler;

/**
 * 別の口の応答を、その口が返すのと同じ内容で引く。
 *
 * @remarks
 * 応答は seed から決まる純粋な関数なので、その口へ届く要求と同じ seed を与えれば、画面が実際に
 * 受け取るのと同じ内容が得られます。
 *
 * @param name - 生成物が公開する応答生成関数の名前（`get<名前>ResponseMock`）
 * @param path - その口のパス。seed は要求の URL から決まるため、綴りまで合わせる
 */
export type DrawFromEndpoint = (name: string, path: string) => unknown;

/**
 * 生成した応答のうち、他の口を指す項目を整合させる差し替え。
 *
 * @remarks
 * 契約から生成した応答は口ごとに独立しているため、ある口が返す識別子が、それを一覧する口の
 * 応答に**存在しない**という組み合わせが生まれます。画面はその状態を「選べない値が入っている」
 * として扱うので、参照の整合はモックの側で取ります。
 *
 * **この機構は表を持ちません。** どの項目がどの口を指すかは契約ごとの知識であり、`stableHandlers`
 * の呼び出し側が渡します。
 */
export type ReferencePatch = (response: unknown, draw: DrawFromEndpoint) => unknown;

/** 応答生成関数の名前から、その応答へ掛ける差し替えを引く表。 */
export type ReferencePatches = ReadonlyMap<string, ReferencePatch>;

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
 * 口と応答の対応は名前で決まります（`getGet{Operation}MockHandler` ↔ `getGet{Operation}ResponseMock`）。
 * 応答本文を持たない口（204 を返すもの）には差し替えるものが無いため、生成物のまま使います。
 *
 * **並び順はここが決めます。** MSW が登録順に照合するためで、2 つの規則の意味は
 * [README](README.md) が持ちます。
 *
 * **その 2 つは互いに依存しています。** 冒頭で名前順を確定させ、末尾の具体度順が**安定**である
 * ことに乗せて同じ具体度の中へ残します。どちらかを不安定な並べ替えに替えると、同じ具体度どうしの
 * 順序が読み込み経路ごとに変わり、契約は同じなのに照合する相手だけが入れ替わります。
 *
 * @param generated - 契約から生成したモックの module
 * @returns 口ごとのハンドラ。具体的なパスが先、同じ具体度どうしは生成関数の名前順
 */
export function stableHandlers(
  generated: Readonly<Record<string, unknown>>,
  patches: ReferencePatches = new Map(),
): HttpHandler[] {
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

    const responseName = `${name.slice(0, -HANDLER_SUFFIX.length)}${RESPONSE_SUFFIX}`;
    const patch = patches.get(responseName);

    handlers.push(
      build(async ({ request }) => {
        const body = await request.clone().text();

        faker.seed(seedFor(request.method, request.url, body));
        faker.setDefaultRefDate(REFERENCE_DATE);

        const response = (respond as () => unknown)();

        // 参照の整合は本体を組み立て**終えてから**取る。途中で seed を与え直すと、本体の続きが
        // 別の seed の並びから作られ、同じ要求に同じ応答を返せなくなる。
        return patch === undefined ? response : patch(response, drawFrom(generated, request.url));
      }),
    );
  }

  if (handlers.length === 0) {
    throw new Error("契約から生成したハンドラがありません");
  }

  return handlers.sort((left, right) => parameterCount(left) - parameterCount(right));
}

/**
 * 参照先の口の応答を引く口を、要求の出所に合わせて組み立てる。
 *
 * @remarks
 * seed は要求の URL から決まるため、参照先の URL も**同じ出所**で組みます。書き写した固定の出所を
 * 使うと、配信先が変わった環境で参照先だけ別の seed になり、整合が黙って外れます。
 *
 * @param generated - 契約から生成したモックの module
 * @param requestUrl - いま応答を組み立てている要求の URL
 */
function drawFrom(
  generated: Readonly<Record<string, unknown>>,
  requestUrl: string,
): DrawFromEndpoint {
  return (name, path) => {
    const respond = generated[name];

    if (typeof respond !== "function") {
      throw new TypeError(`参照先の応答を生成できません: ${name}`);
    }

    faker.seed(seedFor("GET", new URL(path, requestUrl).toString()));
    faker.setDefaultRefDate(REFERENCE_DATE);

    return (respond as () => unknown)();
  };
}
