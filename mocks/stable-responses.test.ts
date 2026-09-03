import { faker } from "@faker-js/faker";
import { type HttpHandler, HttpResponse, http, type RequestHandler } from "msw";
import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { type ReferencePatch, seedFor, stableHandlers } from "./stable-responses";

describe("seedFor", () => {
  // ----- 正常系 -----
  it("同じ要求に同じ値を返す", () => {
    expect(seedFor("GET", "https://api.test/v1/alpha")).toBe(
      seedFor("GET", "https://api.test/v1/alpha"),
    );
  });

  it("method が違えば別の値を返す", () => {
    expect(seedFor("GET", "https://api.test/v1/alpha")).not.toBe(
      seedFor("POST", "https://api.test/v1/alpha"),
    );
  });

  it("method の綴りの大小を区別しない", () => {
    expect(seedFor("get", "https://api.test/v1/alpha")).toBe(
      seedFor("GET", "https://api.test/v1/alpha"),
    );
  });

  it("パスが違えば別の値を返す", () => {
    expect(seedFor("GET", "https://api.test/v1/alpha")).not.toBe(
      seedFor("GET", "https://api.test/v1/beta"),
    );
  });

  it("絞り込みの条件が違えば別の値を返す", () => {
    expect(seedFor("GET", "https://api.test/v1/alpha?keyword=靴")).not.toBe(
      seedFor("GET", "https://api.test/v1/alpha?keyword=鞄"),
    );
  });

  it("本文が違えば別の値を返す", () => {
    expect(seedFor("POST", "https://api.test/v1/alpha", '{"name":"靴"}')).not.toBe(
      seedFor("POST", "https://api.test/v1/alpha", '{"name":"鞄"}'),
    );
  });

  it("本文を持たない要求と空の本文を同じに扱う", () => {
    expect(seedFor("GET", "https://api.test/v1/alpha")).toBe(
      seedFor("GET", "https://api.test/v1/alpha", ""),
    );
  });

  it("faker の seed として渡せる 32bit の非負整数を返す", () => {
    const seed = seedFor("GET", "https://api.test/v1/alpha");

    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(2 ** 32);
  });
});

/** 契約から生成した口の名前。ハンドラと応答が名前で対応する。 */
const ENDPOINTS = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta"] as const;

/**
 * 口 1 つぶんの宣言（ハンドラ生成関数と応答生成関数の組）を組み立てる。
 *
 * @remarks
 * 生成物と同じ形にします —— ハンドラ生成関数は応答の差し替えを受け取り、渡されなければ自分で
 * 応答を組み立てます。
 */
function respondingEndpoint(name: string, path: string): Record<string, unknown> {
  return {
    [`get${name}MockHandler`]: (
      override?: (info: { request: Request }) => Promise<unknown>,
    ): RequestHandler =>
      http.get(path, async (info) =>
        HttpResponse.json(
          (override === undefined ? randomBody() : await override(info)) as Record<string, unknown>,
        ),
      ),
    [`get${name}ResponseMock`]: randomBody,
  };
}

/**
 * 契約から生成したモックの module を模した相手。
 *
 * @remarks
 * 生成物と同じ形だけを取り出しています —— 口ごとに `get<名前>MockHandler` と
 * `get<名前>ResponseMock` を並べ、resolver は `async` で、応答の差し替えを受け取ります
 * （`api/endpoints.msw.ts`）。生成物そのものへ依存しないのは、契約が変わるたびにこの検査が
 * 動く必要はないためです。生成物との対応は隣の検査が見ます。
 */
const generated: Record<string, unknown> = {
  ...Object.fromEntries(
    ENDPOINTS.flatMap((name) => [
      [
        `get${name}MockHandler`,
        (override?: (info: { request: Request }) => Promise<unknown>): RequestHandler =>
          http.get(`https://mock.test/${name.toLowerCase()}`, async (info) =>
            HttpResponse.json(
              (override === undefined ? randomBody() : await override(info)) as Record<
                string,
                unknown
              >,
            ),
          ),
      ],
      [`get${name}ResponseMock`, randomBody],
    ]),
  ),
  // 本文を受け取る口。URL が同じでも本文が違えば別の資源になる。
  getWriteMockHandler: (
    override?: (info: { request: Request }) => Promise<unknown>,
  ): RequestHandler =>
    http.post("https://mock.test/write", async (info) =>
      HttpResponse.json(
        (override === undefined ? randomBody() : await override(info)) as Record<string, unknown>,
      ),
    ),
  getWriteResponseMock: randomBody,
  // 応答本文を持たない口（204 を返すもの）。差し替える相手が無い。
  getSilentMockHandler: (): RequestHandler =>
    http.get("https://mock.test/silent", () => new HttpResponse(null, { status: 204 })),
  // パラメータ区間を持つ口と、それにも一致する具体的な口。生成関数の名前順では前者が先に来るため、
  // 具体度で並べ替えなければ `/items/latest` への要求が `/items/:itemId` に食われる。
  ...respondingEndpoint("ItemById", "https://mock.test/items/:itemId"),
  ...respondingEndpoint("ItemLatest", "https://mock.test/items/latest"),
  // 具体度が 3 段に分かれる口。名前順は Child → Item → Root で、具体度の順とはちょうど逆になる。
  //
  // **区間の数を数える実装と、区間の有無で 2 つに分ける実装を見分けるのがこの 3 つである。**
  // 後者だと Item と Child が同じ組に入り、名前順のまま Child が先に残る。
  //
  // 生成物と同じくスキームを持たないパスにしてある。`/nested` はコロンを 1 つも含まないため、
  // 数える側の「一致なし」もここで踏む。
  ...respondingEndpoint("NestedRoot", "/nested"),
  ...respondingEndpoint("NestedItem", "/nested/:id"),
  ...respondingEndpoint("NestedChild", "/nested/:id/:subId"),
  // 名前順とパス順が食い違う組。名前は Mu → Nu、パスは `aaa-nu` → `zzz-mu` で逆になる。
  ...respondingEndpoint("Mu", "https://mock.test/zzz-mu"),
  ...respondingEndpoint("Nu", "https://mock.test/aaa-nu"),
};

