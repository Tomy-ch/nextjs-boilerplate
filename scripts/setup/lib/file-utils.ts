import fs from "node:fs";
import path from "node:path";
import { ROOT_DIR } from "./runtime.js";

export function toAbsolutePath(relativePath: string): string {
  return path.join(ROOT_DIR, relativePath);
}

export function toRelativePath(filePath: string): string {
  return path.relative(ROOT_DIR, filePath);
}

// UTF-8 として往復できないファイルは読み込みを断る。不正バイトは decode で U+FFFD へ
// 潰れ、書き戻すと元に戻せないため、置換対象から外して呼び出し側へ知らせる
export function readUtf8File(filePath: string): string | null {
  const buffer = fs.readFileSync(filePath);
  const content = buffer.toString("utf8");

  if (!Buffer.from(content, "utf8").equals(buffer)) {
    console.error(`⚠️  UTF-8 として読めないためスキップしました: ${toRelativePath(filePath)}`);
    return null;
  }

  return content;
}

/** 読み取れたときだけ中身を返す。対象が無い場合も `null` になる。 */
function readExistingUtf8File(filePath: string): string | null {
  try {
    return readUtf8File(filePath);
  } catch {
    return null;
  }
}

export function updateFile(
  relativePath: string,
  transformer: (content: string) => string | null,
  dryRun: boolean,
): string | null {
  return updateAbsoluteFile(toAbsolutePath(relativePath), transformer, dryRun);
}

export function updateAbsoluteFile(
  filePath: string,
  transformer: (content: string) => string | null,
  dryRun: boolean,
): string | null {
  // 存在を先に確かめない。確かめてから読むまでの間に消えうるため、読めたかどうかそのものを
  // 判定にする。読めなかったことと UTF-8 として扱えないことは、どちらも「置換しない」で同じ。
  const original = readExistingUtf8File(filePath);

  if (original === null) {
    return null;
  }

  const updated = transformer(original);

  if (updated === null || updated === original) {
    return null;
  }

  if (!dryRun) {
    fs.writeFileSync(filePath, updated);
  }

  return toRelativePath(filePath);
}

export function removeTarget(relativePath: string, dryRun: boolean): string | null {
  const absolutePath = toAbsolutePath(relativePath);

  if (!fs.existsSync(absolutePath)) {
    return null;
  }

  if (!dryRun) {
    fs.rmSync(absolutePath, { recursive: true, force: true });
  }

  return relativePath;
}

type ListOptions = {
  excludedDirectories?: Set<string>;
  shouldIncludeFile?: (filePath: string) => boolean;
};

export function listFilesRecursive(
  dirPath: string,
  options: ListOptions = {},
  files: string[] = [],
): string[] {
  const excludedDirectories = options.excludedDirectories ?? new Set<string>();
  const shouldIncludeFile = options.shouldIncludeFile ?? (() => true);
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (excludedDirectories.has(entry.name)) {
        continue;
      }

      listFilesRecursive(entryPath, options, files);
      continue;
    }

    if (entry.isFile() && shouldIncludeFile(entryPath)) {
      files.push(entryPath);
    }
  }

  return files;
}

export function listChildFiles(
  relativeDir: string,
  predicate: (fileName: string) => boolean = () => true,
): string[] {
  const dirPath = toAbsolutePath(relativeDir);

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && predicate(entry.name))
    .map((entry) => path.join(dirPath, entry.name))
    .sort((a, b) => a.localeCompare(b));
}

export function countOccurrences(content: string, target: string): number {
  return content.split(target).length - 1;
}
