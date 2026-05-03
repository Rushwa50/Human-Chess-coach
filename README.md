# Chess Human Coach AI

A production-ready MVP full-stack web app for uploading chess PGNs, analyzing every move with Stockfish, generating simple human coaching notes with OpenAI, speaking explanations with ElevenLabs or browser speech fallback, and storing structured input/output data for future ML training.

## Stack

- Frontend: React, Vite, TailwindCSS, `react-chessboard`
- Backend: FastAPI, async SQLAlchemy, JWT auth
- Database: SQLite locally, PostgreSQL-ready via `DATABASE_URL`
- Chess engine: Stockfish through `python-chess` UCI
- AI: OpenAI chat completions
- Voice: ElevenLabs text-to-speech, browser speech fallback

## Project Structure

```text
backend/
  app/
    main.py
    database.py
    models.py
    auth.py
    engine.py
    analyzer.py
    ai_explainer.py
    tts.py
  requirements.txt
  .env.example
frontend/
  src/
    pages/
    state/
    api.ts
  package.json
  .env.example
```

## Database Design

The backend creates these tables on startup:

- `users`: `id`, `email`, `password_hash`, `created_at`
- `games`: `id`, `user_id`, `pgn`, `pgn_hash`, `status`, `analysis_error`, `created_at`
- `moves`: `id`, `game_id`, `move_number`, `fen`, `played_move`, `best_move`, `eval_before`, `eval_after`, `eval_drop`
- `mistakes`: `id`, `move_id`, `type`, `explanation`, `created_at`

Every analysis stores both training inputs (`FEN`, played move, best move, evals, eval drop) and model outputs (`explanation`).

## Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

On macOS/Linux, activate with:

```bash
source .venv/bin/activate
```

The API runs at `http://localhost:8000`.

## Frontend Setup

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

The app runs at `http://localhost:5173`.

## Stockfish Setup

For production, users do not install Stockfish. Stockfish runs only on the backend server.

Recommended production flow:

```text
User browser -> frontend website -> FastAPI backend -> Stockfish on backend server
```

The easiest way to guarantee this is Docker. The backend Docker image downloads the official Stockfish 18 release from GitHub, installs it inside the container, and sets:

```env
STOCKFISH_PATH="/usr/local/bin/stockfish18"
STOCKFISH_DEPTH=16
STOCKFISH_TIME_LIMIT=0.0
STOCKFISH_THREADS=1
STOCKFISH_HASH_MB=128
STOCKFISH_CLEAR_HASH_EACH_POSITION=true
```

Run the full app with backend-server Stockfish:

```bash
docker compose up --build
```

Then open:

```text
http://localhost:5173
```

Backend API:

```text
http://localhost:8000/docs
```

For local non-Docker development only, install Stockfish locally and set `STOCKFISH_PATH` in `backend/.env`.

Windows:

1. Download Stockfish from [stockfishchess.org/download](https://stockfishchess.org/download/).
2. Extract it, then set an absolute executable path:

```env
STOCKFISH_PATH="C:\stockfish\stockfish-windows-x86-64-avx2.exe"
```

macOS:

```bash
brew install stockfish
```

```env
STOCKFISH_PATH="/opt/homebrew/bin/stockfish"
```

Linux:

```bash
sudo apt install stockfish
```

```env
STOCKFISH_PATH="/usr/games/stockfish"
```

Tune speed/quality with:

```env
STOCKFISH_DEPTH=16
STOCKFISH_TIME_LIMIT=0.0
STOCKFISH_THREADS=1
STOCKFISH_HASH_MB=128
```

Use fixed depth, `Threads=1`, and the same Stockfish version when you need consistent analysis across devices.

## API Keys

Add these to `backend/.env`:

```env
OPENAI_API_KEY="..."
OPENAI_MODEL="gpt-4o-mini"
ELEVENLABS_API_KEY="..."
ELEVENLABS_VOICE_ID="21m00Tcm4TlvDq8ikWAM"
```

If `OPENAI_API_KEY` is missing, the backend stores a simple fallback explanation so the data pipeline remains functional. If ElevenLabs is missing or fails, the frontend falls back to browser speech synthesis.

## API Endpoints

- `POST /auth/register`
- `POST /auth/login`
- `POST /games/upload`
- `POST /games/analyze/{game_id}`
- `GET /games/{game_id}`
- `GET /analysis/{game_id}`
- `GET /mistakes/{game_id}`
- `POST /tts`

## Notes

- PGN duplicates are prevented per user with `pgn_hash`.
- Analysis is launched as a FastAPI background task and cached in the database.
- Use PostgreSQL by replacing `DATABASE_URL`, for example:

```env
DATABASE_URL="postgresql+asyncpg://user:password@localhost:5432/chess_coach"
```
