from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class AuthRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    credential: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserRead(BaseModel):
    id: int
    email: EmailStr
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GameUploadRequest(BaseModel):
    pgn: str


class MoveRead(BaseModel):
    id: int
    move_number: int
    fen: str
    played_move: str
    best_move: str | None
    eval_before: float | None
    eval_after: float | None
    eval_drop: float

    model_config = ConfigDict(from_attributes=True)

class GameRead(BaseModel):
    id: int
    pgn_hash: str
    status: str
    analysis_error: str | None = None
    opening_suggestion: str | None = None
    loss_reason: str | None = None
    training_recommendation: str | None = None
    progress_summary: str | None = None
    game_story: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GameWithMovesRead(GameRead):
    moves: list[MoveRead] | None = None

    model_config = ConfigDict(from_attributes=True)


class MistakeRead(BaseModel):
    id: int
    move_id: int
    type: str
    explanation: str
    created_at: datetime
    move: MoveRead | None = None

    model_config = ConfigDict(from_attributes=True)


class AnalysisRead(BaseModel):
    game: GameRead
    moves: list[MoveRead]
    mistakes: list[MistakeRead]
    summary: dict[str, int]


class TTSRequest(BaseModel):
    text: str

class Trait(BaseModel):
    name: str
    score_label: str
    description: str

class PlayerProfile(BaseModel):
    skill_level: str
    primary_style: str
    traits: list[Trait]
