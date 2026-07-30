// YAML 定義に現れる `uses:` の値の収集。
//
// `jobs.<id>.steps[].uses` / `runs.steps[].uses` の形を決め打ちで辿らず、解決済みの
// JS 値を再帰的に走査する。alias とマージキー経由で書かれた `uses:` も、パーサの解決を
// 通した後なら同じように現れるため、記法ごとの取りこぼしが出ない。
import { type Document, parseDocument } from "yaml";

export function parseYaml(file: string, source: string): Document {
  const doc = parseDocument(source);
  if (doc.errors.length > 0) {
    throw new Error(`${file}: YAML として読めません: ${doc.errors[0].message}`);
  }
  return doc;
}

// パーサが解決した JS 値。alias とマージキー（`<<`）はここで展開される。
export function toJS(file: string, doc: Document): unknown {
  try {
    return doc.toJS({ merge: true });
  } catch (e) {
    throw new Error(
      `${file}: YAML を解決できません: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
}

export function collectUses(file: string, source: string): string[] {
  const found: string[] = [];
  collectUsesFromValue(toJS(file, parseYaml(file, source)), found);
  return found;
}

export function collectUsesFromValue(value: unknown, out: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectUsesFromValue(item, out);
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (key === "uses" && typeof child === "string") out.push(child);
    collectUsesFromValue(child, out);
  }
}
