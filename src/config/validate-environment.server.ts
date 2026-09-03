import "server-only";

/**
 * この module を import すると、全 server Config singleton が評価される。
 *
 * `bootstrapConfig()` だけが import する起動用の集約入口であり、通常の request path からは使わない。
 */
import { getApiConfig } from "./api/api.server";
import { getAuthConfig } from "./auth/auth.server";
import { getClockConfig } from "./clock/clock.server";
import { getHttpConfig } from "./http/http.server";
import { getMaintenanceConfig } from "./maintenance/maintenance.server";
import { getMediaConfig } from "./media/media.server";
import { getObservabilityConfig } from "./observability/observability.server";
import { getSiteConfig } from "./site/site.server";

getApiConfig();
getAuthConfig();
getClockConfig();
getHttpConfig();
getMaintenanceConfig();
getMediaConfig();
getObservabilityConfig();
getSiteConfig();
