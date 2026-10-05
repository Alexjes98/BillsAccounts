---
description: Always use pnpm instead of npm or yarn in frontend
---

# Package Manager Guidelines

- **ALWAYS use `pnpm`**: Never run `npm` or `yarn` when executing frontend commands.
- **Frontend Commands**:
  - `pnpm install` / `pnpm add <package>`
  - `pnpm build`
  - `pnpm dev`
  - `pnpm lint` / `pnpm test`
- **Lockfile Integrity**: The project depends on `pnpm-lock.yaml`. Running `npm` is strictly prohibited to avoid broken node_modules structure and lockfile corruption.
