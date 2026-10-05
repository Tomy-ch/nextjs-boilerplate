---
name: canonicalize-doc
usage-class: situational
description: Create or sync the Japanese mirror (`<name>.ja.md`) of an English canonical Markdown document — a README, a `docs/**` document, an ADR, a spec, a SKILL, a skill prompt — or produce the canonical from a mirror. Confirms the source file(s) and direction via AskUserQuestion, then writes the missing side or syncs the stale one with the repo conventions: sibling placement, the line-1 sync note, no frontmatter in the mirror, no link from canonical to mirror, and the katakana term table. Use it whenever a canonical changed and its mirror must follow in the same change, when another skill chains into it after writing a document, or on 「翻訳を同期して」「ja.md を作って」「ミラーを直して」. Do NOT use it for paths on ADR 0140's no-mirror list.
---

# Canonicalize Doc

This skill produces or synchronizes the pair of an English canonical Markdown document and its
Japanese mirror, following the conventions used in this repository.

A Japanese reference translation of this skill is available at SKILL.ja.md in the same directory (not loaded as a skill; for human reference only).

## When to Use

Use this skill when:

- A canonical changed and its mirror must follow in the same change — the typical case. Skills that
  write a document (`sync-readme`, `new-feature`, `back-prop`, `scaffold-*`, …) chain into it as
  their last step.
- An English canonical exists without its mirror, and the path is not on the no-mirror list.
- Only a Japanese draft exists, and the English canonical must be produced from it.
- Both sides exist but have drifted apart.

Supported document types — every one of them uses the same sibling placement:

- Claude Code skill files: `SKILL.md` / `SKILL.ja.md`, and `prompts/*.md` / `references/*.md` beside them
- READMEs: `README.md` / `README.ja.md`
- Every other tracked Markdown document: `<name>.md` / `<name>.ja.md` in the same directory —
  `docs/**` (ADRs, `docs/spec/**`, design notes, templates) and root documents alike

## Step 0. Confirm Input

This skill **MUST call `AskUserQuestion` immediately after invocation** to confirm:

1. **Source file path(s)** — the file the user is pointing at (canonical or mirror).
2. **Direction** — what to produce:
    - `canonical-from-translation`: translate the Japanese into English and write the canonical.
    - `translation-from-canonical`: translate the English into Japanese and write the mirror.
    - `sync-both`: both files exist; reconcile differences and rewrite the side that should be updated.

Procedure:

1. If the user or a chaining skill supplied file paths, include them as candidates.
2. Detect the counterpart of each candidate (`<name>.md` ↔ `<name>.ja.md` in the same directory),
   and drop any path on ADR [0140](../../../docs/adr/0140-documentation-operations.md)'s
   no-mirror list — read that list there rather than from a copy.
3. Call `AskUserQuestion` with:
    - Question 1: "Confirm the source file path." (include the detected candidates)
    - Question 2: "Which direction? (canonical-from-translation / translation-from-canonical / sync-both)" — include the recommended option based on what files already exist.
    - If `sync-both`, also ask: "Which side is the source of truth for this sync?" — the canonical, unless the user says otherwise.

**Bulk mode**: when a change touched several canonicals (a chaining skill, or a sweep), confirm the
whole list in one `AskUserQuestion` — the list of files and one direction for all of them — rather
than one question per file. A file the user strikes from the list is left alone.

Do NOT read or write any files for translation until the source path(s) and direction are confirmed.

## Repo Conventions

Apply these rules when producing each side of the pair. ADR
[0140](../../../docs/adr/0140-documentation-operations.md) owns the canonical language model; this
section is how the skill carries it out.

### Language

- **English is canonical on the suffix-less path; Japanese is the sibling mirror `<name>.ja.md`.**
  There is no parallel `docs/ja/` tree. The canonical is the source of truth, and the mirror follows it.
- **Every tracked suffix-less `.md` has a mirror, except 0140 Decision 1's closed no-mirror list.**
  Never create a mirror for a path on that list.
- **Agents never read `*.ja.md`.** This skill is the one exception, and only for the single pair (or
  the confirmed bulk list) it was pointed at.
