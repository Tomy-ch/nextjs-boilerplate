import { Skeleton } from "@/components/design-system/status/skeleton/skeleton";

/** 待機表示が出すカードの数。出来上がりの段組みと同じ枚数を同時に出す。 */
export const PLACEHOLDER_CARDS = 2;

/** カードの中に並べる行数。プロフィールの項目数に合わせる。 */
export const PLACEHOLDER_ROWS = 4;

const CARDS = Array.from({ length: PLACEHOLDER_CARDS }, (_, index) => index);

const ROWS = Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => index);

/**
 * マイページの待機表示。
 *
 * @remarks
 * 出来上がりと同じ段組みで枠だけを出します。1 枚ずつ現れる形にすると、読み始めた位置が
 * 後から来たカードに押し下げられます。
 *
 * 退会の帯は含めません。取得を待たずに出せるもので、待機表示に混ぜると戻せない操作が
 * 読み込み中に押せる位置へ現れます。
 */
export function MypageSkeleton() {
  return (
    <div aria-hidden="true" className="grid items-start gap-6 lg:grid-cols-2">
      {CARDS.map((card) => (
        <div className="flex flex-col gap-4 rounded-lg border p-6" key={card}>
          <Skeleton className="h-6 w-40" />
          {ROWS.map((row) => (
            <Skeleton className="h-4 w-full" key={row} />
          ))}
        </div>
      ))}
    </div>
  );
}
