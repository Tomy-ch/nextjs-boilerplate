# Policy of Not Adopting Docker

This project's policy is **not to adopt Docker for application delivery**. Specifically, it does not bundle a `Dockerfile` for running the Next.js application itself, nor a `docker-compose.yml` / `.dockerignore` for delivering it. Together with this, it defines the repository's intended role as **"an application foundation that uses Next.js as the presentation layer"**, and primarily assumes PaaS / static CDN as deployment targets.

On the other hand, using **docker-compose as dev infrastructure** (auxiliary tools independent of starting the application, such as a mock backend API, an OpenAPI viewer, a docs viewer and a Lighthouse runner) is outside what this ADR prohibits (see the section "docker-compose as Dev Infrastructure (Exception)" below).

## Status

Accepted

## Character of the Repository

This repository is **a general-purpose Next.js application foundation**. This is a **concretization** of the role definition "use Next.js as the presentation layer", not an extension or change of that role. Its granularity is deciding here the general-purpose libraries the presentation layer needs (backend business logic / DB and ORM / self-hosting the application with Docker are outside the role).

It aims at three things (the three pillars of its philosophy).

1. **The frontend can be assembled without having to think about it** — where things go, how they are written and the connection points are settled, so judgments are not redone every time
2. **You can implement from the design and the READMEs** — the design answers how a screen looks; the layer READMEs answer how components are used and what they are responsible for
3. **Responsibilities are separated and implementation stays clean** — layer boundaries are guarded by machines, and the right place for something can be read from its name

### Scope of Bundled Libraries

- **General-purpose, everyday libraries** (UI components / form state / global state / display formatting / observability, etc.) are **bundled as necessities**. The breakdown of what is adopted is held by each ADR's body
- **Libraries used locally** (i18n / rich text / DnD / payments / analytics / PWA, etc.) are **not bundled; only a seam is kept**. These are dependencies whose need splits from project to project; carrying them by default makes the side that does not use them do the work of removing them. With a seam in place, the side that needs one can add it without designing the boundary itself

### Meaning of Out-of-Scope

Out-of-scope means "**outside the role boundary**" (backend business logic / DB and ORM / self-hosting the application with Docker, etc.). It is not a reservation in selection such as "not decided yet / kept minimal". Undecided general-purpose libraries are not out-of-scope; each is **already decided** in its ADR. Accordingly, the out-of-scope parts this ADR sets — not adopting Docker and the presentation-layer role — draw a line of "outside the target by the role definition in the first place", not "left out because the use is undecided".

### Discipline of Adoption ([0010](0010-standards-and-non-lockin.md) / [0004](0004-library-management.md))

The adoption of each bundled library is owned by its individual ADR, not by this one. This ADR only refers to them from the viewpoint of role consistency, but every adoption requires the following.

- [0010](0010-standards-and-non-lockin.md): ride on the de facto standard while **stating vendor-independent justifying material in the body**, and keep it **replaceable behind the adapters / kernel boundary** (do not scatter direct vendor references across features / components).
- [0004](0004-library-management.md): core dependencies are **exact-pinned**, and **`pnpm audit`** is run when they are added.

## Rationale

### 1. The Intended Role Is Limited to the "Presentation Layer"

This repository is defined as an application foundation that uses Next.js as the "frontend presentation layer".

- UI rendering (CSR / SSR / ISR / static export) is the main responsibility
- The backend API (DB / authentication / business logic) is **a separate repository or service** (e.g. Go / Rails / NestJS / Supabase, etc.)
- Next.js `/api/*` routes are limited to a BFF (a thin proxy to external APIs, auth token exchange) and do not take on business logic

Under this premise, the needs that Dockerizing the application solves — "confining heavy system dependencies in a container" and "co-locating backend services such as a DB / Redis" — structurally do not arise in the application delivery layer (peripheral services as development aids are a separate matter; see below).

### 2. None of the Intended Deployment Targets Need Docker

