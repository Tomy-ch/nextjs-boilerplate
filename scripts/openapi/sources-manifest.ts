// 取り込む契約の座標宣言（openapi/sources.yaml）の読み取りとスタンプ書き戻し。
import { parseDocument } from "yaml";
import { z } from "zod";

/** 契約の取得先ディレクトリ。取得物と宣言を同じ場所に置く。 */
export const CONTRACT_DIR = "openapi";

export const MANIFEST_PATH = `${CONTRACT_DIR}/sources.yaml`;

// name は取得物のファイル名になるため、パス区切りやドットを含む値を弾く。
const NAME_PATTERN = /^[a-z][a-z0-9-]*$/;
// GitHub の owner/repo。gh へ渡す前にここで形を確定させる。
const REPO_PATTERN = /^[\w.-]+\/[\w.-]+$/;
// path は取得 URL の一部になる。`?` や `#` を許すと ref のクエリを宣言側から上書きでき、
// ref による版の固定を宣言の別フィールドから迂回できてしまう。
const PATH_PATTERN = /^[\w.-]+(\/[\w.-]+)*$/;

const sourceSchema = z.object({
  name: z.string().regex(NAME_PATTERN, { error: "name は英小文字始まりの kebab-case です" }),
  repo: z.string().regex(REPO_PATTERN, { error: "repo は owner/repo の形式です" }),
  path: z
    .string()
    .regex(PATH_PATTERN, { error: "path は / 区切りの相対パスです" })
    .refine((value) => !value.split("/").includes(".."), {
      error: "path に .. は使えません",
    }),
  ref: z.string().min(1),
  // 取得前は未スタンプであり、宣言だけが存在する状態を正当とする。
  sha: z.string().nullable().default(null),
  fetchedAt: z.string().nullable().default(null),
});

const manifestSchema = z.object({
  sources: z.array(sourceSchema).min(1, { error: "sources が空です" }),
});

/** 契約 1 本の取得座標。 */
export type OpenApiSource = z.infer<typeof sourceSchema>;

/** 取得結果として座標へ書き戻す値。 */
export type ContractStamp = {
  sha: string;
  fetchedAt: string;
};

/** 取得物の置き場所。name から一意に決まり、宣言側では指定できない。 */
export function contractPath(name: string): string {
  return `${CONTRACT_DIR}/${name}.gen.yaml`;
}

/**
 * 座標宣言を読み取る。
 *
 * @remarks
 * name の重複を拒否します。name は取得物のファイル名を決めるため、重複を通すと後勝ちの
 * 取得物が先の契約を黙って上書きし、生成物が宣言と対応しなくなるためです。
 */
export function parseSourcesManifest(text: string): OpenApiSource[] {
  const { sources } = manifestSchema.parse(parseDocument(text).toJS());
  const seen = new Set<string>();

  for (const source of sources) {
    if (seen.has(source.name)) {
      throw new Error(`name "${source.name}" が重複しています`);
    }

    seen.add(source.name);
  }

  return sources;
}

/**
 * 取得対象を選ぶ。名前を渡さなければ宣言された全件を対象とする。
 *
 * @remarks
 * 宣言に無い名前は無視せず拒否します。綴り違いが「対象 0 件で正常終了」として現れると、
 * 取得したつもりの契約が古いまま生成へ流れるためです。
 */
export function selectSources(
  sources: readonly OpenApiSource[],
  requested: readonly string[],
): OpenApiSource[] {
  if (requested.length === 0) {
    return [...sources];
  }

  const unknown = requested.filter((name) => !sources.some((source) => source.name === name));

  if (unknown.length > 0) {
    throw new Error(`${MANIFEST_PATH} に宣言のない契約です: ${unknown.join(", ")}`);
  }

  return sources.filter((source) => requested.includes(source.name));
}

/**
 * 取得 URL のパス部分へ埋め込める形に整える。
 *
 * @remarks
 * セグメント単位で符号化し、区切りの `/` は残します。パス全体を符号化すると階層が 1 つの
 * セグメントに潰れ、存在しないパスとして 404 になります。
 */
export function encodeContractPath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

/**
 * 取得結果を座標宣言へ書き戻す。
 *
 * @remarks
 * YAML を再構築せず既存の文書へ値だけを差し込みます。宣言は ref を選んだ理由をコメントで
 * 持っており、書き戻しのたびにそれが落ちると座標の根拠が残らないためです。
 */
export function applyStamps(text: string, stamps: ReadonlyMap<string, ContractStamp>): string {
  const document = parseDocument(text);
  const sources = parseSourcesManifest(text);

  for (const [name, stamp] of stamps) {
    const index = sources.findIndex((source) => source.name === name);

    if (index < 0) {
      throw new Error(`name "${name}" は sources.yaml に宣言されていません`);
    }

    document.setIn(["sources", index, "sha"], stamp.sha);
    document.setIn(["sources", index, "fetchedAt"], stamp.fetchedAt);
  }

  return document.toString();
}
