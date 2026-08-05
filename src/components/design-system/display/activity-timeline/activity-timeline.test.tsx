// @vitest-environment jsdom

import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";

import {
  ListItemContent,
  ListItemDescription,
  ListItemTitle,
} from "@/components/design-system/display/list/list";
import { ActivityTimeline, ActivityTimelineItem, ActivityTimelineTime } from "./activity-timeline";

const EVENTS = [
  { id: "3", title: "田中 が 状態を「公開中」に変更しました", at: "2026-08-04T09:12:00+09:00" },
  { id: "2", title: "佐藤 が 月額を ¥1,200 に変更しました", at: "2026-08-03T18:40:00+09:00" },
  { id: "1", title: "鈴木 が プランを作成しました", at: "2026-08-01T10:05:00+09:00" },
];

function TimelineFixture({ label = "変更履歴" }: { label?: string } = {}) {
  return (
    <ActivityTimeline label={label}>
      {EVENTS.map((event) => (
        <ActivityTimelineItem key={event.id}>
          <ListItemContent>
            <ListItemTitle>{event.title}</ListItemTitle>
            <ActivityTimelineTime dateTime={event.at}>{event.at.slice(0, 16)}</ActivityTimelineTime>
          </ListItemContent>
        </ActivityTimelineItem>
      ))}
    </ActivityTimeline>
  );
}

describe("ActivityTimeline", () => {
  it("並び順に意味のある一覧として出来事を並べる", () => {
    render(<TimelineFixture />);

    const timeline = screen.getByRole("list", { name: "変更履歴" });

    expect(timeline.tagName).toBe("OL");
    expect(within(timeline).getAllByRole("listitem")).toHaveLength(3);
  });

  it("履歴の名前を呼び出し元が与える", () => {
    render(<TimelineFixture label="この項目の監査ログ" />);

    expect(screen.getByRole("list", { name: "この項目の監査ログ" })).toBeInTheDocument();
  });

  it("渡された順序をそのまま並べる", () => {
    render(<TimelineFixture />);

    const titles = screen.getAllByRole("listitem").map((item) => item.textContent);

    expect(titles[0]).toContain("状態を「公開中」に変更");
    expect(titles[2]).toContain("プランを作成");
  });

  it("keyboard 操作を約束する role は持たない", () => {
    render(<TimelineFixture />);

    expect(screen.queryByRole("feed")).not.toBeInTheDocument();
    expect(screen.getByRole("list", { name: "変更履歴" })).not.toHaveAttribute("role");
  });

  it("誰が何をしたかは印ではなく文言が伝える", () => {
    const { container } = render(
      <ActivityTimeline label="変更履歴">
        <ActivityTimelineItem marker={<svg aria-hidden="true" role="presentation" />}>
          <ListItemContent>
            <ListItemTitle>田中 が 公開しました</ListItemTitle>
          </ListItemContent>
        </ActivityTimelineItem>
      </ActivityTimeline>,
    );

    const marker = container.querySelector("[data-slot='activity-timeline-item-marker']");

    expect(marker).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByText("田中 が 公開しました")).toBeInTheDocument();
  });

  it("印を渡さなくても行の頭が揃う", () => {
    const { container } = render(<TimelineFixture />);

    expect(container.querySelectorAll("[data-slot='activity-timeline-item-marker']")).toHaveLength(
      3,
    );
  });

  it("時刻は表示用の文字列と機械可読な値の両方を持つ", () => {
    render(<TimelineFixture />);

    const time = screen.getByText("2026-08-04T09:12");

    expect(time.tagName).toBe("TIME");
    expect(time).toHaveAttribute("dateTime", "2026-08-04T09:12:00+09:00");
  });

  it("説明を添えられる", () => {
    render(
      <ActivityTimeline label="変更履歴">
        <ActivityTimelineItem>
          <ListItemContent>
            <ListItemTitle>田中 が 公開しました</ListItemTitle>
            <ListItemDescription>下書きから公開へ切り替わりました。</ListItemDescription>
          </ListItemContent>
        </ActivityTimelineItem>
      </ActivityTimeline>,
    );

    expect(screen.getByText("下書きから公開へ切り替わりました。")).toBeInTheDocument();
  });

  it("a11y 自動検査に違反しない", async () => {
    const { container } = render(<TimelineFixture />);

    const result = await axe(container, { rules: { "color-contrast": { enabled: false } } });

    expect(result.violations).toEqual([]);
  });
});
