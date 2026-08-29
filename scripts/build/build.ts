/** 取得先の URL から、待ち受けるポートを読む。既定のポートは URL に現れないので補う。 */
export function portOf(baseUrl: string): number {
  const parsed = new URL(baseUrl);

  if (parsed.port !== "") {
    return Number(parsed.port);
  }

  return parsed.protocol === "https:" ? 443 : 80;
}

/**
 * この build が取得先を自分で立てるべきか。
 *
 * @remarks
 * 立てるのは mock のときだけです。live は実物の取得先を指しているので、そこへ割り込むと、
 * 実物へ繋がっているつもりの build が生成ハンドラの応答で固まります。
 */
export function servesMockApi(mode: string | undefined): boolean {
  return mode === "mock";
}
