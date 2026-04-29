import { NextRequest, NextResponse } from "next/server";

export async function middleware(_request: NextRequest): Promise<NextResponse> {
  // Auth is enforced by the API and by the client app layouts. Do not inspect
  // or rotate auth cookies here: refresh tokens are single-use, and middleware
  // can either consume the token before the browser does or fail to see
  // host-only API cookies when web/API run on different hosts.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|login|register|confirm-email|forgot-password|reset-password)(?!$).*)",
  ],
};
