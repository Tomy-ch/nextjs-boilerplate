import { fn } from "storybook/test";

import { succeededActionState } from "@/model/action-state";

import type { InquiryMessageActionState } from "../actions";

/**
 * カタログでの [sendInquiryMessageAction](../actions.ts)。
 *
 * @remarks
 * 本物は成立すると画面を取り直し、送った 1 通は取り直した正本に現れます。カタログには取り直す先が
 * 無いので、成功を返して送った後の画面に留まります。
 */
export const sendInquiryMessageAction = fn(
  async (): Promise<InquiryMessageActionState> => succeededActionState(undefined),
).mockName("sendInquiryMessageAction");
