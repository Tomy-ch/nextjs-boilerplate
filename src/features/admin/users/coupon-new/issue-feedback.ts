import type { IssueCouponField, IssueCouponState } from "./form-state";

export function recipientLostIn(state: IssueCouponState): boolean {
  return state.status === "error" && state.fieldErrors?.userId !== undefined;
}

export function closesConfirmation(state: IssueCouponState): boolean {
  return (
    state.status === "success" ||
    (state.status === "error" && Object.keys(state.fieldErrors ?? {}).length > 0)
  );
}

export function failuresOf(state: IssueCouponState): readonly string[] {
  if (state.status !== "error" || closesConfirmation(state) || state.formError === null) {
    return [];
  }

  return [state.formError];
}

export function fieldMessagesOf(
  checked: Readonly<Partial<Record<IssueCouponField, string>>>,
  state: IssueCouponState | null,
): Partial<Record<IssueCouponField, string>> {
  const returned = state?.status === "error" ? (state.fieldErrors ?? {}) : {};
  const firstReturned: Partial<Record<IssueCouponField, string>> = Object.fromEntries(
    Object.entries(returned).flatMap(([field, list]) =>
      list?.[0] === undefined ? [] : [[field, list[0]]],
    ),
  );

  return { ...firstReturned, ...checked };
}
