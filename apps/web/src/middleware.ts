import { NextRequest, NextResponse } from "next/server";

// Middleware runs server-side; in Docker `localhost` is the container itself,
// so prefer an internal address (e.g. http://api:3000 in compose) when set.
const API_URL =
  process.env.API_INTERNAL_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3000";

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const accessToken = request.cookies.get("access_token");
  if (accessToken) return NextResponse.next();

  const refreshToken = request.cookies.get("refresh_token");
  if (!refreshToken) {
    return redirectToLogin(request);
  }

  try {
    const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { Cookie: `refresh_token=${refreshToken.value}` },
    });

    if (!refreshRes.ok) return redirectToLogin(request);

    const response = NextResponse.next();
    refreshRes.headers.getSetCookie().forEach((cookie) => {
      response.headers.append("Set-Cookie", cookie);
    });
    return response;
  } catch {
    return redirectToLogin(request);
  }
}

function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|login|register|confirm-email|forgot-password|reset-password)(?!$).*)",
  ],
};
