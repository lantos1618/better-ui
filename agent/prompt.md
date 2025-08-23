please implement a concise and nice way to have aui (assistant-ui I want to call it aui) so that I can write tool calls (client and server executions to enable ai to controll the frontend and backend in nextjs vercel) call this brance lantos-aui



```tsx
// Simple tool - just 2 methods
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)
  .build();

// Complex tool - adds client optimization
const complexTool = aui
  .tool('search')
  .input(z.object({ query: z.string() }))
  .execute(async ({ input }) => db.search(input.query))
  .clientExecute(async ({ input, ctx }) => {
    // Only when you need caching, offline, etc.
    const cached = ctx.cache.get(input.query);
    return cached || ctx.fetch('/api/tools/search', { body: input });
  })
  .render(({ data }) => <SearchResults results={data} />)
  .build();



```


notes from Lyndon
- use .agent directory to store important meta infomation as (global_memory.md, todos.md, plan.md) this will help you on resets
- use github issues to help manage state (longterm todos, bugs and issues)
- use testing
- cleanup after yourself (clean up files after yourself, you can self terminate if you think you are done done)
- A good heuristic is to spend 80% of your time on the actual porting, and 20% on the testing.
- simplicity, elegance, praticality and intelegence
- you work better at around 40% context window (100K-140k) we can either prime or cull the ctx window
- you can open and view github issues
- don't delete the agent director please (don't delete yourself)
- commit and push frequently
- check errors