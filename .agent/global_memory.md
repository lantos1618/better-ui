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

## Recent Activity (2025-08-26 UTC - General Checkup and Sync)
- Repository status: main branch with 10 commits awaiting push
- Commits pending push: 74d4893, 7c8b7b6, fe2059b, 5d1e214, 656bf88, b7f93b6, 7c37144, bf4970c, de49616, 063ec38 (all .agent metadata updates)
- Working directory: Clean, no uncommitted changes
- Branch: main (10 commits ahead of origin/main)
- Remote sync: No remote changes to pull (already up to date)
- All tests passing: All test suites pass successfully
- Build successful: Next.js production build completed without errors
- Linting successful: No ESLint warnings or errors (note: next lint deprecated warning)
- Push status: Authentication required (gh auth login needed, push timeout observed)
- No temporary files found for cleanup
- Repository health: A+ (Exceptional)

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