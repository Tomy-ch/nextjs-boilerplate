// 基準画像の置き場を用意するときの判定。GitHub への問い合わせと対話は index.ts が持ち、
// ここは受け取った値だけで決まることを担う。

/** 置き場の既定名を作る接尾辞。fork 先の名前置換に追随するよう、親の名前から導く。 */
const NAME_SUFFIX = "-vrt-images";

/**
 * 書き込みができる権限。
 *
 * @remarks
 * 足りない権限で進むと、置き場を作った後に push だけが失敗して原因が遠くなります。ここは
 * **許可する側を列挙**します。GitHub が権限を増やしたとき、既定で「書ける」側へ倒れないためです。
 */
export const WRITABLE_PERMISSIONS: readonly string[] = ["ADMIN", "MAINTAIN", "WRITE"];

/** 指定できる公開範囲。`internal` は組織のみ有効だが、可否は GitHub 側が判定する。 */
export const VISIBILITIES: readonly string[] = ["public", "private", "internal"];

/**
 * 公開範囲の既定。
 *
 * @remarks
 * 基準画像は画面の見た目そのものなので、公開側へ倒れる既定は取れません。親に合わせると、
 * 公開リポジトリを fork した非公開プロジェクトが黙って画面を公開します。
 *
 * 代償として、**置き場が非公開だと fork からの PR で `vrt` が落ちます**。fork の PR には
 * secrets が渡らず、App のトークンを取れないためです。公開のまま運用するリポジトリは、
 * ここで `public` を選んでください。
 */
export const DEFAULT_VISIBILITY = "private";

/** `owner/repo` を owner と repo に割る。 */
export function splitRepository(repository: string): { owner: string; name: string } {
  const match = /^([^/\s]+)\/([^/\s]+)$/.exec(repository);
  if (match === null) {
    throw new Error(`owner/repo の形ではありません: ${JSON.stringify(repository)}`);
  }
  return { owner: match[1], name: match[2] };
}

/** 親リポジトリから導く置き場の既定名。 */
export function defaultImagesName(parentRepository: string): string {
  return `${splitRepository(parentRepository).name}${NAME_SUFFIX}`;
}

/** 置き場は親と同じ owner の下に作る。名前だけを受け取り、`owner/repo` に組み立てる。 */
export function targetRepository(parentRepository: string, name: string): string {
  const trimmed = name.trim();
  if (trimmed === "") {
    throw new Error("リポジトリ名が空です。");
  }
  if (trimmed.includes("/")) {
    throw new Error(
      `リポジトリ名に owner は含めません: ${JSON.stringify(trimmed)}（既存を使う場合は最初の問いへ入力してください）`,
    );
  }
  return `${splitRepository(parentRepository).owner}/${trimmed}`;
}

/** 既存の置き場を使えるか。使えないときは、何が足りないかを載せて投げる。 */
export function assertWritable(repository: string, permission: string): void {
  if (!WRITABLE_PERMISSIONS.includes(permission)) {
    throw new Error(
      `${repository} への書き込み権限がありません（現在: ${permission || "不明"}）。`,
    );
  }
}

/** `gh` が返す大文字の公開範囲も受けて、`gh repo create` へ渡せる形へ揃える。 */
export function normalizeVisibility(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!VISIBILITIES.includes(normalized)) {
    throw new Error(
      `公開範囲は ${VISIBILITIES.join(" / ")} のいずれかです（入力: ${JSON.stringify(value)}）。`,
    );
  }
  return normalized;
}

/**
 * サブモジュールへ書く URL。
 *
 * @remarks
 * HTTPS を使うのは、CI と fork 先が鍵の配置なしに読めるためです。撮り直しの push は
 * GitHub App のトークンを `http.extraheader` へ載せて通します。
 */
export function cloneUrl(repository: string): string {
  return `https://github.com/${repository}.git`;
}

/**
 * 置き場へ置く README を組み立てる。
 *
 * @remarks
 * 差し込み漏れがあれば投げます。埋まらないまま push すると、置き場の README に `{{...}}` が
 * 残ったまま誰も直しません。
 */
export function renderReadme(
  template: string,
  values: { repositoryName: string; parentRepository: string },
): string {
  const rendered = template
    .replaceAll("{{REPO_NAME}}", values.repositoryName)
    .replaceAll("{{PARENT_REPO}}", values.parentRepository);

  const leftover = /\{\{[^}]+\}\}/.exec(rendered);
  if (leftover !== null) {
    throw new Error(`README のテンプレートに差し込めない箇所があります: ${leftover[0]}`);
  }
  return rendered;
}

/** 空の回答を既定値へ落とす。 */
export function withDefault(answer: string, fallback: string): string {
  const trimmed = answer.trim();
  return trimmed === "" ? fallback : trimmed;
}

/** 確認の回答。既定は「進めない」側に置く。 */
export function isAffirmative(answer: string): boolean {
  return ["y", "yes"].includes(answer.trim().toLowerCase());
}

/**
 * App の URL か slug から slug を取り出す。
 *
 * @remarks
 * 人が控えるのは作成直後に居る **General ページの URL**（`/settings/apps/<slug>`、組織なら
 * `/organizations/<org>/settings/apps/<slug>`）で、公開ページの `/apps/<slug>` ではありません。
 * どこに `apps/` が現れても受けるのはそのためです。末尾に `/permissions` などが付いていても構いません。
 */
export function normalizeAppSlug(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  const fromUrl = /github\.com\/(?:.*\/)?apps\/([^/?#]+)/.exec(trimmed);
  const slug = fromUrl === null ? trimmed : fromUrl[1];

  if (!/^[A-Za-z0-9-]+$/.test(slug)) {
    throw new Error(
      `App の URL か slug を入力してください（受け取った値: ${JSON.stringify(input)}）`,
    );
  }
  return slug;
}
