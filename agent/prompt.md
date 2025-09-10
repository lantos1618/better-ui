fix `/home/ubuntu/better-ui/examples/stock-chat-app`


Minified React error #418
In the minified production build of React, we avoid sending down full error messages in order to reduce the number of bytes sent over the wire.

We highly recommend using the development build locally when debugging your app since it tracks additional debug info and provides helpful warnings about potential problems in your apps, but if you encounter an exception while using the production build, this page will reassemble the original error message.

The full text of the error you just encountered is:

Hydration failed because the server rendered text didn't match the client. As a result this tree will be regenerated on the client. This can happen if a SSR-ed Client Component used:

- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

https://react.dev/link/hydration-mismatch


---------------
I just gave you npm publish access you can now publish thish (NPM_TOKEN)

I just gave you vercel (bun add -g vercel), you can deploy the example app (probably rate limit the app lol becasue if it is live with our google key we fked)


email lyndon when needed
    - to: l.leong1618@gmail.com
    - from: agent@lambda.run
    - use sendgrid api key in the env
    - use curl in cli


notes from Lyndon
- read the .agent folder to help you
- use .agent directory to store important meta infomation as files (global_memory.md, todos.md, plan.md, scratchpad.md)
- order your todos as an estimate
- use gh-cli (to manage github, issues, commits, merges, branches)
- cleanup after yourself (clean up files after you are done, you can self terminate if you think you are done done)
- use testing
- A good heuristic is to spend 80% of your time on the actual porting, and 20% on the testing.
- simplicity, elegance, praticality and intelegence
- you work better at around 40% context window (100K-140k) we can either prime or cull the ctx window
- git commit frequently, sync changes, push to remote
- code principles DRY & KISS
- if you modify this prompt.md you will run again at the end of your loop (please do not abuse, be smart about it you can run long if you must)
