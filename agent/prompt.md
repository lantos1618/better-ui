please validate better-ui 
then try to make an example a chat app with stocks in the chat, using this project, with ai, 

make sure to ignore the right files/folders form the root dir because this is a framework project. (can git have subfolder .gitignores)

we also want to run and host it

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
