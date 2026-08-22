import "server-only";

/** cookie を封緘する鍵配送方式と暗号方式。共有鍵をそのまま content encryption key に使う。 */
export const SEAL_HEADER = { alg: "dir", enc: "A256GCM" } as const;

/**
 * 秘密値から 256 bit の鍵を導く。
 *
 * @remarks
 * `A256GCM` は 32 バイトちょうどの鍵を要求しますが、設定が持つのは長さの決まっていない文字列です。
 * ハッシュを通すことで、設定側に「32 バイトちょうど」という運用不能な制約を課さずに済みます。
 *
 * 封緘するものが増えても導き方は 1 つに保ちます。導出が分かれると、同じ秘密値から違う鍵が出て、
 * 片方で封緘したものをもう片方が開けません。
 */
export async function deriveSealKey(secret: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));

  return new Uint8Array(digest);
}
