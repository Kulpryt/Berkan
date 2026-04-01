import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("kulpryt-finance-token")?.value;

  if (token !== process.env.FINANCE_SECRET) {
    const loginUrl = new URL("/login-finance", req.url);
    loginUrl.searchParams.set("from", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/finance/:path*"],
};