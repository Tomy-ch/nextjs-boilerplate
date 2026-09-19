import type { ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/design-system/status/alert/alert";

/** Server Action の結果を利用者向けに表示する SSR first feedback。 */
export type FormFeedbackProps = {
  /** 表示する要約。 */
  title: string;
  /** 影響や次の行動を示す説明。 */
  description?: ReactNode;
  /** 連絡のときに伝える request ID。 */
  requestId?: string;
  /** 通常・warning・destructive の見た目。 */
  variant?: "default" | "warning" | "destructive";
  /** link など、次の行動へ進む要素。 */
  children?: ReactNode;
};

/**
 * Server Action の結果を要約し、次の行動と request ID を表示する。
 *
 * @remarks
 * Server Component であり、Server Action の呼び出し、エラー分類、文言変換、field 単位の検証は
 * 持たない。feature が意味の通る文言へ変換して渡す。`variant` は結果の種類を表し、文言と面の色は
 * 呼び出し元が対応させる。field 単位の誤りには `FieldError`、一時的な通知には `Toaster`、複数項目
 * の検証結果一覧には `FormValidationSummary` を使う。
 *
 * @see Storybook `Feedback/FormFeedback`
 */
export function FormFeedback({
  title,
  description,
  requestId,
  variant = "default",
  children,
}: FormFeedbackProps) {
  return (
    <Alert variant={variant}>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {description}
        {requestId === undefined ? null : <p>リクエスト ID: {requestId}</p>}
        {children}
      </AlertDescription>
    </Alert>
  );
}
