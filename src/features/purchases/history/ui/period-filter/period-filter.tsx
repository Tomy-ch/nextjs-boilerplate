"use client";

import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type SyntheticEvent,
  useCallback,
  useId,
  useState,
  useTransition,
} from "react";

import { Button } from "@/components/design-system/action/button/button";
import { Input } from "@/components/design-system/form/input/input";
import { Label } from "@/components/design-system/form/label/label";
import { SelectNative } from "@/components/design-system/form/select-native/select-native";
import {
  ToggleGroupNative,
  ToggleGroupNativeItem,
} from "@/components/design-system/form/toggle-group-native/toggle-group-native";

import { type PeriodSelection, RECENT_DAYS_OPTIONS, toPurchaseHistoryHref } from "../../period";
import { type PeriodDraft, toAppliedPeriod, toPeriodDraft } from "../../period-draft";

/** 区分の選択肢。並びは対象の広い順で、既定を先頭に置く。 */
const KIND_OPTIONS: readonly { readonly kind: PeriodDraft["kind"]; readonly label: string }[] = [
  { kind: "all", label: "全期間" },
  { kind: "recent", label: "直近" },
  { kind: "month", label: "月で指定" },
  { kind: "range", label: "期間で指定" },
];

/** 区分ごとに、まだ足りていないことを伝える文言。 */
const INCOMPLETE_HINT: Readonly<Record<PeriodDraft["kind"], string>> = {
  all: "",
  month: "対象の月を選ぶと絞り込めます。",
  range: "開始日と、それ以降の終了日を選ぶと絞り込めます。",
  recent: "遡る日数を選ぶと絞り込めます。",
};

/** `PurchasePeriodFilter` の props。 */
export type PurchasePeriodFilterProps = {
  /** いま一覧に効いている期間。 */
  period: PeriodSelection;
};

/**
 * 購入履歴を期間で絞る操作。
 *
 * @remarks
 * **絞り込みは必ずクエリでサーバへ渡します。** 取得済みのページに日付の条件を掛けると、条件に
 * 合う古い購入が落ちた一覧になります。読み込んであるのは新しいほうから数ページぶんでしか
 * ないためで、絞り込んだ結果が「読み込んだ範囲の中の該当分」に化けます。
 *
 * **選んだ時点では反映せず、確定の操作を置きます。** 商品一覧の脇の絞り込みが選んだ時点で
 * 反映するのは、1 回の操作で条件が 1 つ決まるからです。ここは違い、期間の指定は開始日と終了日の
 * 2 つが揃って初めて条件になります。途中で反映すると、片方だけを入れた瞬間に契約が受け取れない
 * 要求になります。
 *
 * 足りていない間は確定を押せなくし、何が足りないかをその場に出します。押せてしまうと、押した
 * 結果が一覧の消えた画面（契約は 400 を返す）になり、原因が利用者から見えません。
 *
 * 区分を跨いでも入力は消しません。月で指定してから期間へ切り替え、また戻る操作は普通に起きます。
 *
 * 反映を `useTransition` で包むのは、取得が終わるまで前の一覧を残すためです。包まないと押した
 * 瞬間に一覧が待機表示へ落ち、続けて絞り込む操作の足場が消えます。
 *
 * 一覧に効いている条件が外から変わったら、下書きを捨ててそちらへ揃えます。条件の chip を外す
 * 操作や戻る操作は入力欄を通らないため、揃えないと画面の一覧と入力欄が違うものを指します。
 */
export function PurchasePeriodFilter({ period }: PurchasePeriodFilterProps) {
  const router = useRouter();
  const scope = useId();
  const [pending, startTransition] = useTransition();
  const appliedHref = toPurchaseHistoryHref(period);
  const [knownHref, setKnownHref] = useState(appliedHref);
  const [draft, setDraft] = useState<PeriodDraft>(() => toPeriodDraft(period));

  if (knownHref !== appliedHref) {
    setKnownHref(appliedHref);
    setDraft(toPeriodDraft(period));
  }

  const applied = toAppliedPeriod(draft);

  const changeKind = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const selected = KIND_OPTIONS.find((option) => option.kind === event.target.value);

    if (selected === undefined) {
      return;
    }

    setDraft((current) => ({ ...current, kind: selected.kind }));
  }, []);

  const changeMonth = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    setDraft((current) => ({ ...current, month: value }));
  }, []);

  const changeFrom = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    setDraft((current) => ({ ...current, from: value }));
  }, []);

  const changeTo = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;

    setDraft((current) => ({ ...current, to: value }));
  }, []);

  const changeDays = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const days = Number(event.target.value);

    setDraft((current) => ({ ...current, days }));
  }, []);

  const submit = useCallback(
    (event: SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (applied === null) {
        return;
      }

      startTransition(() => {
        router.push(toPurchaseHistoryHref(applied));
      });
    },
    [applied, router],
  );

  return (
    <form aria-busy={pending} className="flex flex-wrap items-end gap-3" onSubmit={submit}>
      <ToggleGroupNative aria-label="対象期間の区分">
        {KIND_OPTIONS.map((option) => (
          <ToggleGroupNativeItem
            checked={draft.kind === option.kind}
            key={option.kind}
            name={`${scope}-kind`}
            onChange={changeKind}
            size="sm"
            value={option.kind}
          >
            {option.label}
          </ToggleGroupNativeItem>
        ))}
      </ToggleGroupNative>

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

      <Button disabled={applied === null} type="submit">
        絞り込む
      </Button>

      {applied === null ? (
        <p className="basis-full text-muted-foreground text-sm">{INCOMPLETE_HINT[draft.kind]}</p>
      ) : null}
    </form>
  );
}
