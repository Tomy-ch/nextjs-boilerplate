import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

import { fetchProductCount, fetchProductListPage } from "./products";

const listItem = {
  id: "0195f0c2-0000-7000-8000-000000000001",
  name: "商品",
  price: "19.99",
  quantity: 3,
  categoryName: "雑貨",
  statusName: "公開",
  imageUrl: "https://media.example.test/products/abc.png",
};

const payload = { items: [listItem], nextCursor: "next" };

function stubFetch(status: number, body: unknown): ReturnType<typeof vi.fn<typeof fetch>> {
  const fetchImpl = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));

  vi.stubGlobal("fetch", fetchImpl);

  return fetchImpl;
}

async function kindOf(run: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await run();
  } catch (error) {
    return findAppError(error)?.kind;
  }

  return undefined;
}

async function causeOf(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return findAppError(error)?.cause;
  }

  return undefined;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchProductListPage", () => {
  // ----- 正常系 -----
  it("応答の一覧を 1 ページとして返す", async () => {
    stubFetch(200, payload);

    await expect(fetchProductListPage(new URLSearchParams("first=20"))).resolves.toEqual(payload);
  });

  it("最終ページのカーソルを null のまま持つ", async () => {
    stubFetch(200, { ...payload, nextCursor: null });

    const page = await fetchProductListPage(new URLSearchParams("first=20"));

    expect(page.nextCursor).toBeNull();
  });

  it("取得条件をクエリへ載せる", async () => {
    const fetchImpl = stubFetch(200, payload);

    await fetchProductListPage(new URLSearchParams("keyword=本&after=cursor"));

    expect(fetchImpl.mock.calls[0]?.[0]).toBe("/api/products?keyword=%E6%9C%AC&after=cursor");
  });

  it("打ち切り用のシグナルを fetch へ渡す", async () => {
    const fetchImpl = stubFetch(200, payload);
    const controller = new AbortController();

    await fetchProductListPage(new URLSearchParams(), controller.signal);

    expect(fetchImpl.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
  });

  // ----- 異常系 -----
  it("400 が返ったとき invalid-argument へ写す", async () => {
    stubFetch(400, { message: "入力内容が正しくありません。" });

    await expect(kindOf(() => fetchProductListPage(new URLSearchParams("first=0")))).resolves.toBe(
      ErrorKind.INVALID_ARGUMENT,
    );
  });

  it("400 以外で失敗したとき internal へ写す", async () => {
    stubFetch(503, { message: "現在サービスを利用できません。" });

    await expect(kindOf(() => fetchProductListPage(new URLSearchParams()))).resolves.toBe(
      ErrorKind.INTERNAL,
    );
  });

  it("応答が一覧の形を満たさないとき internal へ写す", async () => {
    stubFetch(200, { items: [{ ...listItem, quantity: "3" }], nextCursor: null });

    await expect(kindOf(() => fetchProductListPage(new URLSearchParams()))).resolves.toBe(
      ErrorKind.INTERNAL,
    );
  });

  it("応答が一覧の形を満たさないとき検証の失敗を原因として残す", async () => {
    stubFetch(200, { items: [{ ...listItem, quantity: "3" }], nextCursor: null });

    await expect(
      causeOf(() => fetchProductListPage(new URLSearchParams())),
    ).resolves.toBeInstanceOf(z.ZodError);
  });
});

describe("fetchProductCount", () => {
  // ----- 正常系 -----
  it("応答の件数だけを返す", async () => {
    stubFetch(200, { count: 42 });

    await expect(fetchProductCount(new URLSearchParams("keyword=鞄"))).resolves.toBe(42);
  });

  it("取得条件をクエリへ載せる", async () => {
    const fetchImpl = stubFetch(200, { count: 0 });

    await fetchProductCount(new URLSearchParams("categoryId=a&categoryId=b"));

    expect(fetchImpl.mock.calls[0]?.[0]).toBe("/api/products/count?categoryId=a&categoryId=b");
  });

  it("打ち切り用のシグナルを fetch へ渡す", async () => {
    const fetchImpl = stubFetch(200, { count: 0 });
    const controller = new AbortController();

    await fetchProductCount(new URLSearchParams(), controller.signal);

    expect(fetchImpl.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
  });

  // ----- 異常系 -----
  it("400 が返ったとき invalid-argument へ写す", async () => {
    stubFetch(400, { message: "入力内容が正しくありません。" });

    await expect(kindOf(() => fetchProductCount(new URLSearchParams("minPrice=x")))).resolves.toBe(
      ErrorKind.INVALID_ARGUMENT,
    );
  });

  it("400 以外で失敗したとき internal へ写す", async () => {
    stubFetch(503, { message: "現在サービスを利用できません。" });

    await expect(kindOf(() => fetchProductCount(new URLSearchParams()))).resolves.toBe(
      ErrorKind.INTERNAL,
    );
  });

  it("応答が件数の形を満たさないとき internal へ写す", async () => {
    stubFetch(200, { count: "42" });

    await expect(kindOf(() => fetchProductCount(new URLSearchParams()))).resolves.toBe(
      ErrorKind.INTERNAL,
    );
  });
});
