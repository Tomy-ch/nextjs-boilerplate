import { describe, expect, it } from "vitest";

import { findSilentSkeletons, isSkeletonModule, mountsAnnouncer } from "./loading-announcement";

const SPECIFIER = "@/components/shell/loading-announcer/loading-announcer";

const SKELETON_PATH = "src/features/notes/list/ui/skeleton/skeleton.tsx";

function importFrom(clause: string): string {
  return `import ${clause} from "${SPECIFIER}";`;
}

function source(...lines: readonly string[]): string {
  return lines.join("\n");
}

function skeleton(content: string, path = SKELETON_PATH) {
  return { path, content };
}

describe("isSkeletonModule", () => {
  // ----- 正常系 -----
  it("待機表示の綴りなら true", () => {
    expect(isSkeletonModule(SKELETON_PATH)).toBe(true);
  });

  // ----- 異常系 -----
  it("待機表示でない綴りなら false", () => {
    expect(isSkeletonModule("src/features/notes/list/view.tsx")).toBe(false);
  });
});

describe("findSilentSkeletons", () => {
  // ----- 正常系 -----
  it("葉を取り込んで置いている待機表示は返さない", () => {
    const modules = [
      skeleton(
        source(
          importFrom("{ LoadingAnnouncement }"),
          "export const S = () => <div aria-hidden><LoadingAnnouncement /></div>;",
        ),
      ),
    ];

    expect(findSilentSkeletons(modules)).toEqual([]);
  });

  it("別名で取り込んでいても、その名前で置いていれば返さない", () => {
    const modules = [
      skeleton(
        source(
          importFrom("{ LoadingAnnouncement as Announce }"),
          "export const S = () => <div aria-hidden><Announce /></div>;",
        ),
      ),
    ];

    expect(findSilentSkeletons(modules)).toEqual([]);
  });

  it("待機表示でない module は見ない", () => {
    const modules = [
      skeleton("export const V = () => <div />;", "src/features/notes/list/view.tsx"),
    ];

    expect(findSilentSkeletons(modules)).toEqual([]);
  });

  // ----- 異常系 -----
  it("葉を取り込んでいない待機表示を返す", () => {
    expect(findSilentSkeletons([skeleton("export const S = () => <div aria-hidden />;")])).toEqual([
      SKELETON_PATH,
    ]);
  });

  it("取り込んだだけで置いていない待機表示を返す", () => {
    const modules = [
      skeleton(
        source(
          importFrom("{ LoadingAnnouncement }"),
          "export const S = () => <div aria-hidden />;",
        ),
      ),
    ];

    expect(findSilentSkeletons(modules)).toEqual([SKELETON_PATH]);
  });

  it("取り込まずに同じ名前の要素を置いている待機表示を返す", () => {
    const modules = [
      skeleton(
        source(
          "const LoadingAnnouncement = () => null;",
          "export const S = () => <div aria-hidden><LoadingAnnouncement /></div>;",
        ),
      ),
    ];

    expect(findSilentSkeletons(modules)).toEqual([SKELETON_PATH]);
  });

  it("別の module から同じ名前を取り込んでいる待機表示を返す", () => {
    const modules = [
      skeleton(
        source(
          'import { LoadingAnnouncement } from "./local";',
          "export const S = () => <div aria-hidden><LoadingAnnouncement /></div>;",
        ),
      ),
    ];

    expect(findSilentSkeletons(modules)).toEqual([SKELETON_PATH]);
  });

  it("型として取り込んだだけの待機表示を返す", () => {
    const modules = [
      skeleton(
        source(
          importFrom("type { LoadingAnnouncement }"),
          "export const S = () => <div aria-hidden><LoadingAnnouncement /></div>;",
        ),
      ),
    ];

    expect(findSilentSkeletons(modules)).toEqual([SKELETON_PATH]);
  });

  it("名前が前方一致するだけの要素を置いている待機表示を返す", () => {
    const modules = [
      skeleton(
        source(
          importFrom("{ LoadingAnnouncement }"),
          "export const S = () => <div aria-hidden><LoadingAnnouncement2 /></div>;",
        ),
      ),
    ];

    expect(findSilentSkeletons(modules)).toEqual([SKELETON_PATH]);
  });

  it("コメントの中にだけ葉を書いた待機表示を返す", () => {
    const modules = [
      skeleton(
        source(
          importFrom("{ LoadingAnnouncement }"),
          "// <LoadingAnnouncement />",
          "export const S = () => <div aria-hidden />;",
        ),
      ),
    ];

    expect(findSilentSkeletons(modules)).toEqual([SKELETON_PATH]);
  });

  it("いくつも混ざっていれば、葉を置いていないものだけを並べて返す", () => {
    const silentB = "src/features/b/ui/skeleton/skeleton.tsx";
    const silentA = "src/features/a/ui/skeleton/skeleton.tsx";
    const modules = [
      skeleton("export const S = () => <div aria-hidden />;", silentB),
      skeleton(
        source(
          importFrom("{ LoadingAnnouncement }"),
          "export const S = () => <div aria-hidden><LoadingAnnouncement /></div>;",
        ),
      ),
      skeleton("export const S = () => <div aria-hidden />;", silentA),
    ];

    expect(findSilentSkeletons(modules)).toEqual([silentA, silentB]);
  });
});

describe("mountsAnnouncer", () => {
  const LAYOUT_PATH = "src/app/layout.tsx";

  // ----- 正常系 -----
  it("Provider を取り込んで置いていれば true", () => {
    expect(
      mountsAnnouncer({
        path: LAYOUT_PATH,
        content: source(
          importFrom("{ LoadingAnnouncerProvider }"),
          "export default () => <LoadingAnnouncerProvider>{null}</LoadingAnnouncerProvider>;",
        ),
      }),
    ).toBe(true);
  });

  // ----- 異常系 -----
  it("Provider を置いていなければ false", () => {
    expect(
      mountsAnnouncer({
        path: LAYOUT_PATH,
        content: source(
          importFrom("{ LoadingAnnouncerProvider }"),
          "export default () => <div />;",
        ),
      }),
    ).toBe(false);
  });
});
