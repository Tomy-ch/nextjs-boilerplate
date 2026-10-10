# Package Manager Policy

This project adopts **pnpm** as the Node.js package manager.

This document defines the usage policy and operating rules for the package manager.

## Status

Accepted

## Rationale

### 1. Guaranteed Reproducibility

pnpm's lockfile (pnpm-lock.yaml) is highly deterministic, so the same dependency set can be reproduced in the following environments.

- Local development environments
- CI/CD
- Execution environments run by AI agents

### 2. Strict Dependency Management

pnpm uses a non-flat node_modules structure, which prevents the use of undeclared dependencies.

This:

- Prevents unintended dependencies from creeping in
- Makes module boundaries explicit
- Improves design quality

### 3. Performance

- Fast installs through the global store
- Better disk efficiency by eliminating duplicate dependencies

### 4. Monorepo Support

pnpm workspace also accommodates future structural expansion (moving to a monorepo).

## Version Management

The Node.js and pnpm versions are declared in `mise.toml` as the **single source of truth (SSOT)**.
Local development uses [mise](https://mise.jdx.dev/) to obtain exactly the declared versions.
How CI delivers them is left to that layer's native means (the delivery layer does not use Docker: [0011-no-docker.md](0011-no-docker.md). See [0003-version-manager.md](0003-version-manager.md) for details).

```toml
# mise.toml
[tools]
node = "24.14.1"
pnpm = "10.33.0"
```

Local installation is done in one go with the following command.

```bash
mise install
# もしくは
make install-tools
```

## Basic Commands

### Installing Dependencies

```bash
pnpm install
```

### Using the Lockfile Strictly (CI)

```bash
pnpm install --frozen-lockfile
```

### Adding Dependencies

```bash
pnpm add <package>
pnpm add -D <package>
```

## Usage in CI

CI prioritizes reproducibility and speed and adopts the following approach.

```bash
pnpm fetch
pnpm install --offline --frozen-lockfile
```

> The delivery layer does not use Docker ([0011-no-docker.md](0011-no-docker.md)). This repository is a presentation-layer application foundation that primarily assumes PaaS / static CDN delivery, and does not bundle a `Dockerfile` for delivering the application itself.

## Prohibitions

- Using npm / yarn is prohibited (Enforcement: the `lockfile-drift` job (`pnpm install --frozen-lockfile`) fails on lockfile inconsistencies caused by dependencies added with npm / yarn. Committing package-lock.json / yarn.lock and calling npm / yarn inside scripts or workflows could be caught by spelling, but no rule exists. npm / yarn typed by hand locally is Prose — **not mechanizable**: it never appears in code)
- Editing the lockfile (pnpm-lock.yaml) by hand is prohibited (Enforcement: the `lockfile-drift` job (`pnpm install --frozen-lockfile`) fails on hand edits that disagree with package.json. A hand edit that still satisfies the ranges in package.json is Prose — **not mechanizable**: it cannot be distinguished from lines pnpm resolved)
- Implementations that depend on undeclared dependencies are prohibited

## Notes

Because pnpm manages dependencies strictly, code that worked under npm or yarn may fail.

In that case:

- Add the required dependency explicitly
- Revisit the package's dependency structure

## Future Extensions

- Use `pnpm workspace` when moving to a monorepo
- Integration with Turborepo / Nx can be considered
