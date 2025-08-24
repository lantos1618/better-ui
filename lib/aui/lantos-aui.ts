/**
 * 🚀 LANTOS AUI - Ultra-Concise Assistant-UI API
 * 
 * The most elegant way to create AI-powered tools for Next.js/Vercel
 * No .build() required - tools auto-finalize when complete!
 * 
 * @example Simple tool (2 methods only!)
 * ```tsx
 * const tool = aui
 *   .tool('weather')
 *   .input(z.object({ city: z.string() }))
 *   .execute(async ({ input }) => ({ temp: 72, city: input.city }))
 *   .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
 * ```
 * 
 * @example Complex tool with client optimization
 * ```tsx
 * const tool = aui
 *   .tool('search')
 *   .input(z.object({ query: z.string() }))
 *   .execute(async ({ input }) => db.search(input.query))
 *   .clientExecute(async ({ input, ctx }) => {
 *     const cached = ctx.cache.get(input.query);
 *     return cached || ctx.fetch('/api/tools/search', { body: input });
 *   })
 *   .render(({ data }) => <SearchResults results={data} />)
 * ```
 */

export { aui as default, aui } from './ultra-concise';
export type { AUITool } from './ultra-concise';

// Re-export Zod for convenience
export { z } from 'zod';

// Export type helpers
import type { AUITool } from './ultra-concise';
export type ToolInput<T> = T extends AUITool<infer I, any> ? I : never;
export type ToolOutput<T> = T extends AUITool<any, infer O> ? O : never;