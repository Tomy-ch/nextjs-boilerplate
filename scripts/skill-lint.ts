#!/usr/bin/env node

// `.claude/**` のスキル / エージェント定義を意味的に検査する lint スクリプト。
// markdownlint は体裁しか見ないため、「書いてある内容が実態と合っているか」は誰も検査していない。
// スキル定義はエージェントの挙動を決める指示書であり、腐った参照はそのまま誤った手順の実行につながる。
//
// 検査は Makefile のターゲット一覧・ファイルシステム・見出し抽出・確定済みの採番規約から導出できる
// ものだけに限る（判断を含めない）。node の標準ライブラリのみに依存する。
// 1 件でも違反があれば非 0 で終了する。
import fs from "node:fs";
import path from "node:path";

type Finding = {
  file: string;
  line: number;
  rule: string;
  message: string;
};

type Frontmatter = {
  lines: string[];
  endLine: number;
};

type Heading = {
  level: number;
  text: string;
  lineNo: number;
};

type MakeTargets = {
  exact: Set<string>;
  patterns: RegExp[];
};

const REPO_ROOT = process.cwd();
const CLAUDE_DIR = ".claude";
const SKILLS_DIR = path.join(CLAUDE_DIR, "skills");
const AGENTS_DIR = path.join(CLAUDE_DIR, "agents");

// ファイル索引・参照検査から外すディレクトリ（VCS 内部 / 外部依存 / 生成物 / 実行時成果物）。
const EXCLUDE_DIRS = new Set([".git", "node_modules", ".next", "tmp"]);

// 参照検査の対象外にする先頭セグメント。tmp/ 配下はスキル実行中に生成されるため、
// 静的なファイルシステム検査では存在しないのが正常。
const PATH_ROOT_DENY = new Set(["tmp", ".git"]);

// 意図的に実在しない参照（仮定の例示・任意配置）を抑止するための行内ディレクティブ。
const IGNORE_DIRECTIVE = "<!-- skill-lint-ignore -->";

// 参照 1 件あたりのワイルドカード数とブレース展開数の上限。
// 参照文字列は Markdown 本文から取るため書き手が自由に決められ、pre-commit と CI は時間制限なしで
// このスクリプトを回す。`*` を並べた参照は `.*` の連鎖になり、索引全件との照合で破局的バックトラッキングを
// 起こす。`{a,b}` の並びは組み合わせ爆発を起こす。上限超過は検査を飛ばさず違反として報告する
// （黙って通すと「複雑に書けば検査を外せる」抜け道になる）。
const MAX_WILDCARDS = 8;
const MAX_BRACE_EXPANSIONS = 64;

function isTooComplex(text: string): boolean {
  const wildcards = text.match(/\*+|<[^>]*>/g)?.length ?? 0;
  if (wildcards > MAX_WILDCARDS) return true;
  const combinations = (text.match(/\{[^{}]*\}/g) ?? []).reduce(
    (n, group) => n * Math.max(1, group.split(",").length),
    1,
  );
  return combinations > MAX_BRACE_EXPANSIONS;
}

const findings: Finding[] = [];

function report(file: string, line: number, rule: string, message: string): void {
  findings.push({ file, line, rule, message });
}

// ---------------------------------------------------------------------------
// 共通ユーティリティ
// ---------------------------------------------------------------------------

function readFile(rel: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
}

function listDirs(rel: string): string[] {
  const abs = path.join(REPO_ROOT, rel);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

// REPO_ROOT 配下の全エントリ（ファイル + ディレクトリ）をリポジトリ相対パスで索引化する。
// glob / プレースホルダを含む参照は実パス解決ができないため、この索引に対する正規表現照合で判定する。
function buildEntryIndex(): string[] {
  const entries: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      entries.push(path.relative(REPO_ROOT, abs));
      if (entry.isDirectory()) {
        if (EXCLUDE_DIRS.has(entry.name)) continue;
        walk(abs);
      }
    }
  };
  walk(REPO_ROOT);
  return entries;
}

