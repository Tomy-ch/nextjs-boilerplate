import fs from "fs"
import path from "path"
import { ROOT_DIR } from "./runtime.mjs"

export function toAbsolutePath(relativePath) {
  return path.join(ROOT_DIR, relativePath)
}

export function toRelativePath(filePath) {
  return path.relative(ROOT_DIR, filePath)
}

export function updateFile(relativePath, transformer, dryRun) {
  return updateAbsoluteFile(toAbsolutePath(relativePath), transformer, dryRun)
}

export function updateAbsoluteFile(filePath, transformer, dryRun) {
  if (!fs.existsSync(filePath)) {
    return null
  }

  const original = fs.readFileSync(filePath, "utf8")
  const updated = transformer(original)

  if (updated === null || updated === original) {
    return null
  }

  if (!dryRun) {
    fs.writeFileSync(filePath, updated)
  }

  return toRelativePath(filePath)
}

export function removeTarget(relativePath, dryRun) {
  const absolutePath = toAbsolutePath(relativePath)

  if (!fs.existsSync(absolutePath)) {
    return null
  }

  if (!dryRun) {
    fs.rmSync(absolutePath, { recursive: true, force: true })
  }

  return relativePath
}

export function listFilesRecursive(dirPath, options = {}, files = []) {
  const excludedDirectories = options.excludedDirectories ?? new Set()
  const shouldIncludeFile = options.shouldIncludeFile ?? (() => true)
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      if (excludedDirectories.has(entry.name)) {
        continue
      }

      listFilesRecursive(entryPath, options, files)
      continue
    }

    if (entry.isFile() && shouldIncludeFile(entryPath)) {
      files.push(entryPath)
    }
  }

  return files
}

export function listChildFiles(relativeDir, predicate = () => true) {
  const dirPath = toAbsolutePath(relativeDir)

  return fs.readdirSync(dirPath, { withFileTypes: true })
    .filter(entry => entry.isFile() && predicate(entry.name))
    .map(entry => path.join(dirPath, entry.name))
    .sort((a, b) => a.localeCompare(b))
}

export function countOccurrences(content, target) {
  return content.split(target).length - 1
}
