import { describe, expect, it } from "vitest";
import { parseDocument, Scalar } from "yaml";
import {
  buildContractArtifact,
  CONTRACT_HEADER,
  scalarRange,
  stampContractVersion,
  toShortSha,
} from "./contract-stamp";

const BLOB_SHA = "aa62bff3e087b544494f012d5009702492e40d79";

const spec = [
  "openapi: 3.0.3",
  "info:",
  "  title: Sample",
  "  version: 2.2.0",
  "paths: {}",
  "",
].join("\n");

describe("toShortSha", () => {
  // ----- 正常系 -----
  it("blob SHA を先頭 7 桁へ詰める", () => {
    expect(toShortSha(BLOB_SHA)).toBe("aa62bff");
  });
  // ----- 異常系 -----
  it("16 進以外を拒否する", () => {
    expect(() => toShortSha("not-a-sha")).toThrow("blob SHA の形式ではありません");
  });

  it("7 桁に満たない値を拒否する", () => {
    expect(() => toShortSha("aa62bf")).toThrow("blob SHA の形式ではありません");
  });
});

describe("scalarRange", () => {
  // ----- 正常系 -----
  it("解析済みスカラーの開始位置と終了位置を返す", () => {
    const node = parseDocument("version: 2.2.0").getIn(["version"], true) as Scalar;

    expect(scalarRange(node)).toEqual([9, 14]);
  });
  // ----- 異常系 -----
  it("解析結果ではないノードを拒否する", () => {
    expect(() => scalarRange(new Scalar("2.2.0"))).toThrow("解析結果ではないノード");
  });
});

describe("stampContractVersion", () => {
  // ----- 正常系 -----
  it("info.version の末尾へ short SHA を付ける", () => {
    expect(stampContractVersion(spec, BLOB_SHA)).toContain("  version: 2.2.0+aa62bff\n");
  });

  it("version 以外の行を変えない", () => {
    const stamped = stampContractVersion(spec, BLOB_SHA).split("\n");

    expect(stamped.filter((line) => !line.startsWith("  version:"))).toEqual([
      "openapi: 3.0.3",
      "info:",
      "  title: Sample",
      "paths: {}",
      "",
    ]);
  });

  it("引用符付きの版はその引用を保つ", () => {
    const quoted = stampContractVersion('info:\n  version: "2.2.0"\n', BLOB_SHA);

    expect(quoted).toBe('info:\n  version: "2.2.0+aa62bff"\n');
  });

  it("小数に見える版を解析値へ丸めない", () => {
    expect(stampContractVersion("info:\n  version: 1.0\n", BLOB_SHA)).toBe(
      "info:\n  version: 1.0+aa62bff\n",
    );
  });

  it("単一引用符の版はその引用を保つ", () => {
    expect(stampContractVersion("info:\n  version: '2.2.0'\n", BLOB_SHA)).toBe(
      "info:\n  version: '2.2.0+aa62bff'\n",
    );
  });

  it("既存の build metadata を付け直す", () => {
    const restamped = stampContractVersion("info:\n  version: 2.2.0+0000000\n", BLOB_SHA);

    expect(restamped).toBe("info:\n  version: 2.2.0+aa62bff\n");
  });
  // ----- 異常系 -----
  it("info.version を持たない契約を拒否する", () => {
    expect(() =>
      stampContractVersion("openapi: 3.0.3\ninfo:\n  title: Sample\n", BLOB_SHA),
    ).toThrow("契約に info.version がありません");
  });

  it("info.version がスカラーでない契約を拒否する", () => {
    expect(() => stampContractVersion("info:\n  version:\n    major: 2\n", BLOB_SHA)).toThrow(
      "契約に info.version がありません",
    );
  });

  it("折り畳みブロックの info.version を拒否する", () => {
    expect(() =>
      stampContractVersion("info:\n  version: >-\n    2.2.0\n  title: x\n", BLOB_SHA),
    ).toThrow("スタンプできない info.version の書き方です（BLOCK_FOLDED）");
  });

  it("リテラルブロックの info.version を拒否する", () => {
    expect(() => stampContractVersion("info:\n  version: |-\n    2.2.0\n", BLOB_SHA)).toThrow(
      "スタンプできない info.version の書き方です（BLOCK_LITERAL）",
    );
  });

  it("空の info.version を拒否する", () => {
    expect(() => stampContractVersion("info:\n  version:\n", BLOB_SHA)).toThrow(
      "契約の info.version が空です",
    );
  });

  it("blob SHA が不正なら契約を読む前に落ちる", () => {
    expect(() => stampContractVersion(spec, "")).toThrow("blob SHA の形式ではありません");
  });
});

describe("buildContractArtifact", () => {
  // ----- 正常系 -----
  it("do-not-edit ヘッダを先頭に置く", () => {
    expect(buildContractArtifact(spec, BLOB_SHA).startsWith(CONTRACT_HEADER)).toBe(true);
  });

  it("同じ入力から同じ本文を書き出す", () => {
    expect(buildContractArtifact(spec, BLOB_SHA)).toBe(buildContractArtifact(spec, BLOB_SHA));
  });
});