// `{a,b}` を展開して候補文字列の配列にする。
// make ターゲットでは実ターゲット名の列挙（全て実在すべき）、パスでは glob の選択（どれか 1 つ
// 当たれば良い）と意味が異なるため、判定側で all / any を使い分ける。
function expandBraces(text: string): string[] {
  const m = /\{([^{}]*)\}/.exec(text);
  if (!m) return [text];
  return m[1]
    .split(",")
    .flatMap((alt) =>
      expandBraces(text.slice(0, m.index) + alt + text.slice(m.index + m[0].length)),
    );
}

const WILDCARD_RE = /[*<]/;

// ドキュメント中のプレースホルダ表記を正規表現へ変換する。
// `<name>` は書き手が埋める任意の 1 セグメント、`**` は任意階層、`*` は 1 セグメント内の任意文字列。
function placeholderToRegExp(
  text: string,
  { segmentSeparator }: { segmentSeparator: boolean },
): RegExp {
  const anySegmentChars = segmentSeparator ? "[^/]*" : ".*";
  const placeholderChars = segmentSeparator ? "[^/]+" : ".+";
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "<") {
      const close = text.indexOf(">", i);
      if (close === -1) {
        out += "<";
        continue;
      }
      out += placeholderChars;
      i = close;
      continue;
    }
    if (ch === "*") {
      // 連続する `*` は 1 つのワイルドカードとして扱う。1 個ずつ `.*` へ展開すると `.*` の連鎖ができ、
      // 照合が破局的バックトラッキングに落ちる。
      let run = 1;
      while (text[i + run] === "*") run++;
      i += run - 1;
      if (segmentSeparator && run >= 2) {
        if (text[i + 1] === "/") {
          out += "(?:[^/]+/)*";
          i++;
        } else {
          out += ".*";
        }
        continue;
      }
      out += anySegmentChars;
      continue;
    }
    out += ch.replace(/[.+^${}()|[\]\\?]/g, "\\$&");
  }
  return new RegExp(`^${out}$`);
}

// 行を走査しつつコードフェンス（``` / ~~~）の内外を判定する。
// フェンス内は例示・出力サンプルであり実在性を保証しない前提のため、検査対象から外す。
// スキル本文は Markdown を含む Markdown（```markdown の中に ```json）を書くため、閉じ判定は
// CommonMark どおり「情報文字列を持たない同種・同長以上のフェンス行」に限る。
function* eachLineOutsideFence(content: string): Generator<{ line: string; lineNo: number }> {
  const lines = content.split("\n");
  let fence: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const marker = /^\s*(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      const closes =
        marker !== null &&
        marker[1][0] === fence[0] &&
        marker[1].length >= fence.length &&
        marker[2].trim() === "";
      if (closes) fence = null;
      continue;
    }
    if (marker) {
      fence = marker[1];
      continue;
    }
    yield { line, lineNo: i + 1 };
  }
}

// 1 行からインラインコードスパン（`...`）の中身を抜き出す。
function extractInlineCode(line: string): string[] {
  const spans: string[] = [];
  const re = /(`+)([^`]+?)\1/g;
  let m: RegExpExecArray | null = re.exec(line);
  while (m !== null) {
    spans.push(m[2].trim());
    m = re.exec(line);
  }
  return spans;
}

// ---------------------------------------------------------------------------
// frontmatter
// ---------------------------------------------------------------------------

// 先頭の `---` で囲まれた frontmatter を切り出す。無ければ null。
function splitFrontmatter(content: string): Frontmatter | null {
  const lines = content.split("\n");
  if (lines[0] !== "---") return null;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "---") return { lines: lines.slice(1, i), endLine: i + 1 };
  }
  return null;
}

