# Global Memory - Better UI Stock Chat App

## Project Overview
- **Name**: Lambda Stock Chat App
- **Status**: Production Deployed (Redesigned)
- **URL**: https://stock-chat-app.vercel.app
- **Alternative URLs**: 
  - https://stock-chat-app-lantoslgtms-projects.vercel.app
  - https://stock-chat-h81qfe6y1-lantoslgtms-projects.vercel.app
- **Repository**: https://github.com/lantos1618/better-ui
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
- Rate limiting: 10 requests per minute per IP (production)
- Environment variable protection for API keys
- Secure HTTPS deployment
- Input validation and sanitization
- Updated Gemini API key (2025-09-10)

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
GEMINI_API_KEY=[Updated 2025-09-10 - Secured]
NEXT_PUBLIC_API_RATE_LIMIT=10
NEXT_PUBLIC_API_RATE_WINDOW=60000
```

## Recent Changes (2025-09-10)
- Fixed hydration errors by stabilizing SSR/client state
- Updated Gemini API key for production deployment  
- Configured stricter rate limiting (10 req/min) for production
- Deployed to new Vercel production URL: https://stock-chat-app.vercel.app
- Fixed dark mode hydration mismatch with localStorage persistence
- Email notification sent to Lyndon about deployment

## Previous Changes (2025-09-09)
- Complete UI redesign with shadcn/ui and framer-motion
- New sidebar component with market indices display
- Modern chat interface with animations
- Dark mode implementation with toggle
- Better-ui library integration (partial)
- Removed temporary project folder
- Published @lantos1618/better-ui@0.2.1 to npm

## Known Issues & TODOs
- Consider implementing Redis for distributed rate limiting
- Add WebSocket support for real-time stock prices
- Implement user authentication
- Add data persistence layer
- Monitor API usage to ensure rate limits are sufficient

## Performance Metrics
- Build size: 150 KB First Load JS
- Build time: ~38s (Vercel)
- Rate limit: 10 req/min (production)

## Contact
- Developer: Lyndon Leong (l.leong1618@gmail.com)
- Agent: agent@lambda.run

## Deployment Notes
- Platform: Vercel
- Region: Auto
- Environment: Production
- SSL: Enabled

Last Updated: 2025-09-10 00:08 UTC
