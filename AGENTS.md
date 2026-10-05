# Antigravity Guidelines & Rules

## Package Manager (Frontend)

- **CRITICAL**: **ALWAYS use `pnpm` instead of `npm` or `yarn`** for all frontend commands and script executions.
- **Commands**:
  - Install dependencies: `pnpm install` / `pnpm add <pkg>` / `pnpm add -D <pkg>`
  - Run build: `pnpm build`
  - Run development server: `pnpm dev`
  - Run test / lint: `pnpm test` / `pnpm lint`
  - Any custom script: `pnpm <script>`
- **Rationale**: The project uses `pnpm-lock.yaml`. Using `npm` creates conflicts, bypasses pnpm workspace linking, and risks breaking dependencies.
