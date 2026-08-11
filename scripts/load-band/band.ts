/**
 * ホストの余力からローカルゲートの帯を決める。
 *
 * @remarks
 * 帯が要るのは、飽和したホストではゲートの**失敗自体が信用できなくなる**からです。カバレッジの
 * 中間ファイルの取り合いのように、変更とは無関係な理由で落ちる経路が開きます。信用できない
 * 判定を出すより、同じコマンドを権威として持つ CI へ渡すほうが速く、答えも正しい。
 *
 * 2 つの数値を、それぞれが実際に測っているものへ使い分けます。
 *
 * - **帯は実測の使用率（load average / CPU 数）で決める**。「今このホストが働いているか」を
 *   直接測る唯一の値だからです。作業ツリーの数では決めません — 放置された古い窓が数に入り、
 *   実際には空いているホストを飽和と誤判定します。
 * - **CPU 配分は作業ツリーの数で決める**。「同時に走りうる窓がいくつあるか」は使用率では
 *   測れず、テストランナーへ渡す worker 数はこちらから導くのが筋です。
 */

/** ローカルゲートの帯。 */
export type LoadBand =
  /** 余力がある。すべてのゲートを手元で走らせる。 */
  | "full"
  /** 働いてはいるが余力がある。走らせるが並列度を落とす。 */
  | "low"
  /** 飽和している。CI が同じコマンドを持つゲートは CI へ委ねる。 */
  | "ci-first";

/** 帯の解決結果。 */
export type BandResolution = {
  readonly band: LoadBand;
  /** 1 窓あたりに割り当てる CPU 数。1 を下回らない。 */
  readonly cpuShare: number;
  /** 帯を決めた根拠。出力へそのまま載せ、判定を黙らせない。 */
  readonly reason: string;
};

/** ここを超えたら飽和と見なす。CPU 1 つあたり実行待ちが 1 つ以上ある状態。 */
const SATURATED_UTILIZATION = 1;

/** ここを超えたら働いていると見なす。 */
const BUSY_UTILIZATION = 0.5;

/**
 * 実測の使用率と作業ツリーの数から帯を決める。
 *
 * @param worktrees `git worktree list` が数えた作業ツリーの数。1 未満は 1 として扱う。
 * @param cpus ホストが持つ論理 CPU 数。1 未満は 1 として扱う。
 * @param loadAverage 直近 1 分の load average。負値は 0 として扱う。
 */
export function resolveBand(input: {
  worktrees: number;
  cpus: number;
  loadAverage: number;
}): BandResolution {
  const worktrees = Math.max(1, Math.trunc(input.worktrees));
  const cpus = Math.max(1, Math.trunc(input.cpus));
  const loadAverage = Math.max(0, input.loadAverage);
  const cpuShare = Math.max(1, Math.floor(cpus / worktrees));
  const utilization = loadAverage / cpus;
  const measured = `使用率 ${utilization.toFixed(2)}（load ${loadAverage.toFixed(2)} / CPU ${cpus}）、作業ツリー ${worktrees} → 1 窓あたり ${cpuShare}`;

  if (utilization >= SATURATED_UTILIZATION) {
    return {
      band: "ci-first",
      cpuShare,
      reason: `${measured}。飽和しており、ここでの失敗は変更に起因すると信じられないため CI へ委ねます。`,
    };
  }

  if (utilization >= BUSY_UTILIZATION) {
    return {
      band: "low",
      cpuShare,
      reason: `${measured}。働いているため並列度を落として走らせます。`,
    };
  }

  return { band: "full", cpuShare, reason: `${measured}。余力があるため手元で全部走らせます。` };
}
