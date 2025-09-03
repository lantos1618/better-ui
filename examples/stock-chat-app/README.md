# Stock Chat App Example

An example Next.js chat application built with the Better-UI (AUI) framework, featuring:
- Real-time stock data integration
- AI-powered chat using Google Gemini
- Interactive UI with AUI tools
- Built-in rate limiting (5 requests per minute)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file with your API keys:
```
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_API_RATE_LIMIT=5
NEXT_PUBLIC_API_RATE_WINDOW=60000
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Deployment

### Deploy to Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/lantos1618/better-ui/tree/main/examples/stock-chat-app&env=GEMINI_API_KEY&envDescription=Required%20API%20key%20for%20Gemini%20AI&envLink=https://makersuite.google.com/app/apikey)