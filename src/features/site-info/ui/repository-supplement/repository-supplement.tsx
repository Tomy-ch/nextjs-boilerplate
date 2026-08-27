"use client";

import { useId } from "react";

import { Button } from "@/components/design-system/action/button/button";
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
} from "@/components/design-system/action/button/button.definition";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/design-system/overlay/popover/popover";

import type { Repository } from "../../repositories";

const LABEL = "リポジトリの補足";

/**
 * リポジトリの目的とできることを補足する面。
 *
 * @remarks
 * カードには「何であるか」だけを置き、目的と機能の一覧はここへ畳みます。並べて出すと、この
 * サイトが何かを知りたいだけの利用者にも、開発の関心事を最初から読ませることになります。
 *
 * dialog ではなく popover を使います。読んだあとカードへ戻る前提の補足であり、画面を覆って
 * 背後の操作を止めるほどの内容ではありません。
 *
 * 面の中に導線を置きません。リポジトリそのものへはカードを押せば行けます。同じ行き先を
 * 2 か所に置くと、どちらが正しい入口かが読み取れません。
 */
export function RepositorySupplement({ repository }: { readonly repository: Repository }) {
  const titleId = useId();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size={BUTTON_SIZE.SMALL} variant={BUTTON_VARIANT.OUTLINE}>
          {LABEL}
        </Button>
      </PopoverTrigger>
      <PopoverContent aria-labelledby={titleId} className="w-80 text-sm leading-relaxed">
        <PopoverHeader>
          <PopoverTitle className="font-mono" id={titleId}>
            {repository.name}
          </PopoverTitle>
        </PopoverHeader>
        <div className="flex flex-col gap-3">
          <p>{repository.purpose}</p>
          <ul className="flex list-disc flex-col gap-2 ps-5">
            {repository.capabilities.map((capability) => (
              <li key={capability}>{capability}</li>
            ))}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}
