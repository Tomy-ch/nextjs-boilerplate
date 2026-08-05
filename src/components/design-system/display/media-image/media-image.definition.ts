/**
 * `MediaImage` が枠を固定できる比率。
 *
 * - `SQUARE`: 1:1。一覧のサムネイルやアバター相当の枠
 * - `STANDARD`: 4:3。写真素材をそのまま載せる枠
 * - `WIDE`: 16:9。見出し画像や動画のサムネイル相当の枠
 *
 * @see Storybook `Display/MediaImage`
 */
export const MEDIA_IMAGE_ASPECT_RATIO = {
  SQUARE: "square",
  STANDARD: "standard",
  WIDE: "wide",
} as const;

/** {@link MEDIA_IMAGE_ASPECT_RATIO} のいずれかを表す比率の値。 */
export type MediaImageAspectRatio =
  (typeof MEDIA_IMAGE_ASPECT_RATIO)[keyof typeof MEDIA_IMAGE_ASPECT_RATIO];

/**
 * 比率から、枠へ与える Tailwind の class を引く表。
 *
 * @remarks
 * `MediaImage` が内部で使う対応表を公開したもの。画像を伴わない枠へ同じ比率を揃えたい場合に参照する。
 *
 * `overflow-hidden` を含めるのは、CSS の `aspect-ratio` が内容の高さに負けるためである。枠より高い
 * 内容を入れると比率を保てずに縦へ伸びるので、はみ出しを切って比率を優先する。これがないと、
 * 画像以外を入れた枠だけが崩れる。
 *
 * @see Storybook `Display/MediaImage`
 */
export const MEDIA_IMAGE_ASPECT_RATIO_CLASS: Readonly<Record<MediaImageAspectRatio, string>> = {
  [MEDIA_IMAGE_ASPECT_RATIO.SQUARE]: "aspect-square overflow-hidden",
  [MEDIA_IMAGE_ASPECT_RATIO.STANDARD]: "aspect-[4/3] overflow-hidden",
  [MEDIA_IMAGE_ASPECT_RATIO.WIDE]: "aspect-video overflow-hidden",
};
