import { afterEach, describe, expect, it, vi } from "vitest";

describe("lib/server/agent-proxy — streaming proxy to the Python backend (brief §6)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  const load = async () => {
    vi.resetModules();
    vi.doMock("server-only", () => ({}));
    return import("@/lib/server/agent-proxy");
  };

  it("forwards the body, client IP and shared secret, and streams the backend's response through unchanged", async () => {
    vi.stubEnv("AGENT_SHARED_SECRET", "s3cr3t");
    const { proxyAgentRequest } = await load();

    const backendBody = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"type":"start"}\n\n'));
        controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    const fetchMock = vi.fn(
      async () =>
        new Response(backendBody, {
          status: 200,
          headers: {
            "content-type": "text/event-stream",
            "x-vercel-ai-ui-message-stream": "v1",
            "cache-control": "no-cache",
          },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const request = new Request("http://localhost/api/agent", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", parts: [{ type: "text", text: "hi" }] }] }),
    });

    const response = await proxyAgentRequest(request, "https://agent.example.com/", "203.0.113.4");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://agent.example.com/v1/chat");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["x-agent-secret"]).toBe("s3cr3t");
    expect((init.headers as Record<string, string>)["x-forwarded-for"]).toBe("203.0.113.4");
    expect(JSON.parse(init.body as string)).toMatchObject({ messages: [{ role: "user" }] });

    expect(response.status).toBe(200);
    expect(response.headers.get("x-vercel-ai-ui-message-stream")).toBe("v1");
    expect(response.headers.get("content-type")).toBe("text/event-stream");
    const text = await response.text();
    expect(text).toContain('data: {"type":"start"}');
    expect(text).toContain("data: [DONE]");
  });

  it("passes control-plane errors (rate-limit, etc) through as plain JSON", async () => {
    const { proxyAgentRequest } = await load();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: "rate-limit" }, { status: 429 })),
    );

    const request = new Request("http://localhost/api/agent", { method: "POST", body: "{}" });
    const response = await proxyAgentRequest(request, "https://agent.example.com", "1.2.3.4");

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: "rate-limit" });
  });

  it("answers a clean 502 when the backend is unreachable", async () => {
    const { proxyAgentRequest } = await load();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );

    const request = new Request("http://localhost/api/agent", { method: "POST", body: "{}" });
    const response = await proxyAgentRequest(request, "https://agent.example.com", "1.2.3.4");

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "agent-unavailable" });
  });
});

describe("app/api/agent/route — proxy wiring", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  const loadRoute = async () => {
    vi.resetModules();
    vi.doMock("server-only", () => ({}));
    return import("@/app/api/agent/route");
  };

  it("delegates to the Python backend when AGENT_BACKEND_URL is set", async () => {
    vi.stubEnv("AGENT_BACKEND_URL", "https://agent.example.com");
    const fetchMock = vi.fn(async () => Response.json({ demo: true }, { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await loadRoute();
    const request = new Request("http://localhost/api/agent", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", parts: [{ type: "text", text: "hi" }] }] }),
    });
    const response = await POST(request);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toBe("https://agent.example.com/v1/chat");
    expect(response.status).toBe(503);
  });

  it("uses the existing TS behaviour unchanged when AGENT_BACKEND_URL is not set", async () => {
    vi.stubEnv("AGENT_BACKEND_URL", "");
    vi.stubEnv("AGENT_MODEL", ""); // no model configured -> demo replay fallback
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await loadRoute();
    const request = new Request("http://localhost/api/agent", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", parts: [{ type: "text", text: "hi" }] }] }),
    });
    const response = await POST(request);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ demo: true });
  });
});
