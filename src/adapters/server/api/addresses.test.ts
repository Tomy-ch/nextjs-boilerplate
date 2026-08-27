import { describe, expect, it, vi } from "vitest";
import { PARSED_ENVIRONMENT } from "@/config/environment.fixture";
import { serveJson } from "../../../../vitest.setup.msw";

const { getEnvironment } = vi.hoisted(() => ({ getEnvironment: vi.fn(() => PARSED_ENVIRONMENT) }));

vi.mock("@/config/environment", () => ({ getEnvironment }));

import { findAddresses } from "./addresses";

const wireCandidate = {
  prefectureId: "0195f0c2-0000-7000-8000-0000000000a1",
  prefectureName: "東京都",
  city: "渋谷区",
  town: "神宮前",
};

const ADDRESSES_URL = `${PARSED_ENVIRONMENT.APP_API_BASE_URL}/v1/addresses`;

describe("findAddresses", () => {
  // ----- 正常系 -----
  it("契約の候補を表示用の 3 項目へ写す", async () => {
    serveJson(ADDRESSES_URL, { candidates: [wireCandidate], isFallback: false });

    await expect(findAddresses("150-0001")).resolves.toEqual({
      candidates: [{ prefecture: "東京都", city: "渋谷区", town: "神宮前" }],
      isFallback: false,
    });
  });

  it("画面が使わない都道府県 ID を落とす", async () => {
    serveJson(ADDRESSES_URL, { candidates: [wireCandidate], isFallback: false });

    const [candidate] = (await findAddresses("150-0001")).candidates;

    expect(candidate).not.toHaveProperty("prefectureId");
  });

  it("郵便番号をクエリへ載せる", async () => {
    const requests = serveJson(ADDRESSES_URL, { candidates: [], isFallback: false });

    await findAddresses("150-0001");

    expect(requests[0]?.url).toBe(`${ADDRESSES_URL}?postalCode=150-0001`);
  });

  it("複数の候補を契約が返した順のまま保つ", async () => {
    serveJson(ADDRESSES_URL, {
      candidates: [wireCandidate, { ...wireCandidate, town: "千駄ヶ谷" }],
      isFallback: false,
    });

    const { candidates } = await findAddresses("150-0001");

    expect(candidates.map((candidate) => candidate.town)).toEqual(["神宮前", "千駄ヶ谷"]);
  });

  it("県名を解決できなかった候補も市区町村と町域を保つ", async () => {
    serveJson(ADDRESSES_URL, {
      candidates: [{ ...wireCandidate, prefectureId: null }],
      isFallback: false,
    });

    await expect(findAddresses("150-0001")).resolves.toEqual({
      candidates: [{ prefecture: "東京都", city: "渋谷区", town: "神宮前" }],
      isFallback: false,
    });
  });

  it("該当が無いことを、機構が動いていないことと区別して返す", async () => {
    serveJson(ADDRESSES_URL, { candidates: [], isFallback: false });

    await expect(findAddresses("999-9999")).resolves.toEqual({
      candidates: [],
      isFallback: false,
    });
  });

  // ----- 異常系 -----
  it("外部 lookup が落ちていても投げず、機構が動いていないことを伝える", async () => {
    serveJson(ADDRESSES_URL, { candidates: [], isFallback: true });

    await expect(findAddresses("150-0001")).resolves.toEqual({
      candidates: [],
      isFallback: true,
    });
  });

  it("認証ヘッダを付けずに送る", async () => {
    const requests = serveJson(ADDRESSES_URL, { candidates: [], isFallback: false });

    await findAddresses("150-0001");

    expect(requests[0]?.headers.get("authorization")).toBeNull();
  });
});
