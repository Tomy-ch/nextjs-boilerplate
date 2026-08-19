/**
 * 期間の選択肢 1 つ分の見た目。
 *
 * @remarks
 * 定義を切り出しているのは、**選択肢の 1 つが client island だから**です。日付を選ぶ操作は
 * overlay を開くため hydration が要り、残る 2 つは link のままで足ります。同じ並びに置くものが
 * 別のファイルへ分かれても、見た目は 1 か所が決めます。
 */
export const PERIOD_CHOICE_CLASS =
  "block rounded-md px-3 py-1.5 text-sm font-emphasis transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-active focus-visible:shadow-glow-primary";

/** 選ばれている選択肢の見た目。 */
export const PERIOD_CHOICE_SELECTED_CLASS = "bg-background text-foreground shadow-panel";

/** 選ばれていない選択肢の見た目。 */
export const PERIOD_CHOICE_IDLE_CLASS = "text-muted-foreground hover:text-foreground";
