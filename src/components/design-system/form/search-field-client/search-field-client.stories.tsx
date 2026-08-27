import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useCallback, useState } from "react";

import { Marker, MarkerContent } from "../../display/marker/marker";
import { MARKER_VARIANT } from "../../display/marker/marker.definition";
import { SearchFieldClient } from "./search-field-client";
import { SEARCH_FIELD_COMMIT, type SearchFieldCommit } from "./search-field-client.definition";

type Row = { id: string; name: string };

const rows: readonly Row[] = [
  { id: "overview", name: "概要" },
  { id: "list", name: "一覧" },
  { id: "settings", name: "表示設定" },
  { id: "members", name: "メンバー" },
];

function SearchFieldFixture({
  commit,
  debounceMs,
  defaultValue,
  placeholder,
  submitDisabled,
}: {
  commit?: SearchFieldCommit;
  debounceMs?: number;
  defaultValue?: string;
  placeholder?: string;
  submitDisabled?: boolean;
}) {
  const [keyword, setKeyword] = useState(defaultValue ?? "");
  const handleSearch = useCallback((value: string) => setKeyword(value), []);
  const matched = rows.filter((row) => row.name.includes(keyword));
  const notified = keyword === "" ? "（空）" : keyword;

  return (
    <div className="flex flex-col gap-4">
      <SearchFieldClient
        commit={commit}
        debounceMs={debounceMs}
        defaultValue={defaultValue}
        label="項目を検索"
        onSearch={handleSearch}
        placeholder={placeholder}
        submitDisabled={submitDisabled}
      />
      <Marker>
        <MarkerContent>通知された検索語: {notified}</MarkerContent>
      </Marker>
      <section className="mt-6 flex flex-col gap-2">
        <Marker variant={MARKER_VARIANT.BORDER}>
          <MarkerContent>絞り込み結果</MarkerContent>
        </Marker>
        <ul className="flex flex-col gap-1 text-sm">
          {matched.map((row) => (
            <li key={row.id}>{row.name}</li>
          ))}
        </ul>
        <Marker>
          <MarkerContent>
            この見出しと一覧は story の確認用で、`SearchFieldClient`
            は描画しません。実際の検索結果は feature が検索語を `searchParams` へ載せ、Server
            Component が描画します。
          </MarkerContent>
        </Marker>
      </section>
    </div>
  );
}

const meta = {
  title: "Form/SearchFieldClient",
  component: SearchFieldClient,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: [
          "この component が描画するのは検索入力と消去ボタンだけです。各 story の「絞り込み結果」以下は",
          "callback の発火を目に見える形にするための確認用で、component の一部ではありません。",
          "実運用では検索語を `searchParams` へ載せ、結果は Server Component が描画します。",
          "候補を popup に出して選ばせる UI が要る場合は、`search-field` ではなく combobox を使います。",
        ].join(""),
      },
    },
  },
  args: { label: "項目を検索", onSearch: () => undefined },
  decorators: [
    (Story) => (
      <div className="w-[28rem] max-w-[calc(100vw-2rem)]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SearchFieldClient>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 入力が止まると検索語を通知する。通知後の扱いは呼び出し元が決めるため、この component は結果を描画しない。 */
export const Default: Story = { render: () => <SearchFieldFixture /> };

/** 入力例を補助文で示す場合。 */
export const WithPlaceholder: Story = {
  render: () => <SearchFieldFixture placeholder="キーワードを入力" />,
};

/** 現在の検索条件を反映し、消去ボタンが出た状態。 */
export const WithCurrentKeyword: Story = {
  render: () => <SearchFieldFixture defaultValue="設定" />,
};

/** 待ち時間を長くする場合。取得が重い検索で呼び出し回数を抑える。 */
export const WithLongerDebounce: Story = { render: () => <SearchFieldFixture debounceMs={1000} /> };

/**
 * 送信の操作でだけ確定する場合。ほかの条件と一緒にまとめて確定する画面で選ぶ。打鍵しても
 * 通知は飛ばない。
 */
export const CommitOnSubmit: Story = {
  render: () => <SearchFieldFixture commit={SEARCH_FIELD_COMMIT.SUBMIT} />,
};

/** 送信しても結果が変わらないと呼び出し元が判っている状態。押せなくする判断は画面が持つ。 */
export const SubmitDisabled: Story = {
  render: () => <SearchFieldFixture commit={SEARCH_FIELD_COMMIT.SUBMIT} submitDisabled />,
};
