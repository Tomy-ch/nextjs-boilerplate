// owner は GitHub のアカウント名規則（英数字とハイフン / 先頭末尾はハイフン不可）、
// repo は GitHub が許す文字種に合わせる
const REPOSITORY_REFERENCE = /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\/[A-Za-z0-9._-]+$/;

export function ensureRepositoryReference(value: string): void {
  if (!REPOSITORY_REFERENCE.test(value)) {
    throw new Error("リポジトリ参照は <owner>/<repo> 形式で指定してください。");
  }
}

// package.json の name へ書き込むため npm の命名規則（小文字 + 限定記号）に従わせる
export function ensurePackageName(value: string): void {
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(value)) {
    throw new Error(
      "リポジトリ名は npm パッケージ名として使える形式（小文字英数字で始まり、以降は英数字と . _ - のみ）で指定してください。",
    );
  }
}

export function ensureFourDigitYear(value: string): void {
  if (!/^\d{4}$/.test(value)) {
    throw new Error("--year は 4 桁の西暦で指定してください。");
  }
}

/**
 * portal の URL を検査し、正規化した値を返す。
 *
 * @remarks
 * **返り値を使うこと。** 検査だけして受け取った文字列をそのまま使うと、`"` を含む値が
 * 差し込み先の文字列リテラルを閉じ、その後ろが実行されるコードになります。`href` は
 * 引用符も制御文字もパーセントエンコード済みで、これが閉じられる唯一の口です。
 *
 * scheme を http(s) に限るのは、差し替えたリンクが押した瞬間の実行経路にならないため
 * （`javascript:`）。資格情報付きを拒むのは、この値が公開リポジトリのソースへ焼き付くため。
 *
 * @returns 正規化した URL
 * @throws 絶対 URL でない場合、http(s) でない場合、資格情報を含む場合。
 */
export function normalizePortalUrl(value: string): string {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error("--portal-url は絶対 URL で指定してください。");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("--portal-url は http または https の URL で指定してください。");
  }

  if (parsed.username !== "" || parsed.password !== "") {
    throw new Error("--portal-url に資格情報を含めないでください。");
  }

  return parsed.href;
}
