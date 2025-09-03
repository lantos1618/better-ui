# Stock Chat App

A modern, AI-powered stock market chat application built with Next.js, Gemini AI, and shadcn/ui components.

## Features

- Real-time stock price tracking with interactive charts
- Portfolio management and tracking
- Stock news and market analysis
- AI-powered chat interface with tool calling
- Beautiful UI with shadcn/ui components
- Built-in rate limiting for API protection (20 requests/minute)
- Dark mode support
- Responsive design

## Live Demo

Visit the live app: [https://stock-chat-gn5qeao8t-lantoslgtms-projects.vercel.app](https://stock-chat-gn5qeao8t-lantoslgtms-projects.vercel.app)

## Installation

```bash
npm install lambda-stock-chat-app
# or
yarn add lambda-stock-chat-app
# or
bun add lambda-stock-chat-app
```

## Setup

1. Clone the repository or use as a template
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file with your Gemini API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   
   # Optional rate limiting configuration
   NEXT_PUBLIC_API_RATE_LIMIT=20
   NEXT_PUBLIC_API_RATE_WINDOW=60000
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Available Tools

The chat interface supports the following AI-powered tools:

- **getStockPrice**: Get real-time stock prices with charts
- **getPortfolio**: View and manage your portfolio
- **addToPortfolio**: Add stocks to your portfolio
- **removeFromPortfolio**: Remove stocks from your portfolio
- **getStockNews**: Get latest news for specific stocks
- **getMarketOverview**: Get market overview and trends
- **getTechnicalAnalysis**: Get technical analysis for stocks

## Tech Stack

- **Next.js 15**: React framework for production
- **Gemini AI**: Google's generative AI for intelligent chat
- **shadcn/ui**: Beautiful, accessible UI components
- **Tailwind CSS v4**: Utility-first CSS framework
- **TypeScript**: Type safety and better DX
- **Vercel**: Deployment and hosting platform

## Deployment

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Flambda-run%2Fbetter-ui%2Ftree%2Fmain%2Fexamples%2Fstock-chat-app&env=GEMINI_API_KEY&envDescription=API%20Key%20for%20Gemini%20AI&envLink=https%3A%2F%2Fmakersuite.google.com%2Fapp%2Fapikey)

Remember to add your `GEMINI_API_KEY` environment variable in Vercel's project settings.

## Rate Limiting

The API includes built-in rate limiting to protect against abuse:
- Default: 20 requests per minute per IP address
- Configurable via environment variables
- Automatic rate limit headers in responses

## License

MIT