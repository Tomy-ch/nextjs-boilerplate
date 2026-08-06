// 取得した契約と、そこから生成した成果物の版が揃っているかの突合。
import { contractPath, type OpenApiSource } from "./sources-manifest";

// orval が生成物のヘッダへ書き出す契約の版。契約の info.version をそのまま写すため、
// make fetch-api が焼いた short SHA がここに現れる。
const SPEC_VERSION_PATTERN = /OpenAPI spec version:\s*(\S+)/;
const SHORT_SHA_LENGTH = 7;

/** 生成物 1 件の照合対象。 */
export type GeneratedArtifact = {
  path: string;
  content: string;
};

/** 契約から生成される成果物のうち、版の突合に使うもの。 */
export function stampedArtifactPaths(name: string): string[] {
  return [`src/adapters/gen/${name}/endpoints.zod.ts`];
}

/**
 * 生成物のヘッダから契約の版を取り出す。
 *
 * @remarks
 * 見つからない場合は null を返します。版を持たない生成物は突合の対象外ではなく、
 * 「生成器が版を書かなくなった」という検知すべき変化です。
 */
export function extractSpecVersion(content: string): string | null {
  return SPEC_VERSION_PATTERN.exec(content)?.[1] ?? null;
}

/**
 * 宣言された契約と生成物の版のずれを列挙する。
 *
 * @remarks
 * 契約を取得しただけで生成していない状態を検出します。取得と生成が別コマンドである以上、
 * 片方だけ実行された作業ツリーは必ず作れるため、突合を機械で持つ必要があります。
 */
export function findStampDrift(
  sources: readonly OpenApiSource[],
  artifacts: readonly GeneratedArtifact[],
): string[] {
  const drift: string[] = [];

  for (const source of sources) {
    if (source.sha === null) {
      drift.push(`${contractPath(source.name)}: 契約が未取得です`);
      continue;
    }

    const expected = source.sha.slice(0, SHORT_SHA_LENGTH);

    for (const path of stampedArtifactPaths(source.name)) {
      const artifact = artifacts.find((candidate) => candidate.path === path);

      if (artifact === undefined) {
        drift.push(`${path}: 生成物がありません`);
        continue;
      }

      const version = extractSpecVersion(artifact.content);

      if (version === null) {
        drift.push(`${path}: 生成物が契約の版を持っていません`);
        continue;
      }

      if (!version.endsWith(`+${expected}`)) {
        drift.push(`${path}: 契約は +${expected} ですが生成物は ${version} です`);
      }
    }
  }

  return drift;
}