// frontmatter のトップレベルキーと値を取り出す。折り畳みスカラ（`key: >-`）は後続の
// インデント行を連結して値とする（YAML パーサを持ち込まずに済む範囲に限定した簡易解析）。
function parseFrontmatterKeys(fmLines: string[]): Map<string, string> {
  const keys = new Map<string, string>();
  for (let i = 0; i < fmLines.length; i++) {
    const m = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(fmLines[i]);
    if (!m) continue;
    let value = m[2].trim();
    if (value === ">-" || value === ">" || value === "|" || value === "|-") {
      const folded: string[] = [];
      for (let j = i + 1; j < fmLines.length; j++) {
        if (fmLines[j].trim() !== "" && !/^\s/.test(fmLines[j])) break;
        folded.push(fmLines[j].trim());
      }
      value = folded.join(" ").trim();
    }
    keys.set(m[1], value);
  }
  return keys;
}

// name / description の必須検査と配置名（ディレクトリ名 / ファイル名）との一致検査。
function checkFrontmatter(rel: string, content: string, expectedName: string): void {
  const fm = splitFrontmatter(content);
  if (!fm) {
    report(rel, 1, "frontmatter", "frontmatter (`---` で囲まれたブロック) がありません");
    return;
  }
  const keys = parseFrontmatterKeys(fm.lines);
  for (const required of ["name", "description"]) {
    if (!keys.has(required) || keys.get(required) === "") {
      report(rel, 1, "frontmatter", `frontmatter に \`${required}\` がありません（または空です）`);
    }
  }
  const name = keys.get("name");
  if (name !== undefined && name !== "" && name !== expectedName) {
    report(
      rel,
      1,
      "frontmatter",
      `frontmatter の \`name: ${name}\` が配置名 \`${expectedName}\` と一致しません`,
    );
  }
}

// ---------------------------------------------------------------------------
// 対訳ペア
// ---------------------------------------------------------------------------

