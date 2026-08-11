#!/usr/bin/env node

import { updateFile } from "../lib/file-utils.js";
import { exitWithUsage, parseCommonFlags } from "../lib/runtime.js";
import { ensureFourDigitYear } from "../lib/validators.js";

type Options = {
  holder?: string;
  year: string;
  dryRun: boolean;
  help: boolean;
  rest: string[];
};

const LICENSE_FILE = "LICENSE";

function printUsage(): void {
  console.log(`使用方法:
  tsx scripts/setup/replace-license-copyright --holder <name> [--year <yyyy>] [--dry-run]

例:
  tsx scripts/setup/replace-license-copyright --holder "Example Inc."
  tsx scripts/setup/replace-license-copyright --holder "Example Inc." --year 2026 --dry-run
`);
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    ...parseCommonFlags(argv),
    year: String(new Date().getFullYear()),
  };

  const args = options.rest;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--holder" || arg === "--year") {
      const value = args[i + 1];

      if (!value || value.startsWith("--")) {
        throw new Error(`${arg} の値を指定してください。`);
      }

      if (arg === "--holder") {
        options.holder = value;
      }

      if (arg === "--year") {
        options.year = value;
      }

      i += 1;
      continue;
    }

    throw new Error(`不明な引数です: ${arg}`);
  }

  if (options.help) {
    return options;
  }

  if (!options.holder) {
    throw new Error("--holder は必須です。");
  }

  ensureFourDigitYear(options.year);

  return options;
}

function main(): void {
  let options: Options;

  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    exitWithUsage(error as Error, printUsage);
  }

  if (options.help) {
    printUsage();
    return;
  }

  const pattern = /^Copyright \(c\) .*/m;

  const result = updateFile(
    LICENSE_FILE,
    (original: string): string => {
      if (!pattern.test(original)) {
        throw new Error("LICENSE に著作権表示が見つかりませんでした。");
      }

      return original.replace(pattern, `Copyright (c) ${options.year} ${options.holder}`);
    },
    options.dryRun,
  );

  if (!result) {
    console.log("変更対象は見つかりませんでした。");
    return;
  }

  console.log(`${options.dryRun ? "ドライラン" : "置換完了"}: LICENSE`);
  console.log(`- Copyright (c) ${options.year} ${options.holder}`);
}

main();
