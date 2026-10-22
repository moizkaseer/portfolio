# Build from the REPO ROOT (not agent/), e.g.:
#   docker build -f agent/Dockerfile -t agent-backend .
# The repo root is required as the build context because this service indexes
# ../content at build time (see railway.json / README.md).

FROM python:3.13-slim

WORKDIR /app

RUN groupadd --system appuser && useradd --system --gid appuser --create-home --uid 10001 appuser

COPY agent/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY agent/app ./app
COPY agent/scripts ./scripts
COPY content /content

ENV CONTENT_DIR=/content \
    AGENT_DATA_DIR=/app/data \
    PORT=8000

RUN mkdir -p /app/data && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# Build-time content changes without a redeploy still get indexed lazily
# on first request (app/knowledge/store.py) — this just warms the cache.
CMD ["sh", "-c", "python scripts/build_index.py || true; exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
