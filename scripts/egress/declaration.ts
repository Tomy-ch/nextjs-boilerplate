// 許可する宛先の宣言（`.github/egress.yaml`）の読み取り。
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { z } from "zod";

/** 宣言ファイルの位置。 */
export const DECLARATION_FILE = ".github/egress.yaml";

/**
 * 宛先 1 件。
 *
 * @remarks
 * harden-runner の `allowed-endpoints` と同じ `host:port` です。`*.example.com` の形の
 * ワイルドカードを許します。**port を省けません** —— 省いた宣言は harden-runner 側で
 * 無視され、遮断したつもりの宛先が黙って通ります。
 */
const endpoint = z
  .string()
  .regex(/^(\*\.)?[A-Za-z0-9][A-Za-z0-9.-]*:\d{1,5}$/, "host:port の形である必要があります");

/**
 * 省いてよい対応表。
 *
 * @remarks
 * **キーだけが残った状態（`audit:` の下に何も無い）も空として受けます。**中身を 1 件ずつ
 * 落とす道具 —— サンプルの剥がしがこれをする —— は、最後の 1 件を落とした時点でキーを
 * 取り残します。そこで落とすと、剥がした木でだけ宣言が読めなくなります。
 */
function optionalMap<T extends z.ZodType>(value: T) {
  return z
    .record(z.string(), value)
    .nullish()
    .transform((entries) => entries ?? {});
}

const declarationSchema = z.object({
  baseline: z.array(endpoint).min(1),
  workflows: optionalMap(z.array(endpoint).min(1)),
  audit: optionalMap(z.string().trim().min(1)),
});

/** 許可する宛先の宣言。 */
export type Declaration = z.infer<typeof declarationSchema>;

/**
 * 宣言を読む。
 *
 * @param text - `.github/egress.yaml` の中身
 * @throws 形が宣言に合わないとき。**空へ倒しません** —— 読めない宣言を「宛先なし」として
 * 通すと、全 workflow が baseline すら持たない状態で遮断され、CI が丸ごと止まります
 */
export function parseDeclaration(text: string): Declaration {
  return declarationSchema.parse(parse(text));
}

/** 宣言をファイルから読む。 */
export function readDeclaration(file: string): Declaration {
  return parseDeclaration(readFileSync(file, "utf8"));
}

/**
 * その workflow が許す宛先。
 *
 * @param name - workflow のファイル名（拡張子を除く）
 * @returns 許す宛先の一覧。**まだ遮断しないと宣言されていれば `null`**
 *
 * @remarks
 * 並びは baseline が先で、固有分がその後に来ます。宣言に無い workflow は baseline だけで
 * 足ります —— 足りない側に倒すのではなく、**足す根拠を実測に置く**という運用の結果です。
 */
export function endpointsFor(declaration: Declaration, name: string): string[] | null {
  if (name in declaration.audit) return null;

  return [...declaration.baseline, ...(declaration.workflows[name] ?? [])];
}

/**
 * 宣言にあるが、対応する workflow が存在しないキー。
 *
 * @remarks
 * 消された workflow の宛先が残り続けると、次にその名前が復活したときに誰も見ていない
 * 許可が付いてきます。
 */
export function orphanKeys(declaration: Declaration, names: readonly string[]): string[] {
  const present = new Set(names);

  return [...Object.keys(declaration.workflows), ...Object.keys(declaration.audit)]
    .filter((key) => !present.has(key))
    .sort();
}
