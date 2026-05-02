import hashlib

from fastapi import BackgroundTasks, Depends, FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.analyzer import analyze_game
from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.database import SessionLocal, get_db, init_db
from app.models import Game, Mistake, Move, User
from app.schemas import (
    AnalysisRead,
    AuthRequest,
    GameRead,
    MistakeRead,
    TokenResponse,
    TTSRequest,
)
from app.tts import synthesize_speech

app = FastAPI(title="Chess Human Coach AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    await init_db()


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


async def run_analysis_task(game_id: int) -> None:
    async with SessionLocal() as db:
        await analyze_game(game_id, db)


@app.post("/auth/register", response_model=TokenResponse)
async def register(payload: AuthRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    existing = await db.scalar(select(User).where(User.email == payload.email.lower()))
    if existing:
        raise HTTPException(status_code=409, detail="Email is already registered.")
    user = User(email=payload.email.lower(), password_hash=hash_password(payload.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return TokenResponse(access_token=create_access_token(user.id))


@app.post("/auth/login", response_model=TokenResponse)
async def login(payload: AuthRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    user = await db.scalar(select(User).where(User.email == payload.email.lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
    return TokenResponse(access_token=create_access_token(user.id))


async def create_game_for_user(pgn: str, user: User, db: AsyncSession) -> Game:
    normalized = pgn.strip()
    if not normalized:
        raise HTTPException(status_code=400, detail="PGN cannot be empty.")
    pgn_hash = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
    existing = await db.scalar(
        select(Game).where(Game.user_id == user.id, Game.pgn_hash == pgn_hash)
    )
    if existing:
        return existing
    game = Game(user_id=user.id, pgn=normalized, pgn_hash=pgn_hash)
    db.add(game)
    await db.commit()
    await db.refresh(game)
    return game


@app.post("/games/upload", response_model=GameRead)
async def upload_game(
    background_tasks: BackgroundTasks,
    pgn: str | None = Form(default=None),
    file: UploadFile | None = File(default=None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Game:
    if file:
        pgn = (await file.read()).decode("utf-8")
    if pgn is None:
        raise HTTPException(status_code=400, detail="Paste PGN or upload a PGN file.")
    game = await create_game_for_user(pgn, user, db)
    if game.status in {"uploaded", "failed"}:
        background_tasks.add_task(run_analysis_task, game.id)
    return game


@app.post("/games/analyze/{game_id}", response_model=GameRead)
async def analyze_endpoint(
    game_id: int,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Game:
    game = await db.get(Game, game_id)
    if not game or game.user_id != user.id:
        raise HTTPException(status_code=404, detail="Game not found.")
    background_tasks.add_task(run_analysis_task, game.id)
    game.status = "queued"
    await db.commit()
    await db.refresh(game)
    return game


@app.get("/games", response_model=list[GameRead])
async def list_games(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> list[Game]:
    result = await db.scalars(select(Game).where(Game.user_id == user.id).order_by(Game.created_at.desc()))
    return list(result)


@app.get("/games/{game_id}", response_model=GameRead)
async def get_game(game_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> Game:
    game = await db.get(Game, game_id)
    if not game or game.user_id != user.id:
        raise HTTPException(status_code=404, detail="Game not found.")
    return game


@app.get("/analysis/{game_id}", response_model=AnalysisRead)
async def get_analysis(game_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> AnalysisRead:
    game = await db.get(Game, game_id)
    if not game or game.user_id != user.id:
        raise HTTPException(status_code=404, detail="Game not found.")

    moves = list(await db.scalars(select(Move).where(Move.game_id == game_id).order_by(Move.move_number)))
    mistakes = list(
        await db.scalars(
            select(Mistake)
            .join(Move)
            .options(selectinload(Mistake.move))
            .where(Move.game_id == game_id)
            .order_by(Move.move_number)
        )
    )
    summary = {"inaccuracy": 0, "mistake": 0, "blunder": 0}
    for mistake in mistakes:
        summary[mistake.type] = summary.get(mistake.type, 0) + 1
    return AnalysisRead(game=game, moves=moves, mistakes=mistakes, summary=summary)


@app.get("/mistakes/{game_id}", response_model=list[MistakeRead])
async def get_mistakes(game_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> list[Mistake]:
    game = await db.get(Game, game_id)
    if not game or game.user_id != user.id:
        raise HTTPException(status_code=404, detail="Game not found.")
    result = await db.scalars(
        select(Mistake)
        .join(Move)
        .options(selectinload(Mistake.move))
        .where(Move.game_id == game_id)
        .order_by(Move.move_number)
    )
    return list(result)


@app.post("/tts")
async def tts(payload: TTSRequest, user: User = Depends(get_current_user)) -> Response:
    audio = await synthesize_speech(payload.text)
    return Response(content=audio, media_type="audio/mpeg")