| Deployment form | Example platforms | Docker |
| --- | --- | --- |
| Static export (`output: "export"`) + CDN | S3+CloudFront / GitHub Pages / Cloudflare Pages, etc. | Not needed |
| SSR / ISR on PaaS | Vercel / Netlify / AWS Amplify | Not needed |
| SSR on a PaaS running Node directly | Railway / Render | Not needed |

- **Cloudflare is a separate case**: Next.js on Cloudflare presupposes the Workers / OpenNext approach, with heavy edge-runtime constraints and limited ISR (it cannot be treated on a par with general PaaS as "ISR without Docker too"). Static export + Cloudflare Pages delivery is included in the CDN row above, but SSR / ISR is treated as a separate case with constraints.
- **Fly.io is out of scope**: Fly.io is an OCI container runtime platform, and `fly launch` generates a Dockerfile by default. It needs a Dockerfile, so it is outside this policy (no Docker for the application itself).

Docker is realistically needed only for the option of self-hosting Next.js (container runtime platforms such as ECS / Kubernetes / on-premises / Fly.io), which this repository does not assume.

### 3. `next/image`'s sharp Has No External System Dependencies

The `next/image` component uses `sharp` internally, but modern `sharp` (≥ 0.32) **ships prebuilt binaries**, so there is no need for steps that `apk add` `vips-dev` / `libjpeg-turbo-dev` / `libpng-dev` / `libwebp-dev` and the like. `pnpm install` alone completes it.

"Confining `sharp`'s system dependencies in a container", which could be a motive for keeping Docker, addresses a dependency that does not exist in modern sharp.

### 4. Reducing the Maintenance Burden

Keeping Docker would require syncing the following on every release.

- The `FROM` tag in `Dockerfile` ↔ the `node` version in `mise.toml`
- The install commands in `Dockerfile` ↔ ADR 0001's pnpm policy (no `npm ci` + `package-lock.json`)
- A duplicated lockfile (`package-lock.json` ↔ `pnpm-lock.yaml`)

Not bundling it structurally removes this syncing work and "drift from forgetting to sync".

## Intended Deployment Targets

In principle this repository is intended to deploy to one of the following.

- **Vercel** (run by the makers of Next.js; fastest to follow new features)
- **AWS Amplify Hosting** (integration with the AWS ecosystem)
- **Netlify** (vendor-neutral PaaS)
- **Cloudflare Pages** (specialized in edge delivery)
- **Static CDN** (with `output: "export"`; S3+CloudFront / GitHub Pages, etc.)

To deploy anywhere else (ECS / Kubernetes / in-house on-premises, etc.), reassess this ADR as **a role extension** (see "Reassessment Triggers" below).

## Defining Environments

`APP_ENV` can be one of five: `local` / `ci` / `dev` / `stg` / `prd`
(`src/config/application-environment.ts`). Here we set **what each environment is for**. **How variables are held is
[0030](0030-environment-variable-management.md)'s responsibility** and is not covered in this section — 0011 says "what each environment
is for", 0030 says "how that environment's values are held".

### stand-alone and cloud

Only two names are introduced. **No config axis is added** — the substance is the existing `APP_ENV` and `env/.env.<environment>`,
and the names are words the documents use to point at those two groups.

| Name | `APP_ENV` | What it is for |
| --- | --- | --- |
| **stand-alone** | `local` / `ci` | Every screen works without signing up for anything. Bringing up compose provides the IdP, image delivery and the API, so someone with no accounts on external services can try it the same day |
| **cloud** | `dev` / `stg` / `prd` | Point the connection targets in `env/.env.<environment>` at your own IdP / CDN / API. Go through the same path production does |

The place of each environment:

- **`local`** — local development. The development-only endpoints are open
- **`ci`** — automated checks. It points at the same counterpart as local (mock), and every screen must work without human intervention. The development-only
  endpoints are open
- **`dev`** — the first place that connects to external services. It talks to the real IdP and real API, and **the development-only endpoints are
  closed**
- **`stg`** — verification with the same configuration as production
- **`prd`** — production

### Deciding Development-Only Endpoints

