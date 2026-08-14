"use client";

import { Button } from "@/components/design-system/action/button/button";
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
} from "@/components/design-system/action/button/button.definition";
import { Separator } from "@/components/design-system/display/separator/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/design-system/overlay/dialog/dialog";

import { REPOSITORIES } from "../../repositories";

const TITLE = "リポジトリの補足";

/**
 * リポジトリの目的とできることを補足する面。
 *
 * @remarks
 * カードには「何であるか」だけを置き、目的と機能の一覧はここへ畳みます。並べて出すと、
 * このサイトが何かを知りたいだけの利用者にも、開発の関心事を最初から読ませることになります。
 *
 * 面の中に導線を置きません。ここに書いてあるのは補足で、リポジトリそのものへはカードの
 * ボタンから行けます。同じ行き先を 2 か所に置くと、どちらが正しい入口かが読み取れません。
 */
export function RepositorySupplement() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size={BUTTON_SIZE.SMALL} variant={BUTTON_VARIANT.OUTLINE}>
          {TITLE}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{TITLE}</DialogTitle>
          <DialogDescription>
            それぞれが何のために作られ、何を備えているかを説明します。
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-6 text-sm leading-relaxed">
          {REPOSITORIES.map((repository, index) => (
            <section className="flex flex-col gap-3" key={repository.name}>
              {index === 0 ? null : <Separator />}
              <h3 className="font-mono text-base font-semibold">{repository.name}</h3>
              <p>{repository.purpose}</p>
              <ul className="flex list-disc flex-col gap-2 ps-5">
                {repository.capabilities.map((capability) => (
                  <li key={capability}>{capability}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
