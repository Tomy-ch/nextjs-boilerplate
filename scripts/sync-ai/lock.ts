import fs from "node:fs";
import path from "node:path";

// handoff の連鎖を 1 段で止めるリース。受け手への前置きも別のエージェントの起動を禁じるが、
// 指示は無視され得るので、連鎖の深さを実際に抑えるのはこのリースで、handoff はどの向きでも同じパスを取る。
// 環境変数ではなく作業ツリー上のディレクトリにするのは、Codex がモデルの走らせるコマンドへ渡す環境を
// 絞るためで、両エージェントが確実に共有しているのは作業ツリーだけである。

/**
 * これより古いリースは、落ちた実行の残骸として取り直す。
 *
 * @remarks
 * 移植 1 回は分単位で終わるので、1 時間保持されたままのリースは「実行中」ではなく「落ちた」と読みます。
 */
export const LOCK_TTL_MS = 60 * 60 * 1000;

const HOLDER_FILE = "started_by";

/** リースを取れなかったときの、保持者の情報。 */
export type HeldLock = {
  heldBy: string;
  ageMs: number;
};

/** リースの取得結果。 */
export type LockResult = { acquired: true } | ({ acquired: false } & HeldLock);

/**
 * ディレクトリの作成を test-and-set としてリースを取る。
 *
 * @remarks
 * 経過時間はリースのディレクトリ自身の mtime から測ります。作成と同時に決まるので、保持者の
 * 情報を書き終える前に覗かれても「古い」と誤読されません。
 *
 * @param lockPath - リースのディレクトリ
 * @param holder - 取れたときに保持者として残す名前
 * @param nowMs - 現在時刻（epoch ミリ秒）
 * @returns 取れたか、取れなかったなら保持者と経過時間
 */
export function acquireHandoffLock(lockPath: string, holder: string, nowMs: number): LockResult {
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });

  if (!tryCreate(lockPath)) {
    const held = readHeld(lockPath, nowMs);

    if (held.ageMs < LOCK_TTL_MS) {
      return { acquired: false, ...held };
    }

    fs.rmSync(lockPath, { force: true, recursive: true });

    if (!tryCreate(lockPath)) {
      return { acquired: false, ...readHeld(lockPath, nowMs) };
    }
  }

  fs.writeFileSync(path.join(lockPath, HOLDER_FILE), holder);

  return { acquired: true };
}

/**
 * リースを手放す。
 *
 * @param lockPath - リースのディレクトリ
 */
export function releaseHandoffLock(lockPath: string): void {
  fs.rmSync(lockPath, { force: true, recursive: true });
}

/**
 * リースを取れなかったときに出す文面。
 *
 * @remarks
 * 読み手は 2 通りいます。handoff で起動された受け手のエージェントには「連鎖の末端なので、
 * したかったことは報告へ回せ」を、落ちた実行の後始末をする人には消すパスを示します。
 *
 * @param lockPath - リースのディレクトリ
 * @param held - 保持者と経過時間
 * @returns 標準エラーへ出す複数行の文面
 */
export function lockRefusal(lockPath: string, held: HeldLock): string {
  return [
    "sync-ai: handoff を拒否しました。別の handoff が進行中です。",
    "",
    `  リース   : ${lockPath}`,
    `  保持者   : ${held.heldBy}（経過 ${Math.floor(held.ageMs / 1000)} 秒）`,
    "",
    "handoff で起動されたエージェントなら、これが想定どおりの応答です。あなたは連鎖の末端なので、",
    "実行しようとした follow-up は実行せず報告してください。",
    "",
    "handoff が実際には走っていないなら、前回の実行が落ちています。リースを消してから再実行してください:",
    `  rm -rf "${lockPath}"`,
  ].join("\n");
}

/**
 * ディレクトリを作れたかを返す。既に在るときだけ false で、それ以外の失敗は投げる。
 *
 * @param lockPath - 作るディレクトリ
 * @returns 作れたなら true
 */
function tryCreate(lockPath: string): boolean {
  try {
    fs.mkdirSync(lockPath);

    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      return false;
    }

    throw error;
  }
}

/**
 * 既に在るリースの保持者と経過時間を読む。
 *
 * @remarks
 * 作れなかった直後に保持者が手放して消えていたリースは、経過時間を無限大として返します。
 * 呼ぶ側は古いリースと同じく取り直しに進みます。
 *
 * @param lockPath - リースのディレクトリ
 * @param nowMs - 現在時刻（epoch ミリ秒）
 * @returns 保持者と経過時間。保持者を書き終える前のリースなら保持者は `unknown`
 */
function readHeld(lockPath: string, nowMs: number): HeldLock {
  const stat = fs.statSync(lockPath, { throwIfNoEntry: false });

  if (stat === undefined) {
    return { heldBy: "unknown", ageMs: Number.POSITIVE_INFINITY };
  }

  let heldBy = "unknown";

  try {
    heldBy = fs.readFileSync(path.join(lockPath, HOLDER_FILE), "utf8").trim();
  } catch {
    // 作成直後で保持者をまだ書いていないリースは、保持者不明のまま扱う。
  }

  return { heldBy, ageMs: nowMs - stat.mtimeMs };
}
