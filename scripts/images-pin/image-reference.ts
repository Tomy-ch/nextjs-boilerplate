// container image 参照の走査と解釈。固定対象ファイルの列挙と、行から参照 1 件を取り出す
// 責務を持つ。
//
// 対象は compose の `image:` と Dockerfile の `FROM`。どちらも「接頭辞・参照・接尾辞」の
// 3 つに割れるため、書き換えは同じ関数で扱える。
import fs from "node:fs";
import path from "node:path";

/** container image の参照 1 件。key は `image:tag`。 */
export type ImageRef = {
  /** 例: `alpine` / `mcr.microsoft.com/playwright`。 */
  image: string;
  /** 例: `3.24` / `v1.62.0-noble`。 */
  tag: string;
};

/** 走査するファイルと、その参照行を捕まえるパターン。 */
export type PinTarget = {
  file: string;
  pattern: RegExp;
  /** 厳格なパターンで拾えなかった行を検出するパターン。 */
  loose: RegExp;
};

// compose service の `image: <ref>`。接尾辞は行末の空白と行コメントを取り込んで保つ。
// 引用符を参照から締め出すのは、含めると `image: "alpine:3.24"` が引用符ごと一致し、
// `"alpine` を image 名として固定対象に載せてしまうため。締め出せば一致しなくなり、
// unparsedLines が対応記法の外として拾う。
export const COMPOSE_IMAGE_PATTERN = /^([ \t]+image:[ \t]+)([^\s'"]+)([ \t]*(?:#.*)?)$/gm;
const COMPOSE_IMAGE_LOOSE = /^[ \t]+image[ \t]*:[ \t]*\S/;

// FROM [--platform=...] <ref> [AS <stage>]
export const DOCKERFILE_FROM_PATTERN =
  /^(FROM[ \t]+)(?:--platform=\S+[ \t]+)?([^\s'"]+)((?:[ \t]+[Aa][Ss][ \t]+\S+)?[ \t]*)$/gim;
const DOCKERFILE_FROM_LOOSE = /^[ \t]*FROM[ \t]+\S/i;

const COMPOSE_PREFIX = "docker-compose";
const YAML_EXTENSIONS = [".yml", ".yaml"];
const DOCKER_DIR = "docker";
const DOCKERFILE = "Dockerfile";

export function refKey(ref: ImageRef): string {
  return `${ref.image}:${ref.tag}`;
}

/**
 * 参照文字列を image と tag へ分ける。固定対象でなければ null を返す。
 *
 * @remarks
 * 対象外になるのは、tag を持たない参照（`FROM builder` のようなビルドステージ参照や
 * `scratch`）と、最後の `:` が registry のポート指定だったもの（`localhost:5000/app`）です。
 * 既に付いている digest は捨てて読みます。版の SSOT は tag 側であり、digest はロック
 * ファイルが持つためです。
 */
export function parseRef(reference: string): ImageRef | null {
  const [name] = reference.split("@");
  const separator = name.lastIndexOf(":");
  if (separator < 0) return null;
  const image = name.slice(0, separator);
  const tag = name.slice(separator + 1);
  if (tag === "" || tag.includes("/")) return null;

  return { image, tag };
}

/**
 * 固定対象ファイルの一覧。
 *
 * @remarks
 * リポジトリ直下の `docker-compose*.yml` / `*.yaml` と、`docker/<用途>/Dockerfile` を集めます。
 * 走査対象が静かに空になると、そこに書かれた image 参照が検疫・固定・drift 検査のいずれからも
 * 外れたまま「すべて固定済み」と報告されます。
 */
export function targetFiles(root: string): PinTarget[] {
  const targets: PinTarget[] = [];

  for (const entry of readDirOrEmpty(root)) {
    if (!entry.isFile() || !entry.name.startsWith(COMPOSE_PREFIX)) continue;
    if (!YAML_EXTENSIONS.some((extension) => entry.name.endsWith(extension))) continue;
    targets.push({
      file: path.join(root, entry.name),
      pattern: COMPOSE_IMAGE_PATTERN,
      loose: COMPOSE_IMAGE_LOOSE,
    });
  }

  const dockerDir = path.join(root, DOCKER_DIR);
  for (const entry of readDirOrEmpty(dockerDir)) {
    if (!entry.isDirectory()) continue;
    const file = path.join(dockerDir, entry.name, DOCKERFILE);
    if (!fs.existsSync(file)) continue;
    targets.push({ file, pattern: DOCKERFILE_FROM_PATTERN, loose: DOCKERFILE_FROM_LOOSE });
  }

  return targets.sort((a, b) => a.file.localeCompare(b.file));
}

/** 対象ファイル群から固定対象の参照をキー単位で集める。同一キーは 1 件に畳む。 */
export function collectRefs(targets: PinTarget[]): Map<string, ImageRef> {
  const refs = new Map<string, ImageRef>();
  for (const target of targets) {
    const data = fs.readFileSync(target.file, "utf8");
    for (const match of data.matchAll(target.pattern)) {
      const ref = parseRef(match[2]);
      if (ref) refs.set(refKey(ref), ref);
    }
  }

  return refs;
}

/**
 * 厳格なパターンで解釈できなかった参照行の行番号を返す。
 *
 * @remarks
 * 引用符付き（`image: "alpine:3.24"`）や flow mapping で書かれた参照は、未登録としても
 * 未固定としても数えられず、検査が「異常なし」を返します。固定の網から外れた参照を黙って
 * 通さないよう、対応記法の外を検出して呼び出し元に落とさせます。
 */
export function unparsedLines(data: string, target: PinTarget): number[] {
  const rest = data.replace(target.pattern, (line) => " ".repeat(line.length));
  const lines: number[] = [];
  for (const [index, line] of rest.split("\n").entries()) {
    if (line.trimStart().startsWith("#")) continue;
    if (target.loose.test(line)) lines.push(index + 1);
  }

  return lines;
}

function readDirOrEmpty(dir: string): fs.Dirent[] {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}
