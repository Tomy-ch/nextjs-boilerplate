# Tooltip

## 用途

アイコンや略記など、それだけでは意味が自明でない要素へ短い補足を添え、画面を離れずに読めるようにします。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `TooltipProvider` | 配下の Tooltip が表示遅延を共有する境界です。`Tooltip` はこの Provider を祖先に必要とします。 |
| `Tooltip` | hover / keyboard focus に応じた開閉状態を管理する client-side root です。 |
| `TooltipTrigger` | Tooltip を開く trigger です。`Button` や link を使う場合は `asChild` で合成します。 |
| `TooltipContent` | Portal へ表示する補足文です。位置は `side` / `align` / `sideOffset` で調整します。 |

## 利用ケース

- アイコンだけのボタンや、単位・略号を伴う数値へ短い説明を添える場合
- 値の算出根拠のように、読めば理解の助けになるが、読まなくても操作を完了できる補足を置く場合

操作を含む内容には使わず `Popover`、まとまった補足情報には `HoverCard`、不可逆操作の確認には `AlertDialog` を使います。

## 責務境界

SSR first の選定では `△` に当たります。既定は静的な補足文・`title` 属性・focus 対応 CSS・明示的な詳細 link であり、位置計算・表示遅延・hover interaction が必要になった場合にこの client island を選びます。表示位置の計算と遅延制御のため hydration が必要で、Server Component からは直接 render できません。内容自体に client runtime が要らない場合は、Server Component で組み立てた要素を `children` として渡します。

表示する文言、取得、業務判断は持ちません。`TooltipProvider` を mount する位置も feature 側の判断です。tooltip を使う画面の外側で一度だけ mount し、`Tooltip` ごとに入れ子で置きません。Provider を分けると、trigger を移動したときに遅延を省く連続性が失われます。

**ただし、内部に複数の tooltip を持つ部品は自分で Provider を持ちます。** `RichTextEditor` が先例で、外へ出すと呼び出し側が mount し忘れた瞬間に描画時の例外になるためです。この場合、その部品の中の tooltip どうしだけが遅延の連続性を共有します。上の「feature 側の判断」が指すのは、feature が `Tooltip` を自分で並べる場合です。

`TooltipContent` は `role="tooltip"` を持ち、開いている間だけ trigger の `aria-describedby` から参照される**説明**です。trigger のアクセシブルな名前にはならないため、アイコンだけの trigger には `aria-label` か視覚的に隠したテキストを trigger 側で必ず与えます。内容には link・button・入力などの focus 可能な要素を入れません。pointer が離れると閉じるため、tooltip 内の操作には到達できません。

tooltip は pointer hover と keyboard focus でしか開かず、touch 環境では到達できません。操作や判断に不可欠な情報は tooltip だけに置かず、常時表示または明示的な導線を feature 側にも用意します。

面は `bg-foreground` / `text-background` の反転色で描画し、trigger を指す arrow を伴います。ページ内容の上へ重なるため面は不透明である必要があり、反転色は同時に、常時表示の補足文と一時的な tooltip を見分けられるようにします。arrow が trigger へ接するよう `sideOffset` の既定は `0` です。

vendor は現在 Radix ですが、公開 API に vendor 名は含めません。

## Storybook とテスト

Storybook は既定の開閉、開いた状態の説明、`side` / `align` による配置、アイコンだけの trigger に名前を与える場合、一つの Provider を共有して遅延をまとめる場合、内容が一行に収まらない場合の折り返し幅指定を確認します。

テストは開くまで内容を描画しないこと、閉じている間は `aria-describedby` を持たないこと、keyboard focus での開閉、Escape での閉じ、Portal 内容が `role="tooltip"` として trigger の説明になること、trigger のアクセシブルな名前が tooltip の内容に依存しないこと、a11y 自動検査を確認します。hover 経路は表示遅延の timer を伴うため、Storybook で確認します。

a11y 自動検査では `color-contrast` に加えて `region` を無効化します。`region` は「ページの内容がすべて landmark に含まれるか」を見る page 単位の best-practice 規則であり、landmark を持たない component 単体の render と、Portal で `body` 直下へ出る内容の両方に構造上適合しません。component の意味論を見る規則ではないため、無効化しても検査範囲は狭まりません。
