FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install uv package manager
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

WORKDIR /app

# Copy application source code and descriptors
COPY . .

# Install application package with uv
RUN uv pip install --system -e .

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/src

EXPOSE 8000

CMD ["uvicorn", "gdmas.main:app", "--host", "0.0.0.0", "--port", "8000"]
