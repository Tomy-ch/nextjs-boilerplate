"use client";

import { type ChangeEvent, useActionState, useCallback, useId, useState } from "react";
import { useFormStatus } from "react-dom";

import { FormFeedback } from "@/components/app-starter/form-feedback/form-feedback";
import { Button } from "@/components/design-system/action/button/button";
import { Input } from "@/components/design-system/form/input/input";
import { Label } from "@/components/design-system/form/label/label";
import {
  RadioGroupNative,
  RadioGroupNativeItem,
} from "@/components/design-system/form/radio-group-native/radio-group-native";
import { SwitchNative } from "@/components/design-system/form/switch-native/switch-native";
import { Textarea } from "@/components/design-system/form/textarea/textarea";
import { FormField } from "@/components/patterns/form-field/form-field";
import { idleActionState } from "@/model/action-state";
import { SESSION_ROLE, type SessionRole } from "@/model/session";

import type { DevSessionFormState, IssueDevSessionAction } from "../../form-state";
import { RETURN_URL_PARAM, STATE_PARAM } from "../../paths";

/** `DevSessionForm` の props。 */
export type DevSessionFormProps = {
  /** 発行したあとの戻り先。 */
  returnUrl: string;
  /**
   * 認可の往復で持ち回る、要求と応答を対応づける値。直接開いたときは null。
   *
   * @remarks
   * 送信へそのまま載せます。**この form は値の意味を知りません** —— 載っているときに送信先が
   * `/api/auth/callback` へ返す、という判断は Server Action の側にあります。
   */
  authorizationState: string | null;
  /** 発行の送信先。route が渡す。 */
  action: IssueDevSessionAction;
  /**
   * 実物の API へ繋いでいるか。
   *
   * @remarks
   * トークンを取りに行くかどうかの**既定**にします。画面が推測すると、設定を変えるたびに
   * 既定と実態がずれます。切り替え自体は残すので、繋ぎ先と違う組み合わせも試せます。
   */
  connectsLiveApi: boolean;
  /**
   * 設定が指している IdP。接続先の**初期値**にする。
   *
   * @remarks
   * 初期値であって固定値ではありません。開発機ではバックエンドを複数の口で並行して立てるため、
   * いま叩いている API が期待する IdP と設定の値がずれます。**どれが正かを知っているのは、その場で
   * 繋ぎ先を選んでいる人**なので、書き換えられる形で出します。
   */
  defaultIssuer: string;
};

/** 既定の subject。実在の利用者を指さない値にしておく。 */
const DEFAULT_SUBJECT = "dev-user";

/** 既定の失効までの秒数。 */
const DEFAULT_EXPIRES_IN_SECONDS = 3600;

const ROLE_LABEL: Readonly<Record<SessionRole, string>> = {
  [SESSION_ROLE.user]: "一般利用者",
  [SESSION_ROLE.admin]: "管理者",
};

const SUBMIT_LABEL = "この内容で入る";
const PENDING_LABEL = "session を発行しています";

/** 送信部。`useFormStatus` は form の子でしか状態を読めないため切り出している。 */
function IssueSubmit() {
  const { pending } = useFormStatus();

  return (
    <Button aria-label={pending ? PENDING_LABEL : undefined} disabled={pending} type="submit">
      {SUBMIT_LABEL}
    </Button>
  );
}

/**
 * IdP を通さずに session を発行する指定。
 *
 * @remarks
 * **「API 接続モード」が入っていると、トークンはこちらで取ります。** 実物の API へ繋いでいる間、
 * 検証されない前提のトークンは 401 で弾かれます。それを避けるために利用者へ手作業（別の口を
 * 叩いてトークンを写す）を要求すると、写し間違いと期限切れがそのまま「画面が壊れている」と
 * して現れます。取り方そのものは画面が知りません（`adapters/server/auth/development-token.ts`）。
 *
 * **貼る欄は、入っていないときだけ出します。** 両方が同時に見えていると、どちらが効くのかを
 * 見た目から決められません。自分で取ったトークンを使いたいときは切ってから貼ります。
 *
 * **接続先は書き換えられる形で出します**（{@link DevSessionFormProps.defaultIssuer}）。ずれたまま
 * 取ると、トークンは出るのに API で 401 になります。
 *
 * 役割は radio です。同時に 1 つしか選べないものを選ぶ操作であり、既定を持ちます
 * （[0053](../../../../../docs/adr/0053-ui-component-interaction-seam.md)）。
 *
 * 失効までの秒数を指定できるのは、**失効したときの見え方を確かめるため**です。短い値を入れると、
 * その秒数のあとに保護された画面がどうなるかを実際に踏めます。
 */
