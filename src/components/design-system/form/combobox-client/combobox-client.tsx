"use client";

import { useCallback, useState } from "react";

import { cn } from "@/components/cn";
import { CheckIcon, ChevronsUpDownIcon } from "@/components/icon";

import { Button } from "../../action/button/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../overlay/command/command";
import { Popover, PopoverContent, PopoverTrigger } from "../../overlay/popover/popover";

/** {@link ComboboxClient} が並べる候補 1 件。 */
export type ComboboxClientOption = {
  /** form へ送信する値。 */
  value: string;
  /** 画面へ表示し、絞り込みの対象にもなる文言。 */
  label: string;
  /** 選べない候補か。 */
  disabled?: boolean;
};

/** {@link ComboboxClient} の props。 */
export type ComboboxClientProps = {
  /** form へ送信するフィールド名。 */
  name: string;
  /** 並べる候補。 */
  options: ComboboxClientOption[];
  /** controlled value。 */
  value?: string;
  /** uncontrolled の初期値。 */
  defaultValue?: string;
  /** 選択が変わったときの通知。選ばれた候補そのものも渡す。 */
  onValueChange?: (value: string, option: ComboboxClientOption) => void;
  /**
   * 絞り込み入力が変わったときの通知。
   *
   * @remarks
   * 渡すと**候補を手元で絞らなくなります**。入力語で候補を取り直すのは呼び出し元で、取り直した
   * 結果を `options` として差し替えます。手元でも絞ると、取り直した候補を label の一致でもう一度
   * 削り、検索の側が一致と判断した候補が消えます。
   */
  onSearchChange?: (search: string) => void;
  /**
   * 未選択時に trigger へ表示する文言。
   *
   * @defaultValue `"選択してください"`
   */
  placeholder?: string;
  /**
   * 絞り込み入力の placeholder。
   *
   * @defaultValue `"検索"`
   */
  searchPlaceholder?: string;
  /**
   * 一致する候補が無いときの文言。
   *
   * @defaultValue `"該当する候補がありません"`
   */
  emptyMessage?: string;
  /** trigger のアクセシブルな名前。 */
  "aria-label"?: string;
  /** trigger の名前を外の要素から参照する場合の id。 */
  "aria-labelledby"?: string;
  /** trigger の説明（誤りの文言など）を外の要素から参照する場合の id。 */
  "aria-describedby"?: string;
  /**
   * trigger の値が誤りを持つか。
   *
   * @defaultValue `false`
   */
  "aria-invalid"?: boolean;
  /**
   * 入力を無効にするか。
   *
   * @defaultValue `false`
   */
  disabled?: boolean;
  /** trigger へ追加する class。 */
  className?: string;
};

/**
 * 入力語で候補を絞り込みながら 1 件を選ぶ client island。
 *
 * @remarks
 * `Popover` と `Command` を合成した実装パターンであり、shadcn CLI の単独部品ではない。選択値は
 * hidden input として持つため、native form へそのまま載る。
 *
 * 候補が少なく静的なら `SelectNative` を優先する。この component を選ぶのは、候補が多く**入力で
 * 絞り込む**必要がある場合に限る。絞り込みの必要がないのに使うと、選ぶまでに入力という手数が
 * 増えるだけになる。
 *
 * 候補の取得・並び順・件数の制限は持たない。`options` として渡された配列をそのまま扱い、
 * 絞り込みは `Command` が label に対して行う（サーバ側で検索するときは `onSearchChange` を参照）。
 * 選択中の候補が `options` から外れると trigger は placeholder に戻るため、`options` を差し替える
 * 呼び出し元は選択中の候補を残す。
 *
 * hydration が必要で、Server Component からは直接 render できない。
 *
 * trigger は選択状態によって文言が変わるため、`aria-label` か `aria-labelledby` で**アクセシブルな
 * 名前を必ず与える**。絞り込み入力の名前は `Command` の `label` として渡している。
 *
 * **必須指定は持たない。** 値を運ぶ hidden input は constraint validation の対象外であり、
 * `required` を付けても browser は検証しない。必須であることの表示は `Field`、実際の強制は
 * Server Action や server 側の検証で行う。
 *
 * @param props - 表示用 props。native 属性は透過しない。
 * @see Storybook `Form/ComboboxClient`
 */
