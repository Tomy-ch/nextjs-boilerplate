import { fn } from "storybook/test";

import { type ActionState, succeededActionState } from "@/model/action-state";

/** カタログでの [addToCartAction](../add-to-cart.ts)。 */
export const addToCartAction = fn(
  async (): Promise<ActionState<void>> => succeededActionState(undefined),
).mockName("addToCartAction");
