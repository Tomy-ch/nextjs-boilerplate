import { describe, expect, it } from "vitest";

import { PARTNER_DOCUMENT, servePartnerOrigin } from "./partner-origin";

describe("servePartnerOrigin", () => {
  // ----- 正常系 -----
  it("どのパスにも同じ文書を HTML として返す", async () => {
    const { port, close } = await servePartnerOrigin("127.0.0.1", 0);

    try {
      const response = await fetch(`http://127.0.0.1:${port}/any/path?q=1`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
      await expect(response.text()).resolves.toBe(PARTNER_DOCUMENT);
    } finally {
      await close();
    }
  });

  it("止めると待ち受けをやめる", async () => {
    const { port, close } = await servePartnerOrigin("127.0.0.1", 0);

    await close();

    await expect(fetch(`http://127.0.0.1:${port}/`)).rejects.toThrow();
  });

  // ----- 異常系 -----
  it("既に使われているポートでは立たない", async () => {
    const first = await servePartnerOrigin("127.0.0.1", 0);

    try {
      await expect(servePartnerOrigin("127.0.0.1", first.port)).rejects.toThrow();
    } finally {
      await first.close();
    }
  });
});
