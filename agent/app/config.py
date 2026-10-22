"""Environment-only configuration for the agent service (brief §1/§5/§6).

Nothing here is hardcoded except fallback defaults; every value is overridable via env.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

# repo root: agent/app/config.py -> parents[2] == agent/, parents[3] == repo root
_REPO_ROOT = Path(__file__).resolve().parents[3]


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

    def model_pricing(self) -> tuple[float, float]:
        if self.cost_input_per_mtok is not None and self.cost_output_per_mtok is not None:
            return (self.cost_input_per_mtok, self.cost_output_per_mtok)
        return DEFAULT_MODEL_PRICING.get(self.model, _FALLBACK_PRICING)


def load_settings() -> Settings:
    content_dir = Path(_env_str("CONTENT_DIR", str(_REPO_ROOT / "content")))
    data_dir = Path(_env_str("AGENT_DATA_DIR", str(_REPO_ROOT / "agent" / "data")))
    return Settings(
        anthropic_api_key=_env_str("ANTHROPIC_API_KEY"),
        model=_env_str("AGENT_MODEL", "claude-sonnet-4-5"),
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
