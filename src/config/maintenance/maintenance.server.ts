import "server-only";

import { getEnvironment } from "../environment";
import type { MaintenanceEnvironment } from "./maintenance.schema";

class MaintenanceConfig {
  readonly #mode: "off" | "on";

  private constructor(mode: "off" | "on") {
    this.#mode = mode;
  }

  /** 検証済み ENV から production singleton を組み立てる。 */
  static fromValues(values: MaintenanceEnvironment): MaintenanceConfig {
    return new MaintenanceConfig(values.APP_MAINTENANCE_MODE);
  }

  /** 配信を止めているか。 */
  get isStopped(): boolean {
    return this.#mode === "on";
  }
}

let maintenanceConfig: MaintenanceConfig | undefined;

/**
 * 配信を止めているかを供給する、プロセス内で不変な singleton を返す。
 *
 * @remarks
 * **切り替えには起動し直しが要ります。** ENV はプロセスに一度だけ読み込まれ、以後は同じ評価結果
 * を配るためです（[README](../README.md)）。止める / 戻すはどちらも配備先の環境設定を変えて
 * 立ち上げ直す操作であり、実行中のプロセスへ効かせる口は持ちません。
 */
export function getMaintenanceConfig(): MaintenanceConfig {
  maintenanceConfig ??= MaintenanceConfig.fromValues(getEnvironment());
  return maintenanceConfig;
}
