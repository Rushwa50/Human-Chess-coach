import asyncio
import io
import math
from dataclasses import dataclass

import chess.pgn
from sqlalchemy import delete
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai_explainer import explain_mistake, suggest_opening
from app.engine import StockfishSession
from app.models import Game, Mistake, Move


def win_probability(eval_pawns: float) -> float:
    capped_eval = max(-100.0, min(100.0, eval_pawns))
    return 1 / (1 + math.exp(-0.368208 * capped_eval))

def classify_mistake(eval_drop: float, eval_before: float, eval_after: float) -> str | None:
    wp_before = win_probability(eval_before)
    wp_after = win_probability(eval_after)
    wp_drop = wp_before - wp_after
    
    if wp_drop >= 0.20:
        if wp_before > 0.70 and wp_after < 0.50:
            return "miss"
        return "blunder"
    if wp_drop >= 0.10:
        return "mistake"
    if wp_drop >= 0.05:
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
    time_left: float | None = None
    time_spent: float | None = None
    is_capture: bool = False
    is_check: bool = False

def extract_emotional_patterns(computed_moves: list[ComputedMove]) -> list[str]:
    patterns = set()
    
    for color in [0, 1]: 
        color_moves = [m for m in computed_moves if m.move_number % 2 == (1 if color == 0 else 0)]
        color_name = "White" if color == 0 else "Black"
        
        tp_moves = [m for m in color_moves if m.time_left is not None and m.time_left < 30]
        non_tp_moves = [m for m in color_moves if m.time_left is None or m.time_left >= 30]
        if tp_moves and non_tp_moves:
            avg_tp_drop = sum(m.eval_drop for m in tp_moves) / len(tp_moves)
            avg_non_tp_drop = sum(m.eval_drop for m in non_tp_moves) / len(non_tp_moves)
            if avg_tp_drop > avg_non_tp_drop + 0.5 and avg_tp_drop > 0.8:
                patterns.add(f"{color_name} suffered a drop in move quality under time pressure.")
                
        for i in range(len(color_moves) - 1):
            curr = color_moves[i]
            next_m = color_moves[i+1]
            
            if curr.eval_drop > 2.0:
                if next_m.time_spent is not None and next_m.time_spent < 5.0:
                    patterns.add(f"{color_name} played rushed/impulsive moves immediately after a major blunder.")
                
                if next_m.is_capture or next_m.is_check:
                    if next_m.eval_drop > 1.0:
                        patterns.add(f"{color_name} lashed out with forced/aggressive attacks after making a mistake, worsening the position.")
                        
            if curr.eval_drop > 1.0:
                if not next_m.is_capture and not next_m.is_check and next_m.eval_drop > 0.5:
                     try:
                         move_obj = chess.Move.from_uci(next_m.played_move)
                         from_rank = chess.square_rank(move_obj.from_square)
                         to_rank = chess.square_rank(move_obj.to_square)
                         is_retreat = to_rank < from_rank if color == 0 else to_rank > from_rank
                         if is_retreat:
                             patterns.add(f"{color_name} played passively (retreating) and made further inaccuracies after a mistake.")
                     except Exception:
                         pass

    return list(patterns)



