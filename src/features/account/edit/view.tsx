import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/design-system/navigation/breadcrumb/breadcrumb";
import type { Prefecture, UserProfile } from "@/model/user/user";
import { withScreenSpan } from "@/observability/render-span";
import { MYPAGE_PATH } from "../facade/paths/paths";
import { ProfileForm } from "./ui/profile-form/profile-form";

type ProfileEditViewProps = {
  readonly profile: UserProfile;
  readonly prefectures: readonly Prefecture[];
};

/**
 * フォームが初期値に使う項目だけを、取得した object とは別の object へ写す。
 *
 * @remarks
 * 取得した object は Client Component へ渡せないものとして登録されています。
 *
 * @param profile - 取得したプロフィール
 * @returns フォームへ渡すプロフィール
 */
function toFormProfile(profile: UserProfile): UserProfile {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email,
    phone: profile.phone,
    postalCode: profile.postalCode,
    prefecture: profile.prefecture,
    city: profile.city,
    street: profile.street,
    building: profile.building,
  };
}

/**
 * global nav から 1 手で戻れない階層にあるため、パンくずで祖先への戻りを持つプロフィール編集の器。
 *
 * @remarks
 * nav が直接指すのはマイページまでで、ここはその下の階層にあります。
 *
 * @param props - 表示するプロフィールと選べる都道府県。
 */
export const ProfileEditView = withScreenSpan(
  "features/account/edit/view",
  ({ prefectures, profile }: ProfileEditViewProps) => {
    return (
      <div className="flex flex-col gap-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href={MYPAGE_PATH}>マイページ</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>プロフィール編集</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <ProfileForm prefectures={prefectures} profile={toFormProfile(profile)} />
      </div>
    );
  },
);
