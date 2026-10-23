import { describe, expect, it } from "vitest";

import { policyBlock } from "./bullfrog-step";

describe("policyBlock", () => {
  // ----- 正常系 -----
  it("遮断なら名前解決を絞り、IP とドメインを改行区切りの一覧で並べる", () => {
    const policy = { domains: ["github.com", "*.example.com"], ips: ["127.0.0.100"], sudo: false };

    expect(policyBlock("  ", policy)).toEqual([
      "  with:",
      "    egress-policy: block",
      "    dns-policy: allowed-domains-only",
      "    enable-sudo: false",
      "    allowed-ips: |",
      "      127.0.0.100",
      "    allowed-domains: |",
      "      github.com",
      "      *.example.com",
    ]);
  });

  it("sudo を残すなら enable-sudo: true を書く", () => {
    expect(policyBlock("", { domains: ["github.com"], ips: [], sudo: true })).toContain(
      "  enable-sudo: true",
    );
  });

  it("監査のままなら IP と sudo だけを書き、名前解決もドメインも絞らない", () => {
    expect(policyBlock("  ", { domains: null, ips: ["127.0.0.100"], sudo: true })).toEqual([
      "  with:",
      "    egress-policy: audit",
      "    enable-sudo: true",
      "    allowed-ips: |",
      "      127.0.0.100",
    ]);
  });

  // ----- 異常系 -----
  it("許す IP が無ければ allowed-ips を書かない", () => {
    expect(policyBlock("", { domains: ["github.com"], ips: [], sudo: false })).toEqual([
      "with:",
      "  egress-policy: block",
      "  dns-policy: allowed-domains-only",
      "  enable-sudo: false",
      "  allowed-domains: |",
      "    github.com",
    ]);
  });

  it("監査のままで IP も無ければ方針と sudo だけを書く", () => {
    expect(policyBlock("", { domains: null, ips: [], sudo: false })).toEqual([
      "with:",
      "  egress-policy: audit",
      "  enable-sudo: false",
    ]);
  });
});
