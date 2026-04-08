# go-boilerplate Copilot Instructions

This document defines how GitHub Copilot must operate in this repository.
Project rules and architectural constraints are defined in AGENTS.md.
Copilot must follow them strictly.

## Repository Overview (Reference Only)

Refer to AGENTS.md for:
- Architecture rules
- Layer responsibilities
- Modification scope
- Strict constraints

Do not duplicate architectural rules here.

## AI Modification Scope

Copilot may modify only:

- `src/`
- `components/`
- `features/`
- `lib/`
- `hooks/`
- `styles/`
- `types/`
- `app/` (if using App Router)

Do NOT modify:
- `public/`
- `.next/`
- `node_modules/`
- `docs/`
- `.github/workflows/`

Unless explicitly instructed.

## Required Workflow Before Implementation

### 1. API Integration Changes

- Update API client (fetch / custom client)
- Update types (DTO)
- Update ViewModel mapping

### 2. UI Changes

- Modify components
- Update feature layer
- Maintain separation between UI and business logic

### 3. State Management Changes

- Update hooks / state logic
- Do NOT embed business logic inside components

## Generated Code Rules

Never edit:

- Generated API client files
- Auto-generated types (if using codegen)

Always regenerate instead.

## Rendering Rules

- Prefer Server Components when possible
- Use Client Components only when necessary
- Avoid unnecessary client-side state

SSR is the default strategy.
CSR is optional and limited.

## Responsibility Rules

- Components: UI only
- Hooks: state + interaction
- Features: business coordination
- lib/: external API integration

Do NOT mix responsibilities.

## API Rules

- Do NOT call API directly from components
- Use abstraction layer (lib or feature)
- Always map DTO to ViewModel

## Testing Workflow

Before writing tests:

    pnpm install

After implementation:

    pnpm lint
    pnpm test
    pnpm build

New or modified features should include appropriate test coverage.

## Git Rules

Feature branches must be created from the latest active release branch.

Do not branch from develop, staging, or production.

Protected branches:
- `production`
- `staging`
- `develop`
- `release/*`
- `hotfix/*`

The following rules are enforced by repository branch protection:

- Direct commits are strictly prohibited.
- Force pushes and rebases are prohibited.
- Branch deletion is prohibited.
- Pull requests are mandatory.
- At least **one approval** is required before merge.
- Any new push dismisses previous approvals.
- The latest push must be approved.
- All review threads must be resolved before merging.

Copilot must:

1. Always create a feature branch.
2. Never attempt to merge without approval.
3. Never attempt to bypass branch protection.
4. After amending a PR branch, STOP and wait for human review.
5. Never use rebase, force-push, or history rewriting unless explicitly instructed.

Branch naming convention:

- `feature/<issue>-short-description`
- `bugfix/<issue>-short-description`

## Language Rule

All outputs, including pull request reviews, comments, and suggestions, MUST be written in Japanese.

Do NOT output English unless explicitly requested by the user.
