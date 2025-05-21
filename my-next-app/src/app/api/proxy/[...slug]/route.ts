import { NextRequest, NextResponse } from 'next/server';

// Ensure TARGET_SERVER_URL is set in your environment variables.
// Fallback to a default for development if not set.
const TARGET_SERVER_URL = process.env.TARGET_SERVER_URL || 'https://jsonplaceholder.typicode.com';

// Generic handler for all HTTP methods
async function handler(req: NextRequest, { params }: { params: { slug: string[] } }) {
  const { slug } = params;
  const originalUrl = req.nextUrl.clone(); // Clone to modify
  originalUrl.pathname = `/${slug.join('/')}`; // Construct path for target server
  
  // To make http-proxy-middleware work with Next.js, we need to manually handle the request and response.
  // http-proxy-middleware typically works by directly manipulating Node.js http.IncomingMessage and http.ServerResponse.
  // In Next.js API routes (especially Edge runtime), we work with Request and Response objects.

  return new Promise<NextResponse>((resolve) => {
    // We need to convert NextRequest to something http-proxy-middleware can understand,
    // or manually construct the target request.
    // For simplicity, let's try to use the core logic of forwarding.

    // The `proxy` instance itself is a middleware function (req, res, next).
    // We need to adapt it. Unfortunately, http-proxy-middleware doesn't directly return a Response object
    // in a way that's easily usable with Next.js's App Router handler pattern.

    // A more direct approach for Next.js App Router without http-proxy-middleware's auto-handling:
    const targetPath = `/${slug.join('/')}${req.nextUrl.search}`; // Include query parameters
    const targetUrl = `${TARGET_SERVER_URL}${targetPath}`;

    console.log(`Forwarding ${req.method} request to: ${targetUrl}`);

    // Prepare headers, removing host and other problematic headers
    const headers = new Headers(req.headers);
    headers.delete('host'); // Let the fetch determine the host
    // Add any other necessary headers or modify existing ones
    // headers.set('X-Forwarded-Host', req.headers.get('host') || '');


    fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
      // @ts-expect-error duplex is required for streaming request bodies in some Node.js versions / fetch implementations
      duplex: 'half', // Important for streaming request bodies (e.g. POST/PUT)
    })
    .then(async (targetRes) => {
      console.log(`Received response from target: ${targetRes.status}`);
      // Construct a NextResponse from the target's response
      const responseHeaders = new Headers();
      targetRes.headers.forEach((value, key) => {
        // Some headers like 'content-encoding' and 'transfer-encoding'
        // should not be directly copied if Node/Next.js handles them automatically.
        if (key.toLowerCase() !== 'content-encoding' && key.toLowerCase() !== 'transfer-encoding') {
          responseHeaders.set(key, value);
        }
      });

      resolve(new NextResponse(targetRes.body, {
        status: targetRes.status,
        statusText: targetRes.statusText,
        headers: responseHeaders,
      }));
    })
    .catch((error: unknown) => { // Added type unknown for error
      console.error(`Error proxying to ${targetUrl}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      resolve(NextResponse.json({ message: 'Proxy error', error: errorMessage }, { status: 502 })); // Bad Gateway
    });
  });
}

// Export handlers for each method
export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const PATCH = handler;
export const HEAD = handler;
export const OPTIONS = handler;

// Note: The original attempt to use `http-proxy-middleware` directly in the Next.js App Router
// is complex because `http-proxy-middleware` is built for traditional Node.js http servers (req, res, next pattern)
// and Next.js App Router handlers expect a `Request => Promise<Response>` signature.
// The solution above bypasses `http-proxy-middleware`'s server integration and uses `fetch` directly,
// which is more aligned with Next.js's architecture, especially for Edge compatibility.
// If specific `http-proxy-middleware` features (like advanced WebSocket handling or detailed event listeners)
// are critical, a more complex adaptation or a custom server setup might be needed.
// For typical API proxying, direct `fetch` as shown is often sufficient and more straightforward in Next.js.