**The decision is held by `APP_ENV` and the destination, and depends neither on the kind of connection target nor on the names above.**

- **`APP_ENV`** — whether endpoints may be opened in that environment (`developmentOnlyEnvironments`)
- **Destination** — whom the endpoint faces. Held on the route / handler side

The names (`stand-alone` / `cloud`) are not used for the decision because they are **aliases** for the two groups, not an independent
axis. It does not depend on a connection mode such as `APP_API_MODE` either — not placing mocks in real environments is
only a promise in prose, and a decision conditioned on a promise goes silent the moment the promise is broken.

### Do not bundle the axes

An axis that takes "stand-alone / cloud" as its value, such as `APP_MODE`, is **not introduced**. Bundling them would make combinations such as
**Cognito for the IdP with self-hosted storage** or **Keycloak for the IdP with CloudFront for delivery**
impossible to express. Reality is such combinations, and bundling them would amount to denying
[0010](0010-standards-and-non-lockin.md)'s non-lock-in in the shape of the config.
**Put an independent setting only at the points where the implementation really splits, and only as far as it splits.**

## What Is Not Bundled

The following (**anything related to Docker delivery of the application itself**) is not bundled.

- `Dockerfile` (for the Next.js application itself)
- `docker-compose.yml` (for delivering the application)
- `.dockerignore`
- Recommendations of "starting with Docker" in the README

Configuration files such as `mise.toml` / `package.json` / `pnpm-lock.yaml` serve as the SSOT.

## docker-compose as Dev Infrastructure (Exception)

This ADR's policy is **not to use Docker to deliver the application itself (the Next.js application proper)**; running **auxiliary tools** started independently during development with Docker / docker-compose is not prohibited.

### No compose for backend / IdP / storage; connect to the backend's stack

This repository does **not have** compose files that bring up a backend / observability / storage / IdP. What development needs from those is covered by connecting to the compose stack in the backend repository. If the presentation-layer repository held the backend's start-up procedure, it would have to follow the backend's changes, managing the same thing twice.

| Connection target | Default | Purpose |
| --- | --- | --- |
| API | `http://localhost:8080` | Where the BFF points |
| OTLP | `http://localhost:4318` | Observability ([0081](0081-observability-logging.md)). Grafana is at `:3000` |
| Object Storage | `http://gobp-local.web.garage.localhost:3902` | Image delivery (virtual-host style only; [0045](0045-fonts-and-images.md)) |
| Authentication | `http://localhost:4000` | Pseudo-OIDC ([0079](0079-auth-frontend-seam.md)) |

When working on the frontend alone, switch to the **MSW mocks** (`APP_API_MODE=mock`). Every connection target can be swapped through env and is not baked into code ([0030](0030-environment-variable-management.md)). The above are development defaults; with a different backend, swapping env is enough.

### Possible Uses

| Use | Example tools | Nature |
| --- | --- | --- |
| Mock backend API | `mockoon` / `prism` / `wiremock` | Makes frontend development independent of the real backend |
| OpenAPI viewer | `redocly/redoc` / Swagger UI | Checks the backend's API spec |
| Docs viewer | `nginx` + Markdown / Mermaid renderer | Serves `docs/` with Mermaid |
| Lighthouse / e2e runner | Self-managed headless Chrome / Playwright | Performance and regression verification |

These are a different layer from "running the application itself in Docker", and no sync problem with `mise.toml` / `pnpm-lock.yaml` arises (base images may be managed independently).

**The only one adopted is the visual regression runner** (`browser_runner` in [`docker-compose.dev-tools.yml`](../../docker-compose.dev-tools.yml)). Baseline images depend on font rasterization, which varies with both the OS and the CPU architecture, so a means of detaching the comparison baseline from the runner's environment is needed ([0091](0091-test-verification-methods.md)). Docker is adopted here because the answer to "can this only be solved with Docker" is yes, which differs in nature from uses that PaaS / SaaS can substitute (below).

### Pin auxiliary tool images by digest

