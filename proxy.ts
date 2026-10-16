import { NextResponse, type NextRequest } from "next/server";
import slugs from "@/lib/content/slugs.generated.json";

const KNOWN = new Set<string>(slugs);
const TERMINAL = /\b(curl|wget|httpie|xh)\//i;

/**
 * Runs before routing:
 *  - terminals (curl, Wget, HTTPie, xh) that don't ask for HTML get the plain-text portfolio
 *    (brief C4) from /api/text, for "/", "/work" and "/work/<slug>";
 *  - /work/<slug> for a slug that doesn't exist answers a real 404 on the first request
 *    (dynamicParams isn't available with Cache Components);
 *  - responses are marked "Vary: User-Agent, Accept". Next.js 16 overwrites Vary on HTML pages
 *    (app-page runtime: res.setHeader('Vary', …)), so only the text responses keep it; on Vercel
 *    this proxy runs before the CDN cache for every request, so the two versions never mix.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ua = request.headers.get("user-agent") ?? "";
  const accept = request.headers.get("accept") ?? "";

  let res: NextResponse;
  if (TERMINAL.test(ua) && !accept.includes("text/html")) {
    // the text route reads the original path and ?nocolor from the request URL
    res = NextResponse.rewrite(new URL(`/api/text${request.nextUrl.search}`, request.url));
  } else {
    const slug = pathname.startsWith("/work/") && pathname !== "/work/opengraph-image" ? pathname.split("/")[2] : undefined;
    res = slug && !KNOWN.has(decodeURIComponent(slug)) ? NextResponse.rewrite(new URL("/_unknown-run", request.url)) : NextResponse.next();
  }
  res.headers.set("Vary", "User-Agent, Accept");
  return res;
}

export const config = {
  matcher: ["/", "/work", "/work/:slug"],
};
