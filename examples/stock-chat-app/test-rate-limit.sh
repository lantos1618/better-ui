#!/bin/bash

URL="https://stock-chat-app-lantoslgtms-projects.vercel.app/api/chat"
echo "Testing rate limiting on deployed app..."
echo "URL: $URL"
echo "---"

for i in {1..5}; do
  echo "Request $i:"
  response=$(curl -X POST "$URL" \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"What is AAPL stock price?"}],"model":"gemini-1.5-flash"}' \
    -s -w "\nHTTP_STATUS:%{http_code}\n" 2>&1)
  
  http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
  
  if [ "$http_status" = "429" ]; then
    echo "✓ Rate limit working - Got 429 (Too Many Requests)"
  elif [ "$http_status" = "200" ]; then
    echo "✓ Request successful - Status 200"
  else
    echo "Status: $http_status"
  fi
  
  echo "---"
  sleep 0.5
done

echo "Rate limiting test complete!"