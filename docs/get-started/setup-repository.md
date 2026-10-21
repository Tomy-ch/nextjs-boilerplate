# Setup Procedure

The steps for standing this boilerplate up as your own project. **Run them from top to bottom.**
Where order matters, each section says so.

The content of each step is owned by the document that owns it. What this file holds is **only the order and the places that need a person**.

## 0. Prerequisites

| | |
| --- | --- |
| [mise](https://mise.jdx.dev) | Version management for tools / runtimes. **Have it activated in your shell** ([0003](../adr/0003-version-manager.md)) |
| GitHub CLI (`gh`) | Used by the make targets for repository operations. Must be `gh auth login`-ed |
| Docker | Used only in step 8. Baseline images are captured only inside a digest-pinned container ([`vrt/README.md`](../../vrt/README.md)) |

## 1. Prepare Your Local Environment

```bash
git clone --recurse-submodules <your-repository>   # the VRT baseline images are a submodule
cd <repository>

make install-tools
pnpm install
pnpm exec lefthook install   # not installed automatically; once after cloning
```

**`lefthook install` is also needed to keep baseline images in step.** git does not move a submodule's checkout
when you switch branches, so when a retake advances the pointer the checkout is left behind and `baseline/images`
keeps showing up in `git status`. **Committing that dirt records the wrong pointer.** The hook aligns the checkout to the
pointer on every switch and pull, so with it installed you never fix this by hand ([0151](../adr/0151-git-hooks.md)).

Forgetting to install it does not break anything. The entry that cuts release branches recognizes exactly this dirt and names
the command that realigns it (`scripts/release`).

## 2. Initialize the Repository

```bash
make setup-repo
```

**Destructive.** It deletes every existing tag both locally and on `origin`, and re-creates `v0.0.0`.
It creates `develop` / `staging` / `production` and applies the default branch, rulesets and labels, as well as
the documentation site's delivery settings (Pages served by Actions, with delivery from `production` allowed).
See [`.makefiles/README.md`](../../.makefiles/README.md) for the details.

**If the delivery permission is forgotten, it fails in a way whose cause cannot be read.** When the `github-pages` environment does not allow
the source branch, `docs-deploy` starts as a job but fails without running a single step.
The log gives no reason, so together with `docs-build` being green, you end up in a state of "it is built but not published".
To deliver from a branch other than `production`, change `PAGES_DELIVERY_BRANCH` and the push trigger of
[`deploy-docs.yaml`](../../.github/workflows/deploy-docs.yaml) together.

## 3. Configure in the GitHub UI (Manual)

Only what `gh` cannot do on your behalf.

1. **Enable Actions** — it may be disabled right after creation
2. **Enable the Dependency graph** — Settings → Security → Dependency graph. Dependabot needs it to read the dependency
   tree ([0110](../adr/0110-security-operations.md)). Enabling it costs nothing
   (**in this repository the `dependency-review` job also reads it**, so leaving it disabled fails with "not available in this repository". It cannot be fixed on the code side until the setting is in)
3. **Confirm the required checks** — after running CI once, check that the `required_status_checks` of the ruleset `make setup-repo` applied
   match the actual context names ([`.github/workflows/README.md`](../../.github/workflows/README.md))

## 4. Make It Your Own Repository

```bash
make setup-replace-repository-reference REPOSITORY=<owner>/<repo>
make setup-replace-license-copyright COPYRIGHT_HOLDER='<copyright-holder>'
make setup-remove-boilerplate-only   # boilerplate-only:line
```

Each can print only its plan, without rewriting anything, with `DRY_RUN=1`.

The first one also replaces links to the documentation portal. The default replacement target is the GitHub Pages delivery URL
(`https://<owner>.github.io/<repo>/`); add `PORTAL_URL=https://docs.example.com/` only when
using a custom domain. **It may be run even if Pages was not enabled in step 3** —
the shape of the URL is decided by `<owner>/<repo>`, not by enabling Pages, so the links match even if you enable it later.

The third one also drops the suppressions in `.gitleaksignore`. What they suppress are **values that remain only in this repository's
history**, and a tree created without inheriting the history has nothing for them to point at. **When this is run on a tree copied together with its history (a fork, or a clone with
the remote removed)**, only the fingerprints disappear while the values in the history remain, so the weekly secret scan
(`make secret-scan-history`) lists them as unsuppressed findings. Exposure has not increased —
only the suppression came off, so check the contents and either write them back to `.gitleaksignore` or cut the history anew.

<!-- boilerplate-only:begin -->
The third one strips **statements that mean something only to the side distributing this template**
([0152](../adr/0152-agents-md-policy.md)). There is no option to skip it — the premise has lapsed the moment a repository is created from the template,
so keeping them means following rules that do not apply to you. Once stripping is done, the tool itself disappears too.
<!-- boilerplate-only:end -->

## 5. Decide Whether to Keep the Scanners That Need Credentials

Three scanners require something this repository alone cannot supply.

| Check | What it needs |
| --- | --- |
| [`codeql.yaml`](../../.github/workflows/codeql.yaml) | GitHub Advanced Security. Free for public, paid for private |
| [`sonarcloud.yaml`](../../.github/workflows/sonarcloud.yaml) | A SonarQube Cloud account and `SONAR_TOKEN` |
| [`dependency-review.yaml`](../../.github/workflows/dependency-review.yaml) | The Dependency graph enabled (step 3). The API it calls is free only for public repositories |

**Nothing breaks until you decide.** Each confirms before scanning that what it needs is in place, and if not,
skips itself and leaves the run green — missing credentials are unfinished setup, not a scan result.
Pull requests from forks are covered by the same path (forks do not receive the repository's secrets).

### Keeping Them

Register the secrets in the repository and create the corresponding project on the vendor side. `sonar.projectKey` / `sonar.organization` in `sonar-project.properties`
are rewritten by `make setup-replace-repository-reference` in step 4, so fix them by hand before the first scan only if you skipped that step (otherwise the analysis results
are sent to the template's project).

### Removing Them

```bash
DRY_RUN=1 make setup-remove-licensed-scanners          # writes nothing, commits nothing
make setup-remove-licensed-scanners                    # removes them
```

**Each product goes into a separate commit.** If you obtain a license later, one `git revert` restores it. The working tree
must be clean.

It cleans up the workflows, the pins in `.github/actions-pin.toml`, and the destinations in `.github/egress.yaml`. `make
actions-pin-check` and `make egress-check` both fail on "an entry no workflow references",
so one of them cannot silently pass with a leftover. **The `github/codeql-action` pin remains** — four other
workflows keep using it through `upload-sarif`, and references are judged by actual count, not by declaration.

**It also drops the lines of the documents that declared them.** If they do not match, the removal throws and stops, so a state where something you thought you removed is still there
does not remain. Mentions it could not catch are listed at the end, so sweep those yourself. There is no switch to toggle enabled / disabled
— keeping means keeping, and a scanner left configured but disabled becomes something no one reads and no one maintains.

## 6. Purge the Bundled Sample

```bash
make setup-remove-sample   # preview with DRY_RUN=1
```

It deletes the screens built on the sample subject, the contracts and mocks specific to that subject, and the purge tool itself.
After the purge it chains through formatting, checks, build and tests, so any leftover references show up on the spot.

Skip this step if you keep the sample and use it. However, **it is better done before step 8** —
the purge does not reach into the submodule, so in the reverse order you would capture the sample's baseline images into your own store.

**Do not commit the purge until you put in your own contract in step 7.** The purge also deletes the sample contract's declaration,
so right afterwards `openapi/sources.yaml` has zero declarations and is rejected on read. `make api-gen-check`, which goes through the same read,
fails both in the commit-time hook (commits touching `openapi/**`) and in CI, so
the purge cannot be committed and pushed on its own first ([`openapi/README.md`](../../openapi/README.md)).

### What to Rewrite Yourself After the Purge

After the purge, `ROUTE_POLICIES` in [`src/model/authz.ts`](../../src/model/authz.ts) is left with two entries: `/account`
(requiring authentication only) and `/admin` (requiring a role as well). These are placeholders that show **where to declare which
paths are protected, and how**; those screens are not bundled. Rewrite them to your own protected targets.
What is enumerated is the protected side, not the public side (the reason is in the doc comment on `ROUTE_POLICIES`).

**Two entries requiring different roles are kept.** With only declarations that require authentication, there would be no path anywhere that
rejects a principal lacking a role, and no input could be built that exercises that branch.

Matching is by prefix, so `/` cannot be used. It would match every path, `/login` itself would become protected,
and redirects would loop.

After the purge, the connection targets in `env/.env.local` and `env/.env.ci` all become **places that do not exist**
(`APP_API_BASE_URL` / `MEDIA_ORIGIN` / `AUTH_ISSUER` / `AUTH_CLIENT_ID`). For what the values mean and which are
required, see [`env/README.md`](../../env/README.md). `MEDIA_ORIGIN` is required even while not a single image is placed:
this value alone decides `next/image`'s allowed host and the CSP's `img-src`.

**Separately from the purge, review the supplied defaults themselves.** What is listed here is only what the purge directly breaks;
the index of the whole, including contracts, design and operational settings, is in the [root README](../../README.md#defaults-to-review-when-adopting).

## 7. Put In Your Own Contract

Write the coordinates of your backend's contract in `openapi/sources.yaml` and regenerate.

```bash
make api-fetch
make api-gen
```

How to write the coordinates, and the spellings that move together when you change `name`, are held by
[`openapi/README.md`](../../openapi/README.md#what-to-change-when-adopting).

**Finish this before capturing baseline images.** Screen-level capture renders with mock responses generated from the contract, so capturing before the contract means retaking everything once it is swapped.

## 8. Prepare the Store for VRT Baseline Images

### 8-1. Create the Store

```bash
make setup-baseline-store
```

You are asked three things. Press Enter to accept the defaults.

```text
既存のリポジトリへ配置しますか? 空欄なら新規作成 [<org>/<repo>]:   ← 空欄で新規作成
作成するリポジトリ名 [<現在のリポジトリ名>-baseline-images]:
公開範囲 (public / private / internal) [private]:
```

If creating new repositories is restricted by permissions in your organization, enter an existing `<org>/<repo>` at the first prompt.

**The visibility defaults to `private`.** Baseline images are the look of the screens itself, so a default that falls to the public side is not taken.
However, **making the store private makes `vrt` fail on PRs from outside (forks)** — fork PRs do not
receive secrets, so they cannot obtain the App token that reads the baseline images. A repository that accepts outside PRs uses `public`.

When it finishes, commit the wiring.

```bash
git add .gitmodules baseline/images
git commit -m "Build: 基準画像の置き場を配線する"
```

> **Do not put a ruleset on the store.** Retakes are pushed by a GitHub App, so
> protecting it blocks the update path itself.

### 8-2. Create the GitHub App (Manual)

This cannot be automated. REST has no endpoint for creating it, and the private key is shown only once, when generated.

Create it at <https://github.com/settings/apps/new>.

| Field | Value |
| --- | --- |
| GitHub App name | `<current-repository-name>-baseline-images-app` (**unique across all of GitHub**) |
| Description | `For visual regression tests of <current-repository-name>-baseline-images` |
| Homepage URL | `https://github.com/<owner>/<current-repository-name>` |
| Webhook | **Uncheck Active** |
| Repository permissions → Contents | **Read and write** |
| Repository permissions → Pull requests | **Read and write** |
| Other permissions | Leave as No access |
| Where can this GitHub App be installed? | **Only on this account** |

A common repository name such as `web` or `frontend` may already be taken; in that case
add the owner name or similar. The name can be changed later (the slug follows too, but if you change it, run `make setup-baseline-app`
again).

After creating it, do three more things. You land on the **General** page right after creation, so they can be done from top to bottom.

1. **Note the App ID** — shown as a number at the top of the General page. You paste it in 8-3
2. **General → Private keys → Generate a private key** → a `.pem` is downloaded
3. **Install App** → **Only select repositories**, with **only the two: the main repository and the store**

`Pull requests` is needed because on protected branches (`release/**` / `hotfix/**` and each environment's branch)
a retake cannot push the pointer directly and brings it in through a PR ([`vrt/README.md`](../../vrt/README.md)).

> **Permissions added later take effect only once approved on the installation side.** Changing the App's settings alone is not
> enough; go through the "Review request" shown at `https://github.com/settings/installations/<id>`. Until it is
> approved, the retake fails at issuing the token itself with
> `422 The permissions requested are not granted to this installation.`

### 8-3. Register the App

```bash
make setup-baseline-app
```

```text
App ID（General ページの App ID）:           ← 8-2 で控えた数字

  App ID : ...
  登録先 : <owner>/<repo>

この内容で登録しますか (y/N) [N]:            ← y

秘密鍵 (.pem) のパス:                        ← 端末へ .pem をドラッグしてもよい
```

Pasting with the label included, like `App ID: 2168345`, also works.

**Delete the `.pem` once registration is done.** The file the browser downloaded is still there.

```bash
gh secret list   # BASELINE_APP_ID / BASELINE_APP_PRIVATE_KEY が並ぶ
```

### 8-4. Capture the First Baseline Images

Docker is required. **There are two.** The store is shared between story-level and screen-level capture, with only the areas separated
([`baseline/README.md`](../../baseline/README.md)). Capturing only one makes the other fail across the board with "no baseline image".
Everything is captured, so it takes time.

```bash
make vrt-retake   # story を撮って置き場へ送る
make e2e-retake   # 画面を撮って置き場へ送る
git commit -am "Test: 基準画像を撮る"
```

The result of the push is printed.

```text
before=<previous-store-commit>
after=<captured-commit>
count=<moved-image-count>
```

Ongoing operation (retakes, approval, cleanup) is owned by [`vrt/README.md`](../../vrt/README.md). For the screen-level side, see
[`e2e/README.md`](../../e2e/README.md).

## 9. View Authenticated Screens Locally

Locally, `/dev/session` is open and **can issue a session without going through the IdP redirect**.
Choose a principal and a role and press 「この内容で入る」 (sign in with these settings), and you land on the specified screen. This endpoint opens only at the local
destinations of development and CI, and the route does not enter the production build at all.

When connected to a real backend, **turning on 「API 接続モード」 (API connection mode)** makes this screen obtain the access token as well.
「IdP の接続先」 (IdP endpoint) uses the setting (`AUTH_ISSUER`) as its initial value but can be overwritten, so point it at **the IdP paired with the API you are
currently calling**. If you run separate endpoints in parallel, it drifts from the configured value.

How the token is obtained is held in one place,
[`src/adapters/server/auth/development-token.ts`](../../src/adapters/server/auth/development-token.ts).
**To move to a different IdP, this file is the only one to rewrite.** For the properties of the IdPs that work and
detailed usage, see [`src/features/dev-session/README.md`](../../src/features/dev-session/README.md).

## Confirmation

```bash
pnpm lint:ci && pnpm typecheck && APP_ENV=local pnpm build && pnpm test
```

On the CI side, opening one PR runs every job. To look up a failed job, see
[`.github/workflows/README.md`](../../.github/workflows/README.md); when stuck, see
[`.claude/skills/repo-ops`](../../.claude/skills/repo-ops/SKILL.md).
