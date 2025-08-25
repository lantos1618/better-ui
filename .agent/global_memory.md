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

## Recent Activity (2025-08-25 - Latest Checkup)
- All tests passing (143/143 tests)
- Build: Successful production build with Next.js 15.5.0
- TypeScript check: All types valid (npm run type-check)
- Security: No vulnerabilities found (npm audit clean)
- Latest local commit: 8e7183d docs: Update .agent metadata after complete checkup
- Repository status: 11 commits ahead of origin/main (authentication required for push)
- GitHub authentication needed: Manual authentication required via `gh auth login`
- All systems operational, codebase healthy and secure
- No temporary files found
- Working directory clean

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