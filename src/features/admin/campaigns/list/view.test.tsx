// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import { AdminCampaignListView } from "./view";

const PERIOD_NOTE = /終了日時ちょうどからは受け取れません/;

describe("AdminCampaignListView", () => {
  it("配布期間が終了の時刻ちょうどを含まないことを、表の外に書く", () => {
    render(
      <AdminCampaignListView>
        <p>一覧の中身</p>
      </AdminCampaignListView>,
    );

    expect(screen.getByText(PERIOD_NOTE)).toBeInTheDocument();
  });

  it("一覧本体を受け取って、補足の後ろに置く", () => {
    render(
      <AdminCampaignListView>
        <p>一覧の中身</p>
      </AdminCampaignListView>,
    );

    const note = screen.getByText(PERIOD_NOTE);
    const body = screen.getByText("一覧の中身");

    expect(note.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("a11y 検査を通る", async () => {
    const { container } = render(
      <AdminCampaignListView>
        <p>一覧の中身</p>
      </AdminCampaignListView>,
    );

    expect(
      (await axe(container, { rules: { "color-contrast": { enabled: false } } })).violations,
    ).toEqual([]);
  });
});
