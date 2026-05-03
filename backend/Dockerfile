FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV STOCKFISH_VERSION=18
ENV STOCKFISH_DOWNLOAD_URL=https://github.com/official-stockfish/Stockfish/releases/download/sf_18/stockfish-ubuntu-x86-64.tar

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl tar \
    && mkdir -p /opt/stockfish18 \
    && curl -L "$STOCKFISH_DOWNLOAD_URL" -o /tmp/stockfish18.tar \
    && tar -xf /tmp/stockfish18.tar -C /opt/stockfish18 --strip-components=1 \
    && install -m 0755 /opt/stockfish18/stockfish-ubuntu-x86-64 /usr/local/bin/stockfish18 \
    && /usr/local/bin/stockfish18 bench 1 > /tmp/stockfish18-bench.txt \
    && rm -f /tmp/stockfish18.tar \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY run_server.py .

ENV DATABASE_URL="sqlite+aiosqlite:////data/chess_coach.db"
ENV STOCKFISH_PATH="/usr/local/bin/stockfish18"
ENV STOCKFISH_DEPTH=16
ENV STOCKFISH_TIME_LIMIT=0.0
ENV STOCKFISH_THREADS=1
ENV STOCKFISH_HASH_MB=128
ENV STOCKFISH_CLEAR_HASH_EACH_POSITION=true

RUN mkdir -p /data

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