- **For the `AGENTS` pair, only the mirror may be written.** `AGENTS.md` stays protected during this
  skill's run (below), so the only direction this skill may take on it is `translation-from-canonical`.

### Canonical side

- Never link to the mirror. Naming it in plain text is fine — a `SKILL.md` keeps its one-line pointer
  sentence, without a link.
- `SKILL.md` MUST include YAML frontmatter with `name` and `description`; `description` is English
  and written to maximize skill-selection accuracy.
- Any other frontmatter (`imports-allowed` on a layer README, …) stays on the canonical only.

### Mirror side

- **No frontmatter**, whatever the canonical carries. Frontmatter is read and written on the
  canonical only; a copy would go stale while claiming to be current.
- **Line 1 is the sync note**, followed by a blank line and the Japanese H1. Fill `<basename>` with
  the canonical's file name:

  ```markdown
  > **このファイルは [`<basename>.md`](<basename>.md) の日本語訳です。**
  > 直接編集しないでください。変更は英語の canonical な `<basename>.md` を先に更新し、そのうえでこの日本語訳を同期してください。
  > エージェントが読むのは `<basename>.md` だけです。このファイルは人間が読むための翻訳です。
  ```

- `SKILL.ja.md` and `AGENTS.ja.md` keep their existing three-line note, whose third line says what is
  loaded as a skill or as the rules.

### Mirror terminology

Web and general software-development terms are written in **katakana or English, never as kanji
calques**. Established kanji terms — 関数, 型, 依存, 境界, 設定, 環境, 契約, 取得, 生成物, 台帳,
外枠 — stay. This table is the permanent home of the rule; apply every row to what you write.

Always replace:

| Calque | Write | Calque | Write |
| --- | --- | --- | --- |
| 索引 | インデックス | 正典 / 正本 | canonical |
| 錨 | アンカー | 雛形 | テンプレート |
| 閾値 | しきい値 | 基準画像 | ベースライン画像 |
| 走査 | スキャン | 目録 | インベントリ |
| 既定 | デフォルト | 部品 | コンポーネント |
| 描画 | レンダリング | 表現層 / 表示層 | プレゼンテーションレイヤー |
| 部分木 | サブツリー | 殻 | シェル |
| 層 README / 層境界 / 層別 / 各層 | レイヤー README / レイヤー境界 / レイヤー別 / 各レイヤー | 節（単独、節名 / 必須節 など） | セクション |
| 窓（単独） | ウィンドウ | 引き金 | トリガー |
| 供給網 | サプライチェーン | 束縛 / 再束縛 | バインド / 再バインド |
| 写像 | マッピング | 封筒 | エンベロープ |

Replace only in the named sense, and keep the word elsewhere:

| Calque | Write | Only when it means |
| --- | --- | --- |
| 層 | レイヤー | an architecture layer (階層, 多層防御 stay) |
| 対訳 | ミラー | the file (翻訳 stays for the act) |
| 写し / 写す | コピー / コピーする | a copy (書き写す stays) |
| 入口 | エントリポイント | an entry point |
| 口 / 取得の口 / 接続口 / 受け口 | エンドポイント / 取得エンドポイント / 接続ポイント / 受信エンドポイント | an endpoint (出口, 窓口 stay) |
| 足場 | スキャフォールド | the scaffold skills |
| 描く | レンダリングする | rendering (drawing a picture stays) |
| 島 | アイランド | a Client Island |
| 鍵 | キー | a cache / React / idempotency key (秘密鍵 stays) |
| 印 | マーカー | a marker (矢印, 目印 stay) |
| 骨格 | スケルトン | a loading skeleton |
| 入れ子 | ネスト | nesting |
| 木 / 葉 | ツリー / リーフ | a component or DOM tree (構文木 stays) |
| 版 | バージョン | a version (修正版, 最新版 stay) |
| 継ぎ目 | シーム | an interaction seam |
| 断片 | フラグメント | a URL or JSX fragment |
| 配備 | デプロイ | a deployment |
| 束 | バンドル | a bundle (約束 stays) |
| 帯 | バンド | a viewport or z-index band (帯域 stays) |
| 穴 | ダイナミックホール | a PPR dynamic hole |
| 器 | レイアウトシェル | a layout shell (生成器 stays) |
| 橋 | ブリッジ | a bridge component (橋渡し stays) |
| 脇の領域 / 待機表示 | サイドバー / ローディング表示 | the spec glossary terms |

