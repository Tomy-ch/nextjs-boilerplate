const START_MESSAGE_ALIGN = "start";
const END_MESSAGE_ALIGN = "end";

/**
 * メッセージを寄せる向きを表す定数。
 *
 * @see Storybook `Display/Message`
 */
export const MESSAGE_ALIGN: Readonly<{
  START: "start";
  END: "end";
}> = {
  START: START_MESSAGE_ALIGN,
  END: END_MESSAGE_ALIGN,
};

/** {@link MESSAGE_ALIGN} のいずれか。 */
export type MessageAlign = (typeof MESSAGE_ALIGN)[keyof typeof MESSAGE_ALIGN];
