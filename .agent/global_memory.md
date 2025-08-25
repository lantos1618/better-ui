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

## Recent Activity (2025-08-25 23:46 UTC - General Checkup and Sync)
- Repository fully synced with origin/main
- Latest commit: 9365892 docs: Update .agent metadata after general checkup and sync
- Working directory: Clean, no uncommitted changes
- Branch: main (up to date with origin/main)
- All tests passing: 143/143 tests pass successfully
- Build successful: Next.js production build completed without errors
- Linting successful: No ESLint warnings or errors (note: next lint deprecated warning)
- TypeScript check: Clean, no type errors
- Dependencies: Some packages have newer major versions available (React 19, Jest 30, Zod 4)
- All systems operational and healthy

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