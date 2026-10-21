# Browser Observation Tooling

This project defines the tooling for **observing the running application outside the gates**. The subjects are checking screens during development, confirming behavior and investigating causes; the gates that judge regressions themselves (`make vrt` / `make e2e` / `make lighthouse`) are owned by [0090](0090-testing-strategy.md) / [0091](0091-test-verification-methods.md).

One tool is not enough for observation. The questions split into three — "how does it look now", "what are the numbers", "why is it so" — and each needs a different mechanism. This ADR defines that division of labor and whether each lane is adopted.

## Status

Accepted

## Rationale / Purpose

- **Fill the stage where no baseline exists yet.** Every gate works by comparison with baseline images, so they say nothing about new screens or screens mid-implementation. Clearing up inconsistencies a machine can catch before they reach human eyes needs a means of observation separate from the gates
- **Fix one tool per question.** When several tools line up for the same question, each person grows a different procedure, and results can no longer be compared
- **Keep observation from mixing into the repository's verdicts.** The gates' authority lies in CI, and local observation does not replace it

## Three Lanes

| Lane | Question | Tool |
| --- | --- | --- |
| **Look and touch** | How does it look now? What happens when pressed? | `agent-browser` (`mise.toml`) |
| **Measure** | What are the numbers? What happens under load? | `chromium` from `@playwright/test`, launched directly as a library |
| **Dig** | Why is it slow? Where did it fail? | `chrome-devtools` (the CLI of `chrome-devtools-mcp`) |

"Look and touch" and "Dig" are **called from the CLI.** Results go to standard output, so they can be filtered, saved to files, reproduced by a person with the same command, and handed to a subagent that has a shell. Only "Measure" is a library, used by writing and running a throwaway measurement rig — load conditions and the metrics taken differ per observation and cannot be expressed with fixed subcommands.

### Align the rendering engine with the gates

**The browser used for observation points at the same binary the gates use.** Every tool auto-detects a browser installed in the environment, so without specifying, each user grabs a different version. Spacing and line wrapping are decided by text rendering, so if that differs, **what looked "aligned" locally breaks in CI**.

So the observation tools are explicitly given the chromium of `@playwright/test`, which the gates use, as the executable. It is not left to auto-detection.

**The value lives in one place, `pnpm exec tsx scripts/chromium-path`.** The answer is `chromium.executablePath()` itself, and `make lighthouse` decides the binary it launches with the same function. If the binary is not installed, it prints nothing and exits with 2. It is not written into committed configuration (`env` in `.claude/settings.json`, `[env]` in `mise.toml`) — the path differs per machine and silently goes stale when the version of `@playwright/test` in the lockfile moves.

How it is received differs per tool, and that difference is a fact of the tools, so no layer is built to absorb it.

| Tool | How it receives it |
| --- | --- |
| `agent-browser` | `--executable-path` (or the environment variable `AGENT_BROWSER_EXECUTABLE_PATH`) |
| `chrome-devtools` | Only `start --executablePath`. There is no corresponding environment variable |

**Assign it to a variable first, then pass it.**

```sh
p=$(pnpm exec tsx scripts/chromium-path) && agent-browser --executable-path "$p" open <url>
```

Embedding `"$(…)"` directly in the argument passes a failed substitution as an empty string, and the tool falls back to auto-detection and silently grabs a different browser.

### Look and Touch — agent-browser

An a11y snapshot with refs, and its diff. Element bounding boxes and computed styles. An a11y audit with axe bundled. React fiber introspection (component tree / props / re-renders / classification of Suspense boundaries).

The last of these is something no other candidate has. It is the only path to confirming that React's rendering is as intended from the rendering side rather than from the resulting DOM.

Being able to compare computed styles across screens also matters a great deal in this repository. The gates compare each target only with **its own past**, so even if spacing in the same role disagrees between screen A and screen B, it stays green forever. Only this lane can enumerate that inconsistency by machine.

### Measure — launching playwright directly as a library

`playwright.config.ts` deliberately fails on anything other than Linux (to fix baseline images together with their capture environment). So when taking numbers locally, `chromium` is launched directly without going through the config. CPU throttling uses CDP's `Emulation.setCPUThrottlingRate`, and the raw material for INP is taken from `event` entries of `PerformanceObserver`.

Because it uses **the same chromium as the gates**, the numbers taken here come from the same rendering as CI's verdicts.

### Dig — the chrome-devtools CLI

Takes DevTools traces and expands Insights by name. Stack traces with source maps applied. A Lighthouse audit of the page's current state. Heap snapshots. Throttling CPU and network bandwidth.

The gates go as far as Core Web Vitals numbers and checking them against budgets, but **do not answer why the numbers are what they are.** The path to the original source location when an exception occurs in bundled code is also, as far as the tools' declarations go, only here. The production build does not emit source maps for the browser (`next.config.ts` has no `productionBrowserSourceMaps`), so this path works only against the development server.

