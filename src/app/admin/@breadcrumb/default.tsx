/**
 * 現在地までの階層を持たない画面。
 *
 * @remarks
 * 階層の一番上にある画面は自分より上を持たないため、何も出しません。この既定が無いと、slot に
 * 対応する route を持たない画面を直接開いたときに 404 になります。
 */
export default function AdminBreadcrumbDefault() {
  return null;
}
