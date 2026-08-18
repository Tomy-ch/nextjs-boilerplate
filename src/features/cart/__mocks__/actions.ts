import { fn } from "storybook/test";

import { succeededActionState } from "@/model/action-state";

import type { CartActionState } from "../actions";

/** カタログでの [setCartItemQuantityAction](../actions.ts)。 */
export const setCartItemQuantityAction = fn(
  async (): Promise<CartActionState> => succeededActionState(undefined),
).mockName("setCartItemQuantityAction");

/** カタログでの [removeCartItemAction](../actions.ts)。 */
export const removeCartItemAction = fn(
  async (): Promise<CartActionState> => succeededActionState(undefined),
).mockName("removeCartItemAction");

/** カタログでの [clearCartAction](../actions.ts)。 */
export const clearCartAction = fn(
  async (): Promise<CartActionState> => succeededActionState(undefined),
).mockName("clearCartAction");
