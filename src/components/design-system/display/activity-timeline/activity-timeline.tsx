import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/components/cn";
import { List, ListItem, ListItemMedia } from "@/components/design-system/display/list/list";

/**
 * 起きた出来事を時刻順に並べる SSR first の表示 component。
 *
 * @remarks
 * 対象は**未知の件数の履歴**であって段階ではない。件数は増え続け、並び順は時刻で決まる。既知で
 * 有限の段階を定義順に並べるのは `Stepper` の担当である。**`次に取れる操作` と `pagination` は
 * 同居しない**ため、1 部品にまとめない。
 *
 * 表示は `List` を合成する。縦に並ぶ行・先頭の印・見出しと説明は `List` が既に持つため、新しい
 * 共通 primitive を作らない。内容は `ListItemContent` / `ListItemTitle` /
 * `ListItemDescription` で組み立てる。
 *
 * `ol` として並び順に意味があることを伝える。`role="feed"` は使わない。あの role は記事単位の
 * keyboard 操作と `aria-busy` の管理を約束することになり、この部品はそれを持たない。
 *
 * **履歴の名前を必ず与える。** 同じ画面に複数の履歴があるとき、名前が無いとどちらの履歴か判らない。
 *
 * 並び順・event の意味・取得・件数の追加読み込みは持たない。新しい順に並べるか古い順に並べるかは
 * 呼び出し元が決め、続きの読み込みは `CursorPagination` を隣に合成する。
 *
 * @example
 * ```tsx
 * <ActivityTimeline label="変更履歴">
 *   <ActivityTimelineItem>
 *     <ListItemContent>
 *       <ListItemTitle>田中 が 状態を「公開中」に変更しました</ListItemTitle>
 *       <ActivityTimelineTime dateTime="2026-08-04T09:12:00+09:00">
 *         2026-08-04 09:12
 *       </ActivityTimelineTime>
 *     </ListItemContent>
 *   </ActivityTimelineItem>
 * </ActivityTimeline>
 * ```
 *
 * @param props.label - この履歴のアクセシブルな名前。
 *
 * @see Storybook `Display/ActivityTimeline`
 */
export function ActivityTimeline({
  label,
  className,
  ...props
}: Omit<ComponentProps<"ol">, "aria-label"> & { label: string }) {
  return (
    <List asChild>
      <ol
        aria-label={label}
        className={cn("gap-0", className)}
        data-slot="activity-timeline"
        {...props}
      />
    </List>
  );
}

/**
 * 出来事 1 件。
 *
 * @remarks
 * 先頭の印は装飾である。誰が何をしたかは `ListItemTitle` の文言が伝える。印だけが actor を示す
 * 作りにしない。
 *
 * @param props.marker - 先頭に置く印。avatar や icon を渡す。省略すると印の枠だけが残り、
 *   行の頭が揃う。
 *
 * @see Storybook `Display/ActivityTimeline`
 */
export function ActivityTimelineItem({
  marker,
  children,
  className,
  ...props
}: Omit<ComponentProps<"li">, "size"> & { marker?: ReactNode }) {
  return (
    <ListItem
      className={cn("items-start", className)}
      data-slot="activity-timeline-item"
      {...props}
    >
      <ListItemMedia
        aria-hidden="true"
        className="size-6 shrink-0 overflow-hidden rounded-full border border-border bg-background text-muted-foreground [&>svg]:size-3.5"
        data-slot="activity-timeline-item-marker"
      >
        {marker}
      </ListItemMedia>
      {children}
    </ListItem>
  );
}

/**
 * 出来事が起きた時刻。
 *
 * @remarks
 * 表示用の文字列と機械可読な値の両方を必ず持つ。`children` は利用者が読む形（表記は
 * `model` の formatter が決める）で、`dateTime` は支援技術と機械が読む ISO 8601 の値である。
 * 表示だけだと「3 日前」のような相対表記で正確な時刻が失われ、`dateTime` だけだと読み手に
 * 伝わらない。
 *
 * 整形はこの部品が持たない。locale ごとの表記は `model` の formatter が決める。
 *
 * @param props.dateTime - ISO 8601 の値。
 *
 * @see Storybook `Display/ActivityTimeline`
 */
export function ActivityTimelineTime({
  className,
  ...props
}: ComponentProps<"time"> & { dateTime: string }) {
  return (
    <time
      className={cn("text-xs text-muted-foreground", className)}
      data-slot="activity-timeline-time"
      {...props}
    />
  );
}
