#!/usr/bin/env node

// 落ちた基準画像を手元で見直すための足場を立てる。
//
//   review vrt --branch <branch> --only <id,id> [--run <run-id>] [--port <port>]
//   review e2e --branch <branch> --only <name,name> [--run <run-id>] [--port <port>]
//   review clean
//
// 見るのは「落ちた実行が判定した木」なので、いま編集している木は動かさない。使い捨ての作業
// ツリーを tmp/ の下へ生やし、そこで Storybook（story 単位）かアプリ（画面単位）を立てて、
// 落ちた対象の URL を並べる。`--run` を渡すと CI が撮った期待 / 実際 / 差分もそこへ落として配る。
//
// 終わるまで前面に居座る。片付けをプロセスの生死を跨いだ状態に出さないためで、見終わったら
// Ctrl-C で止める。
import { spawn, spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import type { Server } from "node:http";
import { connect, createServer } from "node:net";
import path from "node:path";

import { SCREENS } from "../../e2e/lib/screens.js";
import { DEV_SESSION_PATH, RETURN_URL_PARAM } from "../../src/features/dev-session/paths.js";
import { createStaticServer } from "../../vrt/lib/static-server.js";
import { isCommandOnPath } from "../lib/command-presence.js";
import { errorMessage } from "../lib/error-message.js";
import { formatLinks, screenLinks, storyLinks } from "./links.js";
import {
  assertPlainArgument,
  parseOnly,
  REVIEW_ROOT,
  reviewWorktrees,
  worktreePath,
} from "./worktree.js";

const USAGE =
  "usage: review <vrt|e2e> --branch <branch> --only <a,b,c> [--run <run-id>] [--port <port>] | review clean";

/** 見る対象ごとの既定のポート。開発サーバ（3000）と Storybook（6006）を避ける。 */
const DEFAULT_PORT = { vrt: 6106, e2e: 3200 } as const;

/** 待ち受けるポートを渡す make の変数。塞がっていたときの案内に出す。 */
const PORT_KNOB = { vrt: "VRT_REVIEW_PORT", e2e: "E2E_REVIEW_PORT" } as const;

/** CI が撮った一式の artifact 名。 */
const ARTIFACT = { vrt: "vrt-diff", e2e: "e2e-diff" } as const;

/** artifact を落とす先。作業ツリーの中に置き、作業ツリーごと捨てられるようにする。 */
const ARTIFACT_DIR = "tmp/review-artifact";

/** サーバが応答を返すまで待つ上限（秒）。 */
const BOOT_TIMEOUT = 120;

/** ブラウザが `localhost` で辿りうる宛先。どちらか片方でも応答するなら、そのポートは使えない。 */
const LOOPBACK = ["127.0.0.1", "::1"] as const;

/** ポートの空きを見るときに待つ上限（ミリ秒）。 */
const PROBE_TIMEOUT = 1_000;

type Kind = keyof typeof DEFAULT_PORT;

type Options = {
  readonly kind: Kind;
  readonly branch: string;
  readonly only: string[];
  readonly run: string | null;
  readonly port: number;
};

async function main(): Promise<void> {
  if (process.argv[2] === "clean") {
    clean(repositoryRoot());

    return;
  }

  const options = parseOptions(process.argv.slice(2));
  const root = repositoryRoot();
  const tree = path.resolve(root, worktreePath(options.kind, options.branch));

  // 空いていることを、木を用意する手前で確かめる。塞がっているポートで起動待ちに入ると、
  // 待ち受けている他人のサーバへの疎通で待機が満たされ、その相手の絵を見ることになる。
  await assertPortFree(options.port, PORT_KNOB[options.kind]);
  if (options.run !== null) await assertPortFree(options.port + 1, PORT_KNOB[options.kind]);

  prepareWorktree(root, tree, options.branch);
  install(tree);

  const artifact = options.run === null ? null : download(tree, options.kind, options.run);
  const reportServer = artifact === null ? null : serve(artifact, options.port + 1);

  const app = start(tree, options);
  const stop = (): void => {
    app.kill("SIGTERM");
    reportServer?.close();
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  app.on("exit", (code) => {
    reportServer?.close();
    process.exit(code ?? 0);
  });

  const baseURL = `http://localhost:${options.port}`;
  await waitForBoot(baseURL, app);

  console.log(`\n${announce(options, baseURL)}`);
  if (artifact !== null) {
    console.log(`\nCI が撮った一式: http://localhost:${options.port + 1}/report/index.html`);
    console.log(
      `  期待 / 実際 / 差分の画像は ${path.relative(root, artifact)}/results/ にあります。`,
    );
  }
  console.log("\n見終わったら Ctrl-C で止めてください。");
}

/** 見る対象ごとの案内文と URL の一覧。 */
function announce(options: Options, baseURL: string): string {
  if (options.kind === "vrt") {
    return [
      `${options.only.length} 件の story を開けます。`,
      "",
      formatLinks(storyLinks(baseURL, options.only)),
      "",
      "撮影されているのは sidebar の無い面です。`?path=/story/<id>` を `iframe.html?id=<id>` へ読み替えると同じ面が出ます。",
    ].join("\n");
  }

  return [
    `${options.only.length} 件の画面を開けます。`,
    "",
    formatLinks(screenLinks(baseURL, options.only, SCREENS, DEV_SESSION_PATH, RETURN_URL_PARAM)),
  ].join("\n");
}

/**
 * 使い捨ての作業ツリーを、見る対象のブランチの先端に合わせる。
 *
 * @remarks
 * 参照を切り離して置きます。同じブランチは手元の別の作業ツリーが既に持っていることが多く、
 * ブランチとして持たせると `git worktree add` がそこで断られます。
 */
function prepareWorktree(root: string, tree: string, branch: string): void {
  const ref = `refs/remotes/origin/${branch}`;

  git(
    root,
    ["fetch", "origin", `+refs/heads/${branch}:${ref}`],
    `origin/${branch} を取得できません`,
  );

  if (existsSync(tree)) {
    git(tree, ["switch", "--detach", ref], `${tree} を origin/${branch} へ合わせられません`);

    return;
  }

  git(
    root,
    ["worktree", "add", "--detach", tree, ref],
    `${tree} に作業ツリーを作れません。捨ててよければ git worktree remove --force ${tree} を実行してください`,
  );
  console.log(`🌳 ${path.relative(root, tree)} に origin/${branch} を展開しました。`);
}

/**
 * 見直しで生やした作業ツリーを片付ける。
 *
 * @remarks
 * **git の登録から先に外します。**ディレクトリだけ消すと実体を失った登録が残り、次に同じ
 * ブランチを見ようとしたときの `git worktree add` がそこで断られます。
 *
 * 消すのは接頭辞が一致するものだけです（{@link reviewWorktrees}）。
 */
function clean(root: string): void {
  const listed = spawnSync("git", ["worktree", "list", "--porcelain"], {
    cwd: root,
    encoding: "utf8",
  });

  if (listed.status !== 0) fail("作業ツリーの登録を読めません。");

  const trees = reviewWorktrees(listed.stdout, root);

  for (const tree of trees) {
    git(root, ["worktree", "remove", "--force", tree], `${tree} を外せません`);
  }

  rmSync(path.resolve(root, REVIEW_ROOT), { force: true, recursive: true });
  console.log(`🧹 見直し用の作業ツリーを ${trees.length} 件片付けました。`);
}

/** 作業ツリーへ依存を入れる。lockfile どおりに入れるので、ブランチの依存がそのまま再現される。 */
function install(tree: string): void {
  const result = spawnSync("pnpm", ["install", "--frozen-lockfile"], {
    cwd: tree,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    fail("依存を入れられませんでした。");
  }
}

/**
 * CI が撮った一式を作業ツリーへ落とす。
 *
 * @remarks
 * 落とせなくても続けます。artifact は保存期間を過ぎれば消えますが、そのときに見たいのは
 * 「いまのブランチがどう描くか」で、それはサーバさえ立てば見られます。
 */
function download(tree: string, kind: Kind, run: string): string | null {
  const into = path.join(tree, ARTIFACT_DIR);

  if (!isCommandOnPath("gh")) {
    console.log("⏭️ gh が PATH にありません。CI が撮った一式は落とさずに続けます。");

    return null;
  }

  const result = spawnSync("gh", ["run", "download", run, "-n", ARTIFACT[kind], "-D", into], {
    cwd: tree,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    console.log(`⏭️ ${ARTIFACT[kind]} を落とせませんでした。保存期間を過ぎている可能性があります。`);

    return null;
  }

  return into;
}

/** 落とした一式を配る。HTML レポートは `file://` では開けないため、配る側が要る。 */
function serve(root: string, port: number): Server {
  return createStaticServer(root).listen(port);
}

/** 見る対象のサーバを立てる。story は Storybook、画面は本番ビルドを起動する。 */
function start(tree: string, options: Options): ReturnType<typeof spawn> {
  if (options.kind === "vrt") {
    return spawn(
      "pnpm",
      ["exec", "storybook", "dev", "--port", String(options.port), "--no-open", "--quiet"],
      { cwd: tree, env: { ...process.env, APP_ENV: "local" }, stdio: "inherit" },
    );
  }

  // 画面は本番ビルドで撮られている。開発サーバで見ると、判定された絵とは別のものを見ることになる。
  const built = spawnSync("make", ["e2e-build"], { cwd: tree, stdio: "inherit" });

  if (built.status !== 0) {
    fail("アプリを build できませんでした。");
  }

  // 待ち受けを loopback へ絞る。この起動は APP_ENV=ci で、誰でも任意の役割の session を取れる
  // 発行口が開いている（`.makefiles/testing/e2e.mk`）。
  return spawn(
    "pnpm",
    ["exec", "next", "start", "--hostname", "127.0.0.1", "--port", String(options.port)],
    { cwd: tree, env: { ...process.env, APP_ENV: "ci" }, stdio: "inherit" },
  );
}

/**
 * ポートが空いているか。塞がっていればそこで止める。
 *
 * @remarks
 * **繋がるかどうかで見ます。**待ち受けられるかだけを見ると、別のアドレス族を掴んでいる相手を
 * 空きとして読みます（`0.0.0.0` と `::` の両方へ publish した container の隣で `127.0.0.1` に
 * 待ち受けるのは成功する）。その状態で起動待ちに入ると、待機は相手のサーバへの疎通で満たされ、
 * 以後ブラウザが `localhost` で開くのも相手の側になります。
 *
 * @param port - 使おうとしているポート
 * @param knob - 空いている番号を渡す make の変数
 */
async function assertPortFree(port: number, knob: string): Promise<void> {
  for (const host of LOOPBACK) {
    if (await answers(host, port)) {
      throw new Error(
        `ポート ${port} で ${host} が応答します。空いている番号を ${knob} で渡してください。`,
      );
    }
  }

  await new Promise<void>((resolve, reject) => {
    const probe = createServer();

    probe.once("error", () => {
      reject(
        new Error(
          `ポート ${port} で待ち受けられません。空いている番号を ${knob} で渡してください。`,
        ),
      );
    });
    probe.once("listening", () => {
      probe.close(() => resolve());
    });
    probe.listen(port, "127.0.0.1");
  });
}

/** その宛先で何かが応答するか。届かなければ空きとして読む。 */
function answers(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host, port });
    const settle = (result: boolean): void => {
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(PROBE_TIMEOUT, () => settle(false));
    socket.once("connect", () => settle(true));
    socket.once("error", () => settle(false));
  });
}

/** サーバが応答を返すまで待つ。途中で落ちたらそこで止める。 */
async function waitForBoot(baseURL: string, app: ReturnType<typeof spawn>): Promise<void> {
  for (let elapsed = 0; elapsed < BOOT_TIMEOUT; elapsed += 1) {
    if (app.exitCode !== null) fail("サーバが応答を返す前に終了しました。");

    try {
      await fetch(baseURL, { signal: AbortSignal.timeout(5_000) });

      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }

  app.kill("SIGTERM");
  fail(`サーバが ${BOOT_TIMEOUT} 秒で応答を返しませんでした。`);
}

function parseOptions(argv: string[]): Options {
  const [kind, ...rest] = argv;

  if (kind !== "vrt" && kind !== "e2e") fail(USAGE);

  const flags = new Map<string, string>();

  for (let index = 0; index < rest.length; index += 2) {
    const name = rest[index];
    const value = rest[index + 1];

    if (name === undefined || !name.startsWith("--") || value === undefined) fail(USAGE);
    flags.set(name.slice(2), value);
  }

  const branch = flags.get("branch") ?? "";
  const run = flags.get("run") ?? "";

  assertPlainArgument("--branch", branch);
  if (run !== "") assertPlainArgument("--run", run);

  return {
    kind,
    branch,
    only: parseOnly(flags.get("only") ?? ""),
    run: run === "" ? null : run,
    port: Number(flags.get("port") ?? DEFAULT_PORT[kind]),
  };
}

function repositoryRoot(): string {
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" });

  if (result.status !== 0) fail("git のリポジトリの中で実行してください。");

  return result.stdout.trim();
}

function git(cwd: string, args: string[], message: string): void {
  const result = spawnSync("git", args, { cwd, stdio: "inherit" });

  if (result.status !== 0) fail(message);
}

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

main().catch((error: unknown) => fail(errorMessage(error)));
