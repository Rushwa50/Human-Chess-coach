from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    games: Mapped[list["Game"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Game(Base):
    __tablename__ = "games"
    __table_args__ = (UniqueConstraint("user_id", "pgn_hash", name="uq_user_pgn_hash"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True, nullable=False)
    pgn: Mapped[str] = mapped_column(Text, nullable=False)
    pgn_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="uploaded", nullable=False)
    analysis_error: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="games")
    moves: Mapped[list["Move"]] = relationship(back_populates="game", cascade="all, delete-orphan")


class Move(Base):
    __tablename__ = "moves"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    game_id: Mapped[int] = mapped_column(ForeignKey("games.id"), index=True, nullable=False)
    move_number: Mapped[int] = mapped_column(Integer, nullable=False)
    fen: Mapped[str] = mapped_column(Text, nullable=False)
    played_move: Mapped[str] = mapped_column(String(32), nullable=False)
    best_move: Mapped[str | None] = mapped_column(String(32))
    eval_before: Mapped[float | None] = mapped_column(Float)
    eval_after: Mapped[float | None] = mapped_column(Float)
    eval_drop: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    game: Mapped["Game"] = relationship(back_populates="moves")
    mistakes: Mapped[list["Mistake"]] = relationship(back_populates="move", cascade="all, delete-orphan")


class Mistake(Base):
    __tablename__ = "mistakes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    move_id: Mapped[int] = mapped_column(ForeignKey("moves.id"), index=True, nullable=False)
    type: Mapped[str] = mapped_column(String(32), nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    move: Mapped["Move"] = relationship(back_populates="mistakes")
