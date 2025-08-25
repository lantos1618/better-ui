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

## Recent Activity (2025-08-25 - Sync and General Checkup)
- Successfully pushed all 20 commits to origin/main
- All tests passing (143/143 tests) - Jest exits cleanly
- Build: Successful production build with Next.js 15.5.0 (build time: 1696ms)
- TypeScript check: All types valid, no errors
- Linting: No ESLint warnings or errors (Note: `next lint` deprecated)
- Latest commit: 32cd16f docs: Update .agent metadata with current project status
- Repository fully synced with remote (0 commits ahead/behind)
- All systems operational, codebase healthy and production-ready
- Working directory clean, no uncommitted changes
- On main branch, fully synced and deployment-ready

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