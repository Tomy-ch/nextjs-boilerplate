import { useEffect, useId, useRef, useState } from "react";

/** {@link MermaidDiagram} が受け取る props です。 */
export type MermaidDiagramProps = {
  /** mermaid のコードフェンスの原文。 */
  source: string;
};

/**
 * mermaid の原文を図として描きます。
 *
 * @remarks
 * mermaid は browser を必要とします。図の実寸をテキストの計測から決めるため、DOM を模した環境では
 * 描けません（`mermaid.parse` は通っても `mermaid.render` は落ちます）。ビルド時に SVG へ畳むには
 * ヘッドレスブラウザが要るので、描画は browser 側に置いています。
 *
 * **読み込みは図が現れたときだけ行います。** mermaid は大きく、図を含まない文書のほうが多いため、
 * 静的な import にすると portal の初期表示がその分だけ重くなります。
 *
 * 出力の SVG は sanitize を通りません。通す必要が無いためです。sanitize は「取得した Markdown を
 * 濾す」ためのもので、ここへ渡しているのはその濾過を通ったコードブロックの文字列です。図は
 * その文字列から手元で組まれ、外から来た HTML はどこにも現れません。
 *
 * 描くのは mermaid 自身に任せ、こちらは器だけを置きます。SVG を文字列として受け取って流し込むと
 * innerHTML を自分で書くことになり、経路が 1 つ増えます。
 *
 * 配色は面に合わせます。図だけが明るいまま残ると、同じ画面の中で背景が 2 つある状態になります。
 *
 * 描けなかった場合は原文がそのまま残ります。図の構文は `mermaid-lint` が CI で検証しているため
 * ここへ壊れた図は届きませんが、届いたときに何も見えなくなるよりは読める形で残します。
 */
export function MermaidDiagram({ source }: MermaidDiagramProps) {
  const container = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);
  const id = useId();

  useEffect(() => {
    const node = container.current;

    if (node === null) {
      return;
    }

    let alive = true;

    void import("mermaid")
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          // 面の配色に合わせる。portal は切替を持たず OS の設定に従うので、同じ問い合わせを見る。
          theme: window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "default",
        });

        await mermaid.run({ nodes: [node], suppressErrors: true });
      })
      .then(() => {
        if (alive) {
          setRendered(true);
        }
      })
      .catch(() => undefined);

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div
      className={
        rendered
          ? "my-4 flex justify-center overflow-x-auto"
          : "my-4 overflow-x-auto whitespace-pre-wrap font-mono text-muted-foreground text-xs"
      }
      data-slot="mermaid-diagram"
      data-state={rendered ? "rendered" : "source"}
      id={`mermaid-${id.replaceAll(":", "")}`}
      ref={container}
    >
      {source}
    </div>
  );
}
