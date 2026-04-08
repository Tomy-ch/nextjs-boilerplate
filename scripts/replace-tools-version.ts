#!/usr/bin/env node

import fs from "fs"
import path from "path"
import yaml from "js-yaml"

type Tools = {
  pnpm: string
}

type Rule = {
  regex: RegExp
  value: string
}

type Target = {
  file: string
  rules: Rule[]
}

const ROOT = process.cwd()

function loadTools(): Tools {
  const file = path.join(ROOT, "tools.yaml")

  if (!fs.existsSync(file)) {
    console.error("tools.yaml not found")
    process.exit(1)
  }

  const parsed = yaml.load(fs.readFileSync(file, "utf8")) as { tools: Tools }
  return parsed.tools
}

function applyReplacements(
  filePath: string,
  rules: Rule[],
  dryRun: boolean
): void {
  if (!fs.existsSync(filePath)) {
    console.warn(`Skip (not found): ${filePath}`)
    return
  }

  const content = fs.readFileSync(filePath, "utf8")
  let updated = content

  for (const rule of rules) {
    updated = updated.replace(rule.regex, rule.value)
  }

  if (updated === content) {
    console.log(`No changes: ${filePath}`)
    return
  }

  if (!dryRun) {
    fs.writeFileSync(filePath, updated)
  }

  console.log(`${dryRun ? "DryRun" : "Updated"}: ${filePath}`)
}

function main(): void {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")

  const tools = loadTools()

  const targets: Target[] = [
    {
      file: ".makefiles/tools/setup.mk",
      rules: [
        {
          regex: /pnpm@[^ ]+/g,
          value: `pnpm@${tools.pnpm}`
        }
      ]
    }
  ]

  for (const target of targets) {
    const filePath = path.join(ROOT, target.file)
    applyReplacements(filePath, target.rules, dryRun)
  }

  console.log("Done.")
}

main()
