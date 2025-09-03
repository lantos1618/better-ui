while inotifywait -e close_write agent/prompt.md; do
  cat agent/prompt.md | \
    claude -p --output-format=stream-json --verbose --dangerously-skip-permissions | \
    tee -a .agent/claude_output.jsonl | \
    bun agent/visualize.ts --debug
  echo -e "===SLEEP===\n===SLEEP===\n"; echo 'looping'
done
