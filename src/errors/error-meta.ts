/** エラーに付与できる protocol-agnostic なメタ情報の入力です。 */
export type ErrorMetaOptions = Readonly<{
  /** 機械可読なエラーコードです。空文字の場合はカタログの既定値を使います。 */
  code?: string;
  /** 利用者へ表示する文言です。空文字の場合はカタログの既定値を使います。 */
  message?: string;
  /** ログ相関と、利用者からの連絡の突き合わせに使う、バックエンドが発行した識別子です。 */
  requestId?: string;
  /** 公開して安全な詳細識別子です。入力値や理由文は渡してはいけません。 */
  details?: readonly string[];
}>;

/**
 * 分類とは独立して付与する、プロトコル非依存のエラーメタ情報です。
 *
 * インスタンスは不変であり、配列は生成時と取得時の双方でコピーします。
 */
export class ErrorMeta {
  readonly #code: string;
  readonly #message: string;
  readonly #requestId: string;
  readonly #details: readonly string[];

  /** 検証済みの値からインスタンスを構築する。各項目の既定値は空文字列・空配列。 */
  private constructor({ code = "", message = "", requestId = "", details = [] }: ErrorMetaOptions) {
    this.#code = code;
    this.#message = message;
    this.#requestId = requestId;
    this.#details = [...details];
  }

  /**
   * 指定した値から不変のメタ情報を生成します。
   *
   * @param options - 各項目の値。省略した項目は既定値になる
   * @returns 生成した {@link ErrorMeta}
   */
  static create(options: ErrorMetaOptions = {}): ErrorMeta {
    return new ErrorMeta(options);
  }

  /**
   * 機械可読なエラーコードを返します。
   *
   * @returns エラーコード
   */
  get code(): string {
    return this.#code;
  }

  /**
   * 利用者へ表示する文言を返します。
   *
   * @returns 表示用文言
   */
  get message(): string {
    return this.#message;
  }

  /**
   * ログ相関と、利用者からの連絡の突き合わせに使う識別子を返します。
   *
   * @returns requestId
   */
  get requestId(): string {
    return this.#requestId;
  }

  /**
   * 公開可能な詳細識別子のコピーを返します。
   *
   * @returns 詳細識別子の配列
   */
  get details(): readonly string[] {
    return [...this.#details];
  }

  /**
   * 利用者向け文言だけを置き換えたメタ情報を返します。
   *
   * @remarks
   * 文言の正は境界のカタログに置くため、通常の利用は境界層に限ります。
   *
   * @param message - 置き換える表示用文言
   * @returns 置き換え後の {@link ErrorMeta}
   */
  withMessage(message: string): ErrorMeta {
    return createErrorMeta({
      code: this.#code,
      message,
      requestId: this.#requestId,
      details: this.#details,
    });
  }
}

/**
 * protocol-agnostic なエラーメタ情報を生成します。
 *
 * @param options - 各項目の値。省略した項目は既定値になる
 * @returns 生成した {@link ErrorMeta}
 */
export function createErrorMeta(options: ErrorMetaOptions = {}): ErrorMeta {
  return ErrorMeta.create(options);
}

class ErrorWithMeta extends Error {
  readonly meta: ErrorMeta;

  /**
   * 元エラーへメタ情報を紐づける。
   *
   * @param error - cause として保持する元エラー
   * @param meta - 紐づけるメタ情報
   */
  constructor(error: Error, meta: ErrorMeta) {
    super(error.message, { cause: error });
    this.name = "ErrorWithMeta";
    this.meta = meta;
  }
}

/**
 * cause chain を保ったまま、エラーへメタ情報を付与します。
 *
 * @remarks
 * `undefined` はそのまま返すため、任意エラーを扱う呼び出し元で明示的な分岐を増やしません。
 *
 * @param error - メタ情報を付与する元エラー
 * @param meta - 付与するメタ情報
 * @returns メタ情報を付与したエラー
 */
export function withErrorMeta(error: Error, meta: ErrorMeta): Error;
/** @inheritdoc */
export function withErrorMeta(error: undefined, meta: ErrorMeta): undefined;
/** @inheritdoc */
export function withErrorMeta(error: Error | undefined, meta: ErrorMeta): Error | undefined {
  if (error === undefined) {
    return undefined;
  }

  return new ErrorWithMeta(error, meta);
}

/**
 * cause chain を保ったまま、公開可能な詳細識別子だけをエラーへ付与します。
 *
 * @param error - 詳細識別子を付与する元エラー
 * @param details - 付与する詳細識別子
 * @returns 詳細識別子を付与したエラー
 */
export function withErrorDetails(error: Error, details: readonly string[]): Error;
/** @inheritdoc */
export function withErrorDetails(error: undefined, details: readonly string[]): undefined;
/** @inheritdoc */
export function withErrorDetails(
  error: Error | undefined,
  details: readonly string[],
): Error | undefined {
  if (error === undefined) {
    return undefined;
  }

  return withErrorMeta(error, createErrorMeta({ details }));
}

/**
 * cause chain の最も外側にあるメタ情報を返します。
 *
 * @remarks
 * 上位層が意図して再ラップしたメタ情報を優先します。
 *
 * @param error - 走査対象のエラー
 * @returns 見つかった {@link ErrorMeta}。無ければ `undefined`
 */
export function errorMetaFrom(error: unknown): ErrorMeta | undefined {
  const seen = new Set<Error>();
  let current = error;

  while (current instanceof Error && !seen.has(current)) {
    if (current instanceof ErrorWithMeta) {
      return current.meta;
    }

    seen.add(current);
    current = current.cause;
  }

  return undefined;
}