export function ComboboxClient({
  name,
  options,
  value,
  defaultValue,
  onValueChange,
  onSearchChange,
  placeholder = "選択してください",
  searchPlaceholder = "検索",
  emptyMessage = "該当する候補がありません",
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid = false,
  disabled = false,
  className,
}: ComboboxClientProps) {
  const [open, setOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(defaultValue ?? "");
  const [search, setSearch] = useState("");
  const currentValue = value ?? selectedValue;
  const selectedOption = options.find((option) => option.value === currentValue);

  const handleSelect = useCallback(
    (option: ComboboxClientOption) => {
      if (value === undefined) setSelectedValue(option.value);
      onValueChange?.(option.value, option);
      setOpen(false);
    },
    [onValueChange, value],
  );

  const changeSearch = useCallback(
    (nextSearch: string) => {
      setSearch(nextSearch);
      onSearchChange?.(nextSearch);
    },
    [onSearchChange],
  );

  return (
    <div className="flex w-full flex-col gap-2">
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <Button
            // 絞り込み入力が `Command` の中で `role="combobox"` として公開されるため、ここには付けない。
            // 二重になると `aria-controls` の関連付けも競合する。開閉は Radix が `aria-expanded` に反映する。
            aria-describedby={ariaDescribedBy}
            aria-invalid={ariaInvalid}
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            className={cn("w-full justify-between font-normal", className)}
            disabled={disabled}
            type="button"
            variant="outline"
          >
            <span className={cn(selectedOption === undefined && "text-muted-foreground")}>
              {selectedOption?.label ?? placeholder}
            </span>
            <ChevronsUpDownIcon aria-hidden="true" className="size-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          aria-label={ariaLabel}
          aria-labelledby={ariaLabelledBy}
          className="w-(--radix-popover-trigger-width) p-0"
        >
          <Command
            label={ariaLabel ?? searchPlaceholder}
            shouldFilter={onSearchChange === undefined}
          >
            <CommandInput
              onValueChange={changeSearch}
              placeholder={searchPlaceholder}
              value={search}
            />
            <CommandList>
              {options.map((option) => (
                <ComboboxClientItem
                  key={option.value}
                  onChoose={handleSelect}
                  option={option}
                  selected={option.value === currentValue}
                />
              ))}
            </CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
          </Command>
        </PopoverContent>
      </Popover>
      <input name={name} type="hidden" value={currentValue} />
    </div>
  );
}

/** {@link ComboboxClientItem} の props。 */
type ComboboxClientItemProps = {
  /** この候補が選ばれたことを伝える。 */
  readonly onChoose: (option: ComboboxClientOption) => void;
  /** 並べる候補。 */
  readonly option: ComboboxClientOption;
  /** 選ばれているか。 */
  readonly selected: boolean;
};

/**
 * 候補 1 つ分の項目。
 *
 * @remarks
 * `CommandItem` の value は送信値で表示文言と異なるため、絞り込みは label を keywords として渡します。
 *
 * @param props - 候補と、選ばれているか・選ばれたときの通知。
 */
function ComboboxClientItem({ onChoose, option, selected }: ComboboxClientItemProps) {
  const choose = useCallback(() => onChoose(option), [onChoose, option]);

  return (
    <CommandItem
      disabled={option.disabled}
      keywords={[option.label]}
      onSelect={choose}
      value={option.value}
    >
      <span className="flex-1">{option.label}</span>
      {selected ? <CheckIcon aria-hidden="true" className="size-4" /> : null}
    </CommandItem>
  );
}
