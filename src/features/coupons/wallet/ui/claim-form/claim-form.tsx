"use client";

import {
  type ChangeEvent,
  type SubmitEvent,
  useActionState,
  useCallback,
  useEffect,
  useState,
} from "react";

import { FormFeedback } from "@/components/app-starter/form-feedback/form-feedback";
import { Field, FieldError, FieldLabel } from "@/components/design-system/form/field/field";
import { Input } from "@/components/design-system/form/input/input";
import { RequirementBadge } from "@/components/design-system/form/requirement-badge/requirement-badge";
import { useToast } from "@/components/shell/toaster/toaster";
import { ErrorKind } from "@/errors/error-kind";
import { idleActionState } from "@/model/action-state";
import { IDEMPOTENCY_KEY_FIELD, newIdempotencyKey } from "@/model/idempotency-key";

import { claimCouponAction } from "../../../actions";
import { CLAIM_CODE_FIELD } from "../../../form-names";
import { type ClaimCouponFormState, EMPTY_CODE_MESSAGE } from "../../../form-state";
import { ClaimSubmitButton } from "../submit-button/submit-button";

const LABEL = "キャンペーンコード";

const ERROR_ID = `${CLAIM_CODE_FIELD}-error`;

const FAILED_TITLE = "受け取れませんでした";

const SUCCEEDED_TITLE = "クーポンを受け取りました";

/**
 * 結果を受けて、次の送信に載せる冪等キーを作り直すか。
 *
 * @remarks
 * 成立した送信と、契約がコードを弾いた送信だけで作り直します。前者は次の 1 枚が同じ鍵で飛ぶと
 * 初回の結果が返って受け取れず、後者は直したコードが別の要求になるためです。処理中・一時的な
 * 失敗・届かなかった応答のあとは同じ鍵で送り直し、成立していた受け取りを 2 枚目にしません。
 *
 * @param state - 届いた結果
 * @returns 作り直すなら `true`
 */
function renewsKey(state: ClaimCouponFormState): boolean {
  return (
    state.status === "success" || (state.status === "error" && state.kind === ErrorKind.VALIDATION)
  );
}

/**
 * キャンペーンコードの受け取り欄。入力と冪等キーはここが持つ。
 *
 * @remarks
 * 成立したら一覧が取り直されて同じ画面に留まるため、成功は toast で伝え、入力を片付けます。
 * 通らなかったときは入力を残し、打ち直させません。
 *
 * @see Storybook `Features/Coupons/Wallet/ClaimForm`
 */
export function ClaimForm() {
  const [state, formAction] = useActionState(claimCouponAction, idleActionState());
  const [code, setCode] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [emptyError, setEmptyError] = useState<string | null>(null);
  const [seenState, setSeenState] = useState(state);
  const { toast } = useToast();

  if (seenState !== state) {
    setSeenState(state);

    if (renewsKey(state)) {
      setIdempotencyKey(newIdempotencyKey());
    }

    if (state.status === "success") {
      setCode("");
    }
  }

  // 知らせは画面の外の通知面へ出すため、描画を終えてから送る。
  useEffect(() => {
    if (state.status === "success") {
      toast({ title: SUCCEEDED_TITLE });
    }
  }, [state, toast]);

  const keepCode = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setCode(event.target.value);
    setEmptyError(null);
  }, []);

  const refuseEmpty = useCallback(
    (event: SubmitEvent<HTMLFormElement>) => {
      if (code.trim() === "") {
        event.preventDefault();
        setEmptyError(EMPTY_CODE_MESSAGE);
      }
    },
    [code],
  );

  const serverCodeErrors =
    state.status === "error" ? (state.fieldErrors?.[CLAIM_CODE_FIELD] ?? []) : [];
  const codeErrors = emptyError === null ? serverCodeErrors : [emptyError];
  const formError = state.status === "error" ? state.formError : null;

  return (
    <form action={formAction} className="flex flex-col gap-3" onSubmit={refuseEmpty}>
      <input name={IDEMPOTENCY_KEY_FIELD} type="hidden" value={idempotencyKey} />

      <Field>
        <div className="flex items-center gap-2">
          <RequirementBadge required />
          <FieldLabel htmlFor={CLAIM_CODE_FIELD}>{LABEL}</FieldLabel>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            aria-describedby={codeErrors.length === 0 ? undefined : ERROR_ID}
            aria-invalid={codeErrors.length === 0 ? undefined : true}
            aria-required
            autoComplete="off"
            className="sm:max-w-sm"
            id={CLAIM_CODE_FIELD}
            name={CLAIM_CODE_FIELD}
            onChange={keepCode}
            value={code}
          />
          <ClaimSubmitButton />
        </div>
        {codeErrors.length === 0 ? null : (
          <FieldError id={ERROR_ID}>{codeErrors.join(" ")}</FieldError>
        )}
      </Field>

      {formError === null ? null : (
        <FormFeedback description={formError} title={FAILED_TITLE} variant="destructive" />
      )}
    </form>
  );
}