// フェンス外の見出しを (レベル, テキスト) で抽出する。
function extractHeadings(content: string): Heading[] {
  const headings: Heading[] = [];
  for (const { line, lineNo } of eachLineOutsideFence(content)) {
    const m = /^(#{1,6})\s+(.*?)\s*$/.exec(line);
    if (m) headings.push({ level: m[1].length, text: m[2], lineNo });
  }
  return headings;
}

// 対訳（SKILL.ja.md）が canonical（SKILL.md）と 1:1 であることを検査する。
// ファイルの有無だけでは節の欠落・ずれを検出できないため、見出しレベル列の一致まで見る。
function checkTranslationPair(canonicalRel: string, translationRel: string): void {
  if (!fs.existsSync(path.join(REPO_ROOT, translationRel))) {
    report(
      canonicalRel,
      1,
      "translation",
      `対訳 \`${path.basename(translationRel)}\` がありません`,
    );
    return;
  }
  const translation = readFile(translationRel);

  if (splitFrontmatter(translation)) {
    report(
      translationRel,
      1,
      "translation",
      "対訳に frontmatter があります（スキルとして読み込まれるのは canonical 側だけです）",
    );
  }

  const firstLine = translation.split("\n").find((l) => l.trim() !== "") ?? "";
  if (!firstLine.startsWith(">") || !firstLine.includes(path.basename(canonicalRel))) {
    report(
      translationRel,
      1,
      "translation",
      `冒頭に canonical (\`${path.basename(canonicalRel)}\`) を指す翻訳注記（引用行）がありません`,
    );
  }

  const canonicalHeadings = extractHeadings(readFile(canonicalRel));
  const translationHeadings = extractHeadings(translation);
  const max = Math.max(canonicalHeadings.length, translationHeadings.length);
  for (let i = 0; i < max; i++) {
    const en = canonicalHeadings[i];
    const ja = translationHeadings[i];
    if (en && ja && en.level === ja.level) continue;
    const enDesc = en ? `L${en.lineNo} ${"#".repeat(en.level)} ${en.text}` : "（無し）";
    const jaDesc = ja ? `L${ja.lineNo} ${"#".repeat(ja.level)} ${ja.text}` : "（無し）";
    report(
      translationRel,
      ja ? ja.lineNo : 1,
      "translation",
      `見出し構造が canonical とずれています（${i + 1} 番目 / canonical ${canonicalHeadings.length} 見出し・対訳 ${translationHeadings.length} 見出し）\n` +
        `      canonical: ${enDesc}\n` +
        `      対訳:      ${jaDesc}`,
    );
    return;
  }
}

// ---------------------------------------------------------------------------
// 参照: make ターゲット
// ---------------------------------------------------------------------------

// Makefile / .makefiles/**/*.mk からターゲット名を集める。
// `%` を含むパターンルールは正規表現として保持する。
function collectMakeTargets(): MakeTargets {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
        continue;
      }
      if (entry.name.endsWith(".mk")) files.push(abs);
    }
  };
  const makefilesDir = path.join(REPO_ROOT, ".makefiles");
  if (fs.existsSync(makefilesDir)) walk(makefilesDir);
  // ルートの makefile は綴りが処理系依存（`makefile` / `Makefile`）。macOS は大文字小文字を
  // 区別しないため、Linux の CI で初めて読み落とすことがないよう実エントリ名で拾う。
  for (const name of fs.readdirSync(REPO_ROOT)) {
    if (name === "makefile" || name === "Makefile" || name === "GNUmakefile") {
      files.push(path.join(REPO_ROOT, name));
    }
  }

  const exact = new Set<string>();
  const patterns: RegExp[] = [];
  const addTarget = (name: string) => {
    if (name === "" || name.startsWith(".")) return;
    if (name.includes("%")) {
      patterns.push(
        new RegExp(
          `^${name
            .split("%")
            .map((p) => p.replace(/[.*+^${}()|[\]\\?]/g, "\\$&"))
            .join(".+")}$`,
        ),
      );
      return;
    }
    exact.add(name);
  };

  for (const file of files) {
    for (const line of fs.readFileSync(file, "utf8").split("\n")) {
      if (line.startsWith("\t")) continue;
      const phony = /^\.PHONY:\s*(.+)$/.exec(line);
      if (phony) {
        for (const name of phony[1].split("##")[0].trim().split(/\s+/)) addTarget(name);
        continue;
      }
      const rule = /^([A-Za-z0-9_%.+/ -]+):(?!=)/.exec(line);
      if (rule) {
        for (const name of rule[1].trim().split(/\s+/)) addTarget(name);
      }
    }
  }
  return { exact, patterns };
}

const makeTargets = collectMakeTargets();

function makeTargetExists(target: string): boolean {
  return expandBraces(target).every((candidate) => {
    if (makeTargets.exact.has(candidate)) return true;
    if (makeTargets.patterns.some((pattern) => pattern.test(candidate))) return true;
    if (!WILDCARD_RE.test(candidate)) return false;
    // 参照側がプレースホルダ（`tag-<level>` / `branch-*`）の場合は、
    // それに当てはまる実ターゲットが 1 つでもあれば実在と見なす。
    const re = placeholderToRegExp(candidate, { segmentSeparator: false });
    return (
      [...makeTargets.exact].some((t) => re.test(t)) ||
      makeTargets.patterns.some((p) => re.test(p.source.replace(/[$^\\]/g, "")))
    );
  });
}

// インラインコードの `make ...` からターゲット名を取り出す。
// 変数代入（`DRY_RUN=1`）やシェル演算子（`2>&1` / `|`）以降は make の引数ではないため打ち切る。
function extractMakeTargets(span: string): string[] {
  if (!/^make(\s|$)/.test(span)) return [];
  const targets: string[] = [];
  for (const token of span.split(/\s+/).slice(1)) {
    if (token.startsWith("-")) continue;
    if (!/^[A-Za-z0-9_%.<>{},*/-]+$/.test(token)) break;
    targets.push(token);
  }
  return targets;
}

// ---------------------------------------------------------------------------
// 参照: ファイルパス
// ---------------------------------------------------------------------------

