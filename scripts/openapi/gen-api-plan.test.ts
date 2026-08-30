import { describe, expect, it } from "vitest";

import { type GenApiIo, planRestore, planStash, runGenApi } from "./gen-api-plan";

const OUTPUTS = ["src/adapters/gen/api", "mocks/api"];
const BACKUP = "tmp/gen-api-backup";

/** 呼ばれた順を記録するだけの入出力。`failing` に挙げた引数末尾を持つ実行だけ失敗させる。 */
function recordingIo(
  existing: readonly string[],
  failing: string | null,
): { io: GenApiIo; log: string[] } {
  const log: string[] = [];
  const present = new Set(existing);

  return {
    log,
    io: {
      exists: (path) => present.has(path),
      remove: (path) => {
        log.push(`rm ${path}`);
      },
      move: (from, to) => {
        log.push(`mv ${from} ${to}`);
      },
      run: (_command, args) => {
        log.push(`run ${args.join(" ")}`);

        return args[args.length - 1] !== failing;
      },
      warn: (message) => {
        log.push(message);
      },
    },
  };
}

describe("planStash", () => {
  // ----- 正常系 -----
  it("在る生成物を相対位置のまま退避先の下へ写す", () => {
    expect(planStash(OUTPUTS, BACKUP, () => true)).toEqual([
      { from: "src/adapters/gen/api", to: "tmp/gen-api-backup/src/adapters/gen/api" },
      { from: "mocks/api", to: "tmp/gen-api-backup/mocks/api" },
    ]);
  });

  it("在るものだけを退避の対象にする", () => {
    expect(planStash(OUTPUTS, BACKUP, (path) => path === "mocks/api")).toEqual([
      { from: "mocks/api", to: "tmp/gen-api-backup/mocks/api" },
    ]);
  });

  // ----- 異常系 -----
  it("1 つも在らなければ退避しない", () => {
    expect(planStash(OUTPUTS, BACKUP, () => false)).toEqual([]);
  });
});

describe("planRestore", () => {
  // ----- 正常系 -----
  it("置き場の全数を消し、退避した移動を裏返して戻す", () => {
    const stashed = [{ from: "mocks/api", to: "tmp/gen-api-backup/mocks/api" }];

    expect(planRestore(OUTPUTS, stashed)).toEqual({
      remove: ["src/adapters/gen/api", "mocks/api"],
      moves: [{ from: "tmp/gen-api-backup/mocks/api", to: "mocks/api" }],
    });
  });

  // ----- 異常系 -----
  it("退避が 0 件でも置き場の全数を消す", () => {
    expect(planRestore(OUTPUTS, [])).toEqual({ remove: OUTPUTS, moves: [] });
  });
});

describe("runGenApi", () => {
  // ----- 正常系 -----
  it("退避してから生成し、成功したら退避先を片付ける", () => {
    const { io, log } = recordingIo(OUTPUTS, null);

    expect(runGenApi(io)).toBe(true);
    expect(log).toEqual([
      "rm tmp/gen-api-backup",
      "mv src/adapters/gen/api tmp/gen-api-backup/src/adapters/gen/api",
      "mv mocks/api tmp/gen-api-backup/mocks/api",
      "run exec orval",
      "run exec tsx scripts/openapi/extract-limits.ts",
      "rm tmp/gen-api-backup",
    ]);
  });

  it("退避するものが無くても生成へ進む", () => {
    const { io, log } = recordingIo([], null);

    expect(runGenApi(io)).toBe(true);
    expect(log).toEqual([
      "rm tmp/gen-api-backup",
      "run exec orval",
      "run exec tsx scripts/openapi/extract-limits.ts",
      "rm tmp/gen-api-backup",
    ]);
  });

  // ----- 異常系 -----
  it("orval が落ちたら定数の抽出を走らせずに書き戻す", () => {
    const { io, log } = recordingIo(OUTPUTS, "orval");

    expect(runGenApi(io)).toBe(false);
    expect(log).not.toContain("run exec tsx scripts/openapi/extract-limits.ts");
    expect(log.slice(4)).toEqual([
      "❌ 生成に失敗しました。退避した生成物を書き戻します。",
      "rm src/adapters/gen/api",
      "rm mocks/api",
      "mv tmp/gen-api-backup/src/adapters/gen/api src/adapters/gen/api",
      "mv tmp/gen-api-backup/mocks/api mocks/api",
      "rm tmp/gen-api-backup",
    ]);
  });

  it("定数の抽出が落ちても書き戻す", () => {
    const { io, log } = recordingIo(["mocks/api"], "scripts/openapi/extract-limits.ts");

    expect(runGenApi(io)).toBe(false);
    expect(log.slice(4)).toEqual([
      "❌ 生成に失敗しました。退避した生成物を書き戻します。",
      "rm src/adapters/gen/api",
      "rm mocks/api",
      "mv tmp/gen-api-backup/mocks/api mocks/api",
      "rm tmp/gen-api-backup",
    ]);
  });
});
