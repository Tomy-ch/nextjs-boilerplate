import { describe, expect, it } from "vitest";

import { parseDeclaration } from "../../egress/declaration";
import { dropOrphanedDeclarations } from "./egress-declaration";

const DECLARATION = [
  "baseline:",
  "  - github.com",
  "workflows:",
  "  vrt:",
  "    - mcr.microsoft.com",
  "  strip-verify:",
  "    - fonts.googleapis.com",
  "audit:",
  "  strip-verify: 宛先を実測できていない",
  "  notify: 宛先を実測できていない",
  "sudo:",
  "  strip-verify:",
  "    build: ホストのパスをマウントする",
  "  vrt:",
  "    vrt-shard: ホストのパスをマウントする",
  "",
].join("\n");

describe("dropOrphanedDeclarations", () => {
  // ----- 正常系 -----
  it("固有分の塊を、続きの行ごと落とす", () => {
    const out = dropOrphanedDeclarations(DECLARATION, ["strip-verify"]);

    expect(out).not.toContain("strip-verify");
    expect(out).not.toContain("fonts.googleapis.com");
  });

  it("監査のままの宣言も落とす", () => {
    const out = dropOrphanedDeclarations(DECLARATION, ["strip-verify"]);

    expect(out).toContain("audit:\n  notify: 宛先を実測できていない\nsudo:");
  });

  it("sudo の例外も job ごと落とす", () => {
    const out = dropOrphanedDeclarations(DECLARATION, ["strip-verify"]);

    expect(out).toContain("sudo:\n  vrt:\n    vrt-shard: ホストのパスをマウントする");
    expect(out).not.toContain("    build:");
  });

  it("残す塊には手を付けない", () => {
    const out = dropOrphanedDeclarations(DECLARATION, ["strip-verify"]);

    expect(out).toContain("workflows:\n  vrt:\n    - mcr.microsoft.com\naudit:");
    expect(out).toContain("baseline:\n  - github.com");
  });

  it("落とした後も宣言として読める", () => {
    const out = dropOrphanedDeclarations(DECLARATION, ["strip-verify"]);
    const declaration = parseDeclaration(out);

    expect(Object.keys(declaration.workflows)).toEqual(["vrt"]);
    expect(declaration.audit).toEqual({ notify: "宛先を実測できていない" });
    expect(declaration.sudo).toEqual({ vrt: { "vrt-shard": "ホストのパスをマウントする" } });
  });

  it("各表の唯一のエントリを落としても、残ったキーごと宣言として読める", () => {
    const only = [
      "baseline:",
      "  - github.com",
      "workflows:",
      "  vrt:",
      "    - mcr.microsoft.com",
      "audit:",
      "  vrt: 実測できていない",
      "sudo:",
      "  vrt:",
      "    vrt-shard: ホストのパスをマウントする",
      "",
    ].join("\n");
    const out = dropOrphanedDeclarations(only, ["vrt"]);

    expect(out).toBe("baseline:\n  - github.com\nworkflows:\naudit:\nsudo:\n");
    expect(parseDeclaration(out)).toEqual({
      baseline: ["github.com"],
      ips: {},
      workflows: {},
      audit: {},
      sudo: {},
    });
  });

  it("続けて並ぶ 2 つの塊をどちらも落とす", () => {
    const pair =
      "workflows:\n  a:\n    - a.example\n  b:\n    - b.example\n  c:\n    - c.example\n";

    expect(dropOrphanedDeclarations(pair, ["a", "b"])).toBe("workflows:\n  c:\n    - c.example\n");
  });

  it("塊の途中に空行があっても最後まで落とす", () => {
    const spaced =
      "workflows:\n  vrt:\n    - a.example\n\n    - b.example\n  lint:\n    - c.example\n";
    const out = dropOrphanedDeclarations(spaced, ["vrt"]);

    expect(out).not.toContain("a.example");
    expect(out).not.toContain("b.example");
    expect(out).toContain("c.example");
  });

  it("末尾の改行を残す", () => {
    const out = dropOrphanedDeclarations(DECLARATION, ["strip-verify"]);

    expect(out.endsWith("    vrt-shard: ホストのパスをマウントする\n")).toBe(true);
  });

  it("末尾に改行の無い宣言には改行を足さない", () => {
    const bare = "workflows:\n  a:\n    - a.example\n  b:\n    - b.example";

    expect(dropOrphanedDeclarations(bare, ["a"])).toBe("workflows:\n  b:\n    - b.example");
  });

  // ----- 異常系 -----
  it("落とす相手が居なければ元のまま返す", () => {
    expect(dropOrphanedDeclarations(DECLARATION, ["不在"])).toBe(DECLARATION);
  });

  it("名前が部分的に一致するだけの塊は落とさない", () => {
    const similar = "workflows:\n  vrt-guard:\n    - a.example\n";

    expect(dropOrphanedDeclarations(similar, ["vrt"])).toBe(similar);
  });

  it("字下げの無い最上位のキーは、名前が一致しても落とさない", () => {
    const top = "audit:\n  vrt: 理由\nsudo:\n";

    expect(dropOrphanedDeclarations(top, ["audit", "sudo"])).toBe(top);
  });

  it("引用符や点を含む ips のキーには手を付けない", () => {
    const kept = "ips:\n  '127.0.0.100': 理由\n  10.0.0.0/8: 理由\nworkflows:\n";
    const ips = `${kept}  vrt:\n    - a.example\n`;

    expect(dropOrphanedDeclarations(ips, ["127", "10", "vrt"])).toBe(kept);
  });

  it("残る workflow の下にある同名の job は落とさない", () => {
    const nested = "sudo:\n  vrt:\n    strip-verify: 理由\n";

    expect(dropOrphanedDeclarations(nested, ["strip-verify"])).toBe(nested);
  });
});
