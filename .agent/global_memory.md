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
- Fixed failing rate limit test in aui-complete.test.ts (added audit: true)
- All tests now passing (143/143 tests)
- Latest local commit: 8dc7971 fix: Enable audit for rate limiting test
- Repository status: 2 commits ahead of origin/main (need push access)
- TypeScript check: All types valid (npm run type-check)
- Linting: 4 warnings in useAUIToolEnhanced.ts (missing dependency warnings)
- General checkup completed successfully
- .agent metadata files updated

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