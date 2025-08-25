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
- Repository fully synced with remote (up to date)
- All changes committed and pushed to main branch
- Latest commit: 56d7a43 docs: Update .agent metadata after general checkup
- Main branch is clean and up to date
- General checkup completed successfully
- .agent metadata files created and updated
- No uncommitted changes
- No unpushed commits
- Tests run: 1 failing test (rate limit test in aui-complete.test.ts)
- TypeScript check: All types valid (npm run type-check)
- Linting: 4 warnings in useAUIToolEnhanced.ts (missing dependency warnings)

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