const entryIndex = buildEntryIndex();
const rootEntries = new Set(fs.readdirSync(REPO_ROOT).filter((name) => !PATH_ROOT_DENY.has(name)));
const basenameIndex = new Set(entryIndex.map((entry) => path.basename(entry)));

// ディレクトリを伴わない設定ファイル名（`mise.toml` / `biome.ci.jsonc`）の実在性を判定する。
// 設定ファイルはリポジトリ内で名前が一意に定まるため、配置を書かずに名前だけで参照されることが多く、
// SSOT が移動・改名しても本文だけが古い名前で残りやすい。
const CONFIG_FILE_RE = /^[.\w][\w.-]*\.(ya?ml|toml|jsonc?)$/;

function configFileExists(name: string): boolean {
  return expandBraces(name).some((candidate) => {
    if (!WILDCARD_RE.test(candidate)) return basenameIndex.has(candidate);
    const re = placeholderToRegExp(candidate, { segmentSeparator: true });
    return [...basenameIndex].some((base) => re.test(base));
  });
}

// インラインコードが検査可能なパス参照かどうかを判定する。
// 相対ファイル名（`SKILL.md` など文脈依存の記述）は解決先が一意に決まらないため対象外にし、
// 先頭セグメントが実在するルート直下エントリであるものだけを検査する。
// さらに、パスと同形だが実体がファイルではない記述を次の規則で除外する:
//   - 末尾セグメントに `.` も末尾 `/` も無いもの — モジュール指定子（`next/image`）と区別できない
//   - `...` を含むもの — 「以下同様」を表す省略記法
//   - `<name>` プレースホルダを含むもの — `src/features/<name>/actions.ts` のような表記は
//     [0027](docs/adr/0027-directory-structure.md) が定める規約上の配置であって、実在ファイルの参照ではない
//   - 未作成のカーネルを指すもの — isUncreatedKernelPath を参照
function asRepoPath(span: string): string | null {
  let text = span.trim();
  if (text.startsWith("./")) text = text.slice(2);
  if (!text.includes("/")) return null;
  if (/<[^>]*>/.test(text)) return null;
  if (/[\s$\\#?!"'()|`:;@]/.test(text)) return null;
  if (text.includes("...")) return null;
  const isDirRef = text.endsWith("/");
  if (isDirRef) text = text.slice(0, -1);
  if (!rootEntries.has(text.split("/")[0])) return null;
  if (!isDirRef && !path.basename(text).includes(".")) return null;
  if (isUncreatedKernelPath(text)) return null;
  return text;
}

// `src/` 直下のカーネル（`config` / `features` 等）と境界エントリ（`proxy.ts` / `instrumentation.ts`）は、
// その決定が着地した時点で作られる（[0027](docs/adr/0027-directory-structure.md) / [0043](docs/adr/0043-middleware-policy.md)）。
// まだ無いものへの参照は「これから置く場所」であって実在ファイルの主張ではないため検査しない。
// 実体化した時点で配下のパスは自動的に検査対象へ入り、以後は rename / 削除が検出される
// （= 骨組みの現状を恒久ルールとして焼き込まない）。
function isUncreatedKernelPath(text: string): boolean {
  const segments = text.split("/");
  if (segments[0] !== "src" || segments.length < 2) return false;
  return !fs.existsSync(path.join(REPO_ROOT, segments[0], segments[1]));
}

// パス参照の実在性を判定する。スキルは自身が同梱するファイル（`prompts/verify-arch.md` など）も
// 同じ表記で参照するため、リポジトリルート相対に加えて参照元ファイルのディレクトリ相対でも解決する。
function repoPathExists(candidate: string, fromDir: string): boolean {
  const bases = [REPO_ROOT, path.join(REPO_ROOT, fromDir)];
  return expandBraces(candidate).some((text) => {
    if (!WILDCARD_RE.test(text)) return bases.some((base) => fs.existsSync(path.join(base, text)));
    const re = placeholderToRegExp(text, { segmentSeparator: true });
    return entryIndex.some((entry) => re.test(entry));
  });
}

// ---------------------------------------------------------------------------
// 参照: ADR 採番
// ---------------------------------------------------------------------------

// 廃止済みの ADR 採番プレフィックス。採番はトピック別ブロック帯の数値 4 桁へ全面再付番済みで
// （`docs/adr/0028-naming-convention.md`）、プレフィックス付きの採番は現行に 1 つも存在しない。
// 参照先が実在しないことが綴りだけで確定するため、判断を挟まずに違反と断定できる。
// 廃止された 2 つに限定するのは、`[A-Z]\w+-\d{4}` のような一般形が規格番号や型番を巻き込むため。
const RETIRED_ADR_NUMBER_RE = /\b(?:Toolchain|Dev)-\d{4}\b/g;

// ---------------------------------------------------------------------------
// 参照: Markdown リンク
// ---------------------------------------------------------------------------

const MD_LINK_RE = /\[[^\]]*\]\(([^()\s]+)\)/g;

// 行からインラインコードスパンを取り除く。コードスパンの中のリンクはリンク記法そのものの例示であり、
// 実在するファイルを指す主張ではない。
function stripInlineCode(line: string): string {
  return line.replace(/(`+)[^`]+?\1/g, "");
}

// リンクターゲットのうち、リポジトリ内のファイルとして解決できるものだけを取り出す。
// 外部 URL・ページ内アンカー・プレースホルダ入りは実パスに解決できない。
function asLinkPath(target: string): string | null {
  if (target.startsWith("#")) return null;
  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(target)) return null;
  if (/<[^>]*>/.test(target)) return null;
  const withoutFragment = target.split("#")[0];
  return withoutFragment === "" ? null : withoutFragment;
}

