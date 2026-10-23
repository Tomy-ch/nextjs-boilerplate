import Link from "next/link";

import {
  List,
  ListItem,
  ListItemContent,
  ListItemDescription,
  ListItemLink,
  ListItemTitle,
} from "@/components/design-system/display/list/list";
import { LIST_ITEM_VARIANT } from "@/components/design-system/display/list/list.definition";
import { COUPONS_PATH } from "@/features/coupons/facade/paths/paths";
import { withPartSpan } from "@/observability/render-span";

/**
 * 保有クーポンへの導線。
 *
 * @see Storybook `Features/Account/Mypage/CouponsLink`
 */
export const MypageCouponsLink = withPartSpan(
  "features/account/mypage/ui/coupons-link/coupons-link",
  () => {
    return (
      <List>
        <ListItem variant={LIST_ITEM_VARIANT.OUTLINE}>
          <ListItemLink asChild>
            <Link href={COUPONS_PATH}>
              <ListItemContent>
                <ListItemTitle>クーポン</ListItemTitle>
                <ListItemDescription>
                  受け取ったクーポンの確認と、キャンペーンコードでの受け取り
                </ListItemDescription>
              </ListItemContent>
            </Link>
          </ListItemLink>
        </ListItem>
      </List>
    );
  },
);
