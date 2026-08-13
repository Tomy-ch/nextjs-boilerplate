"use client";

import { useRouter } from "next/navigation";
import { useCallback, useId, useTransition } from "react";

import { Button } from "@/components/design-system/action/button/button";
import { Input } from "@/components/design-system/form/input/input";
import { Label } from "@/components/design-system/form/label/label";

import { FILTER_KEY, toProductListHref } from "../../query";

/** `ProductSearch` の props。 */
export type ProductSearchProps = {
  /** いま効いている条件。キーワード以外もそのまま引き継ぐ。 */
  selection: Readonly<Record<string, string>>;
};

/**
 * キーワード検索。URL を書き換えることで一覧を取り直す。
 *
 * @remarks
 * 検索語を client state に持たず URL に置きます。そうすると結果を共有でき、戻る操作で前の
 * 条件に戻り、再読み込みでも同じ画面が出ます。取得そのものは Server Component 側で起き、
 * この island は URL を変えるだけです。
 *
 * 読み進めた位置は URL の組み立て側が落とします。条件が変わった後の「続き」は、前の条件の
 * 続きを指しているためです。
 */
export function ProductSearch({ selection }: ProductSearchProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const fieldId = useId();

  const submit = useCallback(
    (formData: FormData) => {
      const keyword = String(formData.get(FILTER_KEY.KEYWORD) ?? "").trim();
      const next = toProductListHref({ ...selection, [FILTER_KEY.KEYWORD]: keyword });

      startTransition(() => {
        router.push(next);
      });
    },
    [router, selection],
  );

  return (
    <form action={submit} className="flex items-end gap-2">
      <div className="flex-1 space-y-1">
        <Label htmlFor={fieldId}>キーワード</Label>
        <Input
          defaultValue={selection[FILTER_KEY.KEYWORD] ?? ""}
          id={fieldId}
          name={FILTER_KEY.KEYWORD}
          placeholder="商品名で探す"
          type="search"
        />
      </div>
      <Button disabled={pending} type="submit">
        検索
      </Button>
    </form>
  );
}