function randomBody(): Record<string, unknown> {
  return {
    value: faker.string.alpha({ length: 16 }),
    count: faker.number.int({ min: 1, max: 100 }),
    // 日付は「いま」を基準に振れる。時刻が動いても応答が動かないことを確かめるために混ぜる。
    at: faker.date.recent().toISOString(),
  };
}

const server = setupServer(...stableHandlers(generated));

/** 参照を整合させる差し替えを渡したときだけ立ち上げる、別の口の一式。 */
function patchedServer(patch: ReferencePatch) {
  return setupServer(...stableHandlers(generated, new Map([["getAlphaResponseMock", patch]])));
}

/** ハンドラが受け持つ口。並びと集合の比較に使う。 */
function endpointOf(handler: HttpHandler): string {
  return `${String(handler.info.method)} ${String(handler.info.path)}`;
}

/** 組み立てた並びから、当たるパスだけを順序を保って取り出す。 */
function pathsMatching(pattern: RegExp): string[] {
  return stableHandlers(generated)
    .map((handler) => String(handler.info.path))
    .filter((path) => pattern.test(path));
}

/**
 * 全ての口を一斉に叩き、応答を 1 本の文字列へ畳む。
 *
 * @remarks
 * 本文を持つ口も混ぜます。そちらは応答を組み立てる前に本文の読み取りを待つため、待たない口との
 * 間で実行が最も混ざりやすくなります。
 */
async function fetchAll(): Promise<string> {
  const bodies = await Promise.all([
    ...ENDPOINTS.map((name) =>
      fetch(`https://mock.test/${name.toLowerCase()}`).then((response) => response.text()),
    ),
    fetch("https://mock.test/write", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "並行" }),
    }).then((response) => response.text()),
  ]);

  return bodies.join("|");
}

