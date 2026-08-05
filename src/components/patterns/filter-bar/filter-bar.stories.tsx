import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Link from "next/link";
import { useCallback, useId, useState } from "react";

import { Button } from "@/components/design-system/action/button/button";
import { Field, FieldLabel } from "@/components/design-system/form/field/field";
import { SearchFieldNative } from "@/components/design-system/form/search-field-native/search-field-native";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/design-system/overlay/sheet/sheet";
import {
  FilterBar,
  FilterBarActiveFilters,
  FilterBarControls,
  FilterBarSummary,
  FilterBarTrigger,
  FilterChip,
} from "./filter-bar";

const meta = {
  title: "Navigation/FilterBar",
  component: FilterBar,
  parameters: { layout: "padded" },
} satisfies Meta<typeof FilterBar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "URL に条件を載せる一覧。解除は link なので、条件を外した状態も履歴と共有可能な URL に残る。",
      },
    },
  },
  render: () => (
    <FilterBar>
      <FilterBarControls>
        <SearchFieldNative action="/plans" className="max-w-xs" label="プランを検索" />
        <FilterBarTrigger count={2} />
      </FilterBarControls>
      <FilterBarActiveFilters>
        <FilterChip label="状態" removeHref="/plans?price=1000" value="公開中" />
        <FilterChip label="価格帯" removeHref="/plans?status=published" value="1,000 円以上" />
      </FilterBarActiveFilters>
      <FilterBarSummary count={12} total={340}>
        <Button asChild size="sm" variant="ghost">
          <Link href="/plans">条件をすべて解除</Link>
        </Button>
      </FilterBarSummary>
    </FilterBar>
  ),
};

export const NoActiveFilter: Story = {
  parameters: {
    docs: {
      description: {
        story: "条件が無い状態。一覧の要素は残すため、条件を外し切ったことが支援技術にも伝わる。",
      },
    },
  },
  render: () => (
    <FilterBar>
      <FilterBarControls>
        <SearchFieldNative action="/plans" className="max-w-xs" label="プランを検索" />
        <FilterBarTrigger />
      </FilterBarControls>
      <FilterBarActiveFilters />
      <FilterBarSummary count={340} />
    </FilterBar>
  ),
};

export const InSheet: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "条件の入力欄を overlay へ入れる場合。中身は画面ごとに異なるため、この部品は trigger だけを持つ。",
      },
    },
  },
  render: () => (
    <FilterBar>
      <FilterBarControls>
        <SearchFieldNative action="/plans" className="max-w-xs" label="プランを検索" />
        <Sheet>
          <SheetTrigger asChild>
            <FilterBarTrigger count={1} />
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>絞り込み条件</SheetTitle>
              <SheetDescription>条件を選ぶと一覧が絞り込まれます。</SheetDescription>
            </SheetHeader>
            <StatusField />
            <SheetFooter>
              <Button type="button">適用する</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </FilterBarControls>
      <FilterBarActiveFilters>
        <FilterChip label="状態" removeHref="/plans" value="公開中" />
      </FilterBarActiveFilters>
      <FilterBarSummary count={28} total={340} />
    </FilterBar>
  ),
};

function StatusField() {
  const statusId = useId();

  return (
    <Field className="px-4">
      <FieldLabel htmlFor={statusId}>状態</FieldLabel>
      <select id={statusId}>
        <option>すべて</option>
        <option>公開中</option>
        <option>下書き</option>
      </select>
    </Field>
  );
}

const CLIENT_FILTERS = [
  { id: "status", label: "状態", value: "公開中" },
  { id: "price", label: "価格帯", value: "1,000 円以上" },
  { id: "tag", label: "タグ", value: "季節限定" },
];

function ClientFilterChip({
  filter,
  onRemove,
}: {
  filter: (typeof CLIENT_FILTERS)[number];
  onRemove: (id: string) => void;
}) {
  const remove = useCallback(() => onRemove(filter.id), [filter.id, onRemove]);

  return <FilterChip label={filter.label} onRemove={remove} value={filter.value} />;
}

function ClientFilterBar() {
  const [removed, setRemoved] = useState<readonly string[]>([]);
  const active = CLIENT_FILTERS.filter((filter) => !removed.includes(filter.id));
  const removeFilter = useCallback((id: string) => setRemoved((current) => [...current, id]), []);
  const clearFilters = useCallback(() => setRemoved([]), []);

  return (
    <FilterBar>
      <FilterBarControls>
        <FilterBarTrigger count={active.length} />
      </FilterBarControls>
      <FilterBarActiveFilters>
        {active.map((filter) => (
          <ClientFilterChip filter={filter} key={filter.id} onRemove={removeFilter} />
        ))}
      </FilterBarActiveFilters>
      <FilterBarSummary count={active.length * 4} total={340}>
        <Button onClick={clearFilters} size="sm" type="button" variant="ghost">
          条件をすべて解除
        </Button>
      </FilterBarSummary>
    </FilterBar>
  );
}

export const ClientSide: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "client 側で条件を持つ一覧。解除は callback になり、件数の変化は live region が伝える。",
      },
    },
  },
  render: () => <ClientFilterBar />,
};
