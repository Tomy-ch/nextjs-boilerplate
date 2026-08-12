// Storybook が build 時に書き出す story 目録 (`storybook-static/index.json`) から、
// 撮影対象の story を取り出す。
//
// 対象は既定で全数であり、外れるのは `VRT_SKIP_TAG` を宣言した story だけ。列挙を story 側の
// 申告 (撮影対象を明示するタグ) にすると、新しく足した story が黙って対象外になる。

/** 撮影対象から外す story が宣言するタグ。 */
export const VRT_SKIP_TAG = "vrt-skip";

/** 撮影する story 1 件。 */
export type Story = {
  /** `iframe.html?id=` に渡す識別子。基準画像のファイル名でもある。 */
  id: string;
  /** sidebar の見出し。失敗時にどの部品かを読めるようにするために持つ。 */
  title: string;
  /** story の表示名。 */
  name: string;
};

type IndexEntry = {
  type?: unknown;
  id?: unknown;
  title?: unknown;
  name?: unknown;
  tags?: unknown;
};

type StoryIndex = {
  entries?: unknown;
};

/**
 * 目録の JSON から撮影対象を id 順で返す。
 *
 * @remarks
 * 目録が空、あるいは entries を持たない形だった場合は例外を投げます。0 件へ縮退させると、
 * 撮影対象が 1 つも無い状態が「差分なし」として緑で通ります。
 */
export function parseStoryIndex(json: string): Story[] {
  const index = JSON.parse(json) as StoryIndex;
  const entries = index.entries;
  if (typeof entries !== "object" || entries === null) {
    throw new Error("story 目録に entries がありません");
  }

  const stories: Story[] = [];
  for (const entry of Object.values(entries as Record<string, IndexEntry>)) {
    if (!isStory(entry)) continue;
    if (hasSkipTag(entry.tags)) continue;
    stories.push({ id: entry.id, title: entry.title, name: entry.name });
  }
  if (stories.length === 0) throw new Error("story 目録に撮影対象がありません");

  return stories.sort((a, b) => a.id.localeCompare(b.id));
}

// 目録には docs ページも同じ entries に並ぶ。撮るのは story だけで、docs は story の再掲と
// 自動生成の表からなるため、退行はいずれ story 側に出る。
function isStory(
  entry: IndexEntry,
): entry is IndexEntry & { id: string; title: string; name: string } {
  return (
    entry.type === "story" &&
    typeof entry.id === "string" &&
    typeof entry.title === "string" &&
    typeof entry.name === "string"
  );
}

function hasSkipTag(tags: unknown): boolean {
  return Array.isArray(tags) && tags.includes(VRT_SKIP_TAG);
}

/**
 * story を開く URL を組み立てる。
 *
 * @remarks
 * `globals` で配色テーマを指定します。テーマは `:root` の `data-theme` を切り替える
 * `.storybook/preview.ts` の decorator が受け取るため、OS の設定ではなく URL で決まります。
 */
export function storyURL(id: string, theme: string): string {
  const params = new URLSearchParams({ id, globals: `theme:${theme}`, viewMode: "story" });

  return `/iframe.html?${params.toString()}`;
}

// 撮影対象を絞る。`VRT_ONLY` は基準画像を撮り直すときに、直前に落ちた story だけへ限るための
// 入口で、指定が無ければ全数を撮る。空振り（該当 0 件）は落とす — 綴りを誤った指定が
// 「差分なし」として緑で通ると、承認したはずの画像が更新されないまま残る。
export function selectStories(stories: Story[], only: string | undefined): Story[] {
  if (!only) return stories;
  const wanted = new Set(only.split(",").map((id) => id.trim()));
  const selected = stories.filter((story) => wanted.has(story.id));
  if (selected.length === 0) throw new Error(`VRT_ONLY に該当する story がありません: ${only}`);

  return selected;
}
