"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useId, useTransition } from "react";

import { Button } from "@/components/design-system/action/button/button";
import { Input } from "@/components/design-system/form/input/input";
import { Label } from "@/components/design-system/form/label/label";

/** 検索フォームの入力名。URL のキーと揃える。 */
const KEYWORD_NAME = "keyword";

/**
 * キーワード検索。URL を書き換えることで一覧を取り直す。
 *
 * @remarks
 * 検索語を client state に持たず URL に置きます。そうすると結果を共有でき、戻る操作で前の
 * 条件に戻り、再読み込みでも同じ画面が出ます。取得そのものは Server Component 側で起き、
 * この island は URL を変えるだけです。
 *
 * ページ送りのカーソル（`after`）は捨てます。条件が変わった後の「次のページ」は、前の条件の
 * 続きを指しているためです。
 */
export function ProductSearch({ defaultKeyword = "" }: { defaultKeyword?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const fieldId = useId();

  const submit = useCallback(
    (formData: FormData) => {
      const next = new URLSearchParams(searchParams.toString());
      const keyword = String(formData.get(KEYWORD_NAME) ?? "").trim();

      if (keyword === "") {
        next.delete(KEYWORD_NAME);
      } else {
        next.set(KEYWORD_NAME, keyword);
      }

      next.delete("after");

      startTransition(() => {
        router.push(next.size === 0 ? "/products" : `/products?${next.toString()}`);
      });
    },
    [router, searchParams],
  );

  return (
    <form className="flex items-end gap-2" action={submit}>
      <div className="flex-1 space-y-1">
        <Label htmlFor={fieldId}>キーワード</Label>
        <Input
          id={fieldId}
          name={KEYWORD_NAME}
          type="search"
          defaultValue={defaultKeyword}
          placeholder="商品名で探す"
        />
      </div>
      <Button type="submit" disabled={pending}>
        検索
      </Button>
    </form>
  );
}
