import { describe, expect, it } from "vitest";

import {
  collectClassCandidates,
  findMissingClasses,
  isKnownWithoutCss,
  toSelector,
  utilityOf,
} from "./check-classes";

describe("toSelector", () => {
  it("記号を含まない class はそのまま selector になる", () => {
    expect(toSelector("flex")).toBe(".flex");
  });

  it("variant 修飾子の区切りを逃がす", () => {
    expect(toSelector("focus-visible:outline-2")).toBe(".focus-visible\\:outline-2");
  });

  it("小数の段を持つ class の `.` を逃がす", () => {
    expect(toSelector("size-3.5")).toBe(".size-3\\.5");
  });

  it("任意値と不透明度の記号を逃がす", () => {
    expect(toSelector("bg-destructive/10")).toBe(".bg-destructive\\/10");
    expect(toSelector("w-[calc(100%-1rem)]")).toBe(".w-\\[calc\\(100\\%-1rem\\)\\]");
  });
});

describe("utilityOf", () => {
  it("修飾子が無ければそのまま返す", () => {
    expect(utilityOf("animate-in")).toBe("animate-in");
  });

  it("最後の修飾子より後ろを返す", () => {
    expect(utilityOf("data-[state=open]:animate-in")).toBe("animate-in");
  });

  it("角括弧の内側の `:` を区切りとして数えない", () => {
    expect(utilityOf("[&_svg:not([class*='size-'])]:size-4")).toBe("size-4");
  });
});

describe("isKnownWithoutCss", () => {
  it("目印としてだけ使う class を除く", () => {
    expect(isKnownWithoutCss("group")).toBe(true);
    expect(isKnownWithoutCss("group/attachment")).toBe(true);
  });

  it("修飾子が付いていても utility で判定する", () => {
    expect(isKnownWithoutCss("data-[state=closed]:animate-out")).toBe(true);
    expect(isKnownWithoutCss("data-[side=top]:slide-in-from-bottom-2")).toBe(true);
  });

  it("CSS を持つはずの class は除かない", () => {
    expect(isKnownWithoutCss("bg-muted")).toBe(false);
    expect(isKnownWithoutCss("data-[state=open]:bg-accent")).toBe(false);
  });
});

describe("collectClassCandidates", () => {
  it("className 属性の値を拾う", () => {
    expect([...collectClassCandidates('<div className="flex gap-2" />')]).toEqual([
      "flex",
      "gap-2",
    ]);
  });

  it("cn() と cva() の引数を拾う", () => {
    const source = 'cn("flex", condition && "gap-2");\nconst v = cva("rounded-md");';

    expect([...collectClassCandidates(source)]).toEqual(["flex", "gap-2", "rounded-md"]);
  });

  it("className 属性の外にある文字列は拾わない", () => {
    const source = '<div data-slot="button-group" role="group" aria-label="操作" />';

    expect([...collectClassCandidates(source)]).toEqual([]);
  });

  it("class を出し分ける条件式の比較対象を拾わない", () => {
    const source = 'cn(orientation === "horizontal" ? "h-px w-full" : "w-px")';

    expect([...collectClassCandidates(source)]).toEqual(["h-px", "w-full", "w-px"]);
  });

  it("cva の defaultVariants が指す variant の名前を拾わない", () => {
    const source = 'cva("rounded-md", { defaultVariants: { variant: "default" } })';

    expect([...collectClassCandidates(source)]).toEqual(["rounded-md"]);
  });

  it("index の key を拾わない", () => {
    const source = 'className={ALIGNMENT_CLASS[column.align ?? "start"]}';

    expect([...collectClassCandidates(source)]).toEqual([]);
  });

  it("class の任意値に含まれる角括弧を index の key と取り違えない", () => {
    const source = "cn(\"[&_svg:not([class*='size-'])]:size-4\")";

    expect([...collectClassCandidates(source)]).toEqual(["[&_svg:not([class*='size-'])]:size-4"]);
  });

  it("入れ子の呼び出しでも引数の終わりを見失わない", () => {
    const source = 'cn("flex", cn("gap-2"), "p-4")';

    expect([...collectClassCandidates(source)]).toEqual(["flex", "gap-2", "p-4"]);
  });

  it("閉じ括弧が無い場合も残りを読み切る", () => {
    expect([...collectClassCandidates('cn("flex"')]).toEqual(["flex"]);
  });

  it("逃がした引用符を含む literal を 1 つとして読む", () => {
    const source = 'cn("before-\\") p-4", "flex")';

    expect([...collectClassCandidates(source)]).toEqual(["p-4", "flex"]);
  });

  it("class になりえない語を落とす", () => {
    expect([...collectClassCandidates('cn("Flex 2xl 日本語")')]).toEqual([]);
  });

  it("単引用符で書かれた class も拾う", () => {
    expect([...collectClassCandidates("cn('flex gap-2')")]).toEqual(["flex", "gap-2"]);
  });
});

describe("findMissingClasses", () => {
  const sources = new Map([["a.tsx", new Set(["flex", "bg-nope"])]]);

  it("生成された CSS に現れない class を、書かれている場所とともに返す", () => {
    expect(findMissingClasses(".flex { display: flex }", sources)).toEqual([
      { className: "bg-nope", files: ["a.tsx"] },
    ]);
  });

  it("同じ class が複数ファイルにあれば 1 件へまとめる", () => {
    const missing = findMissingClasses(
      "",
      new Map([
        ["a.tsx", new Set(["bg-nope"])],
        ["b.tsx", new Set(["bg-nope"])],
      ]),
    );

    expect(missing).toEqual([{ className: "bg-nope", files: ["a.tsx", "b.tsx"] }]);
  });

  it("意図して CSS を持たない class は問題にしない", () => {
    expect(findMissingClasses("", new Map([["a.tsx", new Set(["group"])]]))).toEqual([]);
  });

  it("修飾子付きの class を素の文字列で照合しない", () => {
    const css = ".focus-visible\\:outline-2:focus-visible { outline-width: 2px }";

    expect(
      findMissingClasses(css, new Map([["a.tsx", new Set(["focus-visible:outline-2"])]])),
    ).toEqual([]);
  });

  it("複数見つかった場合は名前順に並べる", () => {
    const missing = findMissingClasses("", new Map([["a.tsx", new Set(["z-nope", "a-nope"])]]));

    expect(missing.map((entry) => entry.className)).toEqual(["a-nope", "z-nope"]);
  });
});