describe("stableHandlers", () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: "error" });
  });

  afterAll(() => {
    server.close();
  });

  /**
   * 差し替えを渡した一式で 1 回叩く。
   *
   * @remarks
   * ハンドラは組み立ての時点で差し替えを抱えるため、渡す相手ごとに一式を立て直します。立てている
   * 間だけ既定の一式を畳むのは、同じ URL を 2 つの一式が受け持つと照合が先勝ちになるためです。
   */
  async function fetchPatched(patch: ReferencePatch): Promise<unknown> {
    server.close();

    const patched = patchedServer(patch);

    patched.listen({ onUnhandledRequest: "error" });

    try {
      return await fetch("https://mock.test/alpha").then((response) => response.json());
    } finally {
      patched.close();
      server.listen({ onUnhandledRequest: "error" });
    }
  }

  /** 本文を持つ口を 1 回叩く。 */
  async function write(body: unknown): Promise<string> {
    const response = await fetch("https://mock.test/write", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    return response.text();
  }

  // ----- 正常系 -----
  it("module が持つ口をすべて組み立て、応答を組み立てる関数を口として拾わない", () => {
    expect(stableHandlers(generated).map(endpointOf).sort()).toEqual(
      [
        ...ENDPOINTS.map((name) => `GET https://mock.test/${name.toLowerCase()}`),
        "GET https://mock.test/silent",
        "GET https://mock.test/items/:itemId",
        "GET https://mock.test/items/latest",
        "GET /nested",
        "GET /nested/:id",
        "GET /nested/:id/:subId",
        "GET https://mock.test/zzz-mu",
        "GET https://mock.test/aaa-nu",
        "POST https://mock.test/write",
      ].sort(),
    );
  });

  it("同じ要求へ何度でも同じ応答を返す", async () => {
    const first = await fetch("https://mock.test/alpha").then((response) => response.text());
    const second = await fetch("https://mock.test/alpha").then((response) => response.text());

    expect(second).toBe(first);
  });

  it("時刻が進んでも、同じ要求には同じ応答を返す", async () => {
    const first = await fetch("https://mock.test/alpha").then((response) => response.text());

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2027-03-04T05:06:07.000Z"));

    const second = await fetch("https://mock.test/alpha").then((response) => response.text());

    vi.useRealTimers();

    expect(second).toBe(first);
  });

  it("違う要求には違う応答を返す", async () => {
    const alpha = await fetch("https://mock.test/alpha").then((response) => response.text());
    const beta = await fetch("https://mock.test/beta").then((response) => response.text());

    expect(beta).not.toBe(alpha);
  });

  it("本文が違う書き込みには違う応答を返す", async () => {
    expect(await write({ name: "靴" })).not.toBe(await write({ name: "鞄" }));
  });

  it("同じ本文の書き込みには同じ応答を返す", async () => {
    expect(await write({ name: "靴" })).toBe(await write({ name: "靴" }));
  });

  it("並行して届いた要求どうしが seed を奪い合わない", async () => {
    const rounds = await Promise.all(Array.from({ length: 16 }, () => fetchAll()));

    expect(new Set(rounds).size).toBe(1);
  });

  it("応答本文を持たない口も組み立てる", async () => {
    const response = await fetch("https://mock.test/silent");

    expect(response.status).toBe(204);
  });

  it("参照を整合させる差し替えを、組み立てた応答へ掛ける", async () => {
    const body = await fetchPatched((response) => ({
      ...(response as Record<string, unknown>),
      aligned: true,
    }));

    expect(body).toMatchObject({ aligned: true });
  });

  it("差し替えは、別の口の応答をその口と同じ内容で引ける", async () => {
    const drawn = (await fetchPatched((_response: unknown, draw) => ({
      drawn: draw("getBetaResponseMock", "/beta"),
    }))) as { drawn: unknown };
    const direct = await fetch("https://mock.test/beta").then((response) => response.json());

    expect(drawn.drawn).toEqual(direct);
  });

  it("差し替えを掛けても、同じ要求には同じ応答を返す", async () => {
    const patch: ReferencePatch = (response, draw) => ({
      ...(response as Record<string, unknown>),
      drawn: draw("getBetaResponseMock", "/beta"),
    });

    expect(await fetchPatched(patch)).toEqual(await fetchPatched(patch));
  });

  it("具体的なパスを、それにも一致するパラメータ区間より先に置く", () => {
    // 位置の比較にしない。`indexOf` は無いものに `-1` を返すので、具体的なパスの側が丸ごと
    // 消えても「先に居る」が成り立ってしまう。
    expect(pathsMatching(/\/items\//)).toEqual([
      "https://mock.test/items/latest",
      "https://mock.test/items/:itemId",
    ]);
  });

  it("パラメータ区間の数が多い口ほど後ろへ置く", () => {
    expect(pathsMatching(/^\/nested/)).toEqual(["/nested", "/nested/:id", "/nested/:id/:subId"]);
  });

  it("具体度が同じ口どうしを生成関数の名前順に並べる", () => {
    // パスでソートする実装と見分けるため、名前順とパス順が逆になる組で見る。
    expect(pathsMatching(/-(?:mu|nu)$/)).toEqual([
      "https://mock.test/zzz-mu",
      "https://mock.test/aaa-nu",
    ]);
  });

  it("module のキーが並ぶ順序によらず同じ並びを返す", () => {
    // `import * as` が返す module のキーは仕様上ソート順で列挙されるが、bundler の変換を通すと
    // 宣言順で見えることがある。並びが読み込み経路で変わると、同じ具体度の口どうしの照合順が
    // 実行環境で変わる。
    const reversed = Object.fromEntries(Object.entries(generated).reverse());

    expect(stableHandlers(reversed).map(endpointOf)).toEqual(
      stableHandlers(generated).map(endpointOf),
    );
  });

  // ----- 異常系 -----
  it("参照先の応答を生成できない名前を引くと落ちる", async () => {
    const body = (await fetchPatched((_response, draw) => {
      try {
        draw("getUnknownResponseMock", "/unknown");
      } catch (error) {
        return { failure: String(error) };
      }

      return { failure: null };
    })) as { failure: string | null };

    expect(body.failure).toContain("参照先の応答を生成できません");
  });

  it("口の名前を持つが関数でない宣言を無視する", () => {
    const broken = { ...generated, getBrokenMockHandler: "組み立てられない値" };

    expect(stableHandlers(broken).map(endpointOf)).toEqual(
      stableHandlers(generated).map(endpointOf),
    );
  });

  it("ハンドラを 1 つも組み立てられない module を落とす", () => {
    expect(() => stableHandlers({ notAHandler: () => undefined })).toThrow(
      /契約から生成したハンドラがありません/,
    );
  });
});
