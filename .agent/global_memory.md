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

## Recent Activity (2025-08-25 - Latest Checkup and Fixes)
- All tests passing (143/143 tests) - Jest now exits cleanly
- Build: Successful production build with Next.js 15.5.0
- TypeScript check: All types valid (npm run type-check)
- Security: No vulnerabilities found (npm audit clean)
- Latest local commit: 6c3babd fix: Clear timeout in server-executor to prevent Jest open handles
- Repository status: 16 commits ahead of origin/main (authentication required for push)
- Fixed: Jest timeout cleanup issue in server-executor.ts
- GitHub authentication needed: Manual authentication required via `gh auth login`
- All systems operational, codebase healthy and secure
- Working directory clean
- Pulled latest from remote (already up to date)
- On main branch, ready for deployment

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