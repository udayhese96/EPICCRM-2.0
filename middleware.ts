import { NextResponse, type NextRequest } from "next/server"
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-here'

export async function middleware(request: NextRequest) {
  console.log(`[Middleware] Processing: ${request.nextUrl.pathname}`)
  
  // Skip middleware for API routes and static files
  if (request.nextUrl.pathname.startsWith('/api/') || 
      request.nextUrl.pathname.startsWith('/_next/') ||
      request.nextUrl.pathname.includes('.')) {
    console.log(`[Middleware] Skipping: ${request.nextUrl.pathname}`)
    return NextResponse.next()
  }

  // Skip middleware for login and register pages
  if (request.nextUrl.pathname.startsWith('/auth/login') ||
      request.nextUrl.pathname.startsWith('/auth/register')) {
    console.log(`[Middleware] Skipping auth page: ${request.nextUrl.pathname}`)
    return NextResponse.next()
  }

  // Get the access token from cookies
  const accessToken = request.cookies.get('access_token')?.value
  console.log(`[Middleware] Access token present: ${!!accessToken}`)
  console.log(`[Middleware] All cookies:`, request.cookies.getAll().map(c => c.name))

  if (!accessToken) {
    console.log(`[Middleware] No access token, redirecting to login`)
    // No token, redirect to login
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  try {
    // Verify the JWT token using jose (Edge Runtime compatible)
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(accessToken, secret)
    
    console.log(`[Middleware] JWT decoded successfully for user: ${payload.username}, role: ${payload.role}`)
    
    // Check if token is expired
    if (payload.exp && payload.exp < Date.now() / 1000) {
      console.log(`[Middleware] Token expired, redirecting to login`)
      // Token expired, redirect to login
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }

    console.log(`[Middleware] Token valid, allowing access to: ${request.nextUrl.pathname}`)
    // Token is valid, continue to the requested page
    return NextResponse.next()

  } catch (error) {
    console.error('[Middleware] JWT verification failed:', error)
    console.error('[Middleware] JWT_SECRET being used:', JWT_SECRET.substring(0, 20) + '...')
    console.error('[Middleware] Token being verified:', accessToken.substring(0, 50) + '...')
    // Invalid token, redirect to login
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
