// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { formatDateTime } from "@/model/datetime";
import type { ProductDiscontinueResult } from "@/model/product/product";

import { DiscontinueResult } from "./result";

const RESULT: ProductDiscontinueResult = {
  discontinuedAt: "2026-08-14T10:30:00.000Z",
  affectedCartCount: 1_043,
  affectedUserCount: 38,
  issuedCouponCount: 37,
};

/** 項目名と並んだ値を読む。 */
function valueBeside(term: string): string | null | undefined {
  return screen.getByText(term).nextElementSibling?.textContent;
}

describe("DiscontinueResult", () => {
  it("廃番にしたことを報せる", () => {
    render(<DiscontinueResult result={RESULT} />);

    expect(screen.getByRole("alert")).toHaveTextContent("廃番にしました");
  });

  it("応答が返した日時を、表示の形に直して出す", () => {
    render(<DiscontinueResult result={RESULT} />);

    expect(valueBeside("廃番にした日時")).toBe(formatDateTime(new Date(RESULT.discontinuedAt)));
  });

  it("応答が返した件数を、項目ごとの単位で出す", () => {
    render(<DiscontinueResult result={RESULT} />);

    expect(valueBeside("理由が表示されたカート")).toBe("1,043 件");
    expect(valueBeside("クーポンを受け取った利用者")).toBe("38 人");
    expect(valueBeside("発行したクーポン")).toBe("37 枚");
  });

  it("件数が 0 でも省かずに出す", () => {
    render(
      <DiscontinueResult
        result={{ ...RESULT, affectedCartCount: 0, affectedUserCount: 0, issuedCouponCount: 0 }}
      />,
    );

    expect(valueBeside("理由が表示されたカート")).toBe("0 件");
    expect(valueBeside("発行したクーポン")).toBe("0 枚");
  });

  it("読み込み直すと件数が消えることを添える", () => {
    render(<DiscontinueResult result={RESULT} />);

    expect(
      screen.getByText(/画面を読み込み直すと、廃番にした日時だけが残ります/),
    ).toBeInTheDocument();
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(<DiscontinueResult result={RESULT} />);

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
