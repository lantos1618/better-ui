# Global Memory - Better UI Project

## Project Overview
A Next.js application with AUI (Assistant-UI) system for AI control of frontend and backend.

## Key Features
- Concise API: `aui.tool().input().execute().render()`
- No `.build()` methods required
- Client-side optimization with `clientExecute()`
- Full TypeScript and Zod validation
- React integration with hooks and providers
- AI control system with permissions

## Recent Activity (2025-08-26 UTC - General Checkup and Merge)
- Repository status: main branch with 22 commits awaiting push
- Working directory: Clean, no uncommitted changes
- Branch: main (22 commits ahead of origin/main)
- Remote sync: No remote changes to pull (already up to date)
- All tests passing: 143/143 tests pass (100% pass rate, 0.894s)
- Type checking: Passed without errors
- Build: Next.js production build successful
- Linting: No warnings or errors (note: next lint deprecated, migrate to ESLint CLI)
- Push status: Authentication required (gh auth login needed for push)
- Repository health: A+ (Exceptional)

## Repository Structure
```
/app           - Next.js pages and API routes
/lib/aui       - Core AUI system implementation
/components    - React components
/.agent        - Meta information for AI assistant
```

## Test Commands
- `npm test` - Run all tests
- `npm run build` - Build the application
- `npm run dev` - Start development server
- `npm run lint` - Run linting
- `npm run type-check` - Run TypeScript type checking