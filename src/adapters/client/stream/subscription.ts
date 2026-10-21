import * as z from "zod/mini";
import { type $ZodType, safeParse } from "zod/v4/core";

import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";

import { request } from "../http/request";
import { nextDelayMs } from "./backoff";
import { STREAM_ORIGIN, type StreamCursor } from "./cursor";
import { CONTROL_ACTION, type ControlEvent, parseControl, parseEnvelope } from "./envelope";
import { ADMIT_RESULT, createOrderingWindow } from "./ordering";

/**
 * 整列の窓を閉じるまでの時間。
 *
 * @remarks
 * 同時に届いたものの順序を直せるだけの長さで、待ちが体感できない範囲に収めます。長くすると
 * 到達順の乱れには強くなりますが、その分だけ新着の表示が遅れます。
 */
const WINDOW_MS = 250;

/** 購読が今どうなっているか。 */
export type StreamState =
  | { readonly kind: "connecting" }
  | { readonly kind: "open" }
  | { readonly kind: "reconnecting" }
  | { readonly kind: "stopped"; readonly reason: StreamStopReason };

/** 購読を打ち切った理由。いずれも張り直しても同じ経路を辿るもの。 */
export const STREAM_STOP_REASON = {
  /** session が切れた。入り直しが要る。 */
  unauthenticated: "unauthenticated",
  /** 権限を失った。 */
  permissionDenied: "permission-denied",
  /** 購読する対象がまだ無い。 */
  absent: "absent",
  /** サーバが打ち切りを指示した。 */
  server: "server",
} as const;

/** {@link StreamState} が持つ打ち切りの理由。 */
type StreamStopReason = (typeof STREAM_STOP_REASON)[keyof typeof STREAM_STOP_REASON];

/** 発券が返した、購読を開くための口。 */
export type StreamConnection = {
  readonly url: string;
  /** この口で新しい接続を始められる期限（epoch ミリ秒）。 */
  readonly expiresAt: number;
};

/** 接続 1 本に対して購読側が受け取る通知。 */
export type StreamSourceHandlers = {
  readonly onOpen: () => void;
  readonly onEvent: (data: string) => void;
  readonly onControl: (data: string) => void;
  readonly onError: () => void;
};

/** 開いている接続 1 本。 */
type StreamSource = {
  readonly close: () => void;
};

/**
 * 購読が外から受け取る道具。
 *
 * @remarks
 * 時刻・乱数・待機・接続を引数で受け取ります。内部で直接掴むと、張り直しの間隔や打ち切りの
 * 分岐を確かめるのに実時間の経過と実際の接続が要ります。
 */
export type StreamDeps = {
  readonly requestConnection: (path: string) => Promise<StreamConnection>;
  readonly createSource: (url: string, handlers: StreamSourceHandlers) => StreamSource;
  /**
   * 待機を 1 つ仕掛け、**取り消す手段を返す**。
   *
   * @remarks
   * 識別子ではなく閉包を返すのは、待機の識別子の型が実行場所で変わるためです（ブラウザは数値、
   * Node は object）。取り消し方を仕掛けた側が持てば、呼ぶ側はどちらの形も知らずに済みます。
   */
  readonly setTimer: (handler: () => void, delayMs: number) => () => void;
  readonly random: () => number;
  readonly now: () => number;
  /** 画面が見えていないか。見えていない間は張り直さない。 */
  readonly isHidden: () => boolean;
  /** 見えるようになったら呼ぶ登録。戻り値で解除する。 */
  readonly onVisible: (listener: () => void) => () => void;
};

/** {@link openStream} の指定。 */
export type OpenStreamOptions<T> = {
  /** 発券を中継する同一オリジンの口。 */
  readonly ticketPath: string;
  /**
   * 購読を始める位置。
   *
   * @remarks
   * **`null` は「発券が束ねた位置から」を意味します。** 正本が購読の位置を返さない口では、
   * 開始位置を組み立てる材料が画面側にありません。`0` を渡すと保持期間ぶんの再生が始まるため、
   * 位置を持たないことと先頭から読み直すことは別に表します。
   */
  readonly cursor: StreamCursor | null;
  /**
   * event の検証スキーマ。
   *
   * @remarks
   * 封筒の読み取りはこの層が持ち、**中身の形は呼び出し側が種別ごとに宣言します**。契約に無い
   * 種別はここで落ち、上へ流れません。
   */
  readonly schema: $ZodType<T>;
  /** 整列済みの event を上へ流す。 */
  readonly onEvents: (events: readonly T[]) => void;
  /** 購読の状態が変わった。 */
  readonly onState: (state: StreamState) => void;
  /**
   * 正本を取り直してほしい。
   *
   * @remarks
   * 窓を越えて遅れた event を見つけたときと、サーバがそう指示したときに呼びます。取り直した
   * 位置を {@link StreamSubscription.resume} へ渡すまで、購読は張り直しません。
   *
   * **{@link OpenStreamOptions.cursor} が `null` の購読は待ちません。** 取り直しても位置は
   * 返ってこないため、掴んでいた位置を捨てて発券が束ねた位置から自分で張り直します。
   */
  readonly onResync: () => void;
  readonly deps?: Partial<StreamDeps>;
};

