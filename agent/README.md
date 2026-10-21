# Agent backend (Python)

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
   app/messages.py       UIMessage[] → Anthropic Messages API turns
   app/anthropic_agent.py  the hand-written agent loop (client.messages.stream)
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
| `ANTHROPIC_API_KEY` | — | Without it, `/v1/chat` answers `503 {"demo": true}`, same as the TS route without a model — the client plays the scripted demo replay either way. |
| `AGENT_MODEL` | `claude-sonnet-4-5` | Any Anthropic model id. |
| `AGENT_MAX_STEPS` | `6` | Max agent-loop steps (tool-call round trips) per request. |
| `AGENT_MAX_OUTPUT_TOKENS` | `500` | `max_tokens` passed to each Anthropic call. |
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
cp .env.example .env   # fill in ANTHROPIC_API_KEY at minimum; see table above
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
error handling) against a scripted fake Anthropic client — no network access
anywhere in the suite.

## Deploying on Railway

`agent/railway.json` configures the build. Two things matter for a monorepo
like this one:

1. In the Railway service settings, leave **Root Directory** as the repo
   root (not `agent/`) — the Dockerfile needs to `COPY content /content` from
   outside `agent/` to build the knowledge index at build time.
2. Railway picks up `agent/railway.json` automatically once step 1 is set;
   it points `build.dockerfilePath` at `agent/Dockerfile`.

Set the environment variables above in the Railway service (at minimum
`ANTHROPIC_API_KEY` and `AGENT_SHARED_SECRET`). The health check is
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
  waits for the backend before answering a clean `502 {"error":
  "agent-unavailable"}`.

With `AGENT_BACKEND_URL` unset, the site's original TypeScript agent runs
exactly as before — nothing else changes.
