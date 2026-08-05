import { z } from "zod";

/** manifest でビューアーの構造制御に予約されているキー。コピー対象の走査からは外す。 */
export const META_KEY = "meta";

/** canonical なドキュメントと、portal 配下へ複製する先の対。 */
export const copyEntrySchema = z.object({
  src: z.string(),
  dst: z.string(),
});

/**
 * manifest 全体の形。
 *
 * `meta` 以外のキーはすべて section であり、値はコピー対の配列になる。`meta` の中身は
 * 構造制御であって複製とは無関係なので、ここでは検証せず素通しする。
 */
export const portalManifestSchema = z.record(
  z.string(),
  z.union([z.array(copyEntrySchema), z.record(z.string(), z.unknown())]),
);

export type CopyEntry = z.infer<typeof copyEntrySchema>;
export type PortalManifest = z.infer<typeof portalManifestSchema>;

/** section 名を添えたコピー対。どの section の記述が原因かを失敗時に示せるようにする。 */
export type ResolvedCopyEntry = CopyEntry & { section: string };

/**
 * manifest からコピー対象を取り出す。
 *
 * @remarks
 * `meta` 以外の値が配列でない場合は拒否します。section のつもりで書いたマップが黙って
 * 無視されると、登録したはずのドキュメントが portal から欠ける形で現れるためです。
 */
export function resolveCopyEntries(manifest: unknown): ResolvedCopyEntry[] {
  const parsed = portalManifestSchema.parse(manifest);
  const entries: ResolvedCopyEntry[] = [];

  for (const [section, value] of Object.entries(parsed)) {
    if (section === META_KEY) {
      continue;
    }

    if (!Array.isArray(value)) {
      throw new Error(
        `${section} は section の配列である必要があります（meta 以外に map は置けません）`,
      );
    }

    for (const entry of value) {
      entries.push({ ...entry, section });
    }
  }

  return entries;
}

/**
 * 複製先が出力ディレクトリの内側に収まっているか検査する。
 *
 * @remarks
 * manifest はリポジトリ内のテキストですが、`dst` はそのままファイル書き込み先になります。
 * `../` を含む値が通ると出力ディレクトリの外を上書きできるため、複製の前に弾きます。
 *
 * @param resolve - 相対パスを絶対パスへ解決する関数。呼び出し元が `node:path` を渡す。
 */
export function assertWithinOutputRoot(
  entries: readonly ResolvedCopyEntry[],
  outputRoot: string,
  resolve: (value: string) => string,
): void {
  const rootAbsolute = resolve(outputRoot);

  for (const entry of entries) {
    const destination = resolve(entry.dst);

    if (destination !== rootAbsolute && !destination.startsWith(`${rootAbsolute}/`)) {
      throw new Error(
        `[${entry.section}] dst が出力ディレクトリ（${outputRoot}）の外を指しています: ${entry.dst}`,
      );
    }
  }
}
