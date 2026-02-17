import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { apiAuthPrefix, authRoutes, DEFAULT_LOGIN_REDIRECT } from "@/lib/route";
export async function proxy(request: NextRequest) {
    const session = await auth.api.getSession({
        headers: await headers()
    })
    const isLoggedIn = !!session

    const isApiAuthRoute = request.nextUrl.pathname.startsWith(apiAuthPrefix)
    const isAuthRoute = authRoutes.includes(request.nextUrl.pathname)

    if (isApiAuthRoute) {
        return NextResponse.next();
    }

    if (isAuthRoute) {
        if (isLoggedIn) {
            return NextResponse.redirect(new URL(DEFAULT_LOGIN_REDIRECT, request.url)); // Redirect to default page if already logged in
        }
        return NextResponse.next();
    }

    if (!isLoggedIn && !isAuthRoute) {
        return NextResponse.redirect(new URL("/login", request.url)); // Redirect to login if not logged in and not on auth route
    }

    return NextResponse.next();
}   

export const config = {
  matcher: 
  [
    {
        source: '/((?!api|_next/static|_next/image|favicon.ico).*)', // Specify the routes the middleware applies to
    }
  ]
}