"use client";

import { type ChangeEvent, useCallback, useId } from "react";

import { Input } from "@/components/design-system/form/input/input";
import { Label } from "@/components/design-system/form/label/label";
import { SelectNative } from "@/components/design-system/form/select-native/select-native";
import {
  ToggleGroupNative,
  ToggleGroupNativeItem,
} from "@/components/design-system/form/toggle-group-native/toggle-group-native";

import { RECENT_DAYS_OPTIONS } from "../../period";
import type { PeriodDraft } from "../../period-draft";

/** 区分の選択肢。並びは対象の広い順で、既定を先頭に置く。 */
const KIND_OPTIONS: readonly { readonly kind: PeriodDraft["kind"]; readonly label: string }[] = [
  { kind: "all", label: "全期間" },
  { kind: "recent", label: "直近" },
  { kind: "month", label: "月で指定" },
  { kind: "range", label: "期間で指定" },
];

/** `PurchasePeriodFields` の props。 */
export type PurchasePeriodFieldsProps = {
  /** いま組み立てている期間。 */
  draft: PeriodDraft;
  /** 期間が変わったときに呼ぶ。 */
  onChange: (next: PeriodDraft) => void;
};

/**
 * 期間の入力欄。
 *
 * @remarks
 * 確定を持ちません。同じ入力欄を、帯の中と overlay の両方から使うためです。どこで確定するかは
 * 呼び出し元が決めます。
 *
 * **区分が使う入力欄だけを出します。** 使わない入力欄を無効にして並べても、押せない欄が場所を
 * 取るだけで、いま何を指定すればよいのかが読み取りにくくなります。
 *
 * **区分にも見出しを付け、操作の高さを入力欄に揃えます。** どの区分でも「見出し + 操作」の同じ
 * 構造になるため、区分を選び替えてもこの行の高さが変わりません。高さを数値で予約するのではなく
 * 構造で揃えているので、入力欄の寸法が変わっても追従します。
 *
 * 区分を跨いでも入力は消しません。月で指定してから期間へ切り替え、また戻る操作は普通に起きます。
 *
 * 終了日に下限を与えるのは、開始日より前の日付を契約が 400 で返すためです。選べてしまうと、
 * 押した後に一覧の消えた画面になります。
 */
export function PurchasePeriodFields({ draft, onChange }: PurchasePeriodFieldsProps) {
  const scope = useId();

  const changeKind = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const selected = KIND_OPTIONS.find((option) => option.kind === event.target.value);

      if (selected === undefined) {
        return;
      }

      onChange({ ...draft, kind: selected.kind });
    },
    [draft, onChange],
  );

  const changeMonth = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange({ ...draft, month: event.target.value });
    },
    [draft, onChange],
  );

  const changeFrom = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange({ ...draft, from: event.target.value });
    },
    [draft, onChange],
  );

  const changeTo = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange({ ...draft, to: event.target.value });
    },
    [draft, onChange],
  );

  const changeDays = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      onChange({ ...draft, days: Number(event.target.value) });
    },
    [draft, onChange],
  );

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <span className="font-medium text-sm" id={`${scope}-kind-label`}>
          対象期間
        </span>
        <ToggleGroupNative aria-labelledby={`${scope}-kind-label`}>
          {KIND_OPTIONS.map((option) => (
            <ToggleGroupNativeItem
              checked={draft.kind === option.kind}
              key={option.kind}
              name={`${scope}-kind`}
              onChange={changeKind}
              size="lg"
              value={option.kind}
            >
              {option.label}
            </ToggleGroupNativeItem>
          ))}
        </ToggleGroupNative>
      </div>

      {draft.kind === "month" ? (
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${scope}-month`}>対象の月</Label>
          <Input
            className="w-40"
            id={`${scope}-month`}
            onChange={changeMonth}
            type="month"
            value={draft.month}
          />
        </div>
      ) : null}

      {draft.kind === "range" ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${scope}-from`}>開始日</Label>
            <Input
              className="w-40"
              id={`${scope}-from`}
              onChange={changeFrom}
              type="date"
              value={draft.from}
            />
          </div>
          <span aria-hidden="true" className="pb-2 text-muted-foreground text-sm">
            〜
          </span>
          <div className="flex flex-col gap-1">
            <Label htmlFor={`${scope}-to`}>終了日</Label>
            <Input
              className="w-40"
              id={`${scope}-to`}
              min={draft.from === "" ? undefined : draft.from}
              onChange={changeTo}
              type="date"
              value={draft.to}
            />
          </div>
        </div>
      ) : null}

      {draft.kind === "recent" ? (
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${scope}-days`}>遡る日数</Label>
          <SelectNative
            className="w-32"
            id={`${scope}-days`}
            onChange={changeDays}
            value={draft.days}
          >
            {RECENT_DAYS_OPTIONS.map((days) => (
              <option key={days} value={days}>
                {`${days} 日`}
              </option>
            ))}
          </SelectNative>
        </div>
      ) : null}
    </div>
  );
}
