import { AlertTriangleIcon } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/design-system/status/alert/alert";

import { ABOUT_PATH, PRIVACY_PATH } from "../facade/paths/paths";

/**
 * 利用規約。
 *
 * @remarks
 * 閲覧そのものにリスクがあることを最初に書きます。**このサイトの主なリスクは、利用者が何かを
 * するかどうかとは無関係に存在する**ためで、行為の禁止事項から始める体裁では伝わりません。
 *
 * 免責はここに集めます。「このサイトについて」と 2 か所に置くと、片方だけ直した状態を作れます。
 */
export function TermsView() {
  return (
    <div className="flex max-w-3xl flex-col gap-8 text-sm leading-relaxed">
      <Alert variant="warning">
        <AlertTriangleIcon />
        <AlertTitle>閲覧した時点で同意したものとみなします</AlertTitle>
        <AlertDescription>
          <p>
            このサイトを閲覧した場合、以下の内容に同意したものとみなします。同意できない場合は
            利用しないでください。
          </p>
        </AlertDescription>
      </Alert>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">セキュリティについて</h2>
        <p>
          このサイトの構成は、将来的に <span className="font-mono">infra-boilerplate</span> として
          公開する予定です。その中で一般的なセキュリティ対策は行いますが、
          <strong>
            設定値を含めて内容がすべて公開されるため、攻撃の難易度は通常のサイトより 低くなります。
          </strong>
        </p>
        <p>
          外部からの不正アクセスやデータベースへの侵入が起きた場合でも、
          <strong>利用者・閲覧者へこちらから連絡することはありません。</strong>
          影響を受けて困る情報は、最初から入力しないでください。
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">入力する情報について</h2>
        <p>
          氏名・住所・電話番号・メールアドレスには、
          <strong>必ず偽名や実在しない値を入力してください。</strong>
          本物の個人情報を入力した結果生じた事態について、作者は責任を負いません。
        </p>
        <p>
          保存先は起動のしかたで変わります。詳しくは
          <Link className="underline underline-offset-4" href={PRIVACY_PATH}>
            プライバシーポリシー
          </Link>
          を読んでください。
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">サービスの提供について</h2>
        <p>
          <strong>
            予告なくメンテナンス・停止・仕様変更・データの全件削除を行うことがあります。
          </strong>
          お知らせ画面などでの事前・事後の通知は行いません。保存した内容が残り続けることも、
          同じ画面が明日も存在することも保証しません。
        </p>
        <p>
          購入・決済は成立しません。注文しても商品は届かず、請求も発生しません。何が動かないかは
          <Link className="underline underline-offset-4" href={ABOUT_PATH}>
            このサイトについて
          </Link>
          に書いてあります。
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">やめてほしいこと</h2>
        <p>
          脆弱性の探索・過負荷をかける操作・自動化した大量の要求・他の利用者が入力した内容の
          収集は行わないでください。動作を確かめたい場合は、公開されているサイトではなく、
          自分の手元へ clone して動かしてください。
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">免責</h2>
        <p>
          このサイトおよび公開しているコードは現状のまま提供されます。
          <strong>利用した結果として生じたいかなる損害についても、作者は責任を負いません。</strong>
          動作の正確性・完全性・特定の目的への適合性についても保証しません。
        </p>
        <p>
          コードを自分の用途へ持ち込む場合は、そのまま本番で使えるものとしてではなく、判断の
          出発点として扱ってください。
        </p>
      </section>
    </div>
  );
}
