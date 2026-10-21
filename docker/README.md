# docker

Holds the definitions of containers that support development, and the digest lockfile for the images used there.

**Nothing here is a shipped artifact.** The application itself is meant to go straight onto a PaaS / static CDN
and is not run in Docker ([0011](../docs/adr/0011-no-docker.md)). Instead of a plain `docker-compose.yml`,
[`docker-compose.dev-tools.yml`](../docker-compose.dev-tools.yml) is started by name, so that it is not
mistaken for shipping the application. The uses for which Docker may be adopted, and the rules for file
names / start commands when it is, are owned by [0011](../docs/adr/0011-no-docker.md).

## Contents

| Path | Role |
| --- | --- |
| `images-pin.toml` | The `image:tag` → digest lockfile (SSOT). Written by `make images-pin-resolve`, never by hand |
| `<purpose>/Dockerfile` | Where a helper tool goes when it cannot be assembled from the upstream image as is. One directory per use; only a `Dockerfile` at this position is scanned |

The lockfile's coverage extends beyond this directory. Three places are scanned.

| Location | Notation |
| --- | --- |
| `docker-compose*.{yml,yaml}` at the repository root | `image: <image>:<tag>` |
| `docker/<purpose>/Dockerfile` | `FROM <image>:<tag>` |
| `.github/workflows/**` / `.github/actions/**` | `uses: docker://<image>:<tag>` |

The third is the notation for a step in which GitHub Actions runs a registry image directly; it is a `uses:`
line, but what it references is not a GitHub repository. actions-pin, which handles SHA pinning, resolves a
tag to a commit with `git ls-remote` and so has no effect on a registry; this side, which handles digests,
owns it ([0153](../docs/adr/0153-ci-configuration.md)). **The tag is required**; omitting it points at
`:latest`, so it is failed as something missed.

## Pin images by digest

**The tag stays on the referencing side as the version SSOT, and the lockfile holds the digest.** Why images
are pinned, the quarantine window, and why tag re-pointing is not detected are owned by
[0011](../docs/adr/0011-no-docker.md); this file holds only the procedure and the notation.

```bash
make images-pin-resolve   # tag を digest へ解決してロックファイルを更新する（唯一ネットワークに出る）
make images-pin-apply     # ロックファイルを元に参照を digest へ固定する
make images-pin-check     # 固定済みか検証する（書き換えなし。pre-commit hook と CI が回す）
```

`resolve` does not adopt a digest published less than `IMAGES_PIN_MIN_AGE_DAYS` (default 14 days) ago. If a
pin already exists it is kept; a brand-new image with nothing to fall back to fails rather than being left
as a tag.

### How the quarantine is measured

- Age is counted from `created` in the registry's image config. **For a multi-arch image, the oldest of the
  per-platform `created` values is used** — the quarantine asks "since when has this reference existed",
  and an update that only adds one architecture to an existing image is not treated as new
- Resolution uses `docker buildx imagetools inspect`. It needs a local docker and its credentials
- In an emergency, the quarantine is lifted **only by stating** `make images-pin-resolve IMAGES_PIN_MIN_AGE_DAYS=0`.
  Scoring the evidence on whether a version caught by the window may be adopted is owned by the
  `supply-chain-triage` skill ([0154](../docs/adr/0154-claude-skills-operations.md))

### Writing references

Write references **one per line, unquoted, with an explicit tag**. Scanning uses strict patterns, and an
`image:` / `FROM` / `uses: docker://` line that does not match them is **an error, not a pass-through** —
quoted forms (`image: "<image>:<tag>"`) and flow mappings would count as neither unregistered nor unpinned,
and the check would return "no anomalies", so anything outside the supported notation is detected and failed.

