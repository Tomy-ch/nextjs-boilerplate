import { beforeEach, describe, expect, it, vi } from "vitest";
import type { findAddressCandidates as findAddressCandidatesType } from "@/adapters/server/api/addresses";
import { createAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

const { findAddressCandidates } = vi.hoisted(() => ({
  findAddressCandidates: vi.fn<typeof findAddressCandidatesType>(),
}));

vi.mock("@/adapters/server/api/addresses", () => ({ findAddressCandidates }));

import { GET } from "./route";

const candidate = { prefecture: "東京都", city: "渋谷区", town: "神宮前" };

function requestFor(search: string): Request {
  return new Request(`http://localhost/api/addresses${search}`);
}

beforeEach(() => {
  findAddressCandidates.mockReset();
  findAddressCandidates.mockResolvedValue([candidate]);
});

describe("GET", () => {
  // ----- 正常系 -----
  it("契約の形の郵便番号のとき候補を JSON で返す", async () => {
    const response = await GET(requestFor("?postalCode=150-0001"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ candidates: [candidate] });
  });

  it("郵便番号をそのまま取得へ渡す", async () => {
    await GET(requestFor("?postalCode=150-0001"));

    expect(findAddressCandidates).toHaveBeenCalledWith("150-0001");
  });

  it("該当が無いとき 200 と空の候補を返す", async () => {
    findAddressCandidates.mockResolvedValue([]);

    const response = await GET(requestFor("?postalCode=999-9999"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ candidates: [] });
  });

  // ----- 異常系 -----
  it.each([
    { label: "郵便番号が無い", search: "" },
    { label: "郵便番号が空", search: "?postalCode=" },
    { label: "ハイフンが無い", search: "?postalCode=1500001" },
    { label: "桁が足りない", search: "?postalCode=150-001" },
    { label: "数字以外を含む", search: "?postalCode=150-000a" },
  ] as const)("$label とき 400 と正規化した文言を返し、取得へ出さない", async ({ search }) => {
    const response = await GET(requestFor(search));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ message: "入力内容が正しくありません。" });
    expect(findAddressCandidates).not.toHaveBeenCalled();
  });

  it("取得が分類つきで失敗したときその分類の status と文言を返す", async () => {
    findAddressCandidates.mockRejectedValue(createAppError(ErrorKind.UNAVAILABLE));

    const response = await GET(requestFor("?postalCode=150-0001"));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      message: "現在サービスを利用できません。しばらくしてから再試行してください。",
    });
  });

  it("取得が分類なしで失敗したとき 500 へ矯正する", async () => {
    findAddressCandidates.mockRejectedValue(new Error("boom"));

    const response = await GET(requestFor("?postalCode=150-0001"));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      message: "問題が発生しました。時間をおいて再試行してください。",
    });
  });
});
