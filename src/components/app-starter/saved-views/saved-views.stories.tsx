import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useCallback, useRef, useState } from "react";

import { type SavedView, SavedViews } from "./saved-views";

const noop = () => undefined;

const meta = {
  title: "Container/SavedViews",
  component: SavedViews,
  parameters: { layout: "centered" },
  args: {
    views: [],
    onSelect: noop,
    onCreate: noop,
    onRename: noop,
    onDelete: noop,
  },
} satisfies Meta<typeof SavedViews>;

export default meta;
type Story = StoryObj<typeof meta>;

const SAMPLE_VIEWS: readonly SavedView[] = [
  { id: "recent", name: "最近更新した順" },
  { id: "mine", name: "自分の担当" },
  { id: "unresolved", name: "未対応だけ" },
];

/** 呼び出し元が条件そのものと保存先を持つことを示す fixture。この component は名前と id だけを扱う。 */
function SavedViewsFixture({
  initialViews,
  initialCurrentViewId,
}: {
  initialViews: readonly SavedView[];
  initialCurrentViewId: string | null;
}) {
  const [views, setViews] = useState(initialViews);
  const [currentViewId, setCurrentViewId] = useState(initialCurrentViewId);
  const createdCount = useRef(0);

  const create = useCallback((name: string) => {
    createdCount.current += 1;

    const id = `created-${createdCount.current}`;

    setViews((current) => [...current, { id, name }]);
    setCurrentViewId(id);
  }, []);

  const rename = useCallback((viewId: string, name: string) => {
    setViews((current) => current.map((view) => (view.id === viewId ? { ...view, name } : view)));
  }, []);

  const remove = useCallback((viewId: string) => {
    setViews((current) => current.filter((view) => view.id !== viewId));
    setCurrentViewId(null);
  }, []);

  return (
    <SavedViews
      currentViewId={currentViewId}
      onCreate={create}
      onDelete={remove}
      onRename={rename}
      onSelect={setCurrentViewId}
      views={views}
    />
  );
}

/** 条件を選んでいる状態。選択・保存・名前の変更・削除がひと通り試せる。 */
export const Default: Story = {
  render: () => <SavedViewsFixture initialCurrentViewId="mine" initialViews={SAMPLE_VIEWS} />,
};

/** どの条件も当てていない状態。trigger は `label` を出し、名前の変更と削除は選べない。 */
export const NoCurrentView: Story = {
  render: () => <SavedViewsFixture initialCurrentViewId={null} initialViews={SAMPLE_VIEWS} />,
};

/** 保存した条件がまだ無い状態。選ぶものは無く、保存だけができる。 */
export const NoSavedViews: Story = {
  render: () => <SavedViewsFixture initialCurrentViewId={null} initialViews={[]} />,
};

/** 操作の名前を呼び出し元が差し替えた状態。 */
export const CustomLabel: Story = {
  render: () => <CustomLabelFixture />,
};

function CustomLabelFixture() {
  const [currentViewId, setCurrentViewId] = useState<string | null>(null);

  return (
    <SavedViews
      currentViewId={currentViewId}
      label="表示する条件"
      onCreate={noop}
      onDelete={noop}
      onRename={noop}
      onSelect={setCurrentViewId}
      views={SAMPLE_VIEWS}
    />
  );
}
