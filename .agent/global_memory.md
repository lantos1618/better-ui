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

## Recent Activity (2025-08-25 22:05 - Sync Verification)
- Repository fully synced with origin/main (pulled latest, already up to date)
- All tests passing (143/143 tests) - Jest exits cleanly
- TypeScript check: All types valid, no errors
- Linting: No ESLint warnings or errors (Note: `next lint` deprecated)
- Latest commit: 0ecc3fb docs: Update .agent metadata after sync verification
- Working directory: Clean, no uncommitted changes
- Branch: main (up to date with origin/main)
- Node v20.19.3, npm 10.8.2
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