// リンク先の実在性を判定する。相対リンクの基準は参照元ファイルのディレクトリ、`/` 始まりは
// リポジトリルート（GitHub の解決規則）。パス参照と違ってルート相対でも解決を試すことはしない
// ── リンクは表示時に実際に辿られるため、解決規則から外れた当たりを実在と見なすと壊れたリンクを通す。
function linkPathExists(target: string, fromDir: string): boolean {
  const abs = target.startsWith("/")
    ? path.join(REPO_ROOT, target)
    : path.resolve(REPO_ROOT, fromDir, target);
  const rel = path.relative(REPO_ROOT, abs);
  if (rel.startsWith("..")) return false;
  // tmp/ 配下はスキル実行中に生成されるため、静的検査では存在しないのが正常。
  if (PATH_ROOT_DENY.has(rel.split(path.sep)[0])) return true;
  return fs.existsSync(abs);
}

// ---------------------------------------------------------------------------
// 実行
// ---------------------------------------------------------------------------

// `.claude/**` の Markdown 本文が参照する make ターゲット / ファイルパス / リンク先の実在性と、
// 廃止済み ADR 採番の不使用を検査する。
// frontmatter も対象にする。`description` はスキル選択時にモデルへ渡る要約であり、本文と同じだけ腐る。
// 抑止ディレクティブ（HTML コメント）は YAML スカラの中では機能しないため、frontmatter で誤検知が
// 出た場合は記述側を直して回避する。
function checkReferences(rel: string): void {
  const content = readFile(rel);
  const fromDir = path.dirname(rel);
  for (const { line, lineNo } of eachLineOutsideFence(content)) {
    if (line.includes(IGNORE_DIRECTIVE)) continue;
    for (const match of line.matchAll(RETIRED_ADR_NUMBER_RE)) {
      report(
        rel,
        lineNo,
        "adr-ref",
        `廃止された ADR 採番を参照しています: \`${match[0]}\`（現行の採番は数値 4 桁のみ）`,
      );
    }
    for (const match of stripInlineCode(line).matchAll(MD_LINK_RE)) {
      const target = asLinkPath(match[1]);
      if (target !== null && !linkPathExists(target, fromDir)) {
        report(rel, lineNo, "link-ref", `存在しないパスへリンクしています: \`${match[1]}\``);
      }
    }
    for (const span of extractInlineCode(line)) {
      for (const target of extractMakeTargets(span)) {
        if (isTooComplex(target)) {
          report(
            rel,
            lineNo,
            "make-ref",
            `ワイルドカードが多すぎて検査できません: \`make ${target}\``,
          );
          continue;
        }
        if (!makeTargetExists(target)) {
          report(
            rel,
            lineNo,
            "make-ref",
            `存在しない make ターゲットを参照しています: \`make ${target}\``,
          );
        }
      }
      const repoPath = asRepoPath(span);
      if (repoPath !== null && isTooComplex(repoPath)) {
        report(rel, lineNo, "path-ref", `ワイルドカードが多すぎて検査できません: \`${span}\``);
        continue;
      }
      if (repoPath !== null && !repoPathExists(repoPath, fromDir)) {
        report(rel, lineNo, "path-ref", `存在しないパスを参照しています: \`${span}\``);
        continue;
      }
      if (
        repoPath === null &&
        CONFIG_FILE_RE.test(span) &&
        !isTooComplex(span) &&
        !configFileExists(span)
      ) {
        report(
          rel,
          lineNo,
          "path-ref",
          `リポジトリに存在しない設定ファイルを参照しています: \`${span}\``,
        );
      }
    }
  }
}