**Call `start` explicitly before the tools.**

```sh
p=$(pnpm exec tsx scripts/chromium-path) && pnpm exec chrome-devtools start --executablePath "$p" --no-performance-crux
```

Calling a tool (`navigate_page`, etc.) with no daemon running starts the daemon implicitly. Tool arguments do not take launch options, so what it grabs then is the system Chrome (stable channel): a window opens, it uses the tool's own persistent profile (`~/.cache/chrome-devtools-mcp-cli/chrome-profile`), and the CrUX query below stays enabled. An explicit `start` defaults to headless and a throwaway profile (`--isolated`). Which way it was started shows in `args` of `pnpm exec chrome-devtools status`.

The shape of the calls carries three constraints.

- **There is one daemon per user per host**, and `start` stops an existing daemon before starting. Parallel working trees can stop each other's daemons
- **Writing to files (`--filePath` / `--outputDirPath`) is limited to inside the OS temporary directory.** This is because the CLI does not tell the tool the allowed range for output; outside it returns `Access denied` while the exit code stays 0. `--allow-unrestricted-paths`, which removes the range, is not used
- The tool's Lighthouse audit has no Performance category. The numbers are held by this lane's trace and by the "Measure" lane

**Capabilities confirmed** are taking traces and expanding Insights against a production build (`APP_ENV=ci`, mock API), the Lighthouse audit, and listing network and console. Stack traces with source maps applied have not been confirmed.

## Cross-Checking

`@playwright/test` bundles a CLI for agents (`pnpm exec playwright cli`). Since it adds no dependency and observes with **the same engine as the gates**, it is used to confirm whether local observation disagrees with the gates' verdicts.

This is not a fourth lane. The default observation paths are the three above; this one is used for cross-checking.

## How tools are obtained

**Split by what the artifact is, not by where it is published** — the same tool is sometimes distributed both as a native binary and on npm, and splitting by publisher would give the same tool two paths.

| Artifact | Path |
| --- | --- |
| A standalone binary | `mise.toml` (backend stated explicitly) |
| A package that runs on Node | `pnpm add -DE` |

**npm packages are not taken through `mise`'s `npm:` backend.** The `pnpm` side enforces a cooldown since publication (it fails resolution if no version satisfies the period, and rejects registries that do not return publication times) and pins versions in the lockfile. The effort of obtaining is the same, but **the safety of obtaining differs**. It is also consistent with the npm ban in [0001](0001-package-manager.md).

On either path, version quarantine follows [0110](0110-security-operations.md).

## Do not register them as MCP servers

Observation tools are called as CLIs and are not registered in the agent's configuration as MCP servers.

- **No usage is pushed down.** Placing an MCP registration in the repository makes the agent start that server on every launch. What this repository distributes is tool pins, not agent configuration
- **It does not consume context constantly.** With MCP, tool definitions stay loaded for the whole session
- **The defaults lean to the safe side.** The CLI defaults to a throwaway profile when started with an explicit `start`, while the MCP server side defaults to a persistent profile (implicit startup is in the "Dig" section)

As the price, some tools are not generated for the CLI (waiting and bulk input). Waiting is needed in the "Look and touch" lane, which another tool covers, so it holds.

If an agent's individual work really needs MCP, it goes in the configuration on the user's home side. Nothing is left in the repository.

**The reversal condition is when a question appears, by measurement, that can only be answered by a tool not generated for the CLI.** Waiting and bulk input are not generated for the CLI, but observations that need waiting are covered by another lane, so it holds today. Even if registered, its place is the user's home side, and nothing is left in the repository. **"MCP is easier to call" is not the condition** — the price is constant context consumption and agent configuration being pushed down onto the repository.

## Do not connect to a real browser profile

Paths that connect to a real browser the user is logged into, or to its profile (staying resident as an extension, a remote-debugging connection to a running browser, loading a real profile), are not made the default.

What this repository observes is the local development server, and authentication is covered by the session-issuing endpoint that is enabled only during development. The real browser's privileges are not needed, and the moment it connects, every window of that profile opens to the observing side.

**The reversal condition is when the observation target moves outside the local development server. "It takes fewer steps" is not the condition** — the moment it connects, every window of that profile opens to the observing side.

### How the prohibition is guaranteed

**The agent's execution permissions cannot guarantee this on their own.** The permission check is a prefix match on the command string that does not interpret argument positions, and the tool lets the flag instructing a connection be placed either before or after the subcommand. So a declaration of the form "reject the dangerous flag" passes straight through if even one permission allows free input at the end. **Some tools can receive the same instruction through an environment variable, which does not appear in the string.**

The guarantee is built from three layers.

