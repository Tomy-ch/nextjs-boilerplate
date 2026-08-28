import { createServer } from "node:net";

import { describe, expect, it } from "vitest";

import { PARTNER_DOCUMENT, servePartnerOrigin } from "./partner-origin";

const HOST = "127.0.0.1";

/** いま空いているポートを 1 つ取る。 */
function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();

    probe.once("error", reject);
    probe.listen(0, HOST, () => {
      const address = probe.address();
      const port = typeof address === "object" && address !== null ? address.port : 0;

      probe.close(() => resolve(port));
    });
  });
}

describe("servePartnerOrigin", () => {
  // ----- 正常系 -----
  it("どのパスにも同じ文書を HTML として返す", async () => {
    const port = await freePort();
    const close = await servePartnerOrigin(HOST, port);

    try {
      const response = await fetch(`http://${HOST}:${port}/any/path?q=1`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
      await expect(response.text()).resolves.toBe(PARTNER_DOCUMENT);
    } finally {
      await close();
    }
  });

  it("止めると待ち受けをやめる", async () => {
    const port = await freePort();
    const close = await servePartnerOrigin(HOST, port);

    await close();

    await expect(fetch(`http://${HOST}:${port}/`)).rejects.toThrow();
  });

  // ----- 異常系 -----
  it("既に使われているポートでは立たない", async () => {
    const port = await freePort();
    const close = await servePartnerOrigin(HOST, port);

    try {
      await expect(servePartnerOrigin(HOST, port)).rejects.toThrow();
    } finally {
      await close();
    }
  });

  it("二度止めると二度目は拒む", async () => {
    const close = await servePartnerOrigin(HOST, await freePort());

    await close();

    await expect(close()).rejects.toThrow();
  });
});
