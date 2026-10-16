import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_UI_ACTIONS_PER_TURN, SECTIONS, traceLabel, validateUiAction } from "@/lib/agent/protocol";

const TOOLS = ["[Orchestrator]", "[Model]"];

describe("agent UI tools — allow-list (C1)", () => {
  it("only the six UI tools from the brief exist", () => {
    expect(typeof validateUiAction("ui_submit_form", {}, TOOLS)).toBe("string");
    expect(typeof validateUiAction("ui_send_email", {}, TOOLS)).toBe("string");
    expect(typeof validateUiAction("ui_navigate", { url: "https://example.com" }, TOOLS)).toBe("string");
  });

  it("scroll_to only knows the home sections", () => {
    expect(SECTIONS).toEqual(["your-turn", "work", "process", "agent", "toolbox", "contact"]);
    expect(validateUiAction("ui_scroll_to", { section: "work" }, TOOLS)).toEqual({ tool: "ui_scroll_to", input: { section: "work" } });
    expect(typeof validateUiAction("ui_scroll_to", { section: "admin" }, TOOLS)).toBe("string");
  });

  it("projects must be real slugs (no other URLs can be opened)", () => {
    expect(validateUiAction("ui_open_project", { slug: "invoice-extraction-pipeline" }, TOOLS)).toMatchObject({ tool: "ui_open_project" });
    expect(typeof validateUiAction("ui_open_project", { slug: "../../evil" }, TOOLS)).toBe("string");
    expect(typeof validateUiAction("ui_open_project", { slug: "https://evil.example" }, TOOLS)).toBe("string");
  });

  it("theme, tools and prefill inputs are checked", () => {
    expect(typeof validateUiAction("ui_set_theme", { theme: "neon" }, TOOLS)).toBe("string");
    expect(validateUiAction("ui_highlight_tools", { names: ["[Model]", "made-up"] }, TOOLS)).toEqual({ tool: "ui_highlight_tools", input: { names: ["[Model]"] } });
    expect(typeof validateUiAction("ui_prefill_contact", { summary: "  " }, TOOLS)).toBe("string");
  });

  it("at most 3 UI actions per turn; traces read like the design", () => {
    expect(MAX_UI_ACTIONS_PER_TURN).toBe(3);
    expect(traceLabel("ui_open_project", { slug: "invoice-extraction-pipeline" })).toBe('ui.open_project("invoice-extraction-pipeline")');
    expect(traceLabel("search_projects", { sort: "impact" })).toBe('search_projects(sort: "impact")');
  });
});

describe("agent model configuration (env only)", () => {
  afterEach(() => vi.unstubAllEnvs());
  const load = async () => {
    vi.resetModules();
    vi.doMock("server-only", () => ({}));
    return import("@/lib/server/agent-model");
  };

  it("no model or no key → demo replay", async () => {
    vi.stubEnv("AGENT_MODEL", "");
    expect((await load()).agentConfigured()).toBe(false);
    vi.stubEnv("AGENT_MODEL", "anthropic/claude-sonnet-5.5");
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    vi.stubEnv("VERCEL_OIDC_TOKEN", "");
    expect((await load()).agentConfigured()).toBe(false);
  });

  it("gateway: the provider/model string is used as-is", async () => {
    vi.stubEnv("AGENT_MODEL", "anthropic/claude-sonnet-5.5");
    vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");
    expect((await load()).agentModel()).toBe("anthropic/claude-sonnet-5.5");
  });

  it("direct providers need their own key", async () => {
    vi.stubEnv("AGENT_MODEL", "anthropic/claude-sonnet-5-5");
    vi.stubEnv("AGENT_PROVIDER", "anthropic");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect((await load()).agentConfigured()).toBe(false);
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    expect((await load()).agentConfigured()).toBe(true);
  });
});
