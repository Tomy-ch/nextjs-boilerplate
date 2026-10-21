import { notFound } from "next/navigation";

import { getInquiryHistory } from "@/adapters/server/api/inquiries";
import { findAppError } from "@/errors/app-error";
import { ErrorKind } from "@/errors/error-kind";
import type { InquiryHistory, InquiryId } from "@/model/inquiry/inquiry";
import { withScreenSpan } from "@/observability/render-span";

import type { AdminInquiryReplyAction } from "../form-state";
import { AdminInquiryDetailView } from "./view";

/** `AdminInquiryDetailPageContent` の props。 */
export type AdminInquiryDetailPageContentProps = {
  /** route の動的セグメントが指す問い合わせ。 */
  inquiryId: InquiryId;
  /** 回答の送信先。route が渡す。 */
  replyAction: AdminInquiryReplyAction;
};

/**
 * やり取りを取得し、`not-found` だけを Next の境界へ渡す。
 *
 * @remarks
 * try の範囲は取得だけです。描画中の例外はここでは捕まらないため、捕まるように見える形にしません。
 *
 * @param inquiryId - route の動的セグメントが指す問い合わせ。
 * @returns 取得したやり取り。
 */
async function loadHistory(inquiryId: InquiryId): Promise<InquiryHistory> {
  try {
    return await getInquiryHistory(inquiryId);
  } catch (error) {
    if (findAppError(error)?.kind === ErrorKind.NOT_FOUND) {
      notFound();
    }

    throw error;
  }
}

/**
 * 問い合わせ 1 件の取得と組み立て。
 *
 * @remarks
 * 1 ページだけ取ります。古いやり取りを遡る導線は持ちません。
 *
 * @param props - route の動的セグメントが指す問い合わせと、回答の送信先。
 */
export const AdminInquiryDetailPageContent = withScreenSpan(
  "features/admin/inquiries/detail/page-content",
  async ({ inquiryId, replyAction }: AdminInquiryDetailPageContentProps) => {
    const history = await loadHistory(inquiryId);

    return (
      <AdminInquiryDetailView history={history} inquiryId={inquiryId} replyAction={replyAction} />
    );
  },
);
