# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.10.0] - 2026-07-02

### ⚠️ Breaking changes (upgrade notes)
- **CORS:** OpenAPI `toolRouter`/`openAPIHandler` no longer send `Access-Control-Allow-Origin: *`. Cross-origin browser callers break until you set `cors.origin`.
- **Origin validation:** MCP and AG-UI HTTP/SSE handlers reject requests whose `Origin` does not match the `Host`. Native clients (no `Origin` header) are unaffected; browser clients on another origin must be listed in `allowedOrigins`.
- **JWT:** `jwtAuth` now throws at construction if the secret is shorter than 32 bytes, requires an `exp` claim by default (opt out with `requireExpiration: false`), and defaults the accepted algorithm to `['HS256']`. Short-secret or non-expiring-token setups must be updated before upgrading.

### Security
- MCP and AG-UI HTTP/SSE handlers now validate the `Origin` header (allowlist via `allowedOrigins`, same-origin fallback; 403 on mismatch) to prevent DNS-rebinding/CSRF
- MCP and AG-UI handlers gained an `onBeforeExecute` hook for authentication/authorization, mirroring `toolRouter`
- Request body size limits (`maxBodyBytes`, default 1MB → 413) on all HTTP handlers; MCP stdio line buffer capped (`maxLineBytes`, default 10MB)
- Error responses are now generic by default; raw error details are logged server-side and only returned when `debug: true`
- **Breaking:** OpenAPI `toolRouter`/`openAPIHandler` no longer send `Access-Control-Allow-Origin: *` by default — CORS is off (same-origin) unless configured via the new `cors.origin` option
- **Breaking:** `jwtAuth` now requires an `exp` claim by default (opt out with `requireExpiration: false`), applies the documented `['HS256']` algorithm default, and rejects secrets shorter than 32 bytes; added `maxTokenAge` option
- Swagger UI assets pinned to an exact version with a `docsAssetBase` self-host option; `basePath` interpolation escaped
- `parseCookies` uses a null-prototype object (prevents `__proto__` pollution)
- `MediaDisplay` validates media URLs against a protocol allowlist (blocks `javascript:` and non-media `data:` URIs)
- `FileUpload` enforces the `accept` prop for drag-and-dropped files

### Added
- `CodeBlock` now renders syntax-highlighted code via lazy-loaded shiki
- Test suites for the auth module (25 tests) and view components (19 tests); suite grew from 228 to 330 tests
- Docs pages for `ThemeProvider`, `Chat`, `Markdown`, and the OpenAPI adapter

### Fixed
- Demo apps: rate limiter was checked without `await` (never triggered with Redis); vite demo CORS restricted to the dev origin; thread message routes validate thread existence and cap payload size
- Demo apps migrated from `better-ui@0.6.1` / AI SDK v5 to the current API / AI SDK v6
- `useTool` docs showed a root import path; it is exported from `@lantos1618/better-ui/react`

## [0.9.3] - 2026-04-23

### Changed
- Replaced remaining inline SVGs with `lucide-react` icons across components

## [0.9.2] - 2026-04-23

### Changed
- Composer/Thread polish: bolder send button and refreshed suggestion prompts
- Rewrote README usage guide

## [0.9.1] - 2026-04-12

### Added
- OpenAPI 3.1 spec generator and callable tool router (`@lantos1618/better-ui/openapi`)
- `generateOpenAPISpec` — build an OpenAPI document from a tool registry
- `openAPIHandler` — serve the spec as JSON
- `toolRouter` — one `POST` endpoint per tool, plus the spec and a Swagger UI page, with an `onBeforeExecute` hook for auth/guards

## [0.8.0] - 2026-04-12

### Changed
- Updated MCP protocol version to `2025-11-25`

### Fixed
- Fixed `ChatProvider` race conditions
- Added an error boundary to `ToolResult`

## [0.7.1] - 2026-04-12

### Added
- Zod 4 compatibility

## [0.7.0] - 2026-04-02

### Changed
- Bumped dependencies: AI SDK v6, Shiki v4, and `@ai-sdk/*` peer deps to v3

### Added
- Comprehensive usage guide (`GUIDE.md`)

### Fixed
- Configured demo apps for deployment

## [0.6.1] - 2026-03-07

### Added
- AG-UI: batch tool calls support

### Changed
- AG-UI server now uses a static import

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
