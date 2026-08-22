import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ContentContainer } from "@/components/shell/content-container/content-container";
import { idleActionState } from "@/model/action-state";
import { SESSION_ROLE } from "@/model/session";

import type { DiscardDevSessionAction, IssueDevSessionAction } from "./form-state";
import { DevSessionView } from "./view";

/**
 * カタログでは session を発行しません。
 *
 * @remarks
 * 送信先を route から受け取る作りなので、ここでは何もしない送信先を渡せます。押しても状態は
 * 変わらず、実際の発行は起動したアプリの `/dev/session` で行います。
 */
const noopIssue: IssueDevSessionAction = async () => idleActionState();
const noopDiscard: DiscardDevSessionAction = async () => idleActionState();

const meta = {
  title: "Page/DevSession",
  component: DevSessionView,
  parameters: {
    layout: "fullscreen",
    docs: {
      story: { inline: false, iframeHeight: 900 },
      description: {
        component: [
          "IdP を通さずに session を発行する開発用画面です。**開発と CI でだけ開きます。**",
          "実物の API へ繋ぐときだけ Access Token を貼り、モックへ繋いでいる間は空欄で足ります。",
          "**カタログでは発行は実行されません。**",
        ].join(""),
      },
    },
  },
  decorators: [
    (Story) => (
      <ContentContainer className="py-8">
        <Story />
      </ContentContainer>
    ),
  ],
  args: {
    authorizationState: null,
    formError: null,
    connectsLiveApi: false,
    defaultIssuer: "https://idp.example.test",
    discardAction: noopDiscard,
    issueAction: noopIssue,
    returnUrl: "/",
  },
} satisfies Meta<typeof DevSessionView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** session を持っていない状態。 */
export const WithoutSession: Story = {
  args: { session: null },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** session を持っている状態。捨てる操作が出る。 */
export const WithSession: Story = {
  args: {
    session: {
      userId: "dev-user",
      role: SESSION_ROLE.user,
      expiresAt: new Date("2026-08-18T12:00:00+09:00"),
    },
  },
  globals: { viewport: { value: "desktop", isRotated: false } },
};

/** 狭い段。入力欄が縦に積まれる。 */
export const Mobile: Story = {
  args: WithSession.args,
  globals: { viewport: { value: "mobile2", isRotated: false } },
};
