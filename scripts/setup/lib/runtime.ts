import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR: string = path.resolve(__dirname, "../../..");

export type CommonOptions = {
  dryRun: boolean;
  help: boolean;
  rest: string[];
};

export function parseCommonFlags(argv: string[]): CommonOptions {
  const options: CommonOptions = {
    dryRun: false,
    help: false,
    rest: [],
  };

  for (const arg of argv) {
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    options.rest.push(arg);
  }

  return options;
}

export function exitWithUsage(error: Error, printUsage: () => void): never {
  console.error(`エラー: ${error.message}`);
  console.error("");
  printUsage();
  process.exit(1);
}
