"use client";

import { type ChangeEvent, type KeyboardEvent, useCallback, useState } from "react";
import { INQUIRY_BODY_MAX_LENGTH } from "@/adapters/client/api/inquiry-limits";
import { Button } from "@/components/design-system/action/button/button";
import { Label } from "@/components/design-system/form/label/label";
import { Textarea } from "@/components/design-system/form/textarea/textarea";
import { useEmptyGuard } from "@/components/use-empty-guard";
import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";
import { INQUIRY_BODY_FIELD } from "../../../form-names";
import { EMPTY_BODY_MESSAGE, type InquiryMessageActionState } from "../../../form-state";

/** `InquiryComposer` の props。 */
export type InquiryComposerProps = {
  /** 送信の受け口。 */
  action: (formData: FormData) => void;
  /** 直前の送信の結果。成功していれば書きかけを片付ける。 */
  state: InquiryMessageActionState;
  /** この送信に載せる冪等キー。成立するまで同じ値を使う。 */
  idempotencyKey: string;
  /** 送信中か。 */
  pending: boolean;
};

const LABEL = "お問い合わせ内容";

const PLACEHOLDER = "ご用件をご記入ください";

const SUBMIT_LABEL = "送信";

const SENDING_LABEL = "送信中";

/** 変換を確定する打鍵に Safari が付ける keyCode。`isComposing` が立たないため、これで見分ける。 */
const IME_PROCESS_KEY_CODE = 229;

/**
 * 送信欄。書きかけはここが持ち、成立したときだけ片付ける。
 *
 * @param props - 送信の受け口、直前の送信結果、この送信に使う冪等キー、送信中かどうか。
 */
export function InquiryComposer({ action, state, idempotencyKey, pending }: InquiryComposerProps) {
  const [draft, setDraft] = useState("");
  const {
    error: emptyError,
    clear: clearEmpty,
    refuseEmpty,
  } = useEmptyGuard(draft, EMPTY_BODY_MESSAGE);
  const [seenState, setSeenState] = useState(state);

  // 送信が成立したら書きかけを片付ける。通らなかったときに残すのは、打ち直させないためである。
  if (seenState !== state) {
    setSeenState(state);

    if (state.status === "success") {
      setDraft("");
    }
  }

  const serverBodyErrors =
    state.status === "error" ? (state.fieldErrors?.[INQUIRY_BODY_FIELD] ?? []) : [];
  const bodyErrors = emptyError === null ? serverBodyErrors : [emptyError];
  const submitLabel = pending ? SENDING_LABEL : SUBMIT_LABEL;

  const keepDraft = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setDraft(event.target.value);
      clearEmpty();
    },
    [clearEmpty],
  );

  const submitOnModifierEnter = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (pending || event.nativeEvent.isComposing || event.keyCode === IME_PROCESS_KEY_CODE) {
        return;
      }

      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        event.currentTarget.form?.requestSubmit();
      }
    },
    [pending],
  );

  return (
    <form action={action} className="flex flex-col gap-2" onSubmit={refuseEmpty}>
      <input name={IDEMPOTENCY_KEY_FIELD} type="hidden" value={idempotencyKey} />

      <Label className="sr-only" htmlFor={INQUIRY_BODY_FIELD}>
        {LABEL}
      </Label>
      <Textarea
        aria-describedby={bodyErrors.length === 0 ? undefined : `${INQUIRY_BODY_FIELD}-error`}
        aria-invalid={bodyErrors.length === 0 ? undefined : true}
        aria-required
        id={INQUIRY_BODY_FIELD}
        maxLength={INQUIRY_BODY_MAX_LENGTH}
        name={INQUIRY_BODY_FIELD}
        onChange={keepDraft}
        onKeyDown={submitOnModifierEnter}
        placeholder={PLACEHOLDER}
        rows={3}
        value={draft}
      />

      {bodyErrors.length === 0 ? null : (
        <p className="text-sm text-destructive" id={`${INQUIRY_BODY_FIELD}-error`}>
          {bodyErrors.join(" ")}
        </p>
      )}

      <div className="flex justify-end">
        <Button disabled={pending} type="submit">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
