/**
 * 分割したテストが書き出す結果の綴り。
 *
 * @remarks
 * **名前を組み立てるのは `.makefiles/testing/test.mk` の `test-shard` です。** ここが持つのは
 * 読み戻しだけで、綴りを変えるなら 2 つを揃えて変えます。揃っていないと、書かれた結果が
 * 選り分けから落ち、束ねる側は「1 台も届いていない」としか言えなくなります。
 */

const BLOB_PATTERN = /^blob-([1-9]\d*)-([1-9]\d*)\.json$/;

/**
 * その名前が台の書いた結果なら、割った台数を返す。
 *
 * @param fileName - 置き場にあるファイルの名前（パスではない）
 * @returns 台数。台の書いた結果でなければ `undefined`
 */
export function readBlobTotal(fileName: string): number | undefined {
  const matched = BLOB_PATTERN.exec(fileName);

  return matched === null ? undefined : Number(matched[2]);
}