| Form | Handling |
| --- | --- |
| `image: <image>:<tag>` / `FROM <image>:<tag>` / `uses: docker://<image>:<tag>` | Pinned |
| A reference that already carries `@sha256:...` | Only the tag part is read; the digest is aligned to the lockfile value |
| `FROM --platform=... <image>:<tag> AS <stage>` | Pinned. Only the reference is rewritten; `--platform` and `AS <stage>` must be preserved |
| `FROM <stage>` / `FROM scratch` | A legitimate tagless reference that cannot be pinned. An exception for Dockerfiles only |
| Quoted, flow mapping, or tagless | Error (reported as `<relative-path>:<line>`) |

`apply` rewrites to `<image>:<tag>@sha256:...` while keeping the tag and the trailing comment.

### What `check` fails

`apply` and `check` share the same decision, and `check` runs it without rewriting. There are four failure
conditions, all fail-closed.

| Symptom | Meaning | Fix |
| --- | --- | --- |
| Unregistered | Referenced but not in the lockfile | `make images-pin-resolve` |
| Unpinned / mismatched | The reference's digest differs from the lockfile, or is missing | Commit the result of `make images-pin-resolve && make images-pin-apply` |
| Orphan | In the lockfile but referenced from nowhere | Delete the line, or `make images-pin-resolve` |
| Unparseable notation | The error row in the table above | Rewrite the reference in a supported notation |

`apply` settles whether every file can be written before writing any. If even one entry is unregistered or
orphaned, no file is rewritten, so "a working tree partly pinned even though the command failed" never
remains.

### Procedures

- **Adding an image** — write the reference with its tag, run `resolve` then `apply`, and commit the
  rewritten reference together with the lockfile. If `resolve` could not adopt it because of the
  quarantine, wait a few days
- **Upgrading a version** — rewrite the tag on the referencing side, then `resolve` → `apply`. Do not swap
  the digest by hand (the version SSOT is the tag side)
- **Removing an image** — delete the reference, then run `resolve`. Deleting alone leaves the lockfile line
  failing `check` as an orphan

## The shape of a helper-tool service

Each service in [`docker-compose.dev-tools.yml`](../docker-compose.dev-tools.yml) follows the shape below.
What each service is responsible for is owned by the comment at the head of that service.

- **Write `image:` with a digest** (the mechanism above pins it). Why tools are put in compose services
  rather than left to official actions that accept images only by tag is in [0011](../docs/adr/0011-no-docker.md)
- **A service whose image guarantees unique output also pins `platform`.** Font rasterization varies with
  CPU architecture as well, so leaving it out makes Apple Silicon and CI pull different architectures, and
  generated artifacts (baseline images and the like) do not match between them
- **The app starts on the host, and the container looks at it.** `node_modules` is resolved for the OS and
  CPU it was installed on, so `next start` cannot run inside the container. `host.docker.internal:host-gateway`
  goes in `extra_hosts` because Docker Desktop resolves this name itself, but on Linux it cannot be looked
  up unless stated
- **A service that writes generated artifacts into the repository passes the host uid / gid to `user:`**
  (`RUNNER_UID` / `RUNNER_GID`, filled by the make side with `id -u` / `id -g`). Writing as root leaves
  generated artifacts in the repository that the person who captured them cannot delete. Since it runs as
  non-root, it is also given a writable `HOME`
- **A tool that writes to a fixed path inside the image is not passed `user:`.** Running it with the
  caller's uid makes it fail to start. Its output then goes only under the gitignored `tmp/`
- **A service that runs Chromium uses `ipc: host`.** Otherwise it exhausts the default 64MB `/dev/shm` and
  the whole tab crashes
- **`ports:` are published only when stated.** They open only when started with
  `docker compose run --service-ports`, so declare only endpoints like report serving, and do not open
  them for the comparison run itself
- **`entrypoint: []`** removes the upstream image's default entrypoint; the command to run is given by the
  make recipe

Example: the visual regression runner `browser_runner` implements every item above, and the DAST `zap`
implements the items for the side not passed `user:`. For usage, see
[`vrt/README.md`](../vrt/README.md) and [`.makefiles/README.md`](../.makefiles/README.md).
