// 基準画像の置き場と、それを更新する資格情報を用意する入口。判定は plan.ts が持ち、
// ここは GitHub への問い合わせ・対話・git の操作・終了コードだけを担う。
//
//   images   置き場を用意し、baseline/images へ配線する（配線済みなら張り替える）
//   app      撮り直しに使う GitHub App を secret へ登録する

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

import { exitWithUsage, parseCommonFlags, ROOT_DIR } from "../lib/runtime.js";
import {
  assertWritable,
  cloneUrl,
  DEFAULT_VISIBILITY,
  defaultImagesName,
  isAffirmative,
  looksLikePrivateKey,
  normalizeKeyPath,
  normalizeVisibility,
  parseAppId,
  renderReadme,
  splitRepository,
  targetRepository,
  withDefault,
} from "./plan.js";

const SUBMODULE_PATH = "baseline/images";
const README_TEMPLATE = ".github/settings/baseline-store/readme-template.md";

function printUsage(): void {
  console.log(
    [
      "使い方: pnpm exec tsx scripts/setup/baseline-store <images | app>",
      "",
      "  images  基準画像の置き場を用意し、baseline/images へ配線する",
      "  app     撮り直しに使う GitHub App を BASELINE_APP_ID / BASELINE_APP_PRIVATE_KEY へ登録する",
      "",
      "  どちらも対話式で、gh のログインが要る。",
    ].join("\n"),
  );
}

async function setupImages(): Promise<void> {
  const parent = gh(["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"]);

  const existing = (
    await ask("既存のリポジトリへ配置しますか? 空欄なら新規作成 [<org>/<repo>]")
  ).trim();
  const target = existing === "" ? await createRepository(parent) : adoptRepository(existing);

  ensureInitialCommit(target, parent);
  wireSubmodule(target);

  console.log(`\n✅ ${target} を ${SUBMODULE_PATH} へ配線しました。`);
  console.log(`   .gitmodules と ${SUBMODULE_PATH} の差分をコミットしてください。`);
  console.log(
    "   続けて make setup-baseline-app を実行し、撮り直しに使う GitHub App を登録してください。",
  );
}

function adoptRepository(repository: string): string {
  splitRepository(repository);

  let permission = "";
  try {
    permission = gh([
      "repo",
      "view",
      repository,
      "--json",
      "viewerPermission",
      "-q",
      ".viewerPermission",
    ]);
  } catch {
    throw new Error(`${repository} を参照できません。名前と権限を確認してください。`);
  }
  assertWritable(repository, permission);

  console.log(`🔧 既存の ${repository} を使います。`);
  return repository;
}

async function createRepository(parent: string): Promise<string> {
  const name = await ask("作成するリポジトリ名", defaultImagesName(parent));
  const target = targetRepository(parent, name);

  const visibility = normalizeVisibility(
    await ask("公開範囲 (public / private / internal)", DEFAULT_VISIBILITY),
  );

  if (repositoryExists(target)) {
    throw new Error(`${target} は既に存在します。既存のリポジトリとして指定し直してください。`);
  }

  console.log(`🔧 ${target} を作成します（${visibility}）。`);
  gh(["repo", "create", target, `--${visibility}`, "--description", `${parent} の VRT 基準画像`]);
  return target;
}

// 空のリポジトリには git submodule add が失敗するため、README を置く初期コミットを作る。
function ensureInitialCommit(target: string, parent: string): void {
  if (repositoryHasCommits(target)) {
    console.log(`🔧 ${target} には既にコミットがあります。初期化はしません。`);
    return;
  }

  const templatePath = path.join(ROOT_DIR, README_TEMPLATE);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`${README_TEMPLATE} が見つかりません。`);
  }

  const branch = gh(["api", `repos/${target}`, "-q", ".default_branch"]);
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "baseline-store-"));

  try {
    console.log(`🔧 ${target} に README を置く初期コミットを作ります。`);
    fs.writeFileSync(
      path.join(work, "README.md"),
      renderReadme(fs.readFileSync(templatePath, "utf8"), {
        repositoryName: splitRepository(target).name,
        parentRepository: parent,
      }),
    );

    git(["init", "--quiet", "--initial-branch", branch], work);
    git(["add", "README.md"], work);
    git(["commit", "--quiet", "-m", "Docs: 基準画像の置き場であることを README に書く"], work);
    git(["remote", "add", "origin", cloneUrl(target)], work);
    git(["push", "--quiet", "origin", `HEAD:${branch}`], work);
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}

// 配線済みなら張り直す。記録済みのコミットは差し替え先には存在しないため、向き先だけを
// 変える set-url では checkout が解決できない。
function wireSubmodule(target: string): void {
  const url = cloneUrl(target);

  if (isWired()) {
    console.log(`🔧 ${SUBMODULE_PATH} を ${url} へ張り直します。`);
    git(["submodule", "deinit", "--force", "--quiet", "--", SUBMODULE_PATH]);
    git(["rm", "--force", "--quiet", "--", SUBMODULE_PATH]);
    fs.rmSync(path.join(git(["rev-parse", "--absolute-git-dir"]), "modules", SUBMODULE_PATH), {
      recursive: true,
      force: true,
    });
  } else {
    console.log(`🔧 ${SUBMODULE_PATH} を ${url} へ配線します。`);
  }

  git(["submodule", "add", "--force", "--", url, SUBMODULE_PATH]);
}

