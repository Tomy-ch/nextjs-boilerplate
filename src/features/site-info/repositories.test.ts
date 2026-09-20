import { describe, expect, it } from "vitest";

import { REPOSITORIES } from "./repositories";

describe("REPOSITORIES", () => {
  // ----- 正常系 -----
  it("このサイトを構成する 2 つのリポジトリを持つ", () => {
    expect(REPOSITORIES.map(({ name }) => name)).toEqual(["nextjs-boilerplate", "go-boilerplate"]);
  });

  it.each([
    { name: "nextjs-boilerplate", url: "https://github.com/Tomy-ch/nextjs-boilerplate" },
    { name: "go-boilerplate", url: "https://github.com/Tomy-ch/go-boilerplate" },
  ])("$name の行き先を $url に固定する", ({ name, url }) => {
    expect(REPOSITORIES.find((repository) => repository.name === name)?.url).toBe(url);
  });

  it("フッターの補足とカードの説明を別の文言で持つ", () => {
    for (const { description, summary } of REPOSITORIES) {
      expect(summary).not.toBe(description);
      expect(summary.length).toBeLessThan(description.length);
    }
  });

  it("補足の面に載せるできることを 1 つ以上持つ", () => {
    for (const { capabilities } of REPOSITORIES) {
      expect(capabilities.length).toBeGreaterThan(0);
    }
  });
});
