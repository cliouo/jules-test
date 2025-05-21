import { NextRequest, NextResponse } from 'next/server';
import { createProxyMiddleware } from 'http-proxy-middleware';

// Ensure TARGET_SERVER_URL is set in your environment variables.
// Fallback to a default for development if not set.
const TARGET_SERVER_URL = process.env.TARGET_SERVER_URL || 'https://jsonplaceholder.typicode.com';

// Helper function to create and configure the proxy middleware
// We need to adapt http-proxy-middleware to work with Next.js Edge/Node.js runtimes.
// Next.js API routes expect a handler that returns a Promise<Response>.
// http-proxy-middleware is designed for traditional Node.js http servers.
// We'll create a function that adapts the request and response.

const proxy = createProxyMiddleware({
  target: TARGET_SERVER_URL,
  changeOrigin: true, // Recommended to prevent issues with virtual hosts
  pathRewrite: (path, req) => {
    // req.url here is the full path including /api/proxy
    // We want to remove /api/proxy from the path
    const originalPath = (req as any).nextUrl?.pathname || path; // Access original pathname from NextRequest
    return originalPath.replace(/^\/api\/proxy/, '');
  },
  logLevel: 'debug', // Optional: for more detailed logging
  onProxyReq: (proxyReq, req, res) => {
    // You can modify the proxy request here if needed
    // For example, to add custom headers
    console.log(`[HPM] Proxying to ${TARGET_SERVER_URL}${proxyReq.path}`);
  },
  onProxyRes: (proxyRes, req, res) => {
    // You can modify the proxy response here if needed
    console.log(`[HPM] Received response from ${TARGET_SERVER_URL}${req.url}`);
  },
  onError: (err, req, res) => {
    console.error('[HPM] Proxy error:', err);
    // Ensure a response is sent to the client on error
    if (typeof res.writeHead === 'function') { // Check if res is a ServerResponse
        (res as any).writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Proxy error', error: err.message }));
    } else { // res is likely a NextResponse or similar, handle differently if needed for Edge runtime
        // For Next.js Edge runtime, direct response manipulation might not be possible here.
        // The promise-based approach below should handle errors by returning a NextResponse.
    }
  },
});

// Generic handler for all HTTP methods
async function handler(req: NextRequest, { params }: { params: { slug: string[] } }) {
  const { slug } = params;
  const originalUrl = req.nextUrl.clone(); // Clone to modify
  originalUrl.pathname = `/${slug.join('/')}`; // Construct path for target server
  
  // To make http-proxy-middleware work with Next.js, we need to manually handle the request and response.
  // http-proxy-middleware typically works by directly manipulating Node.js http.IncomingMessage and http.ServerResponse.
  // In Next.js API routes (especially Edge runtime), we work with Request and Response objects.

  return new Promise<NextResponse>((resolve, reject) => {
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
      // @ts-ignore duplex is required for streaming request bodies in some Node.js versions / fetch implementations
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
    .catch((error) => {
      console.error(`Error proxying to ${targetUrl}:`, error);
      resolve(NextResponse.json({ message: 'Proxy error', error: error.message }, { status: 502 })); // Bad Gateway
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