/** 開いた購読。 */
export type StreamSubscription = {
  /** 正本を取り直した位置で購読を再開する。 */
  readonly resume: (cursor: StreamCursor) => void;
  /** 購読をやめる。以降は状態も event も流れない。 */
  readonly close: () => void;
};

/** 発券の中継が返す形。 */
const connectionPayload = z.object({ url: z.string(), expiresAt: z.string() });

/**
 * 同一オリジンの中継から発券を受け取る。生の ticket はこの URL の中にしか現れない。
 *
 * @param path - 発券を中継する同一オリジンの絶対パス
 * @returns 接続先の URL と、この口で新しい接続を始められる期限
 */
async function requestConnection(path: string): Promise<StreamConnection> {
  const payload = await request(path, connectionPayload, { method: "POST" });

  return { url: payload.url, expiresAt: new Date(payload.expiresAt).getTime() };
}

/**
 * 届いた本文を、文字列として受け取れたときだけ渡す。
 *
 * @remarks
 * 名前を付けた event の listener には `Event` として届きます。本文を持たない event はそもそも
 * この stream に流れませんが、型の上では区別が付かないため、形で確かめてから渡します。
 *
 * @param event - 受け取った DOM イベント
 * @param receive - 文字列として読めたときに本文を渡す関数
 */
function forward(event: Event, receive: (data: string) => void): void {
  const data: unknown = event instanceof MessageEvent ? event.data : null;

  if (typeof data === "string") {
    receive(data);
  }
}

/**
 * ブラウザの `EventSource` で接続を開く。
 *
 * @remarks
 * **`EventSource` を組み立てる場所はここだけです。** 上位層が直接組み立てると、整列・重複排除・
 * 張り直しを持たない購読が画面ごとに生まれます。
 *
 * 組み込みの再接続は使いません。`error` で即座に閉じるのは、閉じずにいると組み込みの再接続と
 * 自前の張り直しが同じ URL へ二重に走るためです。
 *
 * @param url - 接続先の URL（開始位置を含む）
 * @param handlers - 受信した event を渡す先
 * @returns 開いた接続 1 本。`close` で閉じる
 */
function createSource(url: string, handlers: StreamSourceHandlers): StreamSource {
  const source = new EventSource(url);

  source.addEventListener("open", () => {
    handlers.onOpen();
  });
  source.addEventListener("message", (event) => {
    forward(event, handlers.onEvent);
  });
  source.addEventListener("control", (event) => {
    forward(event, handlers.onControl);
  });
  source.addEventListener("error", () => {
    source.close();
    handlers.onError();
  });

  return { close: () => source.close() };
}

/**
 * 既定の道具。ブラウザの時計・乱数・可視性をそのまま使う。
 *
 * @returns {@link StreamDeps} の既定実装
 */
function browserDeps(): StreamDeps {
  return {
    requestConnection,
    createSource,
    setTimer: (handler, delayMs) => {
      const id = globalThis.setTimeout(handler, delayMs);

      return () => {
        globalThis.clearTimeout(id);
      };
    },
    random: Math.random,
    now: Date.now,
    isHidden: () => document.hidden,
    onVisible: (listener) => {
      /** 画面が見えるようになったときだけ `listener` を呼ぶ。 */
      const handle = (): void => {
        if (!document.hidden) {
          listener();
        }
      };

      document.addEventListener("visibilitychange", handle);

      return () => {
        document.removeEventListener("visibilitychange", handle);
      };
    },
  };
}

/**
 * 開始位置を載せた接続先を組む。
 *
 * @remarks
 * 位置がまだ無ければ何も載せません。送り手は発券のときに束ねた位置から配り始めます。
 *
 * @param url - 接続先の URL
 * @param cursor - 開始位置。`null` なら載せない
 * @returns 開始位置を載せた URL 文字列
 */
function withCursor(url: string, cursor: StreamCursor | null): string {
  if (cursor === null) {
    return url;
  }

  const target = new URL(url);

  target.searchParams.set("after", cursor);

  return target.toString();
}

