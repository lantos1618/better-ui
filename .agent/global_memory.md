# Better UI - Global Memory

## Project Overview
**Name**: better-ui  
**Type**: Next.js TypeScript Application  
**Repository**: https://github.com/lantos1618/better-ui.git  
**Primary Feature**: AUI (Assistant-UI) - AI-powered UI system

## Core Architecture

### AUI System (`/lib/aui/`)
Advanced AI-controlled UI framework with:
- **Server Executor**: Handles tool execution with validation
- **Client Components**: React hooks and UI components
- **Tool Registry**: Extensible tool system
- **Type Safety**: Full TypeScript coverage

### Production Tools
1. **API Gateway**: Retry logic, caching, error handling
2. **State Manager**: Client-side CRUD operations
3. **Analytics**: Event tracking with batching
4. **File Upload**: Progress tracking
5. **WebSocket**: Real-time communication
6. **Notifications**: Browser and in-app
7. **Query Builder**: SQL construction

### Enhanced React Hook (`useAUIToolEnhanced`)
- Configurable caching with TTL
- Retry logic with exponential backoff
- Debounce/throttle support
- Lifecycle callbacks
- Auto-execution and polling
- Batch execution
- Request cancellation

## Development Standards

### Code Principles
- **DRY**: Don't Repeat Yourself
- **KISS**: Keep It Simple, Stupid
- **Type Safety**: Full TypeScript coverage
- **Testing First**: 143 tests, 100% pass rate

### Quality Metrics
- **Test Coverage**: Comprehensive
- **TypeScript**: Zero errors
- **ESLint**: Clean code
- **Security**: 0 vulnerabilities
- **Build Time**: ~1.7s for production

### Workflow
1. Frequent commits to maintain history
2. Clean working directory
3. Regular quality checks
4. Metadata tracking in .agent/
5. 80% development, 20% testing heuristic

## Technical Stack

### Core Dependencies
- **next**: 15.5.0
- **react**: 19.0.0
- **typescript**: 5.7.3
- **zod**: 3.24.1

### Testing
- **jest**: 29.7.0
- **@testing-library/react**: 16.1.0
- **ts-jest**: 29.2.5

### Development Tools
- **eslint**: 9.18.0
- **prettier**: 3.4.2
- **@types/node**: 22.10.5

## Important Notes

### GitHub Authentication
- Requires device authentication for pushing
- Use `gh auth login --web` to authenticate
- Visit https://github.com/login/device with provided code

### Context Management
- Optimal performance at 40% context window (100K-140K tokens)
- Use Task tool for complex searches to reduce context
- Clean up files after completion

### Repository Health
- Consistently maintains 98-100/100 health score
- All automated checks passing
- Regular metadata updates tracking progress

## Key Decisions

1. **AI-First Design**: Built specifically for AI control
2. **Production Ready**: Enhanced with enterprise features
3. **Modular Architecture**: Clean separation of concerns
4. **Comprehensive Testing**: Every component tested
5. **Type Safety**: No any types, full inference

## Recent Activities

- **2025-08-26 17:11 UTC**: Comprehensive checkup completed
- **Pending**: 13 commits to push (metadata updates)
- **Health**: 100/100 - All systems operational
- **Tests**: 143/143 passing (0.945s)
- **TypeScript**: Zero errors
- **ESLint**: Clean code
- **Security**: 0 vulnerabilities
- **Cache**: 73MB (.next/cache)
- **Auth Code**: 29FF-F995 (https://github.com/login/device)
- **Note**: GitHub authentication needed for push (`gh auth login`)