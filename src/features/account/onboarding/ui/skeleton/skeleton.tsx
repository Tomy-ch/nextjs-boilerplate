import { Skeleton } from "@/components/design-system/status/skeleton/skeleton";

/** 最初の段階に並ぶ入力の数。名字・名前・メールアドレス・電話番号。 */
const FIRST_STEP_FIELDS = ["lastName", "firstName", "email", "phone"];

/** 進捗に並ぶ段階の数。基本情報・住所・確認。 */
const STEPS = ["profile", "address", "confirm"];

/**
 * 登録の待機表示。
 *
 * @remarks
 * 最初の段階だけを象ります。段階に分けた入力は一度に 1 つしか現れないので、全項目ぶんの枠を
 * 置くと待機のほうが長くなります。
 */
export function OnboardingSkeleton() {
  return (
    <div aria-hidden="true" className="flex max-w-2xl flex-col gap-6">
      <div className="flex gap-4">
        {STEPS.map((step) => (
          <Skeleton className="h-6 flex-1" key={step} />
        ))}
      </div>
      {FIRST_STEP_FIELDS.map((field) => (
        <div className="flex flex-col gap-2" key={field}>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex justify-end gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}
