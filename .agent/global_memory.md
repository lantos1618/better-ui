# Global Memory - Better UI Stock Chat App

## Project Overview
- **Name**: Lambda Stock Chat App
- **Status**: Production Deployed (Redesigned)
- **URL**: https://stock-chat-c2ozpujij-lantoslgtms-projects.vercel.app
- **Repository**: https://github.com/lambda-run/better-ui
- **NPM Package**: @lantos1618/better-ui@0.2.1

## Key Components

### Technology Stack
- **Framework**: Next.js 15.5.2
- **UI Library**: shadcn/ui with Radix UI primitives
- **Animation**: Framer Motion
- **Styling**: Tailwind CSS v4
- **AI Model**: Google Gemini 1.5 Flash
- **Deployment**: Vercel
- **Package Manager**: npm/bun

### Core Features
1. **Real-time Stock Market Chat**: AI-powered assistant for stock market queries
2. **Portfolio Management**: Add, remove, and track stocks
3. **Market Overview**: Live market indices and trends
4. **Stock News**: Latest news for specific stocks
5. **Technical Analysis**: Stock price charts and indicators
6. **Rate Limiting**: Intelligent rate limiting to protect API

### Security Measures
- Rate limiting: 20 requests per minute per IP
- Environment variable protection for API keys
- Secure HTTPS deployment
- Input validation and sanitization

### UI/UX Improvements
- Modern gradient-based design
- Dark mode support
- Animated message streaming
- Voice input ready (UI prepared)
- Quick action buttons
- Real-time market indices display
- Responsive mobile-first design

## Environment Variables
```env
GEMINI_API_KEY=AIzaSyBIabCqpgM-xRocaa05pWHM9yNlTsjKhXQ
NEXT_PUBLIC_API_RATE_LIMIT=30
NEXT_PUBLIC_API_RATE_WINDOW=60000
```

## Recent Changes (2025-09-09)
- Complete UI redesign with shadcn/ui and framer-motion
- New sidebar component with market indices display
- Modern chat interface with animations
- Dark mode implementation with toggle
- Better-ui library integration (partial)
- Removed temporary project folder
- Published @lantos1618/better-ui@0.2.1 to npm
- Deployed to Vercel production

## Known Issues & TODOs
- Gemini API key is exposed in .env.local (needs rotation)
- Consider implementing Redis for distributed rate limiting
- Add WebSocket support for real-time stock prices
- Implement user authentication
- Add data persistence layer

## Performance Metrics
- Build size: 150 KB First Load JS
- Build time: ~5.3s
- Rate limit: 30 req/min

## Contact
- Developer: Lyndon Leong (l.leong1618@gmail.com)
- Agent: agent@lambda.run

## Deployment Notes
- Platform: Vercel
- Region: Auto
- Environment: Production
- SSL: Enabled

Last Updated: 2025-09-09 02:08 UTC
