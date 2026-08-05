import { REGEXP_ONLY_CHARS, REGEXP_ONLY_DIGITS, REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";

/**
 * 受け付ける文字の種類。
 *
 * @remarks
 * `pattern` へ渡すと、合わない文字は入力されない。貼り付けた文字列も同じ規則で弾かれる。
 * 指定しなければ文字種を制限しない。
 *
 * @see Storybook `Form/SegmentedInput`
 */
export const SEGMENTED_INPUT_PATTERN = {
  /** 数字だけ。確認コードや暗証番号に使う。 */
  DIGITS: REGEXP_ONLY_DIGITS,
  /** 英字だけ。 */
  CHARS: REGEXP_ONLY_CHARS,
  /** 英数字。招待コードやライセンスキーに使う。 */
  DIGITS_AND_CHARS: REGEXP_ONLY_DIGITS_AND_CHARS,
} as const;

/** {@link SEGMENTED_INPUT_PATTERN} のいずれか。 */
export type SegmentedInputPattern =
  (typeof SEGMENTED_INPUT_PATTERN)[keyof typeof SEGMENTED_INPUT_PATTERN];

/** 伏せ字に使う既定の文字。 */
export const SEGMENTED_INPUT_MASK_CHAR = "•";
