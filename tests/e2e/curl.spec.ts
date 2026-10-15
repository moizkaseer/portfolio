/** C4 — the curl version: terminals get a plain-text portfolio, browsers get HTML. */
import { test, expect } from "@playwright/test";

const CURL = { "User-Agent": "curl/8.7.1", Accept: "*/*" };
const width = (t: string) => Math.max(...t.replace(/\x1b\[[0-9;]*m/g, "").split("\n").map((l) => l.length));
const RUNS = ["support-inbox-agent", "invoice-extraction-pipeline", "lead-research-agent", "weekly-ops-report"];

test.describe("curl version", () => {
  test.beforeEach(({}, info) => test.skip(info.project.name === "phone", "HTTP-only tests"));

  test("curl gets text/plain with the name, an email, orange accents and Vary", async ({ request }) => {
    const res = await request.get("/", { headers: CURL });
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("text/plain; charset=utf-8");
    expect(res.headers()["vary"]).toContain("User-Agent, Accept");
    const text = await res.text();
    expect(text).toContain("AI agents & automation");
    expect(text).toMatch(/\[you@yourdomain\.com\]|@/);
    expect(text).toContain("\x1b[38;5;202m"); // ANSI 256-colour 202
    expect(text).toContain("Try: curl");
  });

  test("?nocolor drops every ANSI code", async ({ request }) => {
    const text = await (await request.get("/?nocolor", { headers: CURL })).text();
    expect(text).not.toContain("\x1b[");
    expect(text).toContain("SELECTED RUNS");
  });

  test("every page fits in 80 columns", async ({ request }) => {
    for (const path of ["/", "/work", ...RUNS.map((s) => `/work/${s}`)]) {
      const text = await (await request.get(path, { headers: CURL })).text();
      expect(width(text), path).toBeLessThanOrEqual(80);
    }
  });

  test("/work/<slug> is the run report in text; unknown runs are a 404", async ({ request }) => {
    const text = await (await request.get("/work/invoice-extraction-pipeline?nocolor", { headers: CURL })).text();
    expect(text).toContain("[Invoice extraction pipeline]");
    expect(text).toContain("01 — THE SYSTEM");
    expect(text).toContain("This is a sample run showing how the system works.");
    expect(text).toContain("branch: when confidence < 0.9");
    const missing = await request.get("/work/no-such-run", { headers: CURL });
    expect(missing.status()).toBe(404);
    expect(await missing.text()).toContain("Run failed: route not found");
  });

  test("Wget, HTTPie and xh get text too", async ({ request }) => {
    for (const ua of ["Wget/1.21.4", "HTTPie/3.2.2", "xh/0.22.2"]) {
      const res = await request.get("/", { headers: { "User-Agent": ua, Accept: "application/json, */*;q=0.5" } });
      expect(res.headers()["content-type"], ua).toContain("text/plain");
    }
  });

  test("browsers — and terminals that ask for HTML — get the site", async ({ request }) => {
    const browser = await request.get("/", { headers: { "User-Agent": "Mozilla/5.0 Chrome/140", Accept: "text/html,*/*" } });
    expect(browser.headers()["content-type"]).toContain("text/html");
    const curlHtml = await request.get("/", { headers: { ...CURL, Accept: "text/html" } });
    expect(curlHtml.headers()["content-type"]).toContain("text/html");
  });
});
