/** 秘匿値を置き換える固定の表示文字列です。 */
export const redactedValue = "[REDACTED]";

/**
 * メッセージに含まれる明示指定の秘匿値を置き換えます。
 *
 * 何を秘匿するかは呼び出し元が指定します。空文字は置換せず、長い値から処理して部分一致による漏れを防ぎます。
 */
export function redactMessage(message: string, sensitiveValues: readonly string[]): string {
  const values = [...new Set(sensitiveValues.filter((value) => value.length > 0))].sort(
    (left, right) => right.length - left.length,
  );

  return values.reduce(
    (redactedMessage, sensitiveValue) => redactedMessage.split(sensitiveValue).join(redactedValue),
    message,
  );
}
