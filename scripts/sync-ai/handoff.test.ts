import { describe, expect, it } from "vitest";

import { CODEX_RECEIVER_WORKFLOW, CODEX_SKILLS_DIR, codexExecArgs, handoffPrompt } from "./handoff";

const CONTRACT = "# 転送契約\n\n- name: example\n";

describe("codexExecArgs", () => {
  // ----- 正常系 -----
  it("workspace-write のまま .agents を書き込み可能な root へ足し、プロンプトを標準入力から読む", () => {
    expect(codexExecArgs("/repo")).toEqual([
      "exec",
      "--sandbox",
      "workspace-write",
      "-c",
      'sandbox_workspace_write.writable_roots=["/repo/.agents"]',
      "-",
    ]);
  });

  it("パスが引用符とバックスラッシュを含んでも、root の値を 1 つの文字列として閉じる", () => {
    expect(codexExecArgs('/a"b\\c')).toContain(
      'sandbox_workspace_write.writable_roots=["/a\\"b\\\\c/.agents"]',
    );
  });
});

describe("handoffPrompt", () => {
  // ----- 正常系 -----
  it("Codex 側に manage-skill が在れば、それを通して書かせる", () => {
    const prompt = handoffPrompt(CONTRACT, true);

    expect(prompt).toContain(`\`manage-skill\` workflow at \`${CODEX_RECEIVER_WORKFLOW}\``);
    expect(prompt).not.toContain("does not exist");
  });

  it("Codex 側に manage-skill が無ければ、無いことを告げて直接書かせ、報告に残させる", () => {
    const prompt = handoffPrompt(CONTRACT, false);

    expect(prompt).toContain(`\`${CODEX_RECEIVER_WORKFLOW}\` does not exist`);
    expect(prompt).toContain("no receiving-side authoring workflow ran");
    expect(prompt).not.toContain("workflow at");
  });

  it("契約を区切りの後ろへ手を加えずに置く", () => {
    expect(handoffPrompt(CONTRACT, true).endsWith(`--- TRANSFER CONTRACT ---\n\n${CONTRACT}`)).toBe(
      true,
    );
  });

  it("連鎖を延ばさないことと、書き込みを名指しの 1 スキルに限ることを求める", () => {
    const prompt = handoffPrompt(CONTRACT, true);

    expect(prompt).toContain("Do not start another agent");
    expect(prompt).toContain(`Write only under \`${CODEX_SKILLS_DIR}/<name>/\``);
    expect(prompt).toContain("Do not ask questions");
  });
});
