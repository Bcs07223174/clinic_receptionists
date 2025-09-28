import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Only apply to API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    try {
      // Ensure request has proper headers for JSON APIs
      const response = NextResponse.next();
      
      // Add CORS headers
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        return new Response(null, { 
          status: 200, 
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        });
      }
      
      return response;
    } catch (error) {
      console.error('Middleware error:', error);
      
      // Simple error response to avoid module issues
      return NextResponse.json({ 
        success: false,
        error: 'Request processing failed',
        code: 'MIDDLEWARE_ERROR',
        timestamp: new Date().toISOString()
      }, { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*']
};