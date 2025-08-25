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

## Recent Activity (2025-08-25 - Latest Update)
- Updated Next.js from 14.2.0 to 15.5.0 (fixed critical security vulnerability)
- Fixed all React hook warnings in useAUIToolEnhanced.ts
- Updated API routes for Next.js 15 compatibility (async params)
- Removed deprecated swcMinify from next.config.js
- All tests passing (143/143 tests)
- Build: Successful production build with Next.js 15
- TypeScript check: All types valid (npm run type-check)
- Latest local commit: 89eb2df docs: Update .agent metadata after general checkup
- Repository status: 7 commits ahead of origin/main (need push access/authentication)
- GitHub authentication needed for push (gh auth login required)
- All systems operational, codebase healthy and secure

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