import { NextRequest, NextResponse } from 'next/server';

// Whitelist of allowed domains for security
const ALLOWED_DOMAINS = [
  'api.github.com',
  'jsonplaceholder.typicode.com',
  'api.openweathermap.org',
  'dummyjson.com'
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, method = 'GET', headers = {}, body: requestBody } = body;

    // Parse URL and validate domain
    const url = new URL(endpoint);
    const domain = url.hostname;
    
    if (!ALLOWED_DOMAINS.some(allowed => domain.includes(allowed))) {
      return NextResponse.json(
        { error: `Domain ${domain} is not whitelisted` },
        { status: 403 }
      );
    }

    // Make the proxied request
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: requestBody ? JSON.stringify(requestBody) : undefined
    });

    const data = await response.json();
    
    return NextResponse.json({
      data,
      status: response.status,
      statusText: response.statusText,
      url: endpoint
    });
    
  } catch (error) {
    console.error('Proxy API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Proxy request failed' },
      { status: 500 }
    );
  }
}