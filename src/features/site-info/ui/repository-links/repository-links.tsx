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
import { withPartSpan } from "@/observability/render-span";
import { REPOSITORIES } from "../../repositories";

/**
 * リポジトリへの導線。
 *
 * @remarks
 * フッターへ置きます。どの画面からでも辿れる必要があり、かつ画面の主題ではないためです。
 *
 * 説明を HoverCard に載せるのは、常時出すとフッターが本文と同じ量の文字を持つことになるためです。
 * keyboard の focus でも開くので、hover を持たない利用者も読めます。
 */
export const RepositoryLinks = withPartSpan(
  "features/site-info/ui/repository-links/repository-links",
  () => {
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
  },
);
