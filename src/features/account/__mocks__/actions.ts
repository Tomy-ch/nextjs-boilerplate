import { fn } from "storybook/test";

import { succeededActionState } from "@/model/action-state";

import type { ProfileFormState, WithdrawFormState } from "../form-state";

/** カタログでの [updateProfileAction](../actions.ts)。 */
export const updateProfileAction = fn(
  async (): Promise<ProfileFormState> => succeededActionState(undefined),
).mockName("updateProfileAction");

/**
 * カタログでの [withdrawAction](../actions.ts)。
 *
 * @remarks
 * 本物は成立した時点で別の画面へ送るため、成功の状態は画面に現れません。カタログには送り先が
 * 無いので、成功を返して押した後の画面に留まります。
 */
export const withdrawAction = fn(
  async (): Promise<WithdrawFormState> => succeededActionState(undefined),
).mockName("withdrawAction");
