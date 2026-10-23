// bullfrog の step が受け取る入力の語彙。どの入力をどの順で書くかはここだけが持ち、
// workflow の走査（apply-check.ts）は書く場所だけを決める。

/** 1 つの step に書き出す方針。 */
export type StepPolicy = {
  /** 許すドメイン。`null` なら監査のまま残す。 */
  readonly domains: readonly string[] | null;
  /** 許す IP。 */
  readonly ips: readonly string[];
  /** sudo を残すか。 */
  readonly sudo: boolean;
};

/**
 * 書き出す `with:` の中身。
 *
 * @param indent - step の `uses:` の字下げ
 * @param policy - その step に書く方針
 * @returns `with:` から始まる行の並び
 *
 * @remarks
 * 一覧は `|` で書きます。bullfrog は入力を改行で割るので、`>` で畳むと 1 行の不正な
 * ドメインになり、step が落ちます。監査のままなら名前解決も絞らないので、`dns-policy` と
 * 許すドメインを書きません。
 */
export function policyBlock(indent: string, policy: StepPolicy): string[] {
  const block = [`${indent}with:`];

  if (policy.domains === null) {
    block.push(`${indent}  egress-policy: audit`);
  } else {
    block.push(`${indent}  egress-policy: block`, `${indent}  dns-policy: allowed-domains-only`);
  }

  block.push(`${indent}  enable-sudo: ${policy.sudo}`);

  if (policy.ips.length > 0) {
    block.push(`${indent}  allowed-ips: |`, ...policy.ips.map((ip) => `${indent}    ${ip}`));
  }

  if (policy.domains !== null) {
    block.push(
      `${indent}  allowed-domains: |`,
      ...policy.domains.map((domain) => `${indent}    ${domain}`),
    );
  }

  return block;
}
