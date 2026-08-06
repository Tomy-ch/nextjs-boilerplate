import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildSiteTree, DEFAULT_SITE_TREE_LAYOUT, type SiteTreeLayout } from "./site-tree";

let workspace: string;
let layout: SiteTreeLayout;

function place(path: string, content: string): void {
  mkdirSync(join(workspace, path, ".."), { recursive: true });
  writeFileSync(join(workspace, path), content);
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), "site-tree-"));
  layout = {
    docsDir: join(workspace, "docs"),
    viewerDist: join(workspace, "viewer"),
    storybookDist: join(workspace, "storybook"),
    siteRoot: join(workspace, "site"),
  };

  place("docs/index.html", "root");
  place("docs/adr/0001.md", "adr");
  place("docs/portal/docs.json", "{}");
  place("docs/portal/guides/app.md", "guide");
  place("viewer/index.html", "viewer");
});

afterEach(() => {
  rmSync(workspace, { force: true, recursive: true });
});

describe("正常系", () => {
  describe("buildSiteTree", () => {
    it("docs をサイトルートへ写し、自動発見の相対経路を成立させる", () => {
      buildSiteTree(layout);

      expect(existsSync(join(layout.siteRoot, "index.html"))).toBe(true);
      expect(existsSync(join(layout.siteRoot, "adr", "0001.md"))).toBe(true);
    });

    it("生成済みの guides と docs.json の上へビューアーを重ねる", () => {
      buildSiteTree(layout);

      expect(existsSync(join(layout.siteRoot, "portal", "docs.json"))).toBe(true);
      expect(existsSync(join(layout.siteRoot, "portal", "guides", "app.md"))).toBe(true);
      expect(existsSync(join(layout.siteRoot, "portal", "index.html"))).toBe(true);
    });

    it("Storybook があれば兄弟として並べる", () => {
      place("storybook/index.html", "storybook");

      expect(buildSiteTree(layout).storybook).toBe(true);
      expect(existsSync(join(layout.siteRoot, "storybook", "index.html"))).toBe(true);
    });

    it("組み立てのたびに前回の出力を捨てる", () => {
      mkdirSync(layout.siteRoot, { recursive: true });
      writeFileSync(join(layout.siteRoot, "stale.html"), "前回の残り");

      buildSiteTree(layout);

      expect(existsSync(join(layout.siteRoot, "stale.html"))).toBe(false);
    });

    it("既定の配置は配信 workflow と手元の preview で共有する", () => {
      expect(DEFAULT_SITE_TREE_LAYOUT).toEqual({
        docsDir: "docs",
        viewerDist: join("docs-viewer", "dist"),
        storybookDist: "storybook-static",
        siteRoot: "dist",
      });
    });
  });
});

describe("異常系", () => {
  describe("buildSiteTree", () => {
    it("Storybook が無ければ /storybook/ を作らない", () => {
      expect(buildSiteTree(layout).storybook).toBe(false);
      expect(existsSync(join(layout.siteRoot, "storybook"))).toBe(false);
    });
  });
});
