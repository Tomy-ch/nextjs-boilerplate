/** page が受け取る素の `searchParams`。 */
export type RawSearchParams = Record<string, string | string[] | undefined>;

/** 一覧が 1 度に読み込む件数。 */
export const PRODUCT_PAGE_SIZE = 24;

/**
 * 選択肢 1 件。
 *
 * @remarks
 * 「すべて」を空文字の値で表します。選択肢の側が指定なしを持てば、操作は値を差し替えるだけで
 * 済み、キーを消す分岐を UI が持たずに済みます。
 */
export type FilterOption = {
  readonly value: string;
  readonly label: string;
};

/**
 * 素の `searchParams` を、1 つのキーに 1 つの文字列へ均す。
 *
 * @remarks
 * 同じキーが複数回現れたときは先頭だけを採ります。どれを採るかを決めておかないと、リンクの
 * 組み方次第で同じ URL が違う結果になります。
 *
 * 前後の空白を落とし、残りが空なら未指定として扱います。入力欄を空にして送った form は
 * `?keyword=` を URL に残すため、これを不正な入力と扱うと、消しただけで検索できなくなります。
 */
export function normalizeSearchParams(params: RawSearchParams): Readonly<Record<string, string>> {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    const found = Array.isArray(value) ? value[0] : value;
    const trimmed = found?.trim();

    if (trimmed !== undefined && trimmed !== "") {
      normalized[key] = trimmed;
    }
  }

  return normalized;
}
