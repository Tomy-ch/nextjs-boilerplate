/**
 * この feature が持つルート。
 *
 * @remarks
 * `facade` へ置くのは、購入手続き（`checkout`）がカートへ戻る導線を持つためです。
 */

/**
 * カートの中身を全画面で確かめる画面。
 *
 * @remarks
 * 脇の領域と drawer からの副導線の行き先です。認証を要さないため、未ログインの利用者が中身を
 * 確かめられる唯一の経路になります。
 */
export const CART_PATH = "/cart";
