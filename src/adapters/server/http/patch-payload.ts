/**
 * 部分更新で「触らない」と「消す」を区別して組み立てたペイロード。
 *
 * @remarks
 * 値に `undefined` を許しません。`JSON.stringify` は値が `undefined` のキーを落とすため、
 * `{ name: undefined }` と `{}` はワイヤ上で同じになります。つまり「消したい」つもりの
 * `undefined` は「触らない」として届き、どちらの意図だったかは受け取り側から判別できません。
 *
 * 触らないならキーを含めず、消すなら `null` を明示する。この規律を散文ではなく型で持ちます。
 */
export type PatchPayload<T> = {
  [K in keyof T]?: Exclude<T[K], undefined> | null;
};

/**
 * 部分更新のペイロードから、値が `undefined` のキーを落とす。
 *
 * @remarks
 * 直列化の手前で落としておくのは、組み立ての段階で意図を確定させるためです。`JSON.stringify`
 * に任せると、キーが消えたのが意図なのか組み立ての事故なのかを、後から読んで判別できません。
 *
 * `null` は残します。こちらは「消す」という指示であり、値のある指定と同じく届ける必要があります。
 */
export function normalizePatchPayload<T extends object>(payload: PatchPayload<T>): PatchPayload<T> {
  const normalized: PatchPayload<T> = {};

  for (const key in payload) {
    const value = payload[key];

    if (value !== undefined) {
      normalized[key] = value;
    }
  }

  return normalized;
}
