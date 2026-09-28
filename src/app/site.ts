/**
 * サイトの名。
 *
 * @remarks
 * タイトルの雛形・OG 画像・各 route group の shell が同じ名を出します。route 要素のどれにも当たらない
 * このモジュールへ切り出してあるのは、器ごとに書くと一部だけが動くためです（`fonts.ts` と同じ扱い）。
 *
 * **ラテンの綴りに限ります。** 画像を描く `ImageResponse` が持つ既定の書体はラテンの字しか
 * 持たず、和文を含めると画像の側だけが欠けます。
 */
export const SITE_NAME = "nextjs-boilerplate";

/** サイトの説明。root の `description` に載る。 */
export const SITE_DESCRIPTION = "Next.js / React のプレゼンテーション層 boilerplate です。";

/** アイコン（`icon.tsx` / `apple-icon.tsx`）に描く印。枠の大きさは描く側が決めるので、1 文字に限る。 */
export const SITE_MONOGRAM = "N";
