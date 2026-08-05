import { buildSiteTree, DEFAULT_SITE_TREE_LAYOUT } from "./site-tree";

const { storybook } = buildSiteTree();

console.log(`✅ ${DEFAULT_SITE_TREE_LAYOUT.siteRoot}/ を組み立てました`);
console.log("  /         入口（portal へ転送）");
console.log("  /portal/  ドキュメントポータル");
console.log(
  storybook
    ? "  /storybook/ Storybook"
    : "  /storybook/ 未生成（見るなら pnpm build-storybook を先に実行）",
);
