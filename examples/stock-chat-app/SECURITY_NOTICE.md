# IMPORTANT SECURITY NOTICE

## API Key Required
This application requires a valid Google Gemini API key to function.

### Setup Instructions:
1. Obtain a new API key from Google AI Studio: https://makersuite.google.com/app/apikey
2. Set the environment variable on Vercel:
   ```bash
   vercel env add GEMINI_API_KEY production
   ```
3. Enter your API key when prompted
4. Redeploy the application

### Security Measures Implemented:
- Rate limiting enabled (20 requests per minute per IP)
- API key stored only in environment variables
- No hardcoded secrets in source code
- All previous exposed keys have been revoked

### Important:
- NEVER commit API keys to version control
- Always use environment variables for sensitive data
- Rotate keys immediately if exposed
- Monitor usage for suspicious activity

---
Emergency contact: l.leong1618@gmail.com