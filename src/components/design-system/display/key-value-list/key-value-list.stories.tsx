import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CopyButton } from "../../action/copy-button/copy-button";
import { Badge } from "../badge/badge";
import { Separator } from "../separator/separator";
import {
  KeyValueEmpty,
  KeyValueItem,
  KeyValueLabel,
  KeyValueList,
  KeyValueValue,
} from "./key-value-list";

function BasicList() {
  return (
    <KeyValueList>
      <KeyValueItem>
        <KeyValueLabel>名称</KeyValueLabel>
        <KeyValueValue>標準プラン</KeyValueValue>
      </KeyValueItem>
      <KeyValueItem>
        <KeyValueLabel>状態</KeyValueLabel>
        <KeyValueValue>
          <Badge>公開中</Badge>
        </KeyValueValue>
      </KeyValueItem>
      <KeyValueItem>
        <KeyValueLabel>最終更新</KeyValueLabel>
        <KeyValueValue>2026-08-03 10:15</KeyValueValue>
      </KeyValueItem>
    </KeyValueList>
  );
}

function WithEmptyValue() {
  return (
    <KeyValueList>
      <KeyValueItem>
        <KeyValueLabel>名称</KeyValueLabel>
        <KeyValueValue>標準プラン</KeyValueValue>
      </KeyValueItem>
      <KeyValueItem>
        <KeyValueLabel>補足</KeyValueLabel>
        <KeyValueValue>
          <KeyValueEmpty />
        </KeyValueValue>
      </KeyValueItem>
    </KeyValueList>
  );
}

function WithLongValue() {
  return (
    <KeyValueList>
      <KeyValueItem>
        <KeyValueLabel>説明</KeyValueLabel>
        <KeyValueValue>
          折り返しの確認用に長い値を置いています。値が枠を超える場合は語の途中でも折り返し、label
          の幅は保たれたままになります。
        </KeyValueValue>
      </KeyValueItem>
      <KeyValueItem>
        <KeyValueLabel>区切りを含む値</KeyValueLabel>
        <KeyValueValue className="whitespace-pre-line">{"一行目\n二行目"}</KeyValueValue>
      </KeyValueItem>
    </KeyValueList>
  );
}

function WithCopy() {
  return (
    <KeyValueList>
      <KeyValueItem>
        <KeyValueLabel>識別子</KeyValueLabel>
        <KeyValueValue className="flex items-center gap-1">
          <span className="font-mono">01JQZ8Y6K3M4N5P6Q7R8S9T0</span>
          <CopyButton label="識別子を写す" value="01JQZ8Y6K3M4N5P6Q7R8S9T0" />
        </KeyValueValue>
      </KeyValueItem>
    </KeyValueList>
  );
}

function WithSections() {
  return (
    <div className="flex flex-col gap-4">
      <BasicList />
      <Separator />
      <KeyValueList>
        <KeyValueItem>
          <KeyValueLabel>作成者</KeyValueLabel>
          <KeyValueValue>運用担当</KeyValueValue>
        </KeyValueItem>
      </KeyValueList>
    </div>
  );
}

const meta = {
  title: "Display/KeyValueList",
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "項目名と値の対を並べる `dl` です。値の整形は持たないため、日時や金額は `model/` の formatter を",
          "通した文字列を渡します。二つの軸で比較する表形式のデータには `Table` を使います。",
        ].join(""),
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-[32rem] max-w-[calc(100vw-2rem)]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** 基本の構成。狭い幅では label を上、value を下に積む。 */
export const Default: Story = { render: () => <BasicList /> };

/** 値が無い項目。行は残し、記号と読み上げ用の語で示す。 */
export const EmptyValue: Story = { render: () => <WithEmptyValue /> };

/** 長い値と改行を含む値の扱い。 */
export const LongValue: Story = { render: () => <WithLongValue /> };

/** 値を clipboard へ写す操作を添える場合。操作だけが client island になる。 */
export const WithCopyButton: Story = { render: () => <WithCopy /> };

/** 区切りを挟んで複数の一覧を並べる場合。 */
export const Sections: Story = { render: () => <WithSections /> };
