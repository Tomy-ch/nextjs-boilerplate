#!/usr/bin/env node

type BumpType = "patch" | "minor" | "major"

function parseArgs(argv: string[]): { version: string; type: BumpType } {
  if (argv.length < 2) {
    console.error("usage: semver <version> <patch|minor|major>")
    process.exit(1)
  }

  const [version, type] = argv

  if (!["patch", "minor", "major"].includes(type)) {
    console.error("type must be patch | minor | major")
    process.exit(1)
  }

  return {
    version,
    type: type as BumpType
  }
}

function validateVersion(version: string): string {
  const v = version.replace(/^v/, "")

  if (!/^\d+\.\d+\.\d+$/.test(v)) {
    console.error("version must be in the format vX.Y.Z")
    process.exit(1)
  }

  return v
}

function bumpVersion(version: string, type: BumpType): string {
  let [major, minor, patch] = version.split(".").map(Number)

  switch (type) {
    case "patch":
      patch++
      break
    case "minor":
      minor++
      patch = 0
      break
    case "major":
      major++
      minor = 0
      patch = 0
      break
  }

  return `v${major}.${minor}.${patch}`
}

function main(): void {
  const { version, type } = parseArgs(process.argv.slice(2))
  const validated = validateVersion(version)
  const result = bumpVersion(validated, type)

  console.log(result)
}

main()
