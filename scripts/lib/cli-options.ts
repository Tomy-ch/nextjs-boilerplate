/**
 * `--name value` の並びを読む。
 *
 * @remarks
 * 入口が受け取るのは引数の文字列だけで、読み方は遣り取りを伴いません。したがってここは入口では
 * なく判定の側に置きます（[`untested-modules.ts`](./untested-modules.ts) の「線を引くのは
 * 『遣り取りをせずに答えを出せるか』」）。入口へ書くと、並びが崩れた引数の扱いが検査の外に出ます。
 *
 * **落とし方は呼ぶ側が決めます。** ここは throw するだけで、案内の文面と終了コードは入口が
 * 持ちます —— 道具ごとに `usage` が違うためです。
 */

/**
 * `--name value` の並びを表に読む。
 *
 * @remarks
 * 同じ名前が 2 度現れたら後が勝ちます。取り違えではなく、呼ぶ側が組み立てた並びの末尾を
 * 優先する形です。
 *
 * @param argv - `--name value` の並び。オプション以外を含まない
 * @returns 名前から値への表
 * @throws 並びが `--name value` の対になっていないとき
 */
export function parseOptions(argv: readonly string[]): Map<string, string> {
  const options = new Map<string, string>();

  for (let position = 0; position < argv.length; position += 2) {
    const name = argv[position];
    const value = argv[position + 1];

    if (name === undefined || value === undefined || !name.startsWith("--")) {
      throw new Error(`引数の並びが読めません: ${argv.join(" ")}`);
    }

    options.set(name.slice(2), value);
  }

  return options;
}

/**
 * 欠かせないオプションを取り出す。
 *
 * @param options - {@link parseOptions} が読んだ表
 * @param name - `--` を除いた名前
 * @returns その値
 * @throws 渡されていないとき
 */
export function requireOption(options: ReadonlyMap<string, string>, name: string): string {
  const value = options.get(name);

  if (value === undefined) {
    throw new Error(`--${name} を渡してください`);
  }

  return value;
}
