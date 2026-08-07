// GitHub Contents API のレスポンスから契約本文を取り出す。
import { z } from "zod";

// 1MB を超えるファイルは content が空になり encoding が "none" になる。
const NONE_ENCODING = "none";

const contentsSchema = z.object({
  type: z.string(),
  encoding: z.string().optional(),
  content: z.string().optional(),
  sha: z.string(),
  size: z.number(),
});

/** 取得できた契約 1 本。sha は blob SHA であり、内容が変われば変わる。 */
export type FetchedContract = {
  sha: string;
  spec: string;
};

/**
 * Contents API のレスポンスを契約本文へ復号する。
 *
 * @remarks
 * 復号後のバイト長が API の申告する `size` と一致しない場合は拒否します。欠けた契約から
 * 生成すると、消えたエンドポイントが「上流が削除した」のと区別できない形で型から消えるためです。
 */
export function decodeContentsResponse(payload: unknown): FetchedContract {
  const response = contentsSchema.parse(payload);

  if (response.type !== "file") {
    throw new Error(`取得先がファイルではありません（type=${response.type}）`);
  }

  if (
    response.encoding === NONE_ENCODING ||
    response.content === undefined ||
    response.content === ""
  ) {
    throw new Error(
      "契約の本文が空です。Contents API は 1MB を超えるファイルの content を返しません",
    );
  }

  if (response.encoding !== "base64") {
    throw new Error(`想定しない encoding です（encoding=${response.encoding}）`);
  }

  const spec = Buffer.from(response.content, "base64").toString("utf8");
  const decodedSize = Buffer.byteLength(spec, "utf8");

  if (decodedSize !== response.size) {
    throw new Error(`復号後のサイズが一致しません（申告 ${response.size} / 実測 ${decodedSize}）`);
  }

  return { sha: response.sha, spec };
}