function collectClaudeMarkdown(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (EXCLUDE_DIRS.has(entry.name)) continue;
        walk(abs);
        continue;
      }
      if (entry.name.endsWith(".md")) out.push(path.relative(REPO_ROOT, abs));
    }
  };
  const abs = path.join(REPO_ROOT, CLAUDE_DIR);
  if (!fs.existsSync(abs)) {
    console.error(
      `✘ skill-lint: ${CLAUDE_DIR}/ が見つかりません（リポジトリルートで実行してください）`,
    );
    process.exit(2);
  }
  walk(abs);
  return out.sort();
}

const skillDirs = listDirs(SKILLS_DIR);
for (const name of skillDirs) {
  const canonicalRel = path.join(SKILLS_DIR, name, "SKILL.md");
  if (!fs.existsSync(path.join(REPO_ROOT, canonicalRel))) {
    report(path.join(SKILLS_DIR, name), 1, "structure", "`SKILL.md` がありません");
    continue;
  }
  checkFrontmatter(canonicalRel, readFile(canonicalRel), name);
  checkTranslationPair(canonicalRel, path.join(SKILLS_DIR, name, "SKILL.ja.md"));
}

const agentFiles = fs.existsSync(path.join(REPO_ROOT, AGENTS_DIR))
  ? fs
      .readdirSync(path.join(REPO_ROOT, AGENTS_DIR))
      .filter((name) => name.endsWith(".md") && !name.endsWith(".ja.md"))
      .sort()
  : [];
for (const file of agentFiles) {
  const rel = path.join(AGENTS_DIR, file);
  checkFrontmatter(rel, readFile(rel), file.replace(/\.md$/, ""));
}

const markdownFiles = collectClaudeMarkdown();
for (const rel of markdownFiles) checkReferences(rel);

if (findings.length > 0) {
  console.error(`✘ skill-lint: ${findings.length} 件の違反\n`);
  let current: string | null = null;
  for (const finding of findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)) {
    if (finding.file !== current) {
      if (current !== null) console.error("");
      console.error(`  ${finding.file}`);
      current = finding.file;
    }
    console.error(`    :${finding.line}  [${finding.rule}] ${finding.message}`);
  }
  console.error(
    `\n検査 ${skillDirs.length} スキル / ${agentFiles.length} エージェント / ${markdownFiles.length} Markdown 中 ${findings.length} 件 NG`,
  );
  process.exit(1);
}

console.log(
  `✓ skill-lint: ${skillDirs.length} スキル / ${agentFiles.length} エージェント / ${markdownFiles.length} Markdown すべて OK`,
);
