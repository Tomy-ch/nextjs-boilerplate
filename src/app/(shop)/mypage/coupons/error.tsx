"use client";

import { boundaryFeedback } from "@/app/boundary-feedback";
import { ApiErrorAlert } from "@/components/app-starter/api-error-feedback/api-error-feedback";
import { ContentContainer } from "@/components/shell/content-container/content-container";

/**
 * 保有クーポンの error 境界。
 *
 * @remarks
 * マイページと別に置きます。親の境界に任せると、失敗した子だけでなく親の表示まで一緒に消えます。
 *
 * 文言はここで組み立てません。production では Server Component から投げられたエラーの本文が
 * 伏せられ、境界には `digest` しか渡らないためです。
 */
export default function CouponsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ContentContainer className="py-8">
      <ApiErrorAlert {...boundaryFeedback(error, reset)} />
    </ContentContainer>
  );
}
