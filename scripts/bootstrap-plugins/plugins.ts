import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * plugin の導入状態の判定。
 *
 * @remarks
 * CLI の呼び出しと出力は入口が持ちます。ここは「宣言済みか」「ディスク上に居るか」を
 * 見るところだけを持ちます。
 */

/**
 * `settings.json` が名前を宣言しているか。
 *
 * @remarks
 * パースせず生文字列で照合します。宣言の置き場（キー名）が CLI 側のスキーマ変更で動いても、
 * 判定が引きずられないようにするためです。
 */
export function settingsDeclares(settingsPath: string, needle: string): boolean {
  try {
    return fs.readFileSync(settingsPath, "utf8").includes(`"${needle}"`);
  } catch {
    return false;
  }
}

/**
 * plugin 本体がディスク上に解決できたか。
 *
 * @remarks
 * marketplace のディレクトリ名は CLI が決めるため、
 * `~/.claude/plugins/marketplaces/*&#47;plugins/<name>` を走査して探します。
 */
export function resolvedPluginPath(
  plugin: string,
  home: string = os.homedir(),
): string | undefined {
  const marketplaces = path.join(home, ".claude", "plugins", "marketplaces");
  let entries: fs.Dirent[];

  try {
    entries = fs.readdirSync(marketplaces, { withFileTypes: true });
  } catch {
    return undefined;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const candidate = path.join(marketplaces, entry.name, "plugins", plugin);

    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}
