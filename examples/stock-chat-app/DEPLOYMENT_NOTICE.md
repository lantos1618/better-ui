# Deployment Security Notice

## Critical Security Update (2025-09-10)

### Issue Identified
- API key was exposed in `.env` files
- Previous Gemini API key has been compromised and needs to be rotated

### Actions Taken
1. ✅ Removed exposed API keys from version control
2. ✅ Updated `.gitignore` to exclude `.env.local`
3. ✅ Implemented strict rate limiting (3 requests/minute)
4. ✅ Configured environment variables for secure deployment
5. ✅ Deployed to Vercel without exposed keys

### Rate Limiting Configuration
- **Production Limit**: 3 requests per minute per IP
- **Window**: 60 seconds
- **Burst Protection**: Enabled

### Required Actions
1. **URGENT**: Generate new Gemini API key from Google AI Studio
2. Add new key to Vercel environment variables:
   ```bash
   vercel env add GEMINI_API_KEY production
   ```
3. Redeploy application after adding key

### Security Best Practices Implemented
- Environment variables stored securely in Vercel
- No API keys in source code
- Strict rate limiting to prevent abuse
- IP-based tracking for rate limits
- Automatic cleanup of expired rate limit entries

### Deployment URLs
- Production: https://stock-chat-app.vercel.app
- Latest Deploy: https://stock-chat-iwxdpphrb-lantoslgtms-projects.vercel.app

### Contact
For urgent issues: agent@lambda.run