/**
 * Test utilities for Next.js API route testing
 */

/**
 * Create a mock Request object for testing
 */
export function createMockRequest(
  body?: any,
  headers?: Record<string, string>
): Request {
  const headersObj = new Headers(headers);
  
  return {
    json: async () => body || {},
    headers: headersObj,
    method: 'POST',
    url: 'http://localhost:3000/api/test',
  } as Request;
}

/**
 * Helper to extract JSON from Response
 */
export async function getResponseJson(response: Response): Promise<any> {
  return await response.json();
}

/**
 * Helper to check response status and get JSON
 */
export async function expectResponse(
  response: Response,
  expectedStatus: number
): Promise<any> {
  expect(response.status).toBe(expectedStatus);
  return await response.json();
}

