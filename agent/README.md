# Agent backend (Python)

> **Runs free by default.** The agent uses Google **Gemini's free tier**
> (`LLM_PROVIDER=gemini`, model `gemini-3.5-flash-lite`). All you need is a free
> API key from **https://aistudio.google.com/apikey** — no billing account and
> **no Anthropic key**. Anthropic is still supported (`LLM_PROVIDER=anthropic`)
> if you ever want Claude instead.

A FastAPI service that is the "brain" for the site's live agent. The Next.js
route (`app/api/agent/route.ts`) becomes a thin streaming proxy to this service
when `AGENT_BACKEND_URL` is set; otherwise the site's original TypeScript
agent (AI SDK + Vercel AI Gateway/Anthropic/OpenAI) runs unchanged. Only one
of the two is ever live for a given deployment.

## Architecture

```
Browser (lib/agent/live.ts, @ai-sdk/react)
   │  POST /api/agent  { messages, promptState }
   ▼
Next.js route (app/api/agent/route.ts)
   │  AGENT_BACKEND_URL set?
   │     no  → unchanged TS agent (ai SDK + streamText)
   │     yes → lib/server/agent-proxy.ts: forward body + client IP +
   │           X-Agent-Secret, stream the backend's response straight through
   ▼
agent/ (this service)
   app/main.py           FastAPI app: POST /v1/chat, GET /healthz
   app/security.py       shared-secret check, request-shape guardrails
   app/ratelimit.py      per-IP sliding window (in-memory or Upstash REST)
   app/messages.py       UIMessage[] → provider-neutral (Anthropic-shaped) turns
   app/providers.py      LLM_PROVIDER switch, client factory, error classification,
                          live model list + fallback chain, friendly messages
   app/gemini_agent.py   the Gemini agent loop (google-genai, streaming + manual
                          function calling) — the default
   app/anthropic_agent.py  the Claude agent loop (client.messages.stream)
   app/protocol.py       UI message stream chunks (matches the installed `ai`
                          package's schema) + the ui_* allow-list
   app/system_prompt.py  guardrails / prompt-injection defenses / citation rule
   app/tools/            search_knowledge, get_case_study, get_experience,
                          match_job_description, get_availability,
                          propose_meeting_slots, capture_lead, draft_proposal,
                          get_toolbox, get_prompt_state, draft_intro_email,
                          and the ui_* client-tool schemas
   app/knowledge/        content/ loader + a dependency-free BM25 index
                          (persisted as JSON), optional Postgres+pgvector path,
                          optional GitHub README indexing
   app/integrations/     Calendly v2 + Resend HTTP clients
   app/storage/          SQLite lead store
```

### Request/response contract

`POST /v1/chat` accepts the exact same body the TS route does — `{ messages:
UIMessage[], promptState? }` — and streams back the `ai` package's UI message
stream format verified against `node_modules/ai/dist/index.js`
(`uiMessageChunkSchema`): SSE lines `data: {json}\n\n`, headers
`x-vercel-ai-ui-message-stream: v1` / `cache-control: no-cache` /
`connection: keep-alive`, terminated by `data: [DONE]\n\n`.

Server tools (`search_knowledge`, `capture_lead`, ...) execute here and stream
as `tool-input-available` + `tool-output-available` pairs. The `ui_*` tools
(`ui_scroll_to`, `ui_open_project`, ...) have no server-side execution — they
stream as `tool-input-available` with **no** output, which ends that step.
The browser runs the action and sends the result back on the visitor's next
request; `app/messages.py` turns that into a `tool_result` so the model can
continue. This mirrors `lib/agent/protocol.ts` exactly, including the
allow-list (`validate_ui_action` in `app/protocol.py`) and known project
slugs/toolbox names, which are re-checked server-side even though the tool's
JSON Schema already constrains them to real values.

Guardrails (brief §5): a shared-secret header required from the Next.js proxy,
per-IP rate limiting, input-length/turn-count/message-count caps, and a system
prompt that explicitly treats visitor text and tool output as untrusted data
(never as instructions). Agent loop caps (brief §1): max steps, max output
tokens per call, and an estimated per-request cost budget computed from
per-model $/MTok pricing — all configurable via env, below.

## Environment variables

### Model / agent loop

| Var | Default | Notes |
|---|---|---|
| `LLM_PROVIDER` | `gemini` | `gemini` (free tier) or `anthropic`. |
| `GEMINI_API_KEY` | — | Free key from https://aistudio.google.com/apikey (`GOOGLE_API_KEY` also accepted). Without the chosen provider's key, `/v1/chat` answers `503 {"demo": true}`, same as the TS route without a model — the client plays the scripted demo replay. |
| `AGENT_MODEL` | `gemini-3.5-flash-lite` (`claude-sonnet-4-5` for anthropic) | Verified on 2026-10-30: `gemini-2.5-flash` now answers 404 "no longer available to new users", so it is **not** the default. |
| `AGENT_FALLBACK_MODELS` | `gemini-3.5-flash,gemini-flash-latest` | Comma list tried in order when a model is rate-limited / out of free quota / overloaded / not available to the key (each model has its own free quota). Filtered against the key's live `models.list` (cached 6h). `none` disables. |
| `AGENT_THINKING_LEVEL` | unset | Optional for Gemini 3+: `minimal`/`low`/`medium`/`high`. Gemini 2.5 Flash models run with thinking off. |
| `AGENT_LLM_TIMEOUT_MS` | `25000` | Per model call; a hung call fails over to the next model / demo. |
| `GEMINI_FREE_TIER` | `true` | The cost budget counts Gemini as $0 on the free tier; set `false` if the Google project has billing on so `AGENT_MAX_COST_USD` uses paid list prices. |
| `ANTHROPIC_API_KEY` | — | Only for `LLM_PROVIDER=anthropic`. |
| `AGENT_MAX_STEPS` | `6` | Max agent-loop steps (tool-call round trips) per request. |
| `AGENT_MAX_OUTPUT_TOKENS` | `500` | Max output tokens per model call (`max_output_tokens` / `max_tokens`). |
| `AGENT_MAX_COST_USD` | `0.05` | Estimated $ budget per request (input+output tokens × pricing); the loop stops early once it's spent, even mid-tool-use. |
| `AGENT_COST_INPUT_PER_MTOK` / `AGENT_COST_OUTPUT_PER_MTOK` | built-in table keyed by `AGENT_MODEL` (fallback `$3`/`$15`) | Override the $/million-token pricing used for the cost budget above. |
| `AGENT_RATE_INFO` | unset | If set, `draft_proposal` includes it as the pricing line; otherwise the draft never invents a price. |

### Guardrails & security (brief §5)

| Var | Default | Notes |
|---|---|---|
| `AGENT_SHARED_SECRET` | unset | Required header (`X-Agent-Secret`) between the Next.js proxy and this service, constant-time compared. **Unset means the service runs open — set this in every real deployment.** |
| `AGENT_ALLOWED_ORIGINS` | `https://www.moizali.tech,https://moizali.tech` | Comma-separated CORS allow-list. |
| `AGENT_MAX_INPUT_CHARS` | `500` | Per-visitor-message length cap (mirrors `lib/agent/protocol.ts`'s `MAX_INPUT_CHARS`). |
| `AGENT_MAX_TURNS` | `6` | Max user turns per conversation (mirrors `MAX_TURNS`). |
| `AGENT_MAX_MESSAGES` | `40` | Total message-array size cap (defense against oversized payloads). |
| `AGENT_RATE_LIMIT_PER_HOUR` | `12` | Per-IP visitor-message cap per hour. |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | unset | When set, rate limiting uses Upstash's REST API (shared across instances) instead of an in-memory window. |

### Knowledge base (brief §3)

| Var | Default | Notes |
|---|---|---|
| `CONTENT_DIR` | `../content` (repo root `content/`) | Where `site.json`, `about.json`, `process.json`, `toolbox.json`, `projects/*/{index.mdx,graph.json}` are read from. |
| `AGENT_DATA_DIR` | `agent/data` | Base dir for local artifacts (gitignored). |
| `AGENT_INDEX_PATH` | `$AGENT_DATA_DIR/index.json` | Persisted BM25 index (see "Indexing" below). |
| `GITHUB_TOKEN` / `GITHUB_README_REPOS` | unset | Off by default. If both are set (`GITHUB_README_REPOS` is a comma list of `owner/repo`), each repo's README is fetched and indexed alongside `content/`. |
| `DATABASE_URL` | unset | Optional Postgres+pgvector path (`app/knowledge/pgvector.py`) instead of the default BM25 index. Needs `pip install "psycopg[binary]"` (not in `requirements.txt` — install only if you use this). See the module docstring for the `CREATE TABLE` schema. |
| `EMBEDDING_PROVIDER` / `OPENAI_API_KEY` | unset | Only used by the pgvector path above; currently supports `EMBEDDING_PROVIDER=openai` (plain HTTP call, no SDK). |

### Tools (brief §4)

| Var | Default | Notes |
|---|---|---|
| `CALENDLY_TOKEN` | unset | Without it, `propose_meeting_slots` just returns the scheduling link — no API call. With it, the service looks up the event type via `/users/me` + `/event_types` and lists open times via `/event_type_available_times`. **Never books anything** — there is no call anywhere to Calendly's invitee-creation endpoint. |
| `CALENDLY_EVENT_SLUG` | `30-min-intro-call` | Matches `https://calendly.com/moizkaseer/30-min-intro-call`. |
| `RESEND_API_KEY` | unset | Without it, `capture_lead` still stores the lead locally (SQLite) but doesn't email anyone. |
| `AGENT_FROM_EMAIL` | `hello@moizali.tech` | |
| `AGENT_TO_EMAIL` | `moizkaseer@gmail.com` | |
| `LEADS_DB_PATH` | `$AGENT_DATA_DIR/leads.db` | SQLite file; gitignored. |

### Server

| Var | Default |
|---|---|
| `HOST` | `0.0.0.0` |
| `PORT` | `8000` |

## Local run

```sh
cd agent
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
cp .env.example .env   # fill in GEMINI_API_KEY (free) at minimum; see table above
.venv/bin/uvicorn app.main:app --reload --port 8000
```

`GET http://localhost:8000/healthz` should answer `{"status": "ok", ...}`.

## Indexing

The knowledge index is a small, dependency-free BM25 index over `content/`
(brief: "works with NO extra infra"). It's built lazily on first request and
cached in memory/on disk, but you can build it ahead of time:

```sh
agent/.venv/bin/python agent/scripts/build_index.py
```

This writes `AGENT_INDEX_PATH` (default `agent/data/index.json`, gitignored).
Re-run it whenever `content/` changes if you want the persisted artifact to
stay current — the service still works without this, it just rebuilds
in-memory on first boot.

## Tests

```sh
cd agent
.venv/bin/pytest -q
```

Covers: every tool (Calendly and Resend mocked with `respx` — no real network
calls), the UI message stream format (asserted against canned LLM turns),
guardrails (shared secret, rate limiting, input/turn/message limits, the
prompt-injection section of the system prompt), and the full agent loop
(server tools, the `ui_*` client-tool stop condition, step/cost budget caps,
error handling) against scripted fake Gemini and Anthropic clients — no
network access anywhere in the suite. `tests/test_gemini_agent.py` also covers
the fallback chain, `503 {"demo": true, "reason": "quota"}` when every model is
out of free quota, and the friendly mid-answer message.

## Deploying on Railway

`agent/railway.json` configures the build. Two things matter for a monorepo
like this one:

1. In the Railway service settings, leave **Root Directory** as the repo
   root (not `agent/`) — the Dockerfile needs to `COPY content /content` from
   outside `agent/` to build the knowledge index at build time.
2. Railway picks up `agent/railway.json` automatically once step 1 is set;
   it points `build.dockerfilePath` at `agent/Dockerfile`.

Set the environment variables above in the Railway service (at minimum
`GEMINI_API_KEY` and `AGENT_SHARED_SECRET`). The health check is
`GET /healthz`.

To build and run locally with Docker (from the repo root):

```sh
docker build -f agent/Dockerfile -t agent-backend .
docker run -p 8000:8000 --env-file agent/.env agent-backend
```

## Wiring it to the Next.js site (Vercel)

On the Vercel project, set:

- `AGENT_BACKEND_URL` — the Railway service's public URL, e.g.
  `https://agent-backend.up.railway.app`.
- `AGENT_SHARED_SECRET` — **the same value** as the Python service's
  `AGENT_SHARED_SECRET`. The Next.js proxy (`lib/server/agent-proxy.ts`) sends
  it as `X-Agent-Secret`; the Python service rejects requests without it
  whenever it's configured.
- `AGENT_BACKEND_TIMEOUT_MS` (optional, default `30000`) — how long the proxy
  waits for the backend before falling back to the demo replay.

With `AGENT_BACKEND_URL` unset, the site's original TypeScript agent runs
exactly as before — nothing else changes.

## Graceful degradation (free tier)

The free tier has per-model request limits (see your live limits in AI Studio;
daily quotas reset at midnight Pacific). When they run out the visitor never
sees a stack trace:

1. **Fallback chain** — on 429 / quota / overload / 404 the loop retries the same
   step on the next model in `AGENT_FALLBACK_MODELS`.
2. **Before the agent has said anything** — if every model fails, `/v1/chat`
   answers `503 {"demo": true, "reason": "quota" | "unavailable" | "auth" | ...}`.
3. **Mid-answer** — the stream ends with a short friendly text ("I've hit my free
   usage limit…") instead of an error part.
4. **Next.js proxy** (`lib/server/agent-proxy.ts`) — any backend 5xx, timeout or
   unreachable backend becomes `503 {"demo": true}`, which `lib/agent/live.ts`
   already treats as "switch to the recorded demo". `GET /api/agent/status`
   probes the backend's `/healthz` (2.5s timeout) so a sleeping or keyless
   backend shows as *demo* rather than *live*.

## Free hosting options

| | Railway | Render (free web service) | Vercel Python Functions |
|---|---|---|---|
| Cost | $5 one-time trial credit (30 days), then the Free plan's **$1/month** credit — not enough to run 24/7, so realistically $5/mo Hobby | **$0**, no card; 750 instance-hours/month per workspace (enough for one service 24/7) | **$0** on Hobby (Fluid compute) |
| Works with this repo today | Yes (`agent/railway.json` + Dockerfile) | Yes — same Dockerfile, build from repo root (`render.yaml` included) | Mostly — see caveats |
| Cold starts | None | Spins down after 15 min idle; ~1 min to wake. Mitigated by the keep-warm workflow (`.github/workflows/agent-keepwarm.yml`) and by the status probe showing *demo* while it wakes | Seconds |
| Disk | Volume available | Ephemeral (SQLite leads lost on restart — leads are also emailed via Resend) | Read-only except `/tmp` (auto-used when `VERCEL` is set) |
| Streaming | Yes | Yes | Yes (Python `StreamingResponse` is supported) |

**Recommendation: Render free web service + keep-warm ping.** It runs the
existing Dockerfile unchanged (content baked in, index built at build time),
costs nothing, and the 750 free hours cover one always-on service. The keep-warm
workflow pings `/healthz` every 10 minutes so visitors rarely hit the 1-minute
wake-up; `/healthz` never calls Gemini, so it doesn't spend free quota.

**Vercel Python (alternative, not yet verified with a deploy).** Vercel detects
FastAPI and serves `app/main.py:app` as one function. To try it: create a
*second* Vercel project from this repo with Root Directory `agent/`, enable
"Include files outside the root directory", and set `CONTENT_DIR` so the
function can read `content/` (the main open question — files outside the root
must be bundled into the function); set `UPSTASH_REDIS_REST_*` because the
in-memory rate limiter is per instance. Leads go to `/tmp` (ephemeral) and are
emailed via Resend. Until a preview deploy proves `content/` is bundled, Render
is the lower-risk path.

### Render setup (when you're ready — nothing is deployed by this repo)

1. render.com → New → Blueprint → pick this repo (uses `render.yaml`), or New →
   Web Service → Docker, Root Directory = repo root, Dockerfile path
   `agent/Dockerfile`, Instance type **Free**, Health check `/healthz`.
2. Env vars: `GEMINI_API_KEY`, `AGENT_SHARED_SECRET` (long random string),
   optionally `RESEND_API_KEY`, `CALENDLY_TOKEN`.
3. On the Vercel site project: `AGENT_BACKEND_URL=https://<service>.onrender.com`
   and the **same** `AGENT_SHARED_SECRET`, then redeploy.
4. Optional: GitHub repo → Settings → Variables → `AGENT_BACKEND_URL` to turn on
   the keep-warm workflow.
