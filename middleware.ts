import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { Role } from './lib/auth'

export default withAuth(
    async function middleware(req) {
        const token = req.nextauth.token
        const path = req.nextUrl.pathname

        // Handle root path
        if (path === '/') {
            if (!token) {
                return NextResponse.redirect(new URL('/login', req.url))
            }
            return NextResponse.redirect(new URL('/dashboard', req.url))
        }

        // Handle login paths
        if (path === '/login' || path === '/login-error') {
            if (token) {
                return NextResponse.redirect(new URL('/dashboard', req.url))
            }
            return NextResponse.next()
        }

        // Skip tenant check for auth-related paths
        if (path.startsWith('/api/auth/')) {
            return NextResponse.next()
        }

        // Check tenant status for non-super admin users
        if (token && token.role !== Role.SUPER_ADMIN && token.tenantId) {
            try {
                const response = await fetch(new URL('/api/tenants/status', req.nextUrl.origin), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cookie': req.headers.get('cookie') || ''
                    },
                    body: JSON.stringify({ tenantId: token.tenantId })
                })

                if (!response.ok) {
                    throw new Error('Failed to check tenant status')
                }

                const data = await response.json()
                if (!data.isActive) {
                    const response = NextResponse.redirect(new URL('/login', req.url))
                    response.cookies.delete('next-auth.session-token')
                    response.cookies.delete('next-auth.callback-url')
                    response.cookies.delete('next-auth.csrf-token')
                    return response
                }
            } catch (error) {
                console.error('Error checking tenant status:', error)
                // On error, redirect to login and clear cookies
                const response = NextResponse.redirect(new URL('/login', req.url))
                response.cookies.delete('next-auth.session-token')
                response.cookies.delete('next-auth.callback-url')
                response.cookies.delete('next-auth.csrf-token')
                return response
            }
        }

        // Protect admin routes
        if (path.startsWith('/superadmin')) {
            if (!token || token.role !== Role.SUPER_ADMIN) {
                return NextResponse.redirect(new URL('/dashboard', req.url))
            }
        }

        // Handle tenant admin routes - allow TENANT_ADMIN or SUPER_ADMIN with tenantId
        if (path.startsWith('/admin')) {
            if (!token) {
                return NextResponse.redirect(new URL('/dashboard', req.url))
            }
            const isTenantAdmin = token.role === Role.TENANT_ADMIN
            const isSuperAdminWithTenant = token.role === Role.SUPER_ADMIN && token.tenantId
            if (!isTenantAdmin && !isSuperAdminWithTenant) {
                return NextResponse.redirect(new URL('/dashboard', req.url))
            }
        }

        // Default to allowing the request
        return NextResponse.next()
    },
    {
        callbacks: {
            authorized: ({ token, req }) => {
                const path = req.nextUrl.pathname
                // Public paths and auth-related paths don't require auth
                if (path === '/login' || path === '/login-error' || path.startsWith('/api/auth/')) {
                    return true
                }
                // All other paths require auth
                return !!token
            }
        },
    }
)

export const config = {
    matcher: [
        '/',
        '/login',
        '/login-error',
        '/dashboard/:path*',
        '/superadmin/:path*',
        '/admin/:path*',
        '/api/auth/:path*'
    ]
}