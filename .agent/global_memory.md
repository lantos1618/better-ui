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

## Recent Activity (2025-08-26 UTC - General Checkup and Push)
- Repository status: main branch with 34 commits awaiting push
- Working directory: Clean (all changes committed)
- Branch: main (34 commits ahead of origin/main)
- Remote sync: Already up to date with origin/main
- All tests passing: 143/143 tests pass (100% pass rate, 0.925s)
- Type checking: Passed without errors
- Linting: No ESLint warnings or errors
- Build: Next.js production build successful (23 pages generated)
- Push status: Authentication required (needs manual `gh auth login`)
- Repository health: A+ (Exceptional)
- Note: To push changes, run `gh auth login` then `git push origin main`

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