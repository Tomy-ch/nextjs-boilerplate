import { getPrefectures } from "@/adapters/server/api/prefectures";
import { getMyProfile } from "@/adapters/server/api/users";
import { withScreenSpan } from "@/observability/render-span";
import { ProfileEditView } from "./view";

/**
 * プロフィール編集の取得と組み立て。
 *
 * @remarks
 * 自分の情報と都道府県のマスタを並置して合成します。合成をフロント側で行う理由は
 * [README](../README.md) の運用が持ちます。
 *
 * 並行に取るのは、順に待つ理由が無いためです。マスタは変わらないので取得の大半はキャッシュから
 * 返りますが、初回はそうではありません。
 */
export const ProfileEditPageContent = withScreenSpan(
  "features/account/edit/page-content",
  async () => {
    const [profile, prefectures] = await Promise.all([getMyProfile(), getPrefectures()]);

    return <ProfileEditView prefectures={prefectures} profile={profile} />;
  },
);
