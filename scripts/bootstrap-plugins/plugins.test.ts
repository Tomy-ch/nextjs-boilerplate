import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resolvedPluginPath, settingsDeclares } from "./plugins";

let home: string;

/** `<home>/.claude/plugins/marketplaces/<market>/plugins/<plugin>` を置く。 */
function placePlugin(market: string, plugin: string): string {
  const target = join(home, ".claude", "plugins", "marketplaces", market, "plugins", plugin);
  mkdirSync(target, { recursive: true });

  return target;
}

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "bootstrap-plugins-"));
});

afterEach(() => {
  rmSync(home, { force: true, recursive: true });
});

describe("settingsDeclares", () => {
  // ----- 正常系 -----
  it("引用符つきで現れる名前を宣言済みとして扱う", () => {
    const settings = join(home, "settings.json");
    writeFileSync(settings, '{ "enabledPlugins": ["skill-creator@official"] }');

    expect(settingsDeclares(settings, "skill-creator@official")).toBe(true);
  });

  // ----- 異常系 -----
  it("引用符の外にしか現れない名前を宣言済みとして扱わない", () => {
    const settings = join(home, "settings.json");
    writeFileSync(settings, "{ }\n// skill-creator は未宣言\n");

    expect(settingsDeclares(settings, "skill-creator")).toBe(false);
  });

  it("設定ファイルが無ければ未宣言として扱う", () => {
    expect(settingsDeclares(join(home, "不在.json"), "skill-creator")).toBe(false);
  });
});

describe("resolvedPluginPath", () => {
  // ----- 正常系 -----
  it("marketplace の名前を問わず実体を見つける", () => {
    const target = placePlugin("any-market", "skill-creator");

    expect(resolvedPluginPath("skill-creator", home)).toBe(target);
  });

  // ----- 異常系 -----
  it("marketplace 配下に居なければ undefined を返す", () => {
    placePlugin("any-market", "other");

    expect(resolvedPluginPath("skill-creator", home)).toBeUndefined();
  });

  it("marketplace ディレクトリが無ければ undefined を返す", () => {
    expect(resolvedPluginPath("skill-creator", home)).toBeUndefined();
  });
});
