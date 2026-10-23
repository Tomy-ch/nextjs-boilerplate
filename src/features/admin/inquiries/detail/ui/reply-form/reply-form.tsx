"use client";

import { type ChangeEvent, useCallback, useState } from "react";

import { INQUIRY_BODY_MAX_LENGTH } from "@/adapters/client/api/inquiry-limits";
import { Button } from "@/components/design-system/action/button/button";
import { Label } from "@/components/design-system/form/label/label";
import { RequirementBadge } from "@/components/design-system/form/requirement-badge/requirement-badge";
import { Textarea } from "@/components/design-system/form/textarea/textarea";
import { useEmptyGuard } from "@/components/use-empty-guard";
import { IDEMPOTENCY_KEY_FIELD } from "@/model/idempotency-key";
import type { InquiryId } from "@/model/inquiry/inquiry";

import { REPLY_BODY_FIELD, REPLY_INQUIRY_ID_FIELD } from "../../../form-names";
import { type AdminInquiryReplyState, REPLY_EMPTY_MESSAGE } from "../../../form-state";

/** `AdminInquiryReplyForm` の props。 */
export type AdminInquiryReplyFormProps = {
  /** 回答先。送信に載せる。 */
  inquiryId: InquiryId;
  /** 送信の受け口。 */
  action: (formData: FormData) => void;
  /** 直前の送信の結果。 */
  state: AdminInquiryReplyState;
  /** この送信に載せる冪等キー。結果が定まるまで同じ値を使う。 */
  idempotencyKey: string;
  /** 送信中か。 */
  pending: boolean;
  /** 直前の送信の結果が定まっていないか。true のあいだ本文を書き換えさせない。 */
  outcomeOpen: boolean;
};

const LABEL = "回答";

const PLACEHOLDER = "回答を入力してください";

const SUBMIT_LABEL = "回答する";

const SENDING_LABEL = "送信中";

const LOCKED_ID = `${REPLY_BODY_FIELD}-locked`;

const LOCKED_MESSAGE =
  "前回の回答の結果が分かるまで、本文は書き換えられません。同じ本文でもう一度回答してください。";

/**
 * 回答の入力欄。
 *
 * @remarks
 * **`⌘Enter` での送信を持ちません。** 運営の回答は書き上げてから送るもので、打ち終わりが
 * そのまま送信になると、書きかけが利用者へ届きます。
 *
 * **結果が定まらないあいだは本文を書き換えさせません。** 受け取る側は同じ鍵の再送に初回の結果を
 * 返すため、書き換えた本文には書き換える前の本文の結果が黙って返ります（`model/idempotency-key.ts`）。
 * 値を送信に載せ続けるよう、`disabled` ではなく `readOnly` で止め、理由を欄に結びます。
 *
 * @param props - 回答先・送信の受け口・直前の結果・冪等キー・送信中かどうか・結果が定まっていないか。
 */
export function AdminInquiryReplyForm({
  action,
  idempotencyKey,
  inquiryId,
  outcomeOpen,
  pending,
  state,
}: AdminInquiryReplyFormProps) {
  const [draft, setDraft] = useState("");
  const {
    error: emptyError,
    clear: clearEmpty,
    refuseEmpty,
  } = useEmptyGuard(draft, REPLY_EMPTY_MESSAGE);
  const [seenState, setSeenState] = useState(state);

  // 送信が成立したら書きかけを片付ける。通らなかったときに残すのは、打ち直させないためである。
  if (seenState !== state) {
    setSeenState(state);

    if (state.status === "success") {
      setDraft("");
    }
  }

  const serverBodyErrors =
    state.status === "error" ? (state.fieldErrors?.[REPLY_BODY_FIELD] ?? []) : [];
  const bodyErrors = emptyError === null ? serverBodyErrors : [emptyError];
  const submitLabel = pending ? SENDING_LABEL : SUBMIT_LABEL;
  const describedBy = [
    outcomeOpen ? LOCKED_ID : null,
    bodyErrors.length === 0 ? null : `${REPLY_BODY_FIELD}-error`,
  ]
    .filter((id) => id !== null)
    .join(" ");

  const keepDraft = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setDraft(event.target.value);
      clearEmpty();
    },
    [clearEmpty],
  );

  return (
    <form action={action} className="flex flex-col gap-2" onSubmit={refuseEmpty}>
      <input name={IDEMPOTENCY_KEY_FIELD} type="hidden" value={idempotencyKey} />
      <input name={REPLY_INQUIRY_ID_FIELD} type="hidden" value={inquiryId} />

      <div className="flex items-center gap-2">
        <RequirementBadge required />
        <Label htmlFor={REPLY_BODY_FIELD}>{LABEL}</Label>
      </div>
      <Textarea
        aria-describedby={describedBy === "" ? undefined : describedBy}
        aria-invalid={bodyErrors.length === 0 ? undefined : true}
        aria-required
        id={REPLY_BODY_FIELD}
        maxLength={INQUIRY_BODY_MAX_LENGTH}
        name={REPLY_BODY_FIELD}
        onChange={keepDraft}
        placeholder={PLACEHOLDER}
        readOnly={outcomeOpen}
        rows={4}
        value={draft}
      />

      {outcomeOpen ? (
        <p className="text-muted-foreground text-sm" id={LOCKED_ID}>
          {LOCKED_MESSAGE}
        </p>
      ) : null}

      {bodyErrors.length === 0 ? null : (
        <p className="text-sm text-destructive" id={`${REPLY_BODY_FIELD}-error`}>
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
