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
 * bullfrog の `allowed-domains` と同じく、ドメイン名だけを書きます。`*.example.com` の形の
 * ワイルドカードを許し、**apex を含みません** —— `example.com` も要るなら別に並べます。
 * bullfrog はドメインを port で絞らないので、`host:port` は書けません。
 */
const domain = z
  .string()
  .regex(
    /^(\*\.)?[A-Za-z0-9][A-Za-z0-9.-]*$/,
    "ドメイン名だけを書く必要があります（port は書けません）",
  );

const reason = z.string().trim().min(1, "理由を空にできません");

/** IPv4 のアドレスか CIDR。bullfrog の `allowed-ips` が受ける形のうち、IPv4 に絞ったもの。 */
const ip = z
  .string()
  .regex(
    /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\/(3[0-2]|[12]?\d))?$/,
    "IPv4 のアドレスか CIDR である必要があります",
  );

const name = z.string();

/**
 * 省いてよい対応表。
 *
 * @remarks
 * **キーだけが残った状態（`audit:` の下に何も無い）も空として受けます。**中身を 1 件ずつ
 * 落とす道具 —— サンプルの剥がしがこれをする —— は、最後の 1 件を落とした時点でキーを
 * 取り残します。そこで落とすと、剥がした木でだけ宣言が読めなくなります。
 *
 * @param key - キーの形
 * @param value - 値の形
 * @returns 省略・`null` を空の対応表へ寄せる schema
 */
function optionalMap<T extends z.ZodType>(key: z.ZodString, value: T) {
  return z
    .record(key, value)
    .nullish()
    .transform((entries) => entries ?? {});
}

const declarationSchema = z.object({
  baseline: z.array(domain).min(1, "baseline は 1 件以上要ります"),
  ips: optionalMap(ip, reason),
  workflows: optionalMap(name, z.array(domain).min(1, "固有分は 1 件以上要ります")),
  audit: optionalMap(name, reason),
  sudo: optionalMap(name, z.record(name, reason)),
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
 * その workflow が許すドメイン。
 *
 * @param declaration - 許可する宛先の宣言
 * @param name - workflow のファイル名（拡張子を除く）
 * @returns 許すドメインの一覧。**まだ遮断しないと宣言されていれば `null`**
 *
 * @remarks
 * 並びは baseline が先で、固有分がその後に来ます。宣言に無い workflow は baseline だけで
 * 足ります —— 足りない側に倒すのではなく、**足す根拠を実測に置く**という運用の結果です。
 */
export function domainsFor(declaration: Declaration, name: string): string[] | null {
  if (name in declaration.audit) return null;

  return [...declaration.baseline, ...(declaration.workflows[name] ?? [])];
}

/**
 * 全 job が許す IP。
 *
 * @param declaration - 許可する宛先の宣言
 * @returns 宣言の `ips` に並ぶ IP か CIDR
 */
export function allowedIps(declaration: Declaration): string[] {
  return Object.keys(declaration.ips);
}

/**
 * その job に sudo を残すか。
 *
 * @param declaration - 許可する宛先の宣言
 * @param workflow - workflow のファイル名（拡張子を除く）
 * @param job - `jobs:` の下のキー
 * @returns 例外として宣言されていれば `true`。宣言に無い job は残さない
 */
export function sudoFor(declaration: Declaration, workflow: string, job: string): boolean {
  return job in (declaration.sudo[workflow] ?? {});
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
    .sort((a, b) => a.localeCompare(b));
}

/**
 * sudo を残すと宣言されているが、bullfrog の step を持つ job として見つからないもの。
 *
 * @param declaration - 許可する宛先の宣言
 * @param jobs - bullfrog の step が見つかった job（`<workflow>/<job>`）
 * @returns 見つからなかった宣言（`<workflow>/<job>`）
 *
 * @remarks
 * workflow ごと消えた場合も、job の名前が変わった場合もここに出ます。残った例外は、次に
 * 同じ名前の job が現れたときに誰も見ていない sudo を渡します。
 */
export function orphanSudo(declaration: Declaration, jobs: readonly string[]): string[] {
  const present = new Set(jobs);

  return Object.entries(declaration.sudo)
    .flatMap(([workflow, entries]) => Object.keys(entries).map((job) => `${workflow}/${job}`))
    .filter((key) => !present.has(key))
    .sort((a, b) => a.localeCompare(b));
}
