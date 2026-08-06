import { describe, expect, it } from "vitest";
import {
  applyStamps,
  contractPath,
  encodeContractPath,
  parseSourcesManifest,
  selectSources,
} from "./sources-manifest";

const manifest = [
  "sources:",
  "  # 本体の契約",
  "  - name: api",
  "    repo: Tomy-ch/go-boilerplate",
  "    path: openapi/openapi.gen.yaml",
  "    ref: 130b179afd0146ce393626064ca2facaefa059f8",
  "    sha: null",
  "    fetchedAt: null",
  "  - name: auth",
  "    repo: Tomy-ch/go-boilerplate",
  "    path: docker/mock-auth-server/openapi/openapi.gen.yaml",
  "    ref: 130b179afd0146ce393626064ca2facaefa059f8",
  "    sha: null",
  "    fetchedAt: null",
  "",
].join("\n");

describe("正常系", () => {
  describe("contractPath", () => {
    it("契約名から取得物の置き場所を決める", () => {
      expect(contractPath("api")).toBe("openapi/api.gen.yaml");
    });
  });
  describe("parseSourcesManifest", () => {
    it("宣言された契約を順に読み取る", () => {
      expect(parseSourcesManifest(manifest).map((source) => source.name)).toEqual(["api", "auth"]);
    });
    it("未取得の契約を未スタンプとして読む", () => {
      const [source] = parseSourcesManifest(
        "sources:\n  - name: api\n    repo: o/r\n    path: openapi.yaml\n    ref: main\n",
      );

      expect(source).toEqual({
        name: "api",
        repo: "o/r",
        path: "openapi.yaml",
        ref: "main",
        sha: null,
        fetchedAt: null,
      });
    });
  });
  describe("selectSources", () => {
    it("名前を渡さなければ全件を対象にする", () => {
      expect(
        selectSources(parseSourcesManifest(manifest), []).map((source) => source.name),
      ).toEqual(["api", "auth"]);
    });
    it("渡した名前の契約だけを対象にする", () => {
      expect(
        selectSources(parseSourcesManifest(manifest), ["auth"]).map((source) => source.name),
      ).toEqual(["auth"]);
    });
  });
  describe("encodeContractPath", () => {
    it("階層の区切りを残したまま各セグメントを符号化する", () => {
      expect(encodeContractPath("docker/mock auth/openapi.gen.yaml")).toBe(
        "docker/mock%20auth/openapi.gen.yaml",
      );
    });
    it("クエリの区切りに使える文字を符号化する", () => {
      expect(encodeContractPath("openapi.yaml?ref=main")).toBe("openapi.yaml%3Fref%3Dmain");
    });
  });
  describe("applyStamps", () => {
    it("取得した契約へ blob SHA と取得時刻を書き戻す", () => {
      const stamped = parseSourcesManifest(
        applyStamps(
          manifest,
          new Map([["api", { sha: "aa62bff", fetchedAt: "2026-08-07T00:00:00.000Z" }]]),
        ),
      );

      expect(stamped[0]).toMatchObject({
        name: "api",
        sha: "aa62bff",
        fetchedAt: "2026-08-07T00:00:00.000Z",
      });
    });
    it("取得しなかった契約のスタンプを残す", () => {
      const stamped = parseSourcesManifest(
        applyStamps(
          manifest,
          new Map([["api", { sha: "aa62bff", fetchedAt: "2026-08-07T00:00:00.000Z" }]]),
        ),
      );

      expect(stamped[1]).toMatchObject({ name: "auth", sha: null, fetchedAt: null });
    });
    it("宣言に添えたコメントを保つ", () => {
      const rewritten = applyStamps(
        manifest,
        new Map([["api", { sha: "aa62bff", fetchedAt: "2026-08-07T00:00:00.000Z" }]]),
      );

      expect(rewritten).toContain("# 本体の契約");
    });
  });
});

describe("異常系", () => {
  describe("parseSourcesManifest", () => {
    it("空の宣言を拒否する", () => {
      expect(() => parseSourcesManifest("sources: []\n")).toThrow();
    });
    it("契約名の重複を拒否する", () => {
      const duplicated = [
        manifest,
        "  - name: api",
        "    repo: o/r",
        "    path: p",
        "    ref: main",
        "",
      ].join("\n");

      expect(() => parseSourcesManifest(duplicated)).toThrow('name "api" が重複しています');
    });
    it("取得物の置き場所を外せる契約名を拒否する", () => {
      expect(() =>
        parseSourcesManifest(
          "sources:\n  - name: ../evil\n    repo: o/r\n    path: openapi.yaml\n    ref: main\n",
        ),
      ).toThrow();
    });
    it("ref のクエリを上書きできる path を拒否する", () => {
      expect(() =>
        parseSourcesManifest(
          "sources:\n  - name: api\n    repo: o/r\n    path: openapi.yaml?ref=main\n    ref: main\n",
        ),
      ).toThrow();
    });
    it("上位ディレクトリへ遡る path を拒否する", () => {
      expect(() =>
        parseSourcesManifest(
          "sources:\n  - name: api\n    repo: o/r\n    path: ../../openapi.yaml\n    ref: main\n",
        ),
      ).toThrow();
    });
    it("owner/repo の形式でない取得元を拒否する", () => {
      expect(() =>
        parseSourcesManifest(
          "sources:\n  - name: api\n    repo: go-boilerplate\n    path: openapi.yaml\n    ref: main\n",
        ),
      ).toThrow();
    });
  });
  describe("selectSources", () => {
    it("宣言に無い契約名を拒否する", () => {
      expect(() => selectSources(parseSourcesManifest(manifest), ["ghost"])).toThrow(
        "openapi/sources.yaml に宣言のない契約です: ghost",
      );
    });
  });
  describe("applyStamps", () => {
    it("宣言に無い契約名のスタンプを拒否する", () => {
      expect(() =>
        applyStamps(
          manifest,
          new Map([["ghost", { sha: "aa62bff", fetchedAt: "2026-08-07T00:00:00.000Z" }]]),
        ),
      ).toThrow('name "ghost" は sources.yaml に宣言されていません');
    });
  });
});
