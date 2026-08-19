import type { ProfileField } from "@/model/user/profile-schema";

/**
 * 入力欄と、送る前の確認に出す項目名。
 *
 * @remarks
 * 入力欄の label と確認の見出しを同じ出所から取ります。別々に書くと、片方だけ言い換えたときに
 * 「どちらが正しい名前なのか」を利用者が確かめられなくなります。
 */
export const PROFILE_FIELD_LABELS: Readonly<Record<ProfileField, string>> = {
  lastName: "名字",
  firstName: "名前",
  email: "メールアドレス",
  phone: "電話番号",
  postalCode: "郵便番号",
  prefecture: "都道府県",
  city: "市区町村",
  street: "丁目・番地",
  building: "建物名・部屋番号",
};
