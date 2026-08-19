import type { SafeReturnUrl } from "@/model/return-url";
import type { Prefecture } from "@/model/user/user";

import { RegistrationForm } from "./ui/registration-form/registration-form";

type OnboardingViewProps = {
  readonly prefectures: readonly Prefecture[];
  readonly idempotencyKey: string;
  readonly returnUrl: SafeReturnUrl;
};

/**
 * 登録の表示。
 *
 * @remarks
 * パンくずを置きません。この画面に着いた利用者はまだどの画面にも入れず、戻れる祖先が無い
 * ためです（[0026](../../../../docs/adr/0026-layout-shell-mount.md)）。
 */
export function OnboardingView({ idempotencyKey, prefectures, returnUrl }: OnboardingViewProps) {
  return (
    <RegistrationForm
      idempotencyKey={idempotencyKey}
      prefectures={prefectures}
      returnUrl={returnUrl}
    />
  );
}
