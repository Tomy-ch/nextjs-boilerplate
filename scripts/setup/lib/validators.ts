export function ensureRepositoryReference(value: string): void {
  if (!/^[^/\s]+\/[^/\s]+$/.test(value)) {
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
