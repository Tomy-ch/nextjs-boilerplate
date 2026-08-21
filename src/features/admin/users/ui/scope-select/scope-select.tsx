"use client";

import { useRouter } from "next/navigation";
import { useCallback, useId } from "react";

import { Label } from "@/components/design-system/form/label/label";
import {
  SelectNative,
  SelectNativeOption,
} from "@/components/design-system/form/select-native/select-native";

import { toScopeHref, USER_SCOPE, USER_SCOPE_LABELS, type UserScope } from "../../query";

const SCOPES: readonly UserScope[] = [USER_SCOPE.ALL, USER_SCOPE.ACTIVE, USER_SCOPE.WITHDRAWN];

function isUserScope(value: string): value is UserScope {
  return SCOPES.some((scope) => scope === value);
}

/** `UserScopeSelect` の props。 */
export type UserScopeSelectProps = {
  /** いま効いている範囲。 */
  value: UserScope;
};

/**
 * 一覧が対象にする範囲を選ぶ欄。
 *
 * @remarks
 * **選んだ時点で反映します。** 選択肢が排他の 3 つしかなく、結果が同じ画面にそのまま出るため、
 * 確定を待たせる理由がありません。
 *
 * native の `select` で組みます。排他で候補が固定されており、候補ごとの入り切りを見せる必要が
 * ないためです（複数選べる商品一覧の絞り込みとはそこが違います）。
 *
 * @see Storybook `Page/Admin/Users`
 */
export function UserScopeSelect({ value }: UserScopeSelectProps) {
  const router = useRouter();
  const controlId = useId();

  const change = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      // 並べた選択肢が出所でも、DOM から返るのは素の文字列なので判定を通す。
      if (isUserScope(event.target.value)) router.push(toScopeHref(event.target.value));
    },
    [router],
  );

  return (
    <div className="flex items-center gap-2">
      <Label className="shrink-0 text-muted-foreground" htmlFor={controlId}>
        状態
      </Label>
      <SelectNative className="w-40" id={controlId} onChange={change} value={value}>
        {SCOPES.map((scope) => (
          <SelectNativeOption key={scope} value={scope}>
            {USER_SCOPE_LABELS[scope]}
          </SelectNativeOption>
        ))}
      </SelectNative>
    </div>
  );
}
