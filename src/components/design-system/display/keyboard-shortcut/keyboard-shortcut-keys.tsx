"use client";

import { type ComponentProps, useSyncExternalStore } from "react";

import { Kbd, KbdGroup } from "../kbd/kbd";
import {
  SHORTCUT_PLATFORM,
  type ShortcutPlatform,
  shortcutKeyLabel,
} from "./keyboard-shortcut.definition";

/**
 * プラットフォームは変わらないため、購読は解除だけを返す。
 *
 * @returns 何もしない解除関数。
 */
function subscribe(): () => void {
  return () => {};
}

/**
 * 閲覧環境から、修飾キーの表記を選ぶプラットフォームを読む。
 *
 * @returns Apple 系の環境なら {@link SHORTCUT_PLATFORM} の `APPLE`、それ以外は `OTHER`。
 */
function readPlatform(): ShortcutPlatform {
  return /mac|iphone|ipad|ipod/i.test(navigator.platform)
    ? SHORTCUT_PLATFORM.APPLE
    : SHORTCUT_PLATFORM.OTHER;
}

/**
 * server 描画時に使うプラットフォーム。閲覧環境を読めないため Apple 以外として扱う。
 *
 * @returns {@link SHORTCUT_PLATFORM} の `OTHER`。
 */
function readServerPlatform(): ShortcutPlatform {
  return SHORTCUT_PLATFORM.OTHER;
}

/**
 * 修飾キーの表記を選ぶプラットフォームを、hydration 後に閲覧環境から決める。
 *
 * @returns hydration までは {@link SHORTCUT_PLATFORM} の `OTHER`、その後は閲覧環境から読んだ値。
 */
function useShortcutPlatform(): ShortcutPlatform {
  return useSyncExternalStore(subscribe, readPlatform, readServerPlatform);
}

/** {@link KeyboardShortcutKeys} の props。 */
export type KeyboardShortcutKeysProps = Omit<ComponentProps<typeof KbdGroup>, "children"> & {
  /** 押す順に並べたキー。修飾キーは {@link SHORTCUT_MODIFIER} の値で渡す。 */
  keys: readonly string[];
  /** 表記を固定するプラットフォーム。省略すると閲覧環境から決める。 */
  platform?: ShortcutPlatform;
};

/**
 * ひと組のキー操作を、閲覧環境に合った表記で表示する client island。
 *
 * @remarks
 * `mod` などの修飾キーは Apple で `⌘`、それ以外で `Ctrl` と表記が変わる。判定に閲覧環境の情報が
 * 要るため hydration が必要で、Server Component から直接 render できない。
 *
 * **hydration までは Apple 以外の表記で描画する。** Apple 環境では hydration 後に `Ctrl` から
 * `⌘` へ切り替わる。表記を固定したい場合は `platform` を渡す。
 *
 * 表記の変わらないキーは受け取った文字列をそのまま表示する。`K` を小文字で渡せば小文字のまま
 * 出るため、大文字・小文字の見せ方は呼び出し元が決める。
 *
 * shortcut の登録も keydown の待ち受けも持たない。実際にそのキーで操作できるようにするのは
 * 呼び出し元である。何が起きるかはこの表示では伝わらないため、`KeyboardShortcut` の説明や
 * 隣接する文言と必ず組にする。
 *
 * @example
 * ```tsx
 * <KeyboardShortcutKeys keys={[SHORTCUT_MODIFIER.MOD, "K"]} />
 * ```
 *
 * @param props - `KbdGroup` の props から `children` を除いたものと、以下の表示用 props。
 *
 * @see Storybook `Display/KeyboardShortcut`
 */
export function KeyboardShortcutKeys({ keys, platform, ...props }: KeyboardShortcutKeysProps) {
  const detected = useShortcutPlatform();
  const resolved = platform ?? detected;

  return (
    <KbdGroup data-slot="keyboard-shortcut-keys" {...props}>
      {keys.map((key) => (
        <Kbd key={key}>{shortcutKeyLabel(key, resolved)}</Kbd>
      ))}
    </KbdGroup>
  );
}
