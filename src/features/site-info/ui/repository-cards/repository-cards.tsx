import { Button } from "@/components/design-system/action/button/button";
import {
  BUTTON_SIZE,
  BUTTON_VARIANT,
} from "@/components/design-system/action/button/button.definition";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/design-system/display/card/card";

import { REPOSITORIES } from "../../repositories";

/**
 * このサイトを構成しているリポジトリの説明。
 *
 * @remarks
 * フッターの導線より詳しく書きます。あちらはどの画面からでも辿れることを担い、ここは
 * 「何と何で出来ているのか」を読ませます。
 */
export function RepositoryCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {REPOSITORIES.map((repository) => (
        <Card key={repository.name}>
          <CardHeader>
            <CardTitle className="font-mono text-base">{repository.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{repository.description}</p>
          </CardContent>
          <CardFooter>
            <Button asChild size={BUTTON_SIZE.SMALL} variant={BUTTON_VARIANT.OUTLINE}>
              <a href={repository.url} rel="noreferrer" target="_blank">
                リポジトリを見る
              </a>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
