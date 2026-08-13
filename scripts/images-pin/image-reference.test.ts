import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  COMPOSE_IMAGE_PATTERN,
  collectRefs,
  DOCKERFILE_FROM_PATTERN,
  type PinTarget,
  parseRef,
  refKey,
  targetFiles,
  unparsedLines,
} from "./image-reference";

let root: string;

/** リポジトリ相対のパスへ内容を書く。途中のディレクトリも作る。 */
function write(relative: string, content: string): string {
  const file = join(root, relative);
  mkdirSync(join(file, ".."), { recursive: true });
  writeFileSync(file, content);

  return file;
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "images-pin-ref-"));
});

afterEach(() => {
  rmSync(root, { force: true, recursive: true });
});

describe("refKey", () => {
  // ----- 正常系 -----
  it("image と tag を参照の形へ戻す", () => {
    expect(refKey({ image: "alpine", tag: "3.24" })).toBe("alpine:3.24");
  });
});

describe("parseRef", () => {
  // ----- 正常系 -----
  it("image と tag へ分ける", () => {
    expect(parseRef("alpine:3.24")).toEqual({ image: "alpine", tag: "3.24" });
  });

  it("registry を含む参照を最後の : で分ける", () => {
    expect(parseRef("mcr.microsoft.com/playwright:v1.62.0-noble")).toEqual({
      image: "mcr.microsoft.com/playwright",
      tag: "v1.62.0-noble",
    });
  });

  it("既に付いている digest を捨てて読む", () => {
    expect(parseRef("alpine:3.24@sha256:abc")).toEqual({ image: "alpine", tag: "3.24" });
  });

  // ----- 異常系 -----
  it("tag を持たない参照を対象外にする", () => {
    expect(parseRef("scratch")).toBeNull();
  });

  it("tag が空の参照を対象外にする", () => {
    expect(parseRef("alpine:")).toBeNull();
  });

  it("最後の : が registry のポートだった参照を対象外にする", () => {
    expect(parseRef("localhost:5000/app")).toBeNull();
  });
});

describe("targetFiles", () => {
  // ----- 正常系 -----
  it("compose ファイルと docker 配下の Dockerfile を集める", () => {
    write("docker-compose.dev-tools.yml", "");
    write("docker-compose.docs.yaml", "");
    write("docker/tools/Dockerfile", "");

    expect(targetFiles(root).map((target) => target.file)).toEqual([
      join(root, "docker-compose.dev-tools.yml"),
      join(root, "docker-compose.docs.yaml"),
      join(root, "docker/tools/Dockerfile"),
    ]);
  });

  it("compose には image のパターンを、Dockerfile には FROM のパターンを割り当てる", () => {
    write("docker-compose.dev-tools.yml", "");
    write("docker/tools/Dockerfile", "");

    expect(targetFiles(root).map((target) => target.pattern)).toEqual([
      COMPOSE_IMAGE_PATTERN,
      DOCKERFILE_FROM_PATTERN,
    ]);
  });

  // ----- 異常系 -----
  it("compose でない YAML と、拡張子違いの compose を対象にしない", () => {
    write("compose.yml", "");
    write("docker-compose.dev-tools.json", "");

    expect(targetFiles(root)).toEqual([]);
  });

  it("docker 配下でも Dockerfile 以外の名前は対象にしない", () => {
    write("docker/tools/entrypoint.sh", "");

    expect(targetFiles(root)).toEqual([]);
  });

  it("docker 配下の直下ファイルを対象にしない", () => {
    write("docker/images-pin.toml", "");

    expect(targetFiles(root)).toEqual([]);
  });

  it("ディレクトリが無ければ空を返す", () => {
    expect(targetFiles(join(root, "不在"))).toEqual([]);
  });
});

describe("collectRefs", () => {
  // ----- 正常系 -----
  it("compose と Dockerfile の参照をキー単位で畳んで集める", () => {
    write("docker-compose.dev-tools.yml", "services:\n  a:\n    image: alpine:3.24\n");
    write("docker/tools/Dockerfile", "FROM alpine:3.24 AS base\nFROM node:24-alpine\n");

    expect([...collectRefs(targetFiles(root)).keys()]).toEqual(["alpine:3.24", "node:24-alpine"]);
  });

  it("platform 指定付きの FROM から参照を取り出す", () => {
    write("docker/tools/Dockerfile", "FROM --platform=linux/amd64 alpine:3.24\n");

    expect([...collectRefs(targetFiles(root)).keys()]).toEqual(["alpine:3.24"]);
  });

  // ----- 異常系 -----
  it("tag を持たないビルドステージ参照を集めない", () => {
    write("docker/tools/Dockerfile", "FROM alpine:3.24 AS base\nFROM base AS final\n");

    expect([...collectRefs(targetFiles(root)).keys()]).toEqual(["alpine:3.24"]);
  });
});

describe("unparsedLines", () => {
  const target = (): PinTarget => targetFiles(root)[0];

  // ----- 正常系 -----
  it("解釈できた参照を取りこぼしとして数えない", () => {
    write("docker-compose.dev-tools.yml", "services:\n  a:\n    image: alpine:3.24\n");

    expect(unparsedLines("services:\n  a:\n    image: alpine:3.24\n", target())).toEqual([]);
  });

  // ----- 異常系 -----
  it("引用符付きで書かれた compose の image を取りこぼしとして報告する", () => {
    write("docker-compose.dev-tools.yml", "");

    expect(unparsedLines('services:\n  a:\n    image: "alpine:3.24"\n', target())).toEqual([3]);
  });

  it("行全体がコメントなら反応しない", () => {
    write("docker-compose.dev-tools.yml", "");

    expect(unparsedLines('  # image: "alpine:3.24"\n', target())).toEqual([]);
  });

  it("解釈できない FROM を取りこぼしとして報告する", () => {
    write("docker/tools/Dockerfile", "");

    expect(unparsedLines('FROM "alpine:3.24" AS base extra\n', target())).toEqual([1]);
  });
});