def compute_game_analysis(pgn: str) -> list[ComputedMove]:
    parsed_game = chess.pgn.read_game(io.StringIO(pgn))
    if parsed_game is None:
        raise ValueError("Could not parse PGN.")

    rows: list[ComputedMove] = []
    board = parsed_game.board()
    
    with StockfishSession() as engine:
        # Initial evaluation of the starting position
        current_best_move, current_eval = engine.analyze_position(board.copy())
        last_clock = {chess.WHITE: None, chess.BLACK: None}
        
        for ply_number, node in enumerate(parsed_game.mainline(), start=1):
            played = node.move
            fen_before = board.fen()
            best_move = current_best_move
            eval_before = current_eval

            temp_board = board.copy()
            is_capture = temp_board.is_capture(played)
            temp_board.push(played)
            is_check = temp_board.is_check()

            time_left = node.clock()
            color = board.turn
            time_spent = None
            if time_left is not None:
                prev_time = last_clock[color]
                if prev_time is not None:
                    time_spent = max(0.0, prev_time - time_left)
                last_clock[color] = time_left

            board.push(played)
            
            # Evaluate the position AFTER the move.
            # This provides the eval_after for the current ply AND the eval_before for the next ply!
            next_best_move, next_eval = engine.analyze_position(board.copy())
            
            eval_after_for_opponent = next_eval
            eval_after = -eval_after_for_opponent
            if best_move:
                temp_board = chess.Board(fen_before)
                temp_board.push_uci(best_move)
                _, best_eval_after = engine.analyze_position(temp_board)
                best_eval = -best_eval_after
            else:
                best_eval = eval_before

            eval_drop = max(0.0, best_eval - eval_after)

            rows.append(
                ComputedMove(
                    move_number=ply_number,
                    fen=fen_before,
                    played_move=played.uci(),
                    best_move=best_move,
                    eval_before=eval_before,
                    eval_after=eval_after,
                    eval_drop=eval_drop,
                    time_left=time_left,
                    time_spent=time_spent,
                    is_capture=is_capture,
                    is_check=is_check
                )
            )
            
            current_best_move = next_best_move
            current_eval = next_eval

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

        from app.models import PlayerMistakePattern
        from datetime import datetime, timezone
        
        patterns_result = await db.scalars(select(PlayerMistakePattern).where(PlayerMistakePattern.user_id == game.user_id))
        existing_patterns_list = list(patterns_result)
        recurring_mistakes = {p.mistake_type: p.frequency for p in existing_patterns_list}
        pattern_models = {p.mistake_type: p for p in existing_patterns_list}

        from app.profiler import analyze_user_profile
        from sqlalchemy.orm import selectinload
        query = select(Game).where(Game.user_id == game.user_id, Game.status == "analyzed").options(selectinload(Game.moves).selectinload(Move.mistakes))
        past_games = list(await db.scalars(query))
        profile = analyze_user_profile(past_games)
        player_style = profile.primary_style
        player_skill = profile.skill_level

        # Extract recent history and progress
        recent_games = past_games[-3:] if len(past_games) >= 3 else past_games
        recent_progress = []
        for g in recent_games:
            if getattr(g, "progress_summary", None):
                recent_progress.append(g.progress_summary)

        # Extract the Active Core Lesson from the most recent game
        current_core_lesson = None
        current_repetition = 1
        for g in reversed(past_games):
            if getattr(g, "loss_reason", None):
                current_core_lesson = g.loss_reason
                current_repetition = getattr(g, "lesson_repetition", 1) or 1
                break

        # Extract common phase errors
        common_phase_errors = []
        for trait in profile.traits:
            if trait.score_label in ["Weak", "Fragile"]:
                if trait.name == "Tactical Awareness":
                    common_phase_errors.append("Middlegame")
                elif trait.name == "Endgame Strength":
                    common_phase_errors.append("Endgame")
                elif trait.name == "Defense":
                    common_phase_errors.append("Under Pressure")
        
        # Calculate Weakness Trends
        weakness_trends = []
        if len(past_games) >= 3:
            recent_g = past_games[-3:]
            historical_g = past_games[:-3]
            if historical_g:
                hist_mistakes = {}
                recent_mistakes = {}
                for g in historical_g:
                    for m in g.moves:
                        for mist in m.mistakes:
                            hist_mistakes[mist.type] = hist_mistakes.get(mist.type, 0) + 1
                for g in recent_g:
                    for m in g.moves:
                        for mist in m.mistakes:
                            recent_mistakes[mist.type] = recent_mistakes.get(mist.type, 0) + 1
                
                hist_len = len(historical_g)
                recent_len = len(recent_g)
                
                for m_type in set(hist_mistakes.keys()).union(recent_mistakes.keys()):
                    h_avg = hist_mistakes.get(m_type, 0) / hist_len
                    r_avg = recent_mistakes.get(m_type, 0) / recent_len
                    name = m_type.replace('_', ' ').title()
                    
                    if r_avg < h_avg and h_avg > 0.5:
                        weakness_trends.append(f"{name} mistakes are improving (reduced from {h_avg:.1f} to {r_avg:.1f} per game).")
                    elif r_avg >= h_avg and r_avg >= 1.0:
                        weakness_trends.append(f"{name} is a recurring issue ({r_avg:.1f} per game recently).")

        # Sort top 3 recurring weaknesses
        sorted_weaknesses = sorted(existing_patterns_list, key=lambda x: x.frequency, reverse=True)
        recurring_weaknesses_list = [w.mistake_type.replace('_', ' ').title() for w in sorted_weaknesses[:3]]

        emotional_patterns = extract_emotional_patterns(computed_moves)

        player_coaching_context = {
            "skill_level": player_skill,
            "player_type": player_style,
            "recurring_weaknesses": recurring_weaknesses_list,
            "recent_progress": recent_progress,
            "common_phase_errors": common_phase_errors,
            "weakness_trends": weakness_trends,
            "emotional_patterns": emotional_patterns,
            "current_core_lesson": current_core_lesson,
            "current_repetition": current_repetition
        }

        move_rows = []
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
            move_rows.append((move_row, computed))
        
        await db.flush()

        # Identify all mistakes and sort them by severity (eval_drop)
        all_mistakes = []
        for move_row, computed in move_rows:
            mistake_type = classify_mistake(computed.eval_drop, computed.eval_before, computed.eval_after)
            if mistake_type:
                all_mistakes.append((move_row, computed, mistake_type))

        all_mistakes.sort(key=lambda x: x[1].eval_drop, reverse=True)
        top_2_mistake_fens = {m[1].fen for m in all_mistakes[:2]}

        async def fetch_explanation(m_row: Move, c_move: ComputedMove, m_type: str):
            result = await explain_mistake(
                c_move.fen, c_move.played_move, c_move.best_move, c_move.eval_drop, player_coaching_context
            )
            return (m_row, m_type, c_move, result)

        async def dummy_explanation(m_row: Move, c_move: ComputedMove, m_type: str):
            return (m_row, m_type, c_move, {"category": "minor_inaccuracy", "explanation": "Minor error. See the game summary for your key coaching takeaway."})

        tasks = []
        for m_row, c_move, m_type in all_mistakes:
            if c_move.fen in top_2_mistake_fens:
                tasks.append(fetch_explanation(m_row, c_move, m_type))
            else:
                tasks.append(dummy_explanation(m_row, c_move, m_type))
        
        if tasks:
            results = await asyncio.gather(*tasks)
            mistakes_for_summary = []
            
            for m_row, m_type, c_move, result_dict in results:
                category = result_dict.get("category", "other")
                explanation = result_dict.get("explanation", "Mistake made.")
                
                mistakes_for_summary.append({
                    "move_number": m_row.move_number,
                    "eval_drop": c_move.eval_drop,
                    "category": category,
                    "explanation": explanation
                })
                
                db.add(Mistake(move_id=m_row.id, type=m_type, explanation=explanation))
                
                if category in pattern_models:
                    p = pattern_models[category]
                    p.frequency += 1
                    p.severity += c_move.eval_drop
                    p.last_seen = datetime.now(timezone.utc)
                else:
                    new_pattern = PlayerMistakePattern(
                        user_id=game.user_id,
                        mistake_type=category,
                        frequency=1,
                        severity=c_move.eval_drop,
                        last_seen=datetime.now(timezone.utc)
                    )
                    pattern_models[category] = new_pattern
                    db.add(new_pattern)
            
            if mistakes_for_summary:
                from app.ai_explainer import generate_game_summaries
                summary_result = await generate_game_summaries(mistakes_for_summary, player_coaching_context)
                game.loss_reason = summary_result.get("loss_reason")
                game.training_recommendation = summary_result.get("recommended_training")
                game.progress_summary = summary_result.get("progress_summary")
                game.lesson_status = summary_result.get("lesson_status", "new")
                if game.lesson_status == "repeated":
                    game.lesson_repetition = current_repetition + 1
                else:
                    game.lesson_repetition = 1

        game.status = "analyzed"
        game.opening_suggestion = await suggest_opening(game.pgn)
        await db.commit()
    except Exception as exc:
        game.status = "failed"
        game.analysis_error = str(exc)
        await db.commit()
