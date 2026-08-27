import { describe, expect, it } from "vitest";

import { REPOSITORIES } from "./repositories";

/**
 * 参照側のテストは `REPOSITORIES` 自身をループして描画結果と突き合わせるので、実データの内容は
 * 誰も固定していない。この表が「単一の真実の源」である以上、中身を守る地点が 1 つ要る。
 */
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