/**
 * 購読を開く。
 *
 * @remarks
 * 順序・重複・張り直し・開始位置・接続の状態はここが持ちます。**どの event で画面の何を変えるかは
 * 持ちません** —— それは受け取った側の判断です。
 *
 * 打ち切りと張り直しの分かれ目は発券の往復から来ます。接続の失敗は理由を持たないため、
 * `open` の前に落ちた接続は発券からやり直し、そこで返る分類で打ち切るかどうかを決めます。
 *
 * @typeParam T - 検証済みで上へ流す event の型
 * @param options - 購読の指定
 * @returns 開いた購読。{@link StreamSubscription.resume} と `close` を持つ
 */
export function openStream<T>(options: OpenStreamOptions<T>): StreamSubscription {
  const deps = { ...browserDeps(), ...options.deps };
  const window = createOrderingWindow(options.cursor ?? STREAM_ORIGIN);

  /**
   * 取り直す位置を持つ購読か。
   *
   * @remarks
   * 位置を返さない口では、取り直しを求めても再開の位置が返ってきません。待ち続ける相手が
   * 居ないため、この区別が無いと購読は取り直しの合図を出したところで止まります。
   */
  const positioned = options.cursor !== null;

  // 開始位置を渡して繋ぐかどうか。1 件でも受け取れば、以降は自分が流した位置から張り直す。
  let anchored = positioned;

  let connection: StreamConnection | null = null;
  let source: StreamSource | null = null;
  let attempt = 0;
  let cancelReconnect: (() => void) | null = null;
  let cancelFlush: (() => void) | null = null;

  /**
   * いま有効な接続の世代。
   *
   * @remarks
   * **捨てた接続からの通知を無視するために要ります。** `close()` を呼んでも、ブラウザが既に
   * 積んだ通知は届き得ます。世代を見ないと、捨てたはずの接続の `error` が、いま生きている
   * 接続を閉じます。
   */
  let generation = 0;

  /** 発券か接続が進行中か。`await` を挟む区間へ 2 本目を入れないための印。 */
  let starting = false;
  let releaseVisibility: (() => void) | null = null;
  let awaitingResync = false;
  let halted = false;
  let closed = false;

  /**
   * `closed` でなければ、購読の状態が変わったことを呼び出し側へ知らせる。
   *
   * @param state - 通知する新しい状態
   */
  function emit(state: StreamState): void {
    if (!closed) {
      options.onState(state);
    }
  }

  /** 開いている接続を閉じ、参照を外す。 */
  function closeSource(): void {
    source?.close();
    source = null;
  }

  /** 予約している張り直しを取り消す。 */
  function clearReconnect(): void {
    cancelReconnect?.();
    cancelReconnect = null;
  }

  /**
   * 購読を打ち切り、`stopped` を通知する。以降は張り直さない。
   *
   * @param reason - 打ち切りの理由
   */
  function stop(reason: StreamStopReason): void {
    halted = true;
    clearReconnect();
    closeSource();
    emit({ kind: "stopped", reason });
  }

  /** 窓を閉じて検証を通った event だけを呼び出し側へ渡す。1 件でも溜まっていれば、以降は自分が流した位置から張り直す。 */
  function flush(): void {
    const drained = window.drain();
    const events: T[] = [];

    if (drained.length > 0) {
      anchored = true;
    }

    for (const envelope of drained) {
      const parsed = safeParse(options.schema, envelope);

      if (parsed.success) {
        events.push(parsed.data);
      }
    }

    if (events.length > 0 && !closed) {
      options.onEvents(events);
    }
  }

  /** 整列の窓を閉じる合図を、二重に予約しないよう 1 回だけ仕掛ける。 */
  function scheduleFlush(): void {
    if (cancelFlush !== null) {
      return;
    }

    cancelFlush = deps.setTimer(() => {
      cancelFlush = null;
      flush();
    }, WINDOW_MS);
  }

  /** 正本の取り直しを要求する。開始位置を持たない購読はその場で張り直し、持つ購読は取り直しの完了を待つ。 */
  function requestResync(): void {
    if (awaitingResync || closed) {
      return;
    }

    clearReconnect();
    closeSource();

    if (!positioned) {
      anchored = false;
      window.resume(STREAM_ORIGIN);
      scheduleReconnect();
      options.onResync();

      return;
    }

    awaitingResync = true;
    emit({ kind: "reconnecting" });
    options.onResync();
  }

  /**
   * 張り直しを 1 回予約する。
   *
   * @param hintMs - サーバが示した目安。無ければ回数から待ち時間を決める
   */
  function scheduleReconnect(hintMs?: number): void {
    if (closed || halted || awaitingResync) {
      return;
    }

    emit({ kind: "reconnecting" });

    const delay = nextDelayMs(attempt, deps.random, hintMs);

    attempt += 1;
    cancelReconnect = deps.setTimer(() => {
      cancelReconnect = null;
      void start();
    }, delay);
  }

  /** 画面が見えるようになるまで待ち、見えたら 1 回だけ張り直しを再開する。 */
  function waitForVisible(): void {
    releaseVisibility ??= deps.onVisible(() => {
      releaseVisibility?.();
      releaseVisibility = null;
      void start();
    });
  }

  /**
   * 受け取った制御指示に従って、購読を打ち切る・取り直す・張り直すのいずれかを行う。
   *
   * @param control - 読めた制御指示。読めなければ何もしない
   */
  function handleControl(control: ControlEvent | null): void {
    if (control === null) {
      return;
    }

    if (control.action === CONTROL_ACTION.stop) {
      stop(STREAM_STOP_REASON.server);

      return;
    }

    if (control.action === CONTROL_ACTION.resync) {
      requestResync();

      return;
    }

    if (control.action === CONTROL_ACTION.reauthenticate) {
      connection = null;
    }

    closeSource();
    scheduleReconnect(control.retryAfterMs);
  }

  /**
   * 指定された接続先で `EventSource` を開き、世代を切り替えて通知を配線する。
   *
   * @param target - 接続先の URL と期限
   */
  function connect(target: StreamConnection): void {
    closeSource();

    generation += 1;

    const mine = generation;
    /**
     * この接続がまだ有効な世代かどうか。
     *
     * @returns 世代が変わっていない、かつ購読が閉じられていなければ `true`
     */
    const current = (): boolean => mine === generation && !closed;

    let opened = false;

    emit({ kind: "connecting" });

    source = deps.createSource(withCursor(target.url, anchored ? window.cursor() : null), {
      onOpen: () => {
        if (!current()) {
          return;
        }

        opened = true;
        attempt = 0;
        emit({ kind: "open" });
      },
      onEvent: (data) => {
        if (!current()) {
          return;
        }

        const envelope = parseEnvelope(data);

        if (envelope === null) {
          return;
        }

        if (window.admit(envelope) === ADMIT_RESULT.late) {
          requestResync();

          return;
        }

        scheduleFlush();
      },
      onControl: (data) => {
        if (!current()) {
          return;
        }

        handleControl(parseControl(data));
      },
      onError: () => {
        if (!current()) {
          return;
        }

        closeSource();

        if (!opened) {
          connection = null;
        }

        scheduleReconnect();
      },
    });
  }

  /**
   * 発券を取りに行く。失敗の分類によって打ち切るか張り直すかを決め、いずれの場合も `null` を返す。
   *
   * @returns 取得できた接続先。取得できなかった、または打ち切ったときは `null`
   */
  async function issue(): Promise<StreamConnection | null> {
    emit({ kind: "connecting" });

    try {
      return await deps.requestConnection(options.ticketPath);
    } catch (error) {
      const kind = findAppError(error)?.kind;

      if (kind === ErrorKind.UNAUTHENTICATED) {
        stop(STREAM_STOP_REASON.unauthenticated);
      } else if (kind === ErrorKind.PERMISSION_DENIED) {
        stop(STREAM_STOP_REASON.permissionDenied);
      } else if (kind === ErrorKind.NOT_FOUND) {
        stop(STREAM_STOP_REASON.absent);
      } else {
        scheduleReconnect();
      }

      return null;
    }
  }

  /**
   * 購読を張る。
   *
   * @remarks
   * **同時に 2 本走らせません。** 発券は `await` を挟むので、その間に張り直しや再開が重なると、
   * 解決した数だけ接続が開き、先に開いたものが誰にも閉じられなくなります。始まっている間は
   * 後から来た求めを落とし、位置の更新（`resume`）だけを先に効かせます。
   */
  async function start(): Promise<void> {
    if (closed || halted || awaitingResync || starting) {
      return;
    }

    if (deps.isHidden()) {
      waitForVisible();

      return;
    }

    starting = true;

    try {
      if (connection === null || connection.expiresAt <= deps.now()) {
        connection = await issue();
      }

      if (connection === null || closed || halted || awaitingResync) {
        return;
      }

      connect(connection);
    } finally {
      starting = false;
    }
  }

  void start();

  return {
    resume(cursor) {
      if (closed) {
        return;
      }

      // 開いているものは捨てる。位置が変わった以上、いま繋がっている接続は別の位置から
      // 配られており、そのまま残すと 2 本になる。
      clearReconnect();
      closeSource();
      awaitingResync = false;
      halted = false;
      attempt = 0;
      anchored = true;
      window.resume(cursor);
      void start();
    },
    close() {
      closed = true;
      clearReconnect();
      cancelFlush?.();
      cancelFlush = null;

      releaseVisibility?.();
      releaseVisibility = null;
      closeSource();
    },
  };
}
