/**
 * 引っ張りの段階。
 *
 * @see Storybook `Shell/PullToRefresh`
 */
export const PULL_STATE: Readonly<{
  IDLE: "idle";
  PULLING: "pulling";
  READY: "ready";
  REFRESHING: "refreshing";
}> = {
  /** 触れていない、または上端にいない。 */
  IDLE: "idle",
  /** 引いているが、まだ実行の域に届いていない。 */
  PULLING: "pulling",
  /** 離せば実行される。 */
  READY: "ready",
  /** 取り直している最中。 */
  REFRESHING: "refreshing",
};

/** {@link PULL_STATE} のいずれか。 */
export type PullState = (typeof PULL_STATE)[keyof typeof PULL_STATE];

/** 離したときに実行と見なす引き量（px）。 */
export const TRIGGER_DISTANCE = 72;

/** 指の移動量に対する追従の割合。等倍だと少し動かしただけで実行の域に入る。 */
export const RESISTANCE = 0.45;

/** これ以上は引けない上限。無制限だと画面が延々とずれる。 */
export const MAX_DISTANCE = 120;

/** 目印を出し始める引き量。これに満たない揺れでは何も見せない。 */
export const APPEAR_DISTANCE = 8;
