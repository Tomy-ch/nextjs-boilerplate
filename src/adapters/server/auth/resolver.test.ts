import { describe, expect, it, vi } from "vitest";
import { fetchSessionRole } from "../api/user-roles"; // sample:line
import { getSessionResolver } from "./resolver";

const config = {
  issuer: "https://idp.example.test",
  clientId: "boilerplate-client",
  redirectUri: "http://localhost:3000/api/auth/callback",
  scopes: "openid profile",
  sessionSecret: "local-development-session-secret-change-before-production",
};

const createDefaultSessionResolver = vi.hoisted(() =>
  vi.fn((_deps: { resolveRole: unknown }) => ({ marker: "resolver" })),
);

vi.mock("@/config/auth/auth.server", () => ({ getAuthConfig: () => config }));
vi.mock("./default-session-resolver", () => ({ createDefaultSessionResolver }));

describe("getSessionResolver", () => {
  // ----- 正常系 -----
  it("設定の値で既定 Resolver を組み立てる", () => {
    getSessionResolver();

    expect(createDefaultSessionResolver).toHaveBeenCalledWith({
      ...config,
      resolveRole: expect.any(Function), // sample:line
    });
  });

  // sample:begin
  it("役割の取得口を渡す", () => {
    getSessionResolver();

    const [deps] = createDefaultSessionResolver.mock.calls[0] ?? [];

    expect(deps?.resolveRole).toBe(fetchSessionRole);
  });
  // sample:end

  it("同じ実体を返し続ける", () => {
    expect(getSessionResolver()).toBe(getSessionResolver());
  });

  it("組み立ては 1 度だけ行う", () => {
    createDefaultSessionResolver.mockClear();

    getSessionResolver();
    getSessionResolver();

    expect(createDefaultSessionResolver).not.toHaveBeenCalled();
  });
});
