import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "../../action/button/button";
import { BUTTON_VARIANT } from "../../action/button/button.definition";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";

const meta = {
  title: "Overlay/AlertDialog",
  component: AlertDialog,
  parameters: {
    layout: "centered",
    docs: {
      story: { inline: false, iframeHeight: 420 },
      description: {
        component: [
          "取り消せない操作を、実行する前に確認させる modal です。閉じる手段が 2 つの選択肢だけに",
          "限られ、背景のクリックや Escape では閉じません。**判断を迫る場面にだけ使い**、",
          "内容の閲覧や通常の編集には `Dialog` を使います。区別が要るのは、どちらも同じ見た目の面を",
          "開くのに、誤って閉じたときの結果が違うためです。",
          "何を実行するかはこの component が決めません。`AlertDialogAction` に渡した操作を呼ぶだけです。",
        ].join(""),
      },
    },
  },
} satisfies Meta<typeof AlertDialog>;
export default meta;
type Story = StoryObj<typeof meta>;

function DeleteConfirmation({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return (
    <AlertDialog defaultOpen={defaultOpen}>
      <AlertDialogTrigger asChild>
        <Button
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          variant={BUTTON_VARIANT.DEFAULT}
        >
          削除する
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>この操作は取り消せません。</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            variant={BUTTON_VARIANT.DEFAULT}
          >
            削除する
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** trigger を押して開く基本構成。 */
export const Default: Story = { render: () => <DeleteConfirmation /> };

/**
 * 開いた状態。取り消す側を先に置き、実行する側を右へ置く。実行の文言は「はい」ではなく、
 * 何が起きるかを書く。
 */
export const Open: Story = { render: () => <DeleteConfirmation defaultOpen /> };
