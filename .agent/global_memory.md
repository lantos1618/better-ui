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

## Recent Activity (2025-08-26 UTC - Latest General Checkup)
- Repository status: main branch with 48 commits awaiting push
- Working directory: Clean (no uncommitted changes)  
- Branch: main (48 commits ahead of origin/main)
- Remote sync: Already up to date with origin/main (pull completed)
- All tests passing: 143/143 tests pass (100% pass rate, 0.885s)
- Type checking: Zero TypeScript compilation errors
- Linting: No ESLint warnings or errors (deprecation warning for `next lint`)
- Build: Successful production build (23 pages, 1662ms)
- Push status: Authentication required (needs manual `gh auth login`)
- GitHub CLI: Authentication required for PR/issue access
- Repository health: A+ (Exceptional) - Production-ready
- Large file cleaned: .agent/claude_output.jsonl (was 3.2MB)
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