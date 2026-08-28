import { z } from "zod";

/** maintenance purpose 専用の ENV validator を定義する。 */

const maintenanceMode = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === undefined || value === "" ? "off" : value))
  .pipe(z.enum(["off", "on"]));

/**
 * 配信を止めているかの指定を検証する。
 *
 * @remarks
 * **未設定と空文字はどちらも「止めていない」です。** 止めるのは運用が明示したときだけであり、
 * 欠落を不正として落とすと、この変数を注入していない環境が起動できなくなります。止まっている
 * 側を既定にすると、設定を忘れた環境が全ルート停止で立ち上がります。
 */
export function maintenanceModeValidator() {
  return maintenanceMode;
}

export type MaintenanceEnvironment = {
  APP_MAINTENANCE_MODE: z.infer<ReturnType<typeof maintenanceModeValidator>>;
};