## AI Modification Scope

Per the "Exception: Skill Execution" clause in AGENTS.md, the normal AI Modification Scope restrictions are relaxed during this skill's execution, scoped to the document pair(s) the user confirmed in the first step.

Paths that may be modified:

- The confirmed source file(s).
- Their counterpart files (created or rewritten).
- Nothing else.

The following remain protected even during skill execution:

- `AGENTS.md` / `CLAUDE.md`
- Generated files — the paths `.gitattributes` declares `linguist-generated` (`git check-attr linguist-generated -- <path>`), and generated content under `docs/`
- Any path listed under `permissions.deny` in `.claude/settings.json`

## Step 1. Read the source

Read the confirmed source file in full. If the direction is `sync-both`, read both files.

## Step 2. Determine the output path

- `canonical-from-translation`: `<name>.ja.md` → `<name>.md` in the same directory.
- `translation-from-canonical`: `<name>.md` → `<name>.ja.md` in the same directory.
- `sync-both`: rewrite the non-source-of-truth side.

## Step 3. Translate (or sync)

- Preserve heading structure, list nesting, code blocks, link targets, `<a id>` anchors, and removal
  markers exactly, in the same positions.
- Translate prose, comments within code blocks (only if originally translated), and inline text.
- Do NOT translate: identifiers, file paths, command invocations, code samples (unless they contain natural-language strings that were originally translated).
- Apply the canonical-side and mirror-side rules and, for a mirror, the terminology table above.

## Step 4. Write the output

- Write the produced file to its target path.
- If both files exist and the user chose `sync-both`, write only to the non-source-of-truth side.

## Step 5. Add cross-references

- A mirror begins with its sync note, which links back to the canonical.
- A `SKILL.md` contains the one-line pointer sentence naming `SKILL.ja.md`, without a link.
- Never add a link from a canonical to its mirror.

## Step 6. Verify

- Diff section counts and heading levels between the two files; they should match 1:1. `skill-lint`
  checks heading-level parity, the line-1 sync note, and the absence of frontmatter for every pair in
  CI; what it cannot judge — whether the mirror says the same thing — is this step's job.
- `doc-links` rejects a link from a canonical to a mirror (reason `mirror`); do not introduce one.
- Confirm code blocks are byte-identical (except where prose was translated inside them).
- Report any sections that could not be cleanly mapped and ask the user how to resolve them.

## Step 7. Format the written files

After writing the produced file (and the synced side in `sync-both` mode), run `pnpm exec markdownlint-cli2 --no-globs --fix <paths you wrote>` on the files this skill produced. Leave `pnpm lint:md` to the pre-commit hook and CI (AGENTS.md: do not pre-run the gates).

## Checklist

Confirm the following before reporting completion:

- [ ] Source file path(s) confirmed with the user via `AskUserQuestion` (one question for a bulk list)
- [ ] Direction (`canonical-from-translation` / `translation-from-canonical` / `sync-both`) confirmed
- [ ] If `sync-both`, source-of-truth side confirmed
- [ ] No path on 0140 Decision 1's no-mirror list was given a mirror
- [ ] The mirror is the sibling `<name>.ja.md`, starts with the sync note on line 1, and has no frontmatter
- [ ] The canonical does not link to the mirror
- [ ] The mirror follows the terminology table
- [ ] Section structure and code blocks match 1:1
- [ ] `markdownlint-cli2 --fix` was run on the written files only
- [ ] No unintended files modified outside the confirmed pair(s)

## Notes

- Do NOT modify files outside the confirmed document pair(s).
- Do NOT translate identifiers, file paths, commands, or other technical tokens.
- When translating to Japanese, write natural Japanese prose for human readers; when translating to English, prefer concise, declarative wording.
- Japanese literals that are output tokens (`問題なし`, `重大度`, …), PR-template section names, commit-subject examples, and Japanese trigger phrases stay Japanese in the English canonical.
