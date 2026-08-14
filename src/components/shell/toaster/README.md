# Toaster

## 用途

redirect しない mutation の成功・失敗を、一時的な通知として表示します。

## 役割と公開 component

| Component | 役割 |
| --- | --- |
| `ToastProvider` | 通知 queue と同時表示の上限を保持し、配下のどこからでも通知を出せるようにする client Provider です。自身が `Toaster` を描画します。 |
| `useToast` | 配下から `toast()` / `update()` / `dismiss()` と、同時表示上限の `visibleToasts` / `setVisibleToasts` を取り出します。Provider の外で呼ぶと例外を投げます。 |
| `Toaster` | 渡された通知を画面の隅へ積みます。queue は持ちません。 |
| `Toast` | 通知の id、文言、variant、任意の auto-close `duration`、任意の `action` を表す型です。 |
| `ToastAction` | 通知から直接実行できる操作（文言と処理）を表す型です。 |
| `ToastPatch` | `update()` に渡す差分の型です。`id` は変えられません。 |
| `ToastControls` | `useToast()` が返す操作一式の型です。 |

`TOAST_VARIANT`・`TOAST_POSITION`・`DEFAULT_VISIBLE_TOASTS`・`DEFAULT_TOAST_POSITION`・`DEFAULT_TOAST_HOTKEY` などの静的定義は `toaster.definition.ts` が owner です。

内部は責務ごとに 3 つのファイルへ分けています。`toaster.tsx` が queue と公開面、`toast-region.tsx` が積む位置・畳み方・領域への到達手段、`toast-item.tsx` が通知一件の描画・計時・払いのけです。`ToastRegion` と `ToastItem` は公開 API ではありません。

## 利用ケース

局所操作の保存完了、非破壊的な失敗、バックグラウンド処理の完了通知に使います。

通常は `ToastProvider` を root layout へ一度だけ置き、通知を出す側は `useToast()` の `toast()` を呼ぶだけにします。これで呼び出し側は queue の state も dismiss の配線も持ちません。

```tsx
const { toast } = useToast();
toast({ title: "保存しました", duration: 5000 });
```

処理中の表示を結果へ変える場合は、`toast()` が返した `id` を `update()` へ渡します。同じ場所のまま差し替わるため、通知が二重に積まれません。

```tsx
const id = toast({ title: "処理中です" });
// 完了後
update(id, { title: "完了しました", duration: 5000 });
```

queue の保持を呼び出し側で行いたい場合だけ、`Toaster` を直接使って `toasts` と `onDismiss` を渡します。

## 責務境界

Server Action の結果分類は feature が所有します。`Toaster` は queue を持たず、`ToastProvider` を使う場合も保持するのは表示中の通知だけで、永続化・再送・既読管理はしません。文脈内で必要な失敗表示や不可逆操作の確認は `FormFeedback` / `AlertDialog` を使います。

閉じた通知は、呼び出し元が queue から外すまでのあいだ `Toaster` 側でも表示を止めます。呼び出し元の反映を待たずに消すためです。この抑制は **`toasts` からその `id` が消えた時点で解けます**。解かないと、対象ごとに `id` を採る呼び出し元（同じ対象で再び失敗したら同じ `id`）では、二度目の通知が二度と出せなくなります。

同時に表示する件数は `visibleToasts`（既定 3）で抑えます。上限が無いと連続した失敗で画面の隅が覆われ、操作面を塞ぐためです。超えた分は queue に残り、表示中の通知が閉じると現れます。0 以下を渡すと何も表示しません。

`ToastProvider` を使う場合、この上限は `defaultVisibleToasts` が初期値になり、以後は `useToast()` の `setVisibleToasts` で実行時に変えられます。一括処理の結果をまとめて見せたい画面のように、その画面でだけ広げたい場合に使います。**一時的に広げたら離脱時に戻すのは呼び出し元の責務**で、戻さないと以後すべての画面がその上限のままになります。