export function DevSessionForm({
  returnUrl,
  authorizationState,
  action,
  connectsLiveApi,
  defaultIssuer,
}: DevSessionFormProps) {
  const [state, formAction] = useActionState<DevSessionFormState, FormData>(
    action,
    idleActionState(),
  );
  const subjectId = useId();
  const expiresId = useId();
  const tokenId = useId();
  const issueTokenId = useId();
  const issuerId = useId();
  const [issuesToken, setIssuesToken] = useState(connectsLiveApi);
  const errors = state.status === "error" ? state.fieldErrors : undefined;
  const toggleIssuesToken = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setIssuesToken(event.currentTarget.checked);
  }, []);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input name={RETURN_URL_PARAM} type="hidden" value={returnUrl} />
      {authorizationState === null ? null : (
        <input name={STATE_PARAM} type="hidden" value={authorizationState} />
      )}

      <FormField
        controlId={subjectId}
        description="この値がそのまま session の利用者 ID になります。"
        errorId={`${subjectId}-error`}
        label="誰として入るか"
        message={errors?.subject?.[0]}
        required
      >
        <Input
          aria-describedby={errors?.subject === undefined ? undefined : `${subjectId}-error`}
          aria-invalid={errors?.subject !== undefined}
          aria-required
          defaultValue={DEFAULT_SUBJECT}
          id={subjectId}
          name="subject"
        />
      </FormField>

      <RadioGroupNative>
        <legend className="mb-3 font-emphasis text-sm">役割</legend>
        {Object.values(SESSION_ROLE).map((role) => (
          <div className="flex items-center gap-2" key={role}>
            <RadioGroupNativeItem
              defaultChecked={role === SESSION_ROLE.user}
              id={`${subjectId}-${role}`}
              name="role"
              value={role}
            />
            <Label htmlFor={`${subjectId}-${role}`}>{ROLE_LABEL[role]}</Label>
          </div>
        ))}
      </RadioGroupNative>

      <FormField
        controlId={expiresId}
        description="短くすると、失効したあとの見え方をその場で確かめられます。"
        errorId={`${expiresId}-error`}
        label="失効までの秒数"
        message={errors?.expiresInSeconds?.[0]}
        required
      >
        <Input
          aria-describedby={
            errors?.expiresInSeconds === undefined ? undefined : `${expiresId}-error`
          }
          aria-invalid={errors?.expiresInSeconds !== undefined}
          aria-required
          defaultValue={DEFAULT_EXPIRES_IN_SECONDS}
          id={expiresId}
          inputMode="numeric"
          name="expiresInSeconds"
        />
      </FormField>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <SwitchNative
            checked={issuesToken}
            id={issueTokenId}
            name="issueAccessToken"
            onChange={toggleIssuesToken}
          />
          <Label htmlFor={issueTokenId}>API 接続モード</Label>
        </div>
        <p className="text-sm text-muted-foreground">
          {issuesToken
            ? "上の「誰として入るか」で開発用 IdP からトークンを取り、session に載せます。実物の API へそのまま繋がります。"
            : "検証されない前提のトークンを載せます。モックへ繋いでいる間はこれで足ります。"}
        </p>
      </div>

      {issuesToken ? (
        <FormField
          controlId={issuerId}
          description="いま叩いている API が期待する IdP を指します。設定の値を初期値にしていますが、口を分けて並行して立てているならそちらへ書き換えます。"
          errorId={`${issuerId}-error`}
          label="IdP の接続先"
          message={errors?.issuerUrl?.[0]}
          required
        >
          <Input
            aria-describedby={errors?.issuerUrl === undefined ? undefined : `${issuerId}-error`}
            aria-invalid={errors?.issuerUrl !== undefined}
            aria-required
            className="font-mono text-xs"
            defaultValue={defaultIssuer}
            id={issuerId}
            inputMode="url"
            name="issuerUrl"
          />
        </FormField>
      ) : null}

      {issuesToken ? null : (
        <FormField
          controlId={tokenId}
          description="自分で取ったトークンを使うときだけ貼ります。空欄でも発行はできます。"
          errorId={`${tokenId}-error`}
          label="Access Token（任意）"
          message={errors?.accessToken?.[0]}
          required={false}
        >
          <Textarea
            aria-describedby={errors?.accessToken === undefined ? undefined : `${tokenId}-error`}
            aria-invalid={errors?.accessToken !== undefined}
            className="font-mono text-xs"
            id={tokenId}
            name="accessToken"
            rows={4}
          />
        </FormField>
      )}

      <div className="flex flex-col gap-2">
        <IssueSubmit />
        {state.status === "error" && state.formError !== null ? (
          <FormFeedback
            description={state.formError}
            title="session を発行できませんでした"
            variant="destructive"
          />
        ) : null}
      </div>
    </form>
  );
}
