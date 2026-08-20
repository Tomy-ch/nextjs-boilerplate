/**
 * design token が持つ系統。
 *
 * @remarks
 * 綴りは `surface` ですが、呼び名は「系統」です。「面」は `bg-*` が塗る面を指す語として repo
 * 全体で使うため（`tokens/README.md`「切替の軸は 2 本」）。
 *
 * 既定の系統は属性を持ちません。`:root` に出ている宣言がそのまま効くので、属性を置くのは既定
 * 以外へ切り替える部分木だけです。
 */
export const SURFACE: Readonly<{ ADMIN: "admin" }> = { ADMIN: "admin" };

/** {@link SURFACE} のいずれか。 */
export type Surface = (typeof SURFACE)[keyof typeof SURFACE];

/** 系統を載せる属性の名前。 */
export const SURFACE_ATTRIBUTE = "data-surface";
