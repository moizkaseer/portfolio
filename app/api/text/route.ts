import { connection, type NextRequest } from "next/server";
import { renderHome, renderRun } from "@/lib/text/render";

const HEADERS = { "Content-Type": "text/plain; charset=utf-8", Vary: "User-Agent, Accept", "Cache-Control": "public, max-age=0, must-revalidate" };

/**
 * The curl version (brief C4). proxy.ts rewrites terminal requests (curl, Wget, HTTPie, xh that
 * don't accept HTML) for "/", "/work" and "/work/<slug>" here; `?nocolor` drops the ANSI codes.
 */
export async function GET(request: NextRequest) {
  await connection(); // per request: with Cache Components a GET handler would otherwise be prerendered
  const url = request.nextUrl;
  // after the proxy's rewrite the URL is still the visitor's ("/", "/work", "/work/<slug>")
  const path = url.pathname.startsWith("/api/text") ? (url.searchParams.get("path") ?? "/") : url.pathname;
  const color = !url.searchParams.has("nocolor");
  const slug = path.match(/^\/work\/([^/]+)\/?$/)?.[1];
  if (slug) {
    const text = renderRun(decodeURIComponent(slug), color);
    return text ? new Response(text, { headers: HEADERS }) : new Response(`Run failed: route not found (${path}).\nTry: curl ${url.origin}\n`, { status: 404, headers: HEADERS });
  }
  return new Response(renderHome(color), { headers: HEADERS });
}
