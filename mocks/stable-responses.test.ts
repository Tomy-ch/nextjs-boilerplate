import { faker } from "@faker-js/faker";
import { type HttpHandler, HttpResponse, http, type RequestHandler } from "msw";
import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { seedFor, stableHandlers } from "./stable-responses";

describe("seedFor", () => {
  // ----- 正常系 -----
  it("同じ要求に同じ値を返す", () => {
    expect(seedFor("GET", "https://api.test/v1/products")).toBe(
      seedFor("GET", "https://api.test/v1/products"),
    );
  });

  it("method が違えば別の値を返す", () => {
    expect(seedFor("GET", "https://api.test/v1/products")).not.toBe(
      seedFor("POST", "https://api.test/v1/products"),
    );
  });

  it("method の綴りの大小を区別しない", () => {
    expect(seedFor("get", "https://api.test/v1/products")).toBe(
      seedFor("GET", "https://api.test/v1/products"),
    );
  });

  it("パスが違えば別の値を返す", () => {
    expect(seedFor("GET", "https://api.test/v1/products")).not.toBe(
      seedFor("GET", "https://api.test/v1/users"),
    );
  });

  it("絞り込みの条件が違えば別の値を返す", () => {
    expect(seedFor("GET", "https://api.test/v1/products?keyword=靴")).not.toBe(
      seedFor("GET", "https://api.test/v1/products?keyword=鞄"),
    );
  });

  it("本文が違えば別の値を返す", () => {
    expect(seedFor("POST", "https://api.test/v1/products", '{"name":"靴"}')).not.toBe(
      seedFor("POST", "https://api.test/v1/products", '{"name":"鞄"}'),
    );
  });

  it("本文を持たない要求と空の本文を同じに扱う", () => {
    expect(seedFor("GET", "https://api.test/v1/products")).toBe(
      seedFor("GET", "https://api.test/v1/products", ""),
    );
  });

  it("faker の seed として渡せる 32bit の非負整数を返す", () => {
    const seed = seedFor("GET", "https://api.test/v1/products");

    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThan(2 ** 32);
  });
});

/** 契約から生成した口の名前。ハンドラと応答が名前で対応する。 */
const ENDPOINTS = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta"] as const;

/**
 * 契約から生成したモックの module を模した相手。
 *
 * @remarks
 * 生成物と同じ形だけを取り出しています —— 口ごとに `get<名前>MockHandler` と
 * `get<名前>ResponseMock` を並べ、resolver は `async` で、応答の差し替えを受け取ります
 * （`api/endpoints.msw.ts`）。生成物そのものへ依存しないのは、契約が変わるたびにこの検査が
 * 動く必要はないためです。生成物との対応は [handlers.test.ts](handlers.test.ts) が見ます。
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
};

function randomBody(): Record<string, unknown> {
  return {
    value: faker.string.alpha({ length: 16 }),
    count: faker.number.int({ min: 1, max: 100 }),
  };
}

const server = setupServer(...stableHandlers(generated));

/** ハンドラが受け持つ口。並びと集合の比較に使う。 */
function endpointOf(handler: HttpHandler): string {
  return `${String(handler.info.method)} ${String(handler.info.path)}`;
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
        "POST https://mock.test/write",
      ].sort(),
    );
  });

  it("同じ要求へ何度でも同じ応答を返す", async () => {
    const first = await fetch("https://mock.test/alpha").then((response) => response.text());
    const second = await fetch("https://mock.test/alpha").then((response) => response.text());

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
