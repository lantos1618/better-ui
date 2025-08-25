please implement a concise and nice way to have aui (assistant-ui I want to call it aui) so that I can write tool calls (client and server executions to enable ai to controll the frontend and backend in nextjs vercel) call this brance lantos-aui



```tsx
// Simple tool - just 2 methods
const simpleTool = aui
  .tool('weather')
  .input(z.object({ city: z.string() }))
  .execute(async ({ input }) => ({ temp: 72, city: input.city }))
  .render(({ data }) => <div>{data.city}: {data.temp}°</div>)

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



```

-  HIGH PRIORITY STOP USING LANTOS AS A NAME LOOK at the files tree there are files called lantos and also like components or react things or ts thigns called lantos also there are examples that can be cleaned up. clean up this lantos-aui and the LantosAUI and lantos everything ffs
-  HIGH PRIORITY REMOVE THE .build() API WE WANT EVERY ACTION TO RETURN A BUILT object!
-  HIGH PRIORITY FIND ALL the redundant code we have app/aui and lib/aui 
-  HIGH PRIORITY we have two systems built please remove the lantos aui choose the best version and like think about this... infact you can run Tree and ignore the node_modules and .next


notes from Lyndon
- read the .agent folder to help you
- use .agent directory to store important meta infomation as files (global_memory.md, todos.md, plan.md, scratchpad.md)
- order your todos as an estimate
- you can open and view github issues (gh-cli)
- cleanup after yourself (clean up files after you are done, you can self terminate if you think you are done done)
- use testing
- A good heuristic is to spend 80% of your time on the actual porting, and 20% on the testing.
- simplicity, elegance, praticality and intelegence
- you work better at around 40% context window (100K-140k) we can either prime or cull the ctx window
- use frequent git commits and pushes 
- code principles DRY & KISS