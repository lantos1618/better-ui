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

## Recent Activity (2025-08-25 - Full Sync and Checkup)
- Repository fully synced with origin/main (pulled latest, already up to date)
- No local commits to push (everything synchronized)
- All tests passing (143/143 tests) - Jest exits cleanly
- TypeScript check: All types valid, no errors
- Linting: No ESLint warnings or errors (Note: `next lint` deprecated)
- Latest commit: 10c0e3d docs: Update .agent metadata after successful sync and checkup
- Working directory: Clean, no uncommitted changes
- Branch: main (up to date with origin/main)
- Build successful, all pages compiled correctly
- All systems operational, codebase healthy and production-ready

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