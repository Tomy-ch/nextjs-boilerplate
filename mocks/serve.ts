import { createServer } from "node:http";
import { Readable } from "node:stream";

/**
 * 契約から生成したハンドラを、HTTP で応答する 1 プロセスとして立てる。
 *
 * @remarks
 * **プロセスをまたいで届く必要があるから、口を開けます。** `mocks/node.ts` の interception は
 * それを立てたプロセスの中でしか効きません。`next build` のプリレンダーは別の worker プロセスで
 * 走るため、`src/instrumentation.ts` の mock も `next.config.ts` の mock も届きません
 * （どちらも実測で確認済み）。`use cache` を持つ取得は組み立て時に評価されるので、取得先が
 * 要ります。
 *
 * 応答そのものは interception に作らせます。この中で `fetch` を呼ぶと MSW が socket へ出る前に
 * 掴むため、届いた要求をそのまま `fetch` へ渡し、返ってきたものを中継すれば、**ハンドラを二重に
 * 持たずに**同じ応答を HTTP へ出せます。自分自身へ繋ぎに行くことはありません。
 *
 * **interception を立てるのは呼ぶ側です。** ここで立てると、既に立っている文脈（テストの
 * `vitest.setup.msw.ts`）から呼べなくなります —— MSW は二度目の `listen()` を投げます。
 *
 * ハンドラの無い宛先は 502 で返します。素通しにすると、掴まれなかった要求がこのサーバ自身へ
 * 向き直って輪になります。
 */
export function startMockApi(port: number): ReturnType<typeof createServer> {
  const server = createServer((incoming, response) => {
    // 待ち受けている口をそのまま名乗る。`0` を渡された（空きを選ばせた）ときは、
    // 引数のままだと組み立てられない URL になる。
    const address = server.address();
    const listening = typeof address === "object" && address !== null ? address.port : port;
    const url = `http://localhost:${listening}${incoming.url ?? "/"}`;
    const method = incoming.method ?? "GET";
    const headers = new Headers();

    for (const [name, value] of Object.entries(incoming.headers)) {
      if (typeof value === "string") {
        headers.set(name, value);
      }
    }

    // `host` は届いた先の名前で、中継先の名前ではない。載せ替えると要求の宛先が二重になる。
    headers.delete("host");

    const hasBody = method !== "GET" && method !== "HEAD";

    fetch(url, {
      method,
      headers,
      body: hasBody ? (Readable.toWeb(incoming) as ReadableStream) : undefined,
      ...(hasBody ? { duplex: "half" } : {}),
    })
      .then(async (upstream) => {
        response.writeHead(upstream.status, Object.fromEntries(upstream.headers));
        response.end(Buffer.from(await upstream.arrayBuffer()));
      })
      .catch((cause: unknown) => {
        response.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
        response.end(String(cause));
      });
  });

  server.listen(port);

  return server;
}
