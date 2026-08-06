/**
 * この module を import すると、全 server Config singleton が評価される。
 *
 * `bootstrapConfig()` だけが import する起動用の集約入口であり、通常の request path からは使わない。
 */
import { getApiConfig } from "./api/api.server";
import { getAuthConfig } from "./auth/auth.server";
import { getMediaConfig } from "./media/media.server";
import { getObservabilityConfig } from "./observability/observability.server";

getApiConfig();
getAuthConfig();
getMediaConfig();
getObservabilityConfig();
