import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/design-system/display/card/card";
import { withPartSpan } from "@/observability/render-span";
import type { Repository } from "../../repositories";
import { REPOSITORIES } from "../../repositories";
import { RepositorySupplement } from "../repository-supplement/repository-supplement";

/**
 * リポジトリ 1 件のカード。
 *
 * @remarks
 * **カード全体がリポジトリへの導線ですが、link で包んではいません。** 包むと補足を開く操作が
 * link の内側に入り、操作の中に操作が居る形になります。代わりにリポジトリ名の link を疑似要素で
 * カードいっぱいに広げ、支援技術にはリポジトリ名だけが遷移先として見えるようにしています
 * （商品カードと同じ形）。
 *
 * 補足を開く操作は link の後ろに置き、`relative` で重なりの上へ出します。DOM の順序が後ろに
 * ある位置指定要素が上に描かれるため、段階値を持ち出さずに押せる状態を作れます。
 */
function RepositoryCard({ repository }: { readonly repository: Repository }) {
  return (
    <Card className="relative flex h-full flex-col">
      <CardHeader>
        <CardTitle className="font-mono text-base">
          <a
            className="rounded-xs after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-active focus-visible:shadow-glow-primary"
            href={repository.url}
            rel="noreferrer"
            target="_blank"
          >
            {repository.name}
          </a>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <p>{repository.description}</p>
      </CardContent>
      <CardFooter>
        <div className="relative">
          <RepositorySupplement repository={repository} />
        </div>
      </CardFooter>
    </Card>
  );
}

/**
 * このサイトを構成しているリポジトリの説明。
 *
 * @remarks
 * フッターの導線より詳しく書きます。あちらはどの画面からでも辿れることを担い、ここは
 * 「何と何で出来ているのか」を読ませます。
 */
export const RepositoryCards = withPartSpan(
  "features/site-info/ui/repository-cards/repository-cards",
  () => {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {REPOSITORIES.map((repository) => (
          <RepositoryCard key={repository.name} repository={repository} />
        ))}
      </div>
    );
  },
);
