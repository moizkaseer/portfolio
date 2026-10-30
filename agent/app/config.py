"""Environment-only configuration for the agent service (brief §1/§5/§6).

Nothing here is hardcoded except fallback defaults; every value is overridable via env.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

# repo root: agent/app/config.py -> parents[0] == agent/app, parents[1] == agent/, parents[2] == repo root
_REPO_ROOT = Path(__file__).resolve().parents[2]


def _env_str(name: str, default: str | None = None) -> str | None:
    v = os.environ.get(name)
    return v.strip() if v and v.strip() else default


def _env_int(name: str, default: int) -> int:
    v = os.environ.get(name)
    if not v or not v.strip():
        return default
    try:
        return int(v.strip())
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    v = os.environ.get(name)
    if not v or not v.strip():
        return default
    try:
        return float(v.strip())
    except ValueError:
        return default


def _env_bool(name: str, default: bool) -> bool:
    v = os.environ.get(name)
    if v is None or not v.strip():
        return default
    return v.strip().lower() in ("1", "true", "yes", "on")


def _env_list(name: str, default: list[str]) -> list[str]:
    v = os.environ.get(name)
    if not v or not v.strip():
        return default
    return [p.strip() for p in v.split(",") if p.strip()]


# Pricing fallback table, $ per million tokens (input, output). Used only when
# AGENT_COST_INPUT_PER_MTOK / AGENT_COST_OUTPUT_PER_MTOK are not set.
DEFAULT_MODEL_PRICING: dict[str, tuple[float, float]] = {
    "claude-opus-4-8": (5.0, 25.0),
    "claude-opus-4-7": (5.0, 25.0),
    "claude-opus-4-6": (5.0, 25.0),
    "claude-sonnet-5": (3.0, 15.0),
    "claude-sonnet-4-6": (3.0, 15.0),
    "claude-sonnet-4-5": (3.0, 15.0),
    "claude-haiku-4-5": (1.0, 5.0),
    # Gemini on the FREE tier costs $0; these are the paid-tier list prices, used
    # only if you switch the Google project to billing (keeps the cost cap honest).
    "gemini-2.5-flash": (0.30, 2.50),
    "gemini-2.5-flash-lite": (0.10, 0.40),
    "gemini-3.5-flash-lite": (0.30, 2.50),
    "gemini-3.8-flash": (0.75, 3.75),
}
_FALLBACK_PRICING = (3.0, 15.0)


@dataclass(frozen=True)
class Settings:
    anthropic_api_key: str | None
    model: str
    max_steps: int
    max_output_tokens: int
    max_cost_usd_per_request: float
    cost_input_per_mtok: float | None
    cost_output_per_mtok: float | None

    shared_secret: str | None
    allowed_origins: list[str]

    max_input_chars: int
    max_turns: int
    max_messages: int

    upstash_redis_rest_url: str | None
    upstash_redis_rest_token: str | None
    rate_limit_per_hour: int

    content_dir: Path
    index_path: Path

    database_url: str | None
    embedding_provider: str | None
    openai_api_key: str | None

    github_token: str | None
    github_readme_repos: list[str]

    calendly_token: str | None
    calendly_event_slug: str

    resend_api_key: str | None
    resend_from_email: str
    resend_to_email: str

    leads_db_path: Path

    host: str
    port: int

    # LLM provider (app/providers.py). Defaults keep older call sites working.
    llm_provider: str = "gemini"
    gemini_api_key: str | None = None
    fallback_models: list[str] = field(default_factory=list)
    llm_timeout_ms: int = 25_000
    thinking_level: str | None = None
    free_tier: bool = True

    @property
    def model_configured(self) -> bool:
        if self.llm_provider == "anthropic":
            return bool(self.anthropic_api_key)
        return bool(self.gemini_api_key)

    def model_pricing(self) -> tuple[float, float]:
        if self.cost_input_per_mtok is not None and self.cost_output_per_mtok is not None:
            return (self.cost_input_per_mtok, self.cost_output_per_mtok)
        if self.llm_provider == "gemini" and self.free_tier:
            return (0.0, 0.0)
        return DEFAULT_MODEL_PRICING.get(self.model, _FALLBACK_PRICING)


def load_settings() -> Settings:
    content_dir = Path(_env_str("CONTENT_DIR", str(_REPO_ROOT / "content")))
    # Serverless hosts (Vercel) only allow writes under /tmp.
    default_data_dir = "/tmp/agent-data" if os.environ.get("VERCEL") else str(_REPO_ROOT / "agent" / "data")
    data_dir = Path(_env_str("AGENT_DATA_DIR", default_data_dir))
    from app.providers import DEFAULT_FALLBACK_MODELS, DEFAULT_MODELS, SUPPORTED_PROVIDERS

    provider = (_env_str("LLM_PROVIDER", "gemini") or "gemini").lower()
    if provider not in SUPPORTED_PROVIDERS:
        provider = "gemini"
    fallback_raw = _env_str("AGENT_FALLBACK_MODELS", DEFAULT_FALLBACK_MODELS[provider]) or ""
    fallbacks = [] if fallback_raw.lower() in ("none", "off", "false", "0") else [
        p.strip() for p in fallback_raw.split(",") if p.strip()
    ]
    return Settings(
        llm_provider=provider,
        gemini_api_key=_env_str("GEMINI_API_KEY") or _env_str("GOOGLE_API_KEY"),
        fallback_models=fallbacks,
        llm_timeout_ms=_env_int("AGENT_LLM_TIMEOUT_MS", 25_000),
        thinking_level=_env_str("AGENT_THINKING_LEVEL"),
        free_tier=_env_bool("GEMINI_FREE_TIER", True),
        anthropic_api_key=_env_str("ANTHROPIC_API_KEY"),
        model=_env_str("AGENT_MODEL", DEFAULT_MODELS[provider]),
        max_steps=_env_int("AGENT_MAX_STEPS", 6),
        max_output_tokens=_env_int("AGENT_MAX_OUTPUT_TOKENS", 500),
        max_cost_usd_per_request=_env_float("AGENT_MAX_COST_USD", 0.05),
        cost_input_per_mtok=(
            _env_float("AGENT_COST_INPUT_PER_MTOK", -1) if os.environ.get("AGENT_COST_INPUT_PER_MTOK") else None
        ),
        cost_output_per_mtok=(
            _env_float("AGENT_COST_OUTPUT_PER_MTOK", -1) if os.environ.get("AGENT_COST_OUTPUT_PER_MTOK") else None
        ),
        shared_secret=_env_str("AGENT_SHARED_SECRET"),
        allowed_origins=_env_list("AGENT_ALLOWED_ORIGINS", ["https://www.moizali.tech", "https://moizali.tech"]),
        max_input_chars=_env_int("AGENT_MAX_INPUT_CHARS", 500),
        max_turns=_env_int("AGENT_MAX_TURNS", 6),
        max_messages=_env_int("AGENT_MAX_MESSAGES", 40),
        upstash_redis_rest_url=_env_str("UPSTASH_REDIS_REST_URL"),
        upstash_redis_rest_token=_env_str("UPSTASH_REDIS_REST_TOKEN"),
        rate_limit_per_hour=_env_int("AGENT_RATE_LIMIT_PER_HOUR", 12),
        content_dir=content_dir,
        index_path=Path(_env_str("AGENT_INDEX_PATH", str(data_dir / "index.json"))),
        database_url=_env_str("DATABASE_URL"),
        embedding_provider=_env_str("EMBEDDING_PROVIDER"),
        openai_api_key=_env_str("OPENAI_API_KEY"),
        github_token=_env_str("GITHUB_TOKEN"),
        github_readme_repos=_env_list("GITHUB_README_REPOS", []),
        calendly_token=_env_str("CALENDLY_TOKEN"),
        calendly_event_slug=_env_str("CALENDLY_EVENT_SLUG", "30-min-intro-call"),
        resend_api_key=_env_str("RESEND_API_KEY"),
        resend_from_email=_env_str("AGENT_FROM_EMAIL", "hello@moizali.tech"),
        resend_to_email=_env_str("AGENT_TO_EMAIL", "moizkaseer@gmail.com"),
        leads_db_path=Path(_env_str("LEADS_DB_PATH", str(data_dir / "leads.db"))),
        host=_env_str("HOST", "0.0.0.0"),
        port=_env_int("PORT", 8000),
    )


def get_settings() -> Settings:
    """Not cached — tests stub env vars per-case and expect fresh reads."""
    return load_settings()