```tsx
const { setVisibleToasts } = useToast();

useEffect(() => {
  setVisibleToasts(6);
  return () => setVisibleToasts(DEFAULT_VISIBLE_TOASTS);
}, [setVisibleToasts]);
```

`position` は積む隅を決めます。画面ごとに変えると通知の出所が定まらないため、アプリで一つに決めます。払いのけて閉じる向きはこの位置から導出し、画面の外へ向かう向きだけを受け付けます。上下中央に積んだ場合、横へは払えません。

通知が複数あるとき、既定では重ねて畳み、hover するか領域内へ focus が入ったときだけ展開します。常に並べたい場合は `expand` を指定します。

通知は任意のページ内容の上へ重なるため、面は不透明にします。`Alert` の `warning` / `destructive` は文脈内で使う前提の 10% の色であり、そのままでは下の内容が透けます。`Toaster` 側で `bg-background` の下地を敷いたうえに、その色を重ねています。`Alert` 自体は文脈内での見た目が正しいので変えていません。

`variant` が `destructive` の通知だけを `role="alert"` として読み上げに割り込ませ、ほかは `role="status"` で読み上げ中の内容を妨げずに順番を待たせます。成功の報告まで割り込むと、支援技術の利用者は読んでいる内容を毎回中断されます。

通知の領域は名前つきの landmark であり、`hotkey`（既定は `Alt` + `T`）で focus を移せます。通知は数秒で消えるため、pointer を持たない利用者にとってはこれが到達手段になります。`hotkey.code` は物理キーを指すので、キーボード配列が変わっても同じ位置のキーで届きます。**この hotkey は通知の領域へ focus を移すだけで、アプリ全体の shortcut 機構ではありません。** 任意の操作へキーを割り当てる仕組みは別途決めます。

`action` は「元に戻す」「再試行」のように、通知を読んだ直後にしか意味を持たない操作だけに使います。通知は数秒で消えるため、ここにしか到達手段が無い操作は置きません。選択すると処理を実行して通知を閉じます。

`duration` の progress は通常の処理進捗ではなく、通知が閉じるまでの残り時間です。表示は満タンから時間経過に合わせて縮み、右側から左側へ減っていきます。値が増える進捗を表す用途には使いません。描画は `ProgressClient` に委ね、残り時間の計測と `value` / `max` の受け渡しだけをこちらが持ちます。100ms 間隔の更新に合わせるため、進捗部分の transition は `indicatorClassName` で線形に指定します。

自動で閉じる計時は、**hover しているあいだ・領域内へ focus が入っているあいだ・通知を掴んでいるあいだ・タブが背面にあるあいだ**は進みません。hover と focus は「読もうとしている」意思表示であり、その最中に消えるのは操作の裏切りになります。タブが背面のときは誰も見ておらず、戻ったときには通知が消えていて結果を知る手段が無くなります。

`expand` で常時展開している場合は止めません。展開されていることと、読んでいることは別だからです。

## Storybook とテスト

Storybook は variant 三種、auto-close、`action` つき、畳んだ状態と `expand`、`position` の違い、`visibleToasts` の上限、`ToastProvider` から命令的に出す場合、上限を実行時に増減する場合、表示中の通知を差し替える場合を確認します。テストは表示と dismiss、queue から外れた通知を同じ `id` で再び出せること、`destructive` だけが `role="alert"` になること、名前つき landmark へ収まること、hotkey での focus 移動と修飾キーが合わない場合、畳みと hover / focus での展開、`position` に応じた払いのけの向き（逆向き・中央・主ボタン以外では閉じないこと）、上限と超過分の繰り上がり、上限に 0 以下を渡した場合、`action` の実行と自動 dismiss、残り時間の減少と自動閉じ、`duration` が 0 以下の場合、hover / focus / 掴んでいるあいだ / タブが背面のあいだ計時が止まり離れると再開すること、Provider 経由の追加・削除・上限・差し替え、Provider の外で `useToast` を呼んだときの例外、a11y 自動検査を確認します。

払いのけは jsdom で pointer イベントを直接発火して検証しています。実際の慣性やアニメーションは再現されないため、感触は Storybook で確認します。
