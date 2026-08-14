import { Skeleton } from "@/components/design-system/status/skeleton/skeleton";

/** 枠だけを出す入力項目の数。実際の項目数と揃える。 */
const PLACEHOLDER_FIELDS = 9;

const FIELDS = Array.from({ length: PLACEHOLDER_FIELDS }, (_, index) => index);

/**
 * プロフィール編集の待機表示。
 *
 * @remarks
 * 縦の長さを実物に合わせます。短い枠を出してから項目が展開されると、待っている間に置いた
 * scroll 位置が意味を失います。
 */
export function ProfileEditSkeleton() {
  return (
    <div aria-hidden="true" className="flex max-w-2xl flex-col gap-6">
      {FIELDS.map((field) => (
        <div className="flex flex-col gap-2" key={field}>
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