1. **Do not give tools of this kind a permission that leaves free input at the end.** Calls that take arguments fall to per-call confirmation
2. **Fix the environment variables equivalent to the flags to empty in the agent's configuration**
3. **Explicitly mark** the plain forms of the flags, and subcommands that announce a connection, **for confirmation (`ask`)** (the net for whatever gets past 1 and 2)

A declaration alone is not a guarantee. **If even one of these three is missing, the prohibition is merely written down.**

**3 is not made a rejection (`deny`).** 1 already drops calls that take arguments into confirmation, so the only effect rejection would add is **erasing the room for a person to decide to use it**. What this section forbids is not the connection itself but **connecting without confirmation** (the prohibition below), and rejection is stricter than that line. Situations that need cross-checking an event reproducible only in a real browser do exist, and closing them would leave observation stuck without being able to stand as evidence on its own.

**Only subcommands that call an external language model stay rejected.** That is not a question of whether connecting is allowed but of adoption, and this ADR has decided not to adopt them (the "Rejected Alternatives" below). Dropping them to confirmation would reopen the decided adoption on every call.

## Stop outbound sending by default

Observation tools run with the developer's privileges and decide for themselves what to send off the machine ([0110](0110-security-operations.md)). The following four are stopped if enabled by default.

- Sending usage statistics
- Registry queries for update checks
- Subcommands that call an external language model
- Querying an external field-data API with the URL of a performance trace

**What stops them is environment variables, not per-call flags.** A tool may start its resident process on its own at the first call, and what is used then is the library's defaults. If the individual subcommands are built not to take whether to send as an argument, **there is no path for the caller to stop it with a flag.**

The exception is `chrome-devtools`'s CrUX query, which has no environment variable; `start --no-performance-crux` is the only path to stop it. With implicit startup it stays enabled, but the tool excludes `localhost` / `127.0.0.1` URLs from the query, so as long as the local development server is being observed, no URL leaves.

Note that what this section covers is the tools' own default sending, not where code an agent explicitly passes to an `eval`-like subcommand is sent.

## Rejected Alternatives

| Option | Reason |
| --- | --- |
| **Operation tools that stay resident in a real browser as an extension** | The contents of streamed boundaries do not resolve, and scroll events do not fire. This does not reproduce in a plain browser, so **observation cannot stand as evidence on its own**. Once cross-checking becomes mandatory, it no longer works as a path |
| **Tools operated in natural language** (those that call an external language model) | Every operation incurs charges to an external model, and screen contents leave the repository |
| **Tools that presuppose cloud execution** | What is observed is the local development server, unreachable from outside |
| **Tools that embed an agent of their own** | Judgment belongs to the caller. No second judging subject is placed inside a tool |
| **`mise`'s `npm:` backend** | As described in "How tools are obtained" above |

## Prohibitions

- ❌ **Adopting images captured with the tools defined here as baseline images**. Fixing the capture environment is owned by [0091](0091-test-verification-methods.md) (Enforcement: the comparison of the `vrt` job (digest-pinned container, `maxDiffPixels: 0`) rejects pixels captured in another environment as differences, and the `baseline-approval` job requires an approval label on PRs that move baseline images)
- ❌ Connecting the tools defined here to any CI, git hook or build gate. The gates' authority lies in the existing checks (Enforcement: Prose — **mechanizable** (scan that no calls to `agent-browser` / `chrome-devtools` / `playwright cli` appear in `.github/workflows/**`, `.lefthook.yaml` or the scripts of `package.json`. No rule exists))
- ❌ Letting an observation tool launch a browser without passing it the executable (Enforcement: Prose — **partly mechanizable**. A launch line of `agent-browser` lacking `--executable-path` can be rejected by spelling, but no rule exists, and a value passed through an environment variable does not appear in the spelling. The implicit startup of `chrome-devtools` is decided by whether the daemon is running, not by the spelling of the call)
- ❌ Assigning two lanes to the same question (Enforcement: Prose — **not mechanizable**. Whether two tools are assigned to the same question is decided by the purpose of the observation)
- ❌ Using a path that connects to a real browser profile without confirmation

## Related ADRs

- [0001-package-manager.md](0001-package-manager.md) — how npm packages are obtained
- [0003-version-manager.md](0003-version-manager.md) — `mise.toml` holding the pins of binaries
- [0004-library-management.md](0004-library-management.md) — choosing and pinning dependencies
- [0090-testing-strategy.md](0090-testing-strategy.md) — the gates' responsibilities
- [0091-test-verification-methods.md](0091-test-verification-methods.md) — baseline images and the capture environment
- [0101-performance-budget.md](0101-performance-budget.md) — the budget the "Measure" lane checks against
- [0110-security-operations.md](0110-security-operations.md) — cooldown, and vetting tools for agents
- [0154-claude-skills-operations.md](0154-claude-skills-operations.md) — agent tooling (operations)
- [0155-claude-skills-development.md](0155-claude-skills-development.md) — agent tooling (development)
