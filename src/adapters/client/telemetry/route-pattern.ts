import { MAX_ROUTE_LENGTH } from "@/adapters/http/telemetry-report";

/**
 * 実際のパスと動的セグメントの値から、route の型を組み立てる。
 *
 * @remarks
 * ブラウザは自分がどの route を描いているかを名前で知りません。`usePathname()` が返すのは
 * `/docs/42` のような **1 件ぶんのパス**で、そのまま観測基盤へ送ると属性の値が閲覧された
 * 件数だけ増え、識別子も一緒に流れます。動的セグメントの値は `useParams()` が名前付きで返すので、
 * パスの中のその値を名前へ戻せば `/docs/[slug]` が得られます。
 *
 * **符号化された値も戻します。** パスは percent-encode 済みで、`useParams()` が返すのは復号後の
 * 値です。日本語や記号を含む識別子では両者の綴りが違うため、復号後と符号化後の両方を試します。
 *
 * @param pathname - `usePathname()` が返す実際のパス
 * @param params - `useParams()` が返す動的セグメントの値。catch-all は配列で届き、名前だけあって
 *   値が無いセグメントでは `undefined` が入る
 */
export function toRoutePattern(
  pathname: string,
  params: Readonly<Record<string, string | readonly string[] | undefined>>,
): string {
  let pattern = pathname;

  for (const [name, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }

    const segments = typeof value === "string" ? [value] : value;
    const placeholder = typeof value === "string" ? `/[${name}]` : `/[...${name}]`;

    if (segments.join("").length === 0) {
      continue;
    }

    for (const spelling of [segments.join("/"), segments.map(encodeURIComponent).join("/")]) {
      const replaced = pattern.replace(`/${spelling}`, placeholder);

      if (replaced !== pattern) {
        pattern = replaced;
        break;
      }
    }
  }

  return pattern.slice(0, MAX_ROUTE_LENGTH);
}
