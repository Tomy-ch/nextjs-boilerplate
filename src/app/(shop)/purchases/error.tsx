"use client";

import { boundaryFeedback } from "@/app/boundary-feedback";
import { ApiErrorAlert } from "@/components/app-starter/api-error-feedback/api-error-feedback";
import { ContentContainer } from "@/components/shell/content-container/content-container";

/**
 * 購入履歴の error 境界。
 *
 * @remarks
 * 置かないと、取得の失敗が `global-error.tsx` まで抜けて header も nav も消えた画面になります。
 * この segment に境界を置く理由と、文言をここで組み立てない理由は、同層の README の
 * "Conventions for Failure and Absence Surfaces" が持ちます。
 */
export default function PurchaseHistoryError({
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
