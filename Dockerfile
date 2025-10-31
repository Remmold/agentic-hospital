# syntax=docker/dockerfile:1.7
FROM python:3.11-slim

# ---- System deps (build + runtime) ----
# - build-essential, gcc, cmake -> building e.g. chroma-hnswlib
# - curl -> healthcheck / debugging
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    cmake \
    curl \
  && rm -rf /var/lib/apt/lists/*

# ---- Non-root user ----
ARG APP_USER=appuser
RUN useradd -m -u 1000 ${APP_USER}

# ---- Install uv if not available ----
RUN pip install uv

WORKDIR /app

# ---- Copy source ----
COPY . /app
RUN uv sync

# ---- Env (tweak as needed) ----
# Where your vector DB (Chroma) persists in the container; mount a volume here in compose.
ENV VECTOR_STORE_DIR=/app/vector_store
# Default app start command. Change to your actual entry if different.
# Starting Phaser Visualization
ENV APP_START="python -m http.server 8000"

# Ensure dirs exist & are writable
RUN mkdir -p "${VECTOR_STORE_DIR}" && chown -R ${APP_USER}:${APP_USER} /app

USER ${APP_USER}

# Expose your API port (adjust if your app uses another port)
EXPOSE 8000

WORKDIR /app/src/hs_pipeline/visualization
# Start using the chosen command
CMD ["bash", "-lc", "$APP_START"]
