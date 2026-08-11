import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { mockServer } from "./mocks/node";

// dev サーバーと同じ契約駆動ハンドラをテストでも使う。テスト専用のスタブを別に持つと、
// 契約が変わってもテストだけが古い形のまま通り続ける。
//
// 素通しを既定にするのは、ハンドラの無い宛先を落とすと、fetch を直接差し替えて検証している
// 単体テストまでモックの管轄に引き込まれるため。
beforeAll(() => {
  mockServer.listen({ onUnhandledRequest: "bypass" });
});

afterEach(() => {
  cleanup();
  mockServer.resetHandlers();
});

afterAll(() => {
  mockServer.close();
});

vi.mock("server-only", () => ({}));
