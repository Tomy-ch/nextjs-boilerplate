import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { claudeConfigDir, externalSkills } from "./skills";

describe("claudeConfigDir", () => {
  // ----- 正常系 -----
  it("CLAUDE_CONFIG_DIR があればそれを使う", () => {
    expect(claudeConfigDir({ CLAUDE_CONFIG_DIR: "/tmp/claude" })).toBe("/tmp/claude");
  });

  // ----- 異常系 -----
  it("指定が無ければ home 配下の .claude を使う", () => {
    expect(claudeConfigDir({})).toBe(path.join(os.homedir(), ".claude"));
  });

  it("空文字の指定は無指定として扱う", () => {
    expect(claudeConfigDir({ CLAUDE_CONFIG_DIR: "" })).toBe(path.join(os.homedir(), ".claude"));
  });
});

describe("externalSkills", () => {
  // ----- 正常系 -----
  it("graphify を Claude Code 向けの引数で導入対象にする", () => {
    const [skill] = externalSkills({ CLAUDE_CONFIG_DIR: "/tmp/claude" });

    expect(skill?.command).toBe("graphify");
    expect(skill?.args).toEqual(["install", "--platform", "claude"]);
  });

  it("着地の検証先を設定の置き場から組み立てる", () => {
    const [skill] = externalSkills({ CLAUDE_CONFIG_DIR: "/tmp/claude" });

    expect(skill?.landing).toBe(path.join("/tmp/claude", "skills", "graphify", "SKILL.md"));
  });
});
