import { z } from "zod";

/** auth purpose 専用の ENV validator を定義する。 */

const httpUrl = z.url().refine(
  (value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  },
  { error: "http または https の URL を指定してください" },
);

/** OIDC issuer を検証する。 */
export function authIssuerValidator() {
  return httpUrl;
}

/** OIDC public client ID を検証する。 */
export function authClientIdValidator() {
  return z.string().min(1);
}

/** IdP に登録する callback URL を検証する。 */
export function authRedirectUriValidator() {
  return httpUrl;
}

/** 認可リクエストの scope を検証する。 */
export function authScopesValidator() {
  return z.string().trim().min(1);
}

/** BFF session を保護する秘密値を検証する。 */
export function authSessionSecretValidator() {
  return z.string().min(32);
}

export type AuthEnvironment = {
  AUTH_ISSUER: z.infer<ReturnType<typeof authIssuerValidator>>;
  AUTH_CLIENT_ID: z.infer<ReturnType<typeof authClientIdValidator>>;
  AUTH_REDIRECT_URI: z.infer<ReturnType<typeof authRedirectUriValidator>>;
  AUTH_SCOPES: z.infer<ReturnType<typeof authScopesValidator>>;
  AUTH_SESSION_SECRET: z.infer<ReturnType<typeof authSessionSecretValidator>>;
};
