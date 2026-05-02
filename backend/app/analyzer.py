import asyncio
import io
from dataclasses import dataclass

import chess.pgn
from sqlalchemy import delete
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai_explainer import explain_mistake
from app.engine import StockfishSession
from app.models import Game, Mistake, Move


def classify_mistake(eval_drop: float) -> str | None:
    if eval_drop > 3.0:
        return "blunder"
    if eval_drop > 1.5:
        return "mistake"
    if eval_drop > 0.5:
        return "inaccuracy"
    return None


@dataclass
class ComputedMove:
    move_number: int
    fen: str
    played_move: str
    best_move: str | None
    eval_before: float
    eval_after: float
    eval_drop: float


def compute_game_analysis(pgn: str) -> list[ComputedMove]:
    parsed_game = chess.pgn.read_game(io.StringIO(pgn))
    if parsed_game is None:
        raise ValueError("Could not parse PGN.")

    rows: list[ComputedMove] = []
    board = parsed_game.board()
    with StockfishSession() as engine:
        for ply_number, played in enumerate(parsed_game.mainline_moves(), start=1):
            fen_before = board.fen()
            best_move, eval_before = engine.analyze_position(board.copy())

            board.push(played)
            eval_after_for_opponent = engine.evaluate_position(board.copy())
            eval_after = -eval_after_for_opponent
            eval_drop = max(0.0, eval_before - eval_after)

            rows.append(
                ComputedMove(
                    move_number=ply_number,
                    fen=fen_before,
                    played_move=played.uci(),
                    best_move=best_move,
                    eval_before=eval_before,
                    eval_after=eval_after,
                    eval_drop=eval_drop,
                )
            )
    return rows


async def analyze_game(game_id: int, db: AsyncSession) -> None:
    game = await db.get(Game, game_id)
    if game is None:
        return

    game.status = "analyzing"
    game.analysis_error = None
    existing_move_ids = select(Move.id).where(Move.game_id == game_id)
    await db.execute(delete(Mistake).where(Mistake.move_id.in_(existing_move_ids)))
    await db.execute(delete(Move).where(Move.game_id == game_id))
    await db.commit()

    try:
        computed_moves = await asyncio.to_thread(compute_game_analysis, game.pgn)

        for computed in computed_moves:
            move_row = Move(
                game_id=game.id,
                move_number=computed.move_number,
                fen=computed.fen,
                played_move=computed.played_move,
                best_move=computed.best_move,
                eval_before=computed.eval_before,
                eval_after=computed.eval_after,
                eval_drop=computed.eval_drop,
            )
            db.add(move_row)
            await db.flush()

            mistake_type = classify_mistake(computed.eval_drop)
            if mistake_type:
                explanation = await explain_mistake(
                    computed.fen,
                    computed.played_move,
                    computed.best_move,
                    computed.eval_drop,
                )
                db.add(
                    Mistake(
                        move_id=move_row.id,
                        type=mistake_type,
                        explanation=explanation,
                    )
                )

        game.status = "analyzed"
        await db.commit()
    except Exception as exc:
        game.status = "failed"
        game.analysis_error = str(exc)
        await db.commit()