A registry tag can point at different contents under the same name, so a tag-only reference lets the runtime environment change silently. Therefore **the version SSOT stays on the tag side, and a lockfile (`docker/images-pin.toml`) holds the `image:tag` → digest mapping**. Once pinned, pulls fail as soon as the target changes. The procedure is in [`docker/README.md`](../../docker/README.md).

- **This mechanism pins every reference to a registry image, wherever it is written.** The targets are compose `image:` and `FROM` in `docker/<purpose>/Dockerfile`, plus `uses: docker://<image>:<tag>` in workflows / composite actions (the step syntax with which GitHub Actions runs a registry image directly). Even though it is a `uses:` line, the reference is not a GitHub repository, so actions-pin ([0153](0153-ci-configuration.md)), which resolves tags to commit SHAs with `git ls-remote`, cannot handle it. The two mechanisms overlap in the files they scan but not in the lines they pick up. `docker://` references must have a tag, and omitting it (= `:latest`) fails closed
- **Only digests that have passed quarantine are taken.** Resolution does not take digests less than 14 days after publication (`IMAGES_PIN_MIN_AGE_DAYS`; the window length is set for the same reason as [0110](0110-security-operations.md)'s supply-chain quarantine). This buys time for the upstream to detect a takeover and revoke it; an existing pin is kept if there is one. A freshly made image with nothing to fall back to fails rather than being left as a tag
- **Tag re-pointing is not detected.** A base image's tag usually moves forward every time a patch version comes out, and adding "stop if the resolution changes" would make it impossible to tell from everyday updates. Only here does the operation differ from Actions' SHA pins ([0153](0153-ci-configuration.md)). The defenses that work for images are **two: quarantine and pinning**
- **Do not use official actions that accept an image only by tag.** For example, the official action of a DAST tool accepts its image by tag, and that input is outside this mechanism's scan. Rather than adding one more pin that looks pinned but that nobody checks, align it with the other auxiliary tools as a service in the same compose

### Rules When Adopting

1. **Distinguish from application delivery by file name** — e.g. `docker-compose.dev-tools.yml` / `docker-compose.docs.yml`. A plain `docker-compose.yml` is easily mistaken for application delivery and is not used
2. **Make the start command explicit** — point at the dedicated file, as in `docker compose -f docker-compose.dev-tools.yml up`. Designed not to start with `docker compose up` alone
3. **Run the application's Node / pnpm outside containers** — Next.js itself assumes running on the host with `pnpm dev` (mise resolves PATH, consistent with ADR 0003)
4. **State in the README / docs that "this is an auxiliary tool, not a deliverable"** — so users do not mistake it for a production deployment target
5. **A PR that newly introduces `docker-compose.dev-tools.yml` always references an ADR addendum or a related issue** — to record in history that this is exceptional operation

### When Not Adopting

Many of the uses listed here can be substituted by PaaS / SaaS (an in-Node mock such as MSW for mock APIs, Stoplight Studio / Postman for the OpenAPI viewer, GitHub Pages and the like for the docs viewer). Ask once **whether it can only be solved with Docker**.

## If you want to self-host or containerize

Guidance when extending to a role that needs Docker / self-hosting:

1. Treat this ADR as superseded (retired), and declare the override "this project adopts Docker" in a separate ADR
2. Create a new `Dockerfile`
3. Align the following with the SSOT:
   - Match `FROM node:<X.Y.Z>-alpine` with `node` in `mise.toml`
   - Adopt `RUN pnpm install --frozen-lockfile` (do not use `npm ci`)
   - Do not use `package-lock.json` (use `pnpm-lock.yaml`)

## Reassessment Triggers

Reassess whether to keep this ADR as soon as any of the following happens.

- The repository's role is extended from "presentation layer" to "full stack (with the API co-located)"
- Self-hosting Next.js (ECS / Kubernetes / in-house on-premises) is required as a **first-class deployment target** of this repository

> "Wanting to bring up a DB / Redis / mock API / docs viewer and the like in containers for local development" is the domain of Type B (dev infrastructure) and is not among this ADR's reassessment triggers (introduce it with a dedicated file name per the section "docker-compose as Dev Infrastructure (Exception)").

## Prohibitions

- ❌ Reinstating **a `Dockerfile` for the application itself** or **a `docker-compose.yml` (plain) for delivering the application** as a main part of the configuration (Enforcement: none — a decision not to adopt. The absence of an application `Dockerfile` or a plain `docker-compose.yml` is itself the state; adding one shows up in the diff as an added file)
- ❌ Describing "starting with Docker" in the README / documentation as **a recommended deployment method for the application itself** (Enforcement: none — a decision not to adopt. The absence of text recommending starting with Docker is itself the state; adding it shows up as a documentation diff)
- ❌ Building a Docker image **of the application itself** in CI / scripts (Enforcement: none — a decision not to adopt. The absence of jobs or scripts that build the application's Docker image is itself the state; adding one shows up in the diff as an added workflow / script)
- ❌ Introducing a config axis whose values are `stand-alone` / `cloud` (the names are aliases for the two groups, not an independent axis; combinations would become inexpressible; §Defining Environments) (Enforcement: none — a decision not to adopt. The absence of a variable in config whose values are `stand-alone` / `cloud` is itself the state; adding one shows up as a diff in the schema and env)
- ❌ Deciding whether development-only endpoints are open by connection mode (`APP_API_MODE`, etc.) or by an environment's name (the decision is held by `APP_ENV` and the destination; §Defining Environments) (Enforcement: `src/config/application-environment.test.ts` and `src/adapters/server/auth/development-access.test.ts` / `resolver.test.ts` check that the existing endpoints open and close according to `APP_ENV`. Whether a newly added endpoint opens and closes on some other condition is Prose — **not mechanizable**: which endpoints are development-only is decided by the meaning of the destination)
- ❌ Placing only the frontend in cloud while it is still mocked (it would open, in cloud, an endpoint that issues sessions without an IdP; §Defining Environments) (Enforcement: Prose — **mechanizable** (the config schema rejects `APP_API_MODE=mock` at start-up when `APP_ENV` is `dev` / `stg` / `prd`. No rule exists))
- ❌ Referencing an auxiliary tool's image by tag only / running an image through an action that accepts images only by tag (it falls outside the scan for digest pinning; §Pin auxiliary tool images by digest)

> docker-compose as dev infrastructure (named files such as `docker-compose.dev-tools.yml`) is outside these prohibitions.

## Notes

- What this ADR rejects is **"Docker as the delivery means for the application itself"** (Type A). **"Bringing up auxiliary tools with docker-compose"** (Type B, e.g. a mock API / OpenAPI viewer / docs viewer) is out of scope and may be introduced with a dedicated file name
- This is not "rejecting Docker altogether" but the arrangement "this repository's role definition (presentation layer) does not need Type A". It can be introduced when it becomes necessary
- This ADR is also **the documentation of the role definition**. Reading it tells you "what this repository presupposes you are building"

## Related ADRs

- [0001-package-manager.md](0001-package-manager.md) — adopting pnpm (the basis for not using `npm ci` even when a Dockerfile is kept)
- [0003-version-manager.md](0003-version-manager.md) — the SSOT for Node / pnpm versions (the basis that removes the sync problem with the Dockerfile FROM tag)
- [0004-library-management.md](0004-library-management.md) — evaluation guidance on modern libraries' system dependencies, such as `sharp`'s prebuilt binaries / exact pinning and `pnpm audit` for bundled libraries
- [0010-standards-and-non-lockin.md](0010-standards-and-non-lockin.md) — the discipline for adopting bundled libraries (vendor-independent justification + replaceable through adapters / seams). This ADR's presentation-layer role definition is also the basis of 0010's test that treats using framework-specific APIs as a consequence of the settled decision "the framework was chosen" rather than as lock-in
- [0110-security-operations.md](0110-security-operations.md) / [0153-ci-configuration.md](0153-ci-configuration.md) — the supply-chain quarantine window / Actions SHA pins (the mechanism paired with digest pinning of images)
