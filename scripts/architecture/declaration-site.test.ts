import { describe, expect, it } from "vitest";

import { resolveDeclarationSite } from "./declaration-site";

describe("resolveDeclarationSite", () => {
  // ----- 正常系 -----
  it("カーネルの根を、その層の依存で解決する", () => {
    expect(resolveDeclarationSite("src/components")).toEqual({
      type: "components",
      dependencies: ["model", "errors"],
    });
  });

  it("区画の根を、それを含む層より先に解決する", () => {
    expect(resolveDeclarationSite("src/adapters/server/auth")).toEqual({
      type: "adapters-auth",
      dependencies: ["adapters", "model", "errors", "logging", "config"],
    });
  });

  it("何も import できない区画の根も解決する", () => {
    expect(resolveDeclarationSite("src/adapters/gen")).toEqual({
      type: "adapters-gen",
      dependencies: [],
    });
  });

  it("粒度を狭めた層では、スライスを要素の根として解決する", () => {
    expect(resolveDeclarationSite("src/features/auth")?.type).toBe("features");
  });

  it("粒度を狭めた層の根も、スライスと同じ依存の宣言の置き場として解決する", () => {
    expect(resolveDeclarationSite("src/features")).toEqual({
      type: "features",
      dependencies: [
        "model",
        "components",
        "adapters",
        "capabilities",
        "stores",
        "errors",
        "logging",
        "observability",
      ],
    });
  });

  it("共有区画の根を、それを含むスライスより先に解決する", () => {
    expect(resolveDeclarationSite("src/features/auth/facade")?.type).toBe("features-facade");
  });

  // ----- 異常系 -----
  it("層の中で置き場を分けているだけのディレクトリを解決しない", () => {
    expect(resolveDeclarationSite("src/adapters/server/http")).toBeNull();
  });

  it("ファイル名が要素を決める区画を解決しない", () => {
    expect(resolveDeclarationSite("src/app/api")).toBeNull();
  });

  it("スライスの内側のディレクトリを解決しない", () => {
    expect(resolveDeclarationSite("src/features/admin/shipments")).toBeNull();
  });

  it("層の名前で始まるだけの別ディレクトリを解決しない", () => {
    expect(resolveDeclarationSite("src/componentsx")).toBeNull();
  });
});
