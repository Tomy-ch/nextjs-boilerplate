import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  ListItemContent,
  ListItemDescription,
  ListItemTitle,
} from "@/components/design-system/display/list/list";

import { Stepper, StepperItem } from "./stepper";
import { STEPPER_STATE } from "./stepper.definition";

const meta = {
  title: "Display/Stepper",
  component: Stepper,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 途中まで進んだ状態。通過済みは check、現在地は枠を濃くし、未到達は控える。 */
export const Default: Story = {
  args: { label: "申請の進捗" },
  render: (args) => (
    <Stepper {...args} className="w-80">
      <StepperItem marker={1} state={STEPPER_STATE.COMPLETE}>
        <ListItemContent>
          <ListItemTitle>申請</ListItemTitle>
          <ListItemDescription>2026-08-01 に受け付けました</ListItemDescription>
        </ListItemContent>
      </StepperItem>
      <StepperItem marker={2} state={STEPPER_STATE.CURRENT}>
        <ListItemContent>
          <ListItemTitle>審査</ListItemTitle>
          <ListItemDescription>担当者が内容を確認しています</ListItemDescription>
        </ListItemContent>
      </StepperItem>
      <StepperItem marker={3}>
        <ListItemContent>
          <ListItemTitle>完了</ListItemTitle>
        </ListItemContent>
      </StepperItem>
    </Stepper>
  ),
};

/** まだ何も始まっていない状態。現在地は先頭にある。 */
export const NotStarted: Story = {
  args: { label: "登録の進捗" },
  render: (args) => (
    <Stepper {...args} className="w-80">
      <StepperItem marker={1} state={STEPPER_STATE.CURRENT}>
        <ListItemContent>
          <ListItemTitle>入力</ListItemTitle>
        </ListItemContent>
      </StepperItem>
      <StepperItem marker={2}>
        <ListItemContent>
          <ListItemTitle>確認</ListItemTitle>
        </ListItemContent>
      </StepperItem>
      <StepperItem marker={3}>
        <ListItemContent>
          <ListItemTitle>完了</ListItemTitle>
        </ListItemContent>
      </StepperItem>
    </Stepper>
  ),
};

/** すべて通過した状態。現在地は無い。 */
export const AllComplete: Story = {
  args: { label: "登録の進捗" },
  render: (args) => (
    <Stepper {...args} className="w-80">
      <StepperItem marker={1} state={STEPPER_STATE.COMPLETE}>
        <ListItemContent>
          <ListItemTitle>入力</ListItemTitle>
        </ListItemContent>
      </StepperItem>
      <StepperItem marker={2} state={STEPPER_STATE.COMPLETE}>
        <ListItemContent>
          <ListItemTitle>確認</ListItemTitle>
        </ListItemContent>
      </StepperItem>
      <StepperItem marker={3} state={STEPPER_STATE.COMPLETE}>
        <ListItemContent>
          <ListItemTitle>完了</ListItemTitle>
        </ListItemContent>
      </StepperItem>
    </Stepper>
  ),
};

/** 説明を持たない場合。見出しだけが縦に並ぶ。 */
export const TitlesOnly: Story = {
  args: { label: "手続きの進捗" },
  render: (args) => (
    <Stepper {...args} className="w-64">
      <StepperItem marker={1} state={STEPPER_STATE.COMPLETE}>
        <ListItemContent>
          <ListItemTitle>本人確認</ListItemTitle>
        </ListItemContent>
      </StepperItem>
      <StepperItem marker={2} state={STEPPER_STATE.CURRENT}>
        <ListItemContent>
          <ListItemTitle>書類の提出</ListItemTitle>
        </ListItemContent>
      </StepperItem>
      <StepperItem marker={3}>
        <ListItemContent>
          <ListItemTitle>審査</ListItemTitle>
        </ListItemContent>
      </StepperItem>
    </Stepper>
  ),
};

/** 番号を持たない場合。印は状態だけを示す。 */
export const WithoutMarkers: Story = {
  args: { label: "承認の進捗" },
  render: (args) => (
    <Stepper {...args} className="w-72">
      <StepperItem state={STEPPER_STATE.COMPLETE}>
        <ListItemContent>
          <ListItemTitle>起案</ListItemTitle>
        </ListItemContent>
      </StepperItem>
      <StepperItem state={STEPPER_STATE.CURRENT}>
        <ListItemContent>
          <ListItemTitle>一次承認</ListItemTitle>
        </ListItemContent>
      </StepperItem>
      <StepperItem>
        <ListItemContent>
          <ListItemTitle>最終承認</ListItemTitle>
        </ListItemContent>
      </StepperItem>
    </Stepper>
  ),
};

/**
 * 状態の語を段階の呼び名へ差し替えた場合。読み上げ専用のため見た目は変わらず、
 * スクリーンリーダーが「承認済み」「差し戻し」と読む。既定は「完了 / 現在の段階 / 未着手」。
 */
export const CustomStateLabels: Story = {
  args: { label: "承認の進捗" },
  render: (args) => (
    <Stepper {...args} className="w-72">
      <StepperItem marker={1} state={STEPPER_STATE.COMPLETE} stateLabel="承認済み">
        <ListItemContent>
          <ListItemTitle>起案</ListItemTitle>
        </ListItemContent>
      </StepperItem>
      <StepperItem marker={2} state={STEPPER_STATE.CURRENT} stateLabel="差し戻し">
        <ListItemContent>
          <ListItemTitle>一次承認</ListItemTitle>
          <ListItemDescription>内容を修正して再提出してください</ListItemDescription>
        </ListItemContent>
      </StepperItem>
      <StepperItem marker={3} stateLabel="未実施">
        <ListItemContent>
          <ListItemTitle>最終承認</ListItemTitle>
        </ListItemContent>
      </StepperItem>
    </Stepper>
  ),
};
