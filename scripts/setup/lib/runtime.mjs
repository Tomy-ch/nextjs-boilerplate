import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const ROOT_DIR = path.resolve(__dirname, "../../..")

export function parseCommonFlags(argv) {
  const options = {
    dryRun: false,
    help: false,
    rest: []
  }

  for (const arg of argv) {
    if (arg === "--dry-run") {
      options.dryRun = true
      continue
    }

    if (arg === "--help" || arg === "-h") {
      options.help = true
      continue
    }

    options.rest.push(arg)
  }

  return options
}

export function exitWithUsage(error, printUsage) {
  console.error(`エラー: ${error.message}`)
  console.error("")
  printUsage()
  process.exit(1)
}
