import { NextResponse, type NextRequest } from "next/server";
import slugs from "@/lib/content/slugs.generated.json";

const KNOWN = new Set<string>(slugs);

/**
 * Runs before routing. /work/<slug> for a slug that doesn't exist is rewritten to a path no
 * route matches, so it answers a real 404 on the very first request (dynamicParams isn't
 * available with Cache Components). Phase 6 adds the curl version here.
 */
export function proxy(request: NextRequest) {
  const slug = request.nextUrl.pathname.split("/")[2];
  if (slug && !KNOWN.has(decodeURIComponent(slug))) {
    return NextResponse.rewrite(new URL("/_unknown-run", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/work/:slug"],
};
