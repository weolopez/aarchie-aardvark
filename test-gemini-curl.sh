#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Test Gemini API streaming endpoint
# NOTE: Update API_KEY with a valid key from:
# https://makersuite.google.com/app/apikey

API_KEY="${GEMINI_API_KEY}"
MODEL="${GEMINI_MODEL:-gemini-pro}"
URL="https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?key=${API_KEY}"

if [ -z "$API_KEY" ] || [ "$API_KEY" = "YOUR_API_KEY_HERE" ]; then
  echo "ERROR: Please set a valid GEMINI_API_KEY in your .env file or environment"
  echo "Get a key from: https://makersuite.google.com/app/apikey"
  exit 1
fi

echo "Testing Gemini API streaming endpoint..."
echo "URL: $URL"
echo

# JSON payload for Gemini API
PAYLOAD='{
  "contents": [
    {
      "parts": [
        {
          "text": "Say hello in one word."
        }
      ],
      "role": "user"
    }
  ],
  "systemInstruction": {
    "parts": [
      {
        "text": "You are a helpful assistant. Answer questions directly and factually."
      }
    ]
  },
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 4096
  }
}'

echo "Request payload:"
echo "$PAYLOAD"
echo

# Make the curl request
echo "Making request..."
curl -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  -w "\n\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\n" \
  --max-time 30
