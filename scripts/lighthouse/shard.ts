/**
 * 計測を台数で割る。
 *
 * @remarks
 * **1 台の中で並べません。** 測っているのは CPU 律速の値（TBT / LCP）で、同じ機械で計測を
 * 並べると互いの CPU を奪い合い、予算と照らす意味が消えます。しかも壊れ方が実行ごとに違うため、
 * 「たまに超える」ゲートになります。割るのは機械であって、機械の中ではありません。
 */

/** 分割の 1 台ぶん。 */
export type Shard = {
  /** 何台目か。1 始まり。 */
  readonly index: number;
  /** 何台に割ったか。 */
  readonly total: number;
};

const SHARD_PATTERN = /^([1-9]\d*)\/([1-9]\d*)$/;

/**
 * 分割の指定を読む。書式は Playwright / Vitest の `--shard` と同じ「台目 / 台数」。
 *
 * @remarks
 * 案内の綴りに山括弧を使いません。SAST が「変数を挿した HTML に見える文字列」として拾い、
 * 0 件を保つゲートが落ちます。実例を挙げるほうが、書式の記法より読む側に速く届きます。
 */
export function parseShard(spec: string): Shard {
  const matched = SHARD_PATTERN.exec(spec.trim());

  if (matched === null) {
    throw new Error(`分割の指定が読めません: ${spec}（「1/4」のように渡してください）`);
  }

  const index = Number(matched[1]);
  const total = Number(matched[2]);

  if (index > total) {
    throw new Error(`分割の指定が範囲の外です: ${spec}（${total} 台に ${index} 台目はありません）`);
  }

  return { index, total };
}

/**
 * この台が担当するぶんを取り出す。
 *
 * @remarks
 * 前から順に切らず、1 つ飛ばしで配ります。画面ごとに計測の重さが違うため、続きで切ると重い画面が
 * 同じ台へ固まり、その台だけが長引きます。飛ばして配ると重さが台へ散ります。
 */
export function selectShard<T>(items: readonly T[], shard: Shard): T[] {
  return items.filter((_, position) => position % shard.total === shard.index - 1);
}

/** この台の結果を書き出す名前。台数を綴りに持たせ、束ねる側が読み戻せるようにする。 */
export function shardFileName(shard: Shard): string {
  return `measurements-${shard.index}-${shard.total}.json`;
}

const FILE_PATTERN = /^measurements-([1-9]\d*)-([1-9]\d*)\.json$/;

/**
 * その名前が、台の書いた結果かどうか。
 *
 * @remarks
 * **綴りを知っているのはこのモジュールだけです。** 名前を組み立てるのも（{@link shardFileName}）、
 * 台数を読み戻すのも（{@link expectedTotal}）ここなので、選り分けだけを呼び出し側が自前で
 * 書くと、名前の付け方を変えたときに片方だけが古びます。しかも黙って古びます —— 選り分けが
 * 外れた結果は合流の対象から落ちるだけで、台数の突合は「揃っている」と答えます。
 */
export function isShardFile(fileName: string): boolean {
  return FILE_PATTERN.test(fileName);
}

/**
 * 届いた結果が全台ぶん揃っているかを、綴りだけから確かめる。
 *
 * @remarks
 * **台数をここで宣言しません。** 各台が書いた名前が既に台数を持っているので、束ねる側が数字を
 * 書き写すと、それが古びる 2 つ目の宣言になります。
 *
 * 足りないまま束ねると、測らなかった画面が「予算の緩和が宣言されているのに居ない画面」として
 * 現れます。原因を取り違えるので、束ねる前に落とします。
 *
 * @param fileNames - 置き場にあるファイルの名前（パスではない）
 * @returns 割った台数
 */
export function expectedTotal(fileNames: readonly string[]): number {
  const totals = new Set<number>();
  let found = 0;

  for (const name of fileNames) {
    const matched = FILE_PATTERN.exec(name);

    if (matched === null) {
      continue;
    }

    totals.add(Number(matched[2]));
    found += 1;
  }

  if (found === 0) {
    throw new Error("分割の結果が 1 台ぶんも届いていません");
  }

  if (totals.size > 1) {
    throw new Error(
      `届いた結果が別々の台数で割られています: ${[...totals].sort((a, b) => a - b).join(", ")}`,
    );
  }

  const [total] = [...totals];

  if (total !== found) {
    throw new Error(`分割 ${total} 台のうち ${found} 台ぶんしか結果が届いていません`);
  }

  return total;
}
