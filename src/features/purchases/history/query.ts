/**
 * 一覧が 1 度に読み込む件数。
 *
 * @remarks
 * 初回ページと続きで同じ値を使います。違えると、読み進めるたびに 1 度に増える量が変わります。
 */
export const PURCHASE_PAGE_SIZE = 20;

/** ページ送りのカーソルを載せる URL のキー。契約のクエリ名と揃える。 */
export const CURSOR_KEY = "after";

/** 読み込む件数を載せる URL のキー。契約のクエリ名と揃える。 */
export const COUNT_KEY = "first";