async function setupApp(): Promise<void> {
  const appId = parseAppId(await ask("App ID（General ページの App ID）"));

  const target = gh(["repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner"]);
  console.log(`\n  App ID : ${appId}\n  登録先 : ${target}\n`);
  if (!isAffirmative(await ask("この内容で登録しますか (y/N)", "N"))) {
    throw new Error("登録を中止しました。");
  }

  gh(["secret", "set", "BASELINE_APP_ID", "--body", appId]);
  console.log("🔧 BASELINE_APP_ID を登録しました。");

  setPrivateKey(normalizeKeyPath(await ask("秘密鍵 (.pem) のパス"), os.homedir()));
  console.log("🔧 BASELINE_APP_PRIVATE_KEY を登録しました。");

  console.log(
    [
      "",
      "✅ secret の登録が完了しました。",
      "",
      "手元の .pem はもう要りません。消してください。",
      "",
      "残りは GitHub の画面でしか行えません。",
      "  1. App の Repository permissions を Contents: Read and write だけにする",
      "  2. App の installation を「このリポジトリ」と「基準画像のリポジトリ」の 2 つに限定する",
      "  3. 基準画像のリポジトリにルールセットを掛けない（App の push を自分で塞ぐことになる）",
    ].join("\n"),
  );
}

/**
 * `.pem` を開いたまま `gh` の標準入力へ繋ぐ。
 *
 * 鍵の中身はカーネル経由で `gh` へ渡り、このプロセスの記憶には先頭の 1 行しか載らない。
 * 端末へ貼り付けさせないのは、改行で終わらない貼り付けが 1 回目の Ctrl+D で EOF にならず、
 * 「押しても終わらない」に見えるためである。
 */
function setPrivateKey(keyPath: string): void {
  if (!fs.existsSync(keyPath)) {
    throw new Error(`秘密鍵が見つかりません: ${keyPath}`);
  }

  const head = Buffer.alloc(64);
  const probe = fs.openSync(keyPath, "r");
  try {
    fs.readSync(probe, head, 0, head.length, 0);
  } finally {
    fs.closeSync(probe);
  }
  if (!looksLikePrivateKey(head.toString("utf8"))) {
    throw new Error(`秘密鍵の形式ではありません: ${keyPath}`);
  }

  const key = fs.openSync(keyPath, "r");
  try {
    execFileSync("gh", ["secret", "set", "BASELINE_APP_PRIVATE_KEY"], {
      stdio: [key, "inherit", "inherit"],
      cwd: ROOT_DIR,
    });
  } finally {
    fs.closeSync(key);
  }
}

function isWired(): boolean {
  if (!fs.existsSync(path.join(ROOT_DIR, ".gitmodules"))) {
    return false;
  }
  try {
    git(["config", "--file", ".gitmodules", "--get", `submodule.${SUBMODULE_PATH}.url`]);
    return true;
  } catch {
    return false;
  }
}

function repositoryExists(repository: string): boolean {
  try {
    gh(["repo", "view", repository, "--json", "name"]);
    return true;
  } catch {
    return false;
  }
}

function repositoryHasCommits(repository: string): boolean {
  try {
    gh(["api", `repos/${repository}/commits?per_page=1`]);
    return true;
  } catch {
    return false;
  }
}

/**
 * 1 行の入力を取る。既定値は `[...]` で見せる — 何を Enter で受け入れるのかが分からないと、
 * 使う側は空欄で進めない。
 */
function ask(question: string, fallback = ""): Promise<string> {
  const prompt = fallback === "" ? `${question}: ` : `${question} [${fallback}]: `;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(withDefault(answer, fallback));
    });
  });
}

function gh(args: readonly string[]): string {
  return execFileSync("gh", [...args], {
    encoding: "utf8",
    cwd: ROOT_DIR,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function git(args: readonly string[], cwd: string = ROOT_DIR): string {
  return execFileSync("git", [...args], { encoding: "utf8", cwd }).trim();
}

/* istanbul ignore next -- CLI entry。起動経路は make setup-baseline-store / make setup-baseline-app が通す。 */
async function main(): Promise<void> {
  const options = parseCommonFlags(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  try {
    gh(["auth", "status"]);
  } catch {
    exitWithUsage(
      new Error("gh がログインしていません。gh auth login を先に実行してください。"),
      printUsage,
    );
  }

  try {
    switch (options.rest[0]) {
      case "images":
        await setupImages();
        break;
      case "app":
        await setupApp();
        break;
      default:
        throw new Error("images か app のどちらかを指定してください。");
    }
  } catch (error) {
    exitWithUsage(error as Error, printUsage);
  }
}

// トップレベル await にしない。tsx は CJS へ落とすので変換の時点で落ちる。
main().catch((error: unknown) => {
  exitWithUsage(error instanceof Error ? error : new Error(String(error)), printUsage);
});
