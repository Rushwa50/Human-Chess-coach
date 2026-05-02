from openai import AsyncOpenAI
import chess

from app.config import get_settings

SYSTEM_PROMPT = (
    "You are a chess coach. Explain mistakes in very simple English. "
    "Use 2-3 short sentences. Say exactly which piece should move and from which square to which square. "
    "Focus on why the move is bad and what should be done instead. Avoid technical jargon."
)

PIECE_NAMES = {
    chess.PAWN: "pawn",
    chess.KNIGHT: "knight",
    chess.BISHOP: "bishop",
    chess.ROOK: "rook",
    chess.QUEEN: "queen",
    chess.KING: "king",
}


def describe_uci_move(fen: str, uci_move: str | None) -> str:
    if not uci_move:
        return "the engine recommendation"
    try:
        board = chess.Board(fen)
        move = chess.Move.from_uci(uci_move)
        piece = board.piece_at(move.from_square)
        piece_name = PIECE_NAMES.get(piece.piece_type, "piece") if piece else "piece"
        side = "White" if piece and piece.color == chess.WHITE else "Black"
        return f"{side}'s {piece_name} from {chess.square_name(move.from_square)} to {chess.square_name(move.to_square)}"
    except Exception:
        return uci_move


async def explain_mistake(fen: str, played_move: str, best_move: str | None, eval_drop: float) -> str:
    settings = get_settings()
    played_description = describe_uci_move(fen, played_move)
    best_description = describe_uci_move(fen, best_move)
    fallback = (
        f"Moving {played_description} gives the opponent a chance to improve their position. "
        f"A better move was {best_description}, which keeps more pressure and avoids losing control."
    )
    if not settings.openai_api_key:
        return fallback

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    user_prompt = (
        f"Position: {fen}\n"
        f"Played move: {played_move} ({played_description})\n"
        f"Best move: {best_move} ({best_description})\n"
        f"Evaluation drop: {eval_drop:.2f}\n"
        "Explain simply."
    )
    response = await client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.3,
        max_tokens=140,
    )
    return response.choices[0].message.content or fallback
