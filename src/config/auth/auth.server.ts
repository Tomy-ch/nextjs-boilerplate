import "server-only";

import { getEnvironment } from "../environment";
import type { AuthEnvironment } from "./auth.schema";

class AuthConfig {
  readonly #issuer: string;
  readonly #clientId: string;
  readonly #redirectUri: string;
  readonly #scopes: string;
  readonly #sessionSecret: string;

  private constructor(
    issuer: string,
    clientId: string,
    redirectUri: string,
    scopes: string,
    sessionSecret: string,
  ) {
    this.#issuer = issuer;
    this.#clientId = clientId;
    this.#redirectUri = redirectUri;
    this.#scopes = scopes;
    this.#sessionSecret = sessionSecret;
  }

  /** 検証済み ENV から production singleton を組み立てる。 */
  static fromValues(values: AuthEnvironment): AuthConfig {
    return new AuthConfig(
      values.AUTH_ISSUER,
      values.AUTH_CLIENT_ID,
      values.AUTH_REDIRECT_URI,
      values.AUTH_SCOPES,
      values.AUTH_SESSION_SECRET,
    );
  }

  /** OIDC Discovery の起点となる issuer。 */
  get issuer(): string {
    return this.#issuer;
  }

  /** Authorization Code + PKCE の public client ID。 */
  get clientId(): string {
    return this.#clientId;
  }

  /** IdP 登録値と完全一致させる callback URL。 */
  get redirectUri(): string {
    return this.#redirectUri;
  }

  /** 認可リクエストに渡す space-delimited scope。 */
  get scopes(): string {
    return this.#scopes;
  }

  /** BFF session cookie を保護する server 専用の秘密値。 */
  get sessionSecret(): string {
    return this.#sessionSecret;
  }
}

let authConfig: AuthConfig | undefined;

/** 認証 adapter が利用する、プロセス内で不変な singleton を返す。 */
export const getAuthConfig = (): AuthConfig => {
  authConfig ??= AuthConfig.fromValues(getEnvironment());
  return authConfig;
};
