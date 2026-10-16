import "server-only";
import type { LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";

/**
 * The agent's model, configured only through environment variables (never in code):
 *
 *   AGENT_MODEL     "provider/model", e.g. "anthropic/claude-sonnet-5.5" (no default)
 *   AGENT_PROVIDER  "gateway" (default) | "anthropic" | "openai"
 *   gateway:   AI_GATEWAY_API_KEY (or Vercel OIDC when deployed on Vercel)
 *   anthropic: ANTHROPIC_API_KEY  — AGENT_MODEL's model part uses Anthropic's own id
 *   openai:    OPENAI_API_KEY
 *
 * Without a model and a key the site runs the scripted "demo replay" instead.
 */
export function agentModel(): LanguageModel | null {
  const model = process.env.AGENT_MODEL?.trim();
  if (!model) return null;
  const provider = (process.env.AGENT_PROVIDER ?? "gateway").trim();
  const bare = model.includes("/") ? model.slice(model.indexOf("/") + 1) : model;
  switch (provider) {
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY ? createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })(bare) : null;
    case "openai":
      return process.env.OPENAI_API_KEY ? createOpenAI({ apiKey: process.env.OPENAI_API_KEY })(bare) : null;
    default:
      // a "provider/model" string goes through the Vercel AI Gateway
      return process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN ? model : null;
  }
}

export const agentConfigured = () => agentModel() !== null;
