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

## Recent Activity (2025-08-25 19:56 - Latest)
- Repository fully synced with remote (up to date)
- All tests passing (142/143) - only rate limit test failing
- Build successful
- Type checking passes with no errors (tsc --noEmit)
- Linting shows 4 minor React hook warnings in useAUIToolEnhanced.ts
- Main branch is clean and up to date
- Latest general checkup completed successfully
- Full sync and health check verified
- No uncommitted changes
- No unpushed commits
- Security: 1 critical vulnerability in next.js (<=14.2.29)

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
- `npm run typecheck` - Run TypeScript type checking