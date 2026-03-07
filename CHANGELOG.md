# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.6.0] - 2026-03-07

### Added
- AG-UI protocol server (`@lantos1618/better-ui/agui`) — compatible with CopilotKit, LangChain, Google ADK
- SSE/Streamable HTTP transport for MCP server
- GitHub Actions CI/CD pipeline (test, type-check, build, publish)
- CONTRIBUTING.md and CHANGELOG.md
- Comprehensive test suite: 226 tests across 11 suites (up from 163)
- New docs pages: MCP guide, AG-UI guide, Auth guide, Security guide
- MCP API reference documentation

### Changed
- Updated README with AG-UI protocol section and feature table
- Added `mcp`, `ag-ui`, `model-context-protocol`, `ai-tools` keywords to package.json

## [0.5.0] - 2026-03-07

### Added
- MCP server with stdio and HTTP transports (`@lantos1618/better-ui/mcp`)
- Zod to JSON Schema converter for tool input schemas
- Comprehensive security test suite

### Fixed
- Security hardening: prototype pollution prevention, error leakage protection, URL validation

### Changed
- Rewritten README with updated architecture documentation

## [0.4.1] - 2026-02-21

### Fixed
- Outdated documentation corrected across API references

### Added
- Persistence guide for Drizzle/SQLite integration

## [0.4.0] - 2026-02-21

### Added
- Persistence layer with Drizzle/SQLite support (`@lantos1618/better-ui/persistence`)
- Improved tool result rendering in both demo apps

### Changed
- Demo app restructured: `demo/` renamed to `nextjs-demo/`, new `vite-demo/` added
- Core library refactored for cleaner subpath exports

## [0.3.2] - 2026-02-12

### Added
- Mintlify documentation site
- Tool grouping with `groupKey` support
- Conditional human-in-the-loop confirmation
- Multi-panel layout with `Panel` and `ChatPanel` components
- AI state synchronization via `useToolStateStore`
- Rich UI view components: `QuestionView`, `FormView`, `DataTableView`, `ProgressView`, `MediaDisplayView`, `CodeBlockView`, `FileUploadView`, `ToastProvider`
- Suggestion prompts and side panel
- Multi-provider support (OpenAI, Anthropic, Google, OpenRouter)
- Streaming tool views with `useToolStream`
- Pre-built chat components: `Chat`, `Thread`, `Message`, `Composer`, `ChatProvider`

## [0.3.1] - 2025-12-22

### Fixed
- Critical bugs and security issues resolved

### Changed
- Updated to AI SDK v5 compatibility
- Updated `useTools` documentation

## [0.3.0] - 2025-12-05

### Changed
- **BREAKING**: Complete architecture rewrite with clean `tool()` API
- New chainable builder pattern: `.server()`, `.client()`, `.stream()`, `.view()`
- Type-safe tool definitions with Zod schemas

### Added
- Comprehensive test suite (89 initial tests, expanded to 168)
- Rate limiting support
- CI/CD pipeline with GitHub Actions

## [0.2.3] - 2025-09-11

### Changed
- README rewritten with comprehensive documentation and AI SDK integration examples

## [0.2.2] - 2025-09-10

### Changed
- Removed stock-chat-app example from package

### Fixed
- Critical security update: removed exposed API keys

## [0.2.1] - 2025-09-09

### Added
- Stock chat app example with live Yahoo Finance data
- Modern UI redesign using shadcn/ui

### Fixed
- Hydration errors in example app resolved

## [0.2.0] - 2025-08-27

### Added
- Initial stock chat app example with AI integration
- TypeScript and ESLint error resolution pass

## [0.1.0] - 2025-08-26

### Added
- Initial release
- Core tool definition framework
- React integration hooks
