// どの文書を見るかの宣言。走査そのものは入口([index.ts](index.ts))が持つ。
// boilerplate-only:begin
//
// 見るのは**残る側**である。前提を書いてよいのは前提と一緒に捨てられる文書だけで、それは
// `docs/get-started/` と、そこが集めた [boilerplate 限定の規約](../../docs/get-started/boilerplate-only-conventions.md)
// である（[`docs/rules.md`](../../docs/rules.md)）。
// boilerplate-only:end

import { mirrorOf } from "../lib/mirror.js";

/**
 * 走査するパス（リポジトリルート相対）。ディレクトリなら配下を再帰で見る。
 *
 * @remarks
 * **散文だけでは足りません。**配る側の視点はコメントにも残り、そこが渡ると、コードを読んだ人が
 * 自分に効かない前提を受け取ります。拡張子は {@link SCANNED_EXTENSIONS} が決めます。
 *
 * 文書の翻訳のミラー（兄弟の `<name>.ja.md`）は並べません。canonical を名指せばミラーも当たります。
 */
export const SCANNED_PATHS: readonly string[] = [
  "AGENTS.md",
  "README.md",
  "SECURITY.md",
  ".agents",
  ".claude",
  ".github",
  ".makefiles",
  "docs/adr",
  "docs/design",
  "docs/spec",
  "docs/project",
  "docs/reference",
  "docs/playbook.md",
  "docs/rules.md",
  "docs/testing-conventions.md",
  "docs/traceability.md",
  "docs/README.md",
  "e2e",
  "env",
  "mocks",
  "openapi",
  "scripts",
  "src",
  "vrt",
];

/**
 * 走査する拡張子。
 *
 * @remarks
 * コメントを持てる形式だけです。`.json` はコメントを持てないので入れません —— 入れると、値に
 * 現れた綴りを前提として報告することになります。
 */
const SCANNED_EXTENSIONS: readonly string[] = [".md", ".ts", ".tsx", ".mk", ".sh", ".yaml", ".yml"];

/**
 * 走査から外すパスと、その理由。
 *
 * @remarks
 * **理由を値の一部にしてあります。**外した覚えの無い除外は、規則として置いたつもりの無い規則と
 * 見分けが付きません。
 *
 * 外れるのは 2 種類だけです —— **前提と一緒に捨てられる文書**と、**マーカーの形をデータとして
 * 持つ区画**。それ以外を外すと、渡る側に前提が残ります。
 *
 * {@link SCANNED_PATHS} と同じく、文書を名指せばその翻訳のミラーも外れます。
 */
export const EXCLUDED_PATHS: Readonly<Record<string, string>> = {
  "docs/adr/BACKLOG.md": "未決の待ち行列そのもの。途中であることを書くのが役目",
  "docs/plan": "こちらの計画書。作った側は受け取らない",
  "docs/get-started": "読み終えたら捨てる文書。boilerplate 限定の規約もここが持つ",
  "docs/tutorial": "読み終えたら捨てる文書",
  "docs/portal": "生成物",
  "src/adapters/gen": "契約からの生成物",
  ".github/release": "リリースノート。`make setup-repo` が初期化で消す",
  ".claude/worktrees": "別ブランチの作業ツリー。このリポジトリのソースではない",
  "scripts/marker-baseline": "マーカーの形を入力として持つ区画",
  "scripts/setup/remove-boilerplate-only": "剥がしの道具そのもの。剥がしと一緒に消える", // boilerplate-only:line
  "scripts/setup/remove-sample": "破棄の道具そのもの。破棄と一緒に消える",
  "scripts/setup/lib/markers.test.ts": "マーカーの形を入力として持つ",
  "scripts/premise-lint": "前提の綴りを入力として持つ検査そのもの",
  "scripts/setup": "初期化の道具。複製する行為そのものが主題で、済めば用が無い",
  ".makefiles/github/operation/setup-repository.mk": "同上（初期化の make 定義）",
  "docs/project/versioning.md": "テンプレートと派生の関係そのものが主題",
};

/**
 * そのパスが、宣言したパスそのものか、その配下か、宣言した文書の翻訳のミラーか。
 *
 * @remarks
 * ミラーは canonical の兄弟に `<name>.ja.md` として置くので、宣言の側で対を列挙しません。
 * 列挙すると、ミラーを足した日に宣言の足し忘れが黙って走査の穴（または除外の穴）になります。
 */
function covers(declared: string, relativePath: string): boolean {
  if (relativePath === declared || relativePath.startsWith(`${declared}/`)) {
    return true;
  }

  return mirrorOf(declared) === relativePath;
}

/**
 * 走査を始める起点。{@link SCANNED_PATHS} に、名指した文書の翻訳のミラーを足したもの。
 *
 * @remarks
 * ディレクトリはミラーごと配下を辿るので起点を足さない。文書を 1 本だけ名指した場合は、
 * その兄弟を起点に加えないとミラーが辿られない。実在しない起点は入口が読み飛ばす。
 */
export function scanRoots(): readonly string[] {
  return SCANNED_PATHS.flatMap((scanned) => {
    const mirror = mirrorOf(scanned);

    return mirror === null ? [scanned] : [scanned, mirror];
  });
}

/** そのパスが走査の対象か。 */
export function isScanned(relativePath: string): boolean {
  if (!SCANNED_EXTENSIONS.some((extension) => relativePath.endsWith(extension))) {
    return false;
  }

  if (Object.keys(EXCLUDED_PATHS).some((excluded) => covers(excluded, relativePath))) {
    return false;
  }

  return SCANNED_PATHS.some((scanned) => covers(scanned, relativePath));
}
