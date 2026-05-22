import math
from typing import List

from app.models import Game, Mistake, Move
from app.schemas import PlayerProfile, Trait

def analyze_user_profile(games: List[Game]) -> PlayerProfile:
    if not games:
        return PlayerProfile(
            skill_level="Unknown",
            primary_style="Unknown",
            traits=[
                Trait(name="Data", score_label="Insufficient", description="Play and analyze more games to unlock your profile.")
            ]
        )

    total_moves = 0
    
    # Trackers for traits
    middlegame_moves = 0
    middlegame_mistakes = 0
    
    defensive_moves = 0
    defensive_mistakes = 0
    
    endgame_moves = 0
    endgame_mistakes = 0
    
    total_eval_drop = 0.0
    sharp_positions = 0
    
    for game in games:
        # Create a quick lookup for mistakes by move_id
        mistake_map = {m.move_id: m for m in game.moves for m in m.mistakes} if hasattr(game.moves[0], "mistakes") else {}
        
        for move in game.moves:
            total_moves += 1
            is_mistake = len(move.mistakes) > 0 if hasattr(move, "mistakes") else False
            
            # Absolute eval drop to measure volatility
            if move.eval_drop:
                total_eval_drop += move.eval_drop
                
            # Sharp positions: eval is close to 0 but eval_drop is large, or just large eval_drop in general
            if move.eval_drop > 1.5:
                sharp_positions += 1

            # Tactical Awareness (Middlegame: moves 20-60 ply, meaning move 10 to 30)
            if 20 <= move.move_number <= 60:
                middlegame_moves += 1
                if is_mistake:
                    middlegame_mistakes += 1
                    
            # Defense (Moves played when eval_before < -1.0)
            if move.eval_before is not None and move.eval_before < -1.0:
                defensive_moves += 1
                if is_mistake:
                    defensive_mistakes += 1
                    
            # Endgame Strength (Moves > 60 ply, i.e., move 30+)
            if move.move_number > 60:
                endgame_moves += 1
                if is_mistake:
                    endgame_mistakes += 1

    if total_moves < 10:
        return PlayerProfile(
            skill_level="Unknown",
            primary_style="Unknown",
            traits=[
                Trait(name="Data", score_label="Insufficient", description="Analyze more games to unlock your profile.")
            ]
        )
        
    # Calculate Skill Level based on average eval drop
    avg_eval_drop = total_eval_drop / total_moves
    if avg_eval_drop > 0.8:
        skill_level = "Beginner"
    elif avg_eval_drop > 0.3:
        skill_level = "Intermediate"
    else:
        skill_level = "Advanced"

    # 1. Aggression & Risk Appetite
    # Baseline: sharp_positions per 100 moves
    sharpness_rate = (sharp_positions / total_moves) * 100
    if sharpness_rate > 8.0:
        aggression_label, aggression_desc = "High", "You thrive in chaotic positions and frequently create sharp tactical imbalances."
        risk_label, risk_desc = "Risky", "You are willing to sacrifice stability for initiative and attacking potential."
    elif sharpness_rate > 4.0:
        aggression_label, aggression_desc = "Medium", "You balance solid play with calculated aggressive strikes when the position allows."
        risk_label, risk_desc = "Balanced", "You take calculated risks without overcommitting your position."
    else:
        aggression_label, aggression_desc = "Low", "You prefer quiet, positional struggles over volatile complications."
        risk_label, risk_desc = "Safe", "You prioritize a solid structure and minimize unnecessary risks."

    # 2. Tactical Awareness
    # Baseline: mistakes in middlegame
    tactical_mistake_rate = (middlegame_mistakes / middlegame_moves) if middlegame_moves > 0 else 0
    if middlegame_moves < 10:
        tactical_label, tactical_desc = "Unknown", "Not enough middlegame data."
    elif tactical_mistake_rate < 0.10:
        tactical_label, tactical_desc = "Strong", "You have excellent vision in complex middlegames and rarely miss tactical ideas."
    elif tactical_mistake_rate < 0.25:
        tactical_label, tactical_desc = "Good", "You navigate the middlegame well, with solid calculation skills."
    else:
        tactical_label, tactical_desc = "Weak", "You tend to overlook tactical opportunities or fall into traps during the middlegame."

    # 3. Defense
    defensive_mistake_rate = (defensive_mistakes / defensive_moves) if defensive_moves > 0 else 0
    if defensive_moves < 5:
        defense_label, defense_desc = "Untested", "Not enough games played from behind to evaluate defense."
    elif defensive_mistake_rate < 0.15:
        defense_label, defense_desc = "Resourceful", "You are incredibly stubborn when defending and consistently find the best resilient moves."
    elif defensive_mistake_rate < 0.30:
        defense_label, defense_desc = "Stable", "You maintain composure under pressure and defend adequately."
    else:
        defense_label, defense_desc = "Fragile", "You struggle to find the best defensive resources when under heavy pressure."

    # 4. Endgame Strength
    endgame_mistake_rate = (endgame_mistakes / endgame_moves) if endgame_moves > 0 else 0
    if endgame_moves < 10:
        endgame_label, endgame_desc = "Untested", "Not enough endgame data."
    elif endgame_mistake_rate < 0.10:
        endgame_label, endgame_desc = "Technical", "You play with machine-like precision in the endgame, converting advantages flawlessly."
    elif endgame_mistake_rate < 0.25:
        endgame_label, endgame_desc = "Accurate", "You understand essential endgame principles and navigate late-game positions well."
    else:
        endgame_label, endgame_desc = "Weak", "You tend to slip up in the endgame, sometimes squandering earned advantages."

    # Determine Primary Style
    # Score traits to determine style: +1 for attacking traits, -1 for defensive traits
    style_score = 0
    if aggression_label == "High": style_score += 2
    if aggression_label == "Low": style_score -= 2
    if risk_label == "Risky": style_score += 1
    if risk_label == "Safe": style_score -= 1
    if tactical_label == "Strong": style_score += 1
    if defense_label == "Resourceful": style_score -= 1
    
    if style_score >= 2:
        primary_style = "Attacking Player"
    elif style_score <= -2:
        primary_style = "Positional / Defensive Player"
    else:
        primary_style = "Universal / Balanced Player"

    traits = [
        Trait(name="Aggression", score_label=aggression_label, description=aggression_desc),
        Trait(name="Tactical Awareness", score_label=tactical_label, description=tactical_desc),
        Trait(name="Defense", score_label=defense_label, description=defense_desc),
        Trait(name="Risk Appetite", score_label=risk_label, description=risk_desc),
        Trait(name="Endgame Strength", score_label=endgame_label, description=endgame_desc),
    ]

    return PlayerProfile(skill_level=skill_level, primary_style=primary_style, traits=traits)
