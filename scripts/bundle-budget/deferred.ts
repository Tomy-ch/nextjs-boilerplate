// 初期の一式から辿り着ける、遅延読み込みの chunk を成果物から引く。

/**
 * chunk の中身が名指ししている chunk。
 *
 * @remarks
 * Turbopack は遅延読み込みを、**読み込む chunk のパスを文字列として埋め込んだ小さな chunk**として
 * 出します（`Promise.all([...].map((path) => load(path)))` の形）。遅延の先は manifest のどこにも
 * 現れないため、成果物の側からはこの綴りが唯一の手がかりになります。
 *
 * **この綴りは Turbopack の出力形式に依存します。** 形が変わると抽出が 0 件へ落ち、遅延の量が
 * 「無い」として通ります。呼び出し側（`index.ts`）は base で引けていた遅延が current で 0 件に
 * なったことを失敗として扱います —— 形式が変わった PR そのもので鳴らすためです。
 */
const CHUNK_REFERENCE = /static\/chunks\/[A-Za-z0-9_@./-]+?\.(?:js|css)/g;

/**
 * 初期の一式から辿り着ける、遅延読み込みの chunk。
 *
 * @remarks
 * 初期の chunk が名指しする chunk を推移的に閉じ、初期そのものを引きます。開いた人が必ず払う量
 * ではなく、**その画面を使い切ると払う量**です。`next/dynamic` の先へ移した分がここへ現れるので、
 * 初期と合わせて見ると「移しただけ」と「減らした」を区別できます。
 *
 * @param initial - 初期に読む chunk。
 * @param read - chunk の中身を読む。読めない場合は null。
 * @returns 初期を含まない、遅延で読みうる chunk。
 */
export function deferredChunks(
  initial: readonly string[],
  read: (chunk: string) => string | null,
): string[] {
  // 初期のものを最初から見たことにしておく。こうすると「まだ見ていない」がそのまま「遅延」
  // になり、初期かどうかをもう一度確かめる分岐が要らない。
  const seen = new Set(initial);
  // 走査の途中で伸ばす。Array の反復子は毎回 length を読み直すので、押し込んだ先も同じ回で辿る。
  const queue = [...initial];
  const found: string[] = [];

  for (const current of queue) {
    const content = read(current);

    if (content === null) {
      continue;
    }

    for (const reference of content.match(CHUNK_REFERENCE) ?? []) {
      if (seen.has(reference)) {
        continue;
      }

      seen.add(reference);
      queue.push(reference);
      found.push(reference);
    }
  }

  return found;
}
