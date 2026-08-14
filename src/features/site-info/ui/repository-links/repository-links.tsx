import { Button } from "@/components/design-system/action/button/button";
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
} from "@/components/design-system/action/button/button.definition";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/design-system/overlay/hover-card/hover-card";

type Repository = {
  readonly name: string;
  readonly url: string;
  readonly summary: string;
};

/**
 * このサイトを構成している 2 つのリポジトリ。
 *
 * @remarks
 * 説明は補足であって、押した先が何かはボタンの文言だけで判るようにしてあります。HoverCard は
 * hover でしか開かない面があり、touch では到達できないためです。
 */
const REPOSITORIES: readonly Repository[] = [
  {
    name: "nextjs-boilerplate",
    url: "https://github.com/Tomy-ch/nextjs-boilerplate",
    summary:
      "このサイトそのもの。Next.js / React のプレゼンテーション層の boilerplate で、画面の型・取得の境界・エラーの扱いを備えています。",
  },
  {
    name: "go-boilerplate",
    url: "https://github.com/Tomy-ch/go-boilerplate",
    summary:
      "このサイトが繋いでいるバックエンド。Go の Onion Architecture の boilerplate で、商品・購入・ユーザーの API を提供します。",
  },
];

/**
 * リポジトリへの導線。
 *
 * @remarks
 * フッターへ置きます。どの画面からでも辿れる必要があり、かつ画面の主題ではないためです。
 *
 * 説明を HoverCard に載せるのは、常時出すとフッターが本文と同じ量の文字を持つことになるためです。
 * keyboard の focus でも開くので、hover を持たない利用者も読めます。
 */
export function RepositoryLinks() {
  return (
    <nav aria-label="リポジトリ" className="flex flex-wrap items-center gap-2">
      {REPOSITORIES.map((repository) => (
        <HoverCard key={repository.name}>
          <HoverCardTrigger asChild>
            <Button asChild size={BUTTON_SIZE.SMALL} variant={BUTTON_VARIANT.OUTLINE}>
              <a href={repository.url} rel="noreferrer" target="_blank">
                {repository.name}
              </a>
            </Button>
          </HoverCardTrigger>
          <HoverCardContent className="w-80 text-sm">{repository.summary}</HoverCardContent>
        </HoverCard>
      ))}
    </nav>
  );
}
