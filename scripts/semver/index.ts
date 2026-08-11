#!/usr/bin/env node

import { bumpVersion, isBumpType, normalizeVersion } from "./bump.js";

function main(): void {
  const [version, type] = process.argv.slice(2);

  if (version === undefined || type === undefined) {
    console.error("usage: semver <version> <patch|minor|major>");
    process.exit(1);
  }

  if (!isBumpType(type)) {
    console.error("type must be patch | minor | major");
    process.exit(1);
  }

  const normalized = normalizeVersion(version);

  if (normalized === null) {
    console.error("version must be in the format X.Y.Z or vX.Y.Z");
    process.exit(1);
  }

  console.log(bumpVersion(normalized, type));
}

main();
