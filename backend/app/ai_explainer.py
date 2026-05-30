from openai import AsyncOpenAI
import chess

from app.config import get_settings

SYSTEM_PROMPT = (
    "You are an expert chess coach. Your goal is to provide deeply insightful, uniquely personalized coaching.\n"
    "DO NOT give surface-level, generic feedback (e.g., 'You attacked too early').\n"
    "INSTEAD, focus on strategic reasoning, behavioral observations, and underlying patterns (e.g., 'You often start attacks before your pieces are coordinated, which later leaves your king and center vulnerable').\n"
    "Explain the 'why' behind the mistake in a rich, descriptive way. Connect the tactical error to broader strategic concepts.\n"
    "Say exactly which piece should move and to which square, but embed this in a rich explanation of the strategy.\n"
    "Keep it concise (2-4 sentences) but highly impactful and unique. Avoid robotic or repetitive phrasing.\n"
    "Provide your answer ONLY as a JSON object with the keys 'category' and 'explanation'.\n"
    "For 'category', choose one of: king_safety, hanging_piece, tactical_miss, opening_development, endgame_mistake, time_pressure, positional_error, or other."
)

PIECE_NAMES = {
    chess.PAWN: "pawn",
    chess.KNIGHT: "knight",
    chess.BISHOP: "bishop",
    chess.ROOK: "rook",
    chess.QUEEN: "queen",
    chess.KING: "king",
}

def build_teaching_style_prompt(context: dict) -> str:
    if not context:
        return ""
        
    style_instructions = []
    
    # Skill level adaptation
    skill = context.get("skill_level", "")
    if skill == "Beginner":
        style_instructions.append("TEACHING STYLE: You are coaching a Beginner. Keep your explanations extremely simple and brief (1 sentence max). Avoid deep variations or complex technical jargon. Focus on basic chess principles.")
    elif skill == "Advanced":
        style_instructions.append("TEACHING STYLE: You are coaching an Advanced player. Be precise and highly analytical. Provide deeper strategic insights (2-3 sentences). Feel free to point out deep positional nuances or concrete tactical variations.")
    elif skill == "Intermediate":
        style_instructions.append("TEACHING STYLE: You are coaching an Intermediate player. Provide clear, instructive feedback balancing principles with concrete variations (1-2 sentences).")
        
    # Player type adaptation
    p_type = context.get("player_type", "")
    if "Attacking" in p_type:
        style_instructions.append("COACHING FOCUS: This is an aggressive player. Focus your coaching on discipline—remind them not to overextend, to consider king safety, and coordinate their pieces before striking.")
    elif "Positional" in p_type or "Defensive" in p_type:
        style_instructions.append("COACHING FOCUS: This is a solid/defensive player. Encourage them to take calculated risks and seize the initiative when tactical opportunities arise.")
        
    # Improvement rate adaptation
    trends = context.get("weakness_trends", [])
    if any("improving" in t.lower() or "reduced" in t.lower() for t in trends):
        style_instructions.append("TONE: The player is showing improvement. Use a highly encouraging and motivating tone, acknowledging their recent progress.")
    else:
        style_instructions.append("TONE: Keep the tone instructive and focused on building fundamental habits.")
        
    # Recurring weaknesses
    weaknesses = context.get("recurring_weaknesses", [])
    if weaknesses:
        style_instructions.append(f"WATCH OUT FOR: Their recurring weaknesses are {', '.join(weaknesses)}. Pay special attention if their mistake relates to these areas.")
        
    # Emotional awareness
    emotional_patterns = context.get("emotional_patterns", [])
    if emotional_patterns:
        style_instructions.append(f"EMOTIONAL AWARENESS: The player exhibited the following emotional/psychological patterns: {', '.join(emotional_patterns)}. Address these explicitly in your feedback, pointing out how their emotions or time management affected their play.")
        
    return "\n" + "\n".join(style_instructions) + "\n"

def build_learning_strategy_prompt(context: dict) -> str:
    if not context:
        return ""
        
    strategy = []
    strategy.append("LONG-TERM LEARNING STRATEGY FOR THIS PLAYER:")
    
    # Player type
    p_type = context.get("player_type", "")
    if "Attacking" in p_type:
        strategy.append("- Training Focus: Tactical players need more puzzle-focused coaching. Recommend specific tactical motifs (e.g., pins, forks, mating nets) and calculation exercises.")
    elif "Positional" in p_type or "Defensive" in p_type:
        strategy.append("- Training Focus: Positional players need more strategic explanations. Recommend studying pawn structures, maneuvering, and prophylactic thinking.")
    else:
        strategy.append("- Training Focus: Balanced players should receive a mix of tactical puzzles and strategic planning exercises.")
        
    # Skill level
    skill = context.get("skill_level", "")
    if skill == "Beginner":
        strategy.append("- Curriculum: Keep the training curriculum simple and encouraging. Focus on avoiding 1-move blunders, basic checkmates, and opening principles.")
    elif skill == "Advanced":
        strategy.append("- Curriculum: Recommend advanced concepts like endgame technique, complex calculation, and deep opening preparation.")
    else:
        strategy.append("- Curriculum: Focus on intermediate concepts like middle-game plans and intermediate tactics.")

    # Improvement rate
    trends = context.get("weakness_trends", [])
    if any("improving" in t.lower() or "reduced" in t.lower() for t in trends):
        strategy.append("- Difficulty: The player is improving quickly. Recommend harder training, deeper analysis, and challenging puzzles to push their limits.")
    else:
        strategy.append("- Difficulty: The player is plateauing or struggling. Recommend stepping back to reinforce core fundamentals and easier confidence-building exercises.")
        
    return "\n" + "\n".join(strategy) + "\n"


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


async def explain_mistake(fen: str, played_move: str, best_move: str | None, eval_drop: float, coaching_context: dict | None = None) -> dict[str, str]:
    settings = get_settings()
    played_description = describe_uci_move(fen, played_move)
    best_description = describe_uci_move(fen, best_move)
    fallback_explanation = (
        f"Moving {played_description} gives the opponent a chance to improve their position. "
        f"A better move was {best_description}, which keeps more pressure and avoids losing control."
    )
    fallback = {"category": "other", "explanation": fallback_explanation}
    if not settings.openai_api_key:
        return fallback

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    
    context_str = ""
    if coaching_context:
        import json
        context_str = f"\nPlayer Coaching Context Data:\n{json.dumps(coaching_context, indent=2)}\n"
        context_str += build_teaching_style_prompt(coaching_context)
        context_str += "Adapt your coaching explanation to this specific player using the style instructions above.\n"

    user_prompt = (
        f"Position: {fen}\n"
        f"Played move: {played_move} ({played_description})\n"
        f"Best move: {best_move} ({best_description})\n"
        f"Evaluation drop: {eval_drop:.2f}\n"
        f"{context_str}"
        "Provide a deeply insightful explanation that focuses on strategic reasoning and behavioral observations."
    )
    
    try:
        response = await client.chat.completions.create(
            model=settings.openai_model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=200,
        )
        content = response.choices[0].message.content
        return json.loads(content)
    except Exception:
        return fallback


import random

FALLBACK_LESSONS = [
    "Consistency beats motivation.", "Start before you feel ready.", "Focus on progress, not perfection.",
    "Small habits create big results.", "Learn from every mistake.", "Time is your most valuable asset.",
    "Prioritize what matters most.", "Discipline creates freedom.", "Action reduces anxiety.",
    "Success leaves clues.", "Listen more than you speak.", "Build systems, not goals.",
    "Embrace constructive feedback.", "Stay curious every day.", "Confidence comes from preparation.",
    "Solve problems proactively.", "Practice gratitude daily.", "Growth happens outside comfort zones.",
    "Learn to say no.", "Persistence beats talent.", "Take ownership of outcomes.",
    "Manage energy, not just time.", "Adapt to changing situations.", "Every expert was once a beginner.",
    "Rest is productive.", "Think long-term.", "Develop a learning mindset.", "Communicate clearly.",
    "Celebrate small wins.", "Challenge limiting beliefs.", "Build trust through actions.",
    "Learn from successful people.", "Stay organized.", "Ask better questions.", "Focus on solutions.",
    "Consistency compounds.", "Avoid unnecessary distractions.", "Keep promises to yourself.",
    "Master the basics.", "Patience creates better results.", "Learn from failure.",
    "Seek continuous improvement.", "Practice active listening.", "Stay resilient during setbacks.",
    "Invest in relationships.", "Take calculated risks.", "Manage stress effectively.",
    "Develop self-awareness.", "Learn something new today.", "Be accountable.",
    "Focus on what you can control.", "Create positive routines.", "Learn to delegate.",
    "Keep an open mind.", "Build mental toughness.", "Stay humble while growing.",
    "Embrace lifelong learning.", "Lead by example.", "Think critically.", "Stay adaptable.",
    "Set clear priorities.", "Practice mindfulness.", "Learn from criticism.",
    "Develop problem-solving skills.", "Stay optimistic.", "Value teamwork.",
    "Improve communication daily.", "Take initiative.", "Build healthy habits.",
    "Stay committed to your goals.", "Learn from diverse perspectives.", "Protect your focus.",
    "Be resourceful.", "Cultivate patience.", "Stay authentic.", "Keep improving your skills.",
    "Take responsibility for growth.", "Focus on impact.", "Stay organized and prepared.",
    "Learn to recover from setbacks.", "Develop emotional intelligence.", "Build strong foundations.",
    "Think before reacting.", "Stay flexible in your approach.", "Learn from every experience.",
    "Make decisions confidently.", "Value quality over quantity.", "Be proactive, not reactive.",
    "Stay committed to excellence.", "Keep your promises.", "Learn to manage uncertainty.",
    "Focus on continuous learning.", "Build resilience daily.", "Develop leadership qualities.",
    "Practice self-discipline.", "Stay goal-oriented.", "Create value for others.",
    "Learn to simplify.", "Maintain a positive attitude.", "Never stop growing."
]

async def generate_game_summaries(mistakes_list: list[dict], coaching_context: dict | None = None) -> dict[str, str]:
    settings = get_settings()
    fallback = {
        "loss_reason": random.choice(FALLBACK_LESSONS),
        "recommended_training": "No recommendations available.",
        "progress_summary": "No progress data.",
        "lesson_status": "new"
    }
    if not settings.openai_api_key or not mistakes_list:
        return fallback
        
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    
    system_prompt = (
        "You are an expert chess coach analyzing a full game. Your feedback must be deeply insightful, focusing on strategic reasoning and behavioral observations rather than surface-level tactical errors.\n"
        "Based on the provided list of mistakes the player made and their historical recurring weaknesses, "
        "generate four things:\n"
        "1. A 'Key Takeaway' section ('loss_reason'). Generate exactly ONE focused coaching takeaway (1-2 sentences) highlighting the single most important lesson from this game. Do NOT list multiple bullet points.\n"
        "2. A 'Recommended Training' section with 3 actionable, personalized focus areas to study next. This MUST strictly follow the LONG-TERM LEARNING STRATEGY provided in the context below.\n"
        "3. A 'Progress Summary' section highlighting areas where the player has improved, comparing their current performance to their historical recurring weaknesses and recent game history. If `weakness_trends` are provided, explicitly state which weaknesses are improving and which keep repeating.\n"
        "4. A 'Game Story' section ('game_story'). Create a short, dramatic summary of the game's momentum shifts. Format it exactly like this:\n"
        "Game Story:\n- Peak Moment: [short description]\n- Turning Point: [short description]\n- Critical Mistake: [short description]\n- Recovery Attempt: [short description]\n- Today's Core Lesson: [short description]\n"
        "Provide your answer ONLY as a JSON object with keys 'loss_reason', 'lesson_status', 'recommended_training', 'progress_summary', and 'game_story'.\n"
        "The 'lesson_status' MUST be exactly one of: 'mastered' (if they improved on the active lesson), 'repeated' (if they failed the active lesson again), or 'new' (if assigning a brand new lesson).\n"
        "Ensure your tone is uniquely human, deeply observant, and strictly avoids repetitive or generic coaching phrases. Do NOT generate long essays, complex engine evaluations, or overly technical jargon."
    )
    
    mistakes_context = ""
    for idx, m in enumerate(mistakes_list):
        mistakes_context += f"Move {m.get('move_number', '?')}: eval drop {m.get('eval_drop', 0):.2f}, category: {m.get('category', 'other')}, explanation: {m.get('explanation', '')}\n"

    user_prompt = "Game Mistakes:\n" + mistakes_context
    if coaching_context:
        import json
        user_prompt += f"\nPlayer Coaching Context Data:\n{json.dumps(coaching_context, indent=2)}\n"
        user_prompt += build_teaching_style_prompt(coaching_context)
        user_prompt += build_learning_strategy_prompt(coaching_context)
        user_prompt += "Ensure the summary, recommended training, and progress summary are deeply personalized to the player's unique history and traits shown in the context using the style and learning strategy instructions provided above. Pay special attention to the `weakness_trends` to explicitly track improvement patterns and recurring mistakes.\n"
        if coaching_context.get("current_core_lesson"):
            reps = coaching_context.get("current_repetition", 1)
            user_prompt += (
                f"\nIMPORTANT CORE LESSON INSTRUCTION:\n"
                f"The player's ACTIVE CORE LESSON from their previous games is: \"{coaching_context['current_core_lesson']}\".\n"
                f"They have struggled with this exact lesson for {reps} consecutive game(s).\n"
                f"Evaluate if the player showed improvement on this specific lesson in this game based on their mistakes.\n"
                f"- If they STILL struggled with it, your 'loss_reason' MUST repeat this lesson (rephrased slightly) and 'lesson_status' MUST be 'repeated'. If {reps} >= 3, be more forceful in your advice.\n"
                f"- If they successfully avoided this mistake, generate a NEW 'Today's Core Lesson' highlighting their new biggest issue, and set 'lesson_status' to 'mastered'.\n"
            )
        
    try:
        response = await client.chat.completions.create(
            model=settings.openai_model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=500,
        )
        content = response.choices[0].message.content
        print(f"DEBUG AI SUMMARY RESPONSE: {content}", flush=True)
        import json
        return json.loads(content)
    except Exception:
        return fallback

import json
import io

def get_fallback_opening_suggestion(pgn_str: str) -> str:
    import chess.pgn
    try:
        game = chess.pgn.read_game(io.StringIO(pgn_str))
        if not game:
            raise ValueError("Invalid PGN")
            
        opening_name = game.headers.get("Opening", "?")
        
        # We will determine specific advice based on the first few moves if possible
        moves = list(game.mainline_moves())
        m1 = moves[0].uci() if len(moves) > 0 else ""
        m2 = moves[1].uci() if len(moves) > 1 else ""
        
        white_suggestion = "Focus on rapid development, controlling the center with your pawns, and securing king safety by castling early."
        black_suggestion = "Respond to central tension appropriately, develop your minor pieces actively, and ensure your king is safe."

        if m1 == "e2e4":
            if m2 == "e7e5": 
                if opening_name == "?": opening_name = "Open Game (1. e4 e5)"
                white_suggestion = "Against 1... e5, the Italian Game (2. Nf3 Nc6 3. Bc4) or the Ruy Lopez (3. Bb5) are considered the absolute best openings to fight for an advantage."
                black_suggestion = "When facing the King's Pawn Opening, 1... e5 is classically best. Be prepared to defend against the Ruy Lopez with the Berlin Defense or the Morphy Defense."
            elif m2 == "c7c5": 
                if opening_name == "?": opening_name = "Sicilian Defense"
                white_suggestion = "Against the Sicilian Defense, the Open Sicilian (2. Nf3 followed by 3. d4) is the most critical and best test. The Alapin (2. c3) is a solid alternative."
                black_suggestion = "The Sicilian Defense is an excellent fighting response. Prepare setups like the Najdorf (5... a6), the Dragon (5... g6), or the Classical variation."
            elif m2 == "e7e6": 
                if opening_name == "?": opening_name = "French Defense"
                white_suggestion = "To challenge the French Defense, the Advance Variation (3. e5) and the Classical/Tarrasch (3. Nc3/Nd2) are the best systems for an advantage."
                black_suggestion = "In the French Defense, your best plan is to attack White's central pawn chain (usually d4 and e5) with moves like ...c5 and ...f6."
            elif m2 == "c7c6": 
                if opening_name == "?": opening_name = "Caro-Kann Defense"
                white_suggestion = "Against the Caro-Kann, the Advance Variation (3. e5) is currently the most popular and challenging test. The Exchange Variation is also very solid."
                black_suggestion = "In the Caro-Kann, aim to develop your light-squared bishop early (to f5 or g4) before locking the pawn structure with ...e6."
            else: 
                if opening_name == "?": opening_name = "King's Pawn Game"
        elif m1 == "d2d4":
            if m2 == "d7d5": 
                if opening_name == "?": opening_name = "Queen's Pawn Game"
                white_suggestion = "After 1. d4 d5, playing the Queen's Gambit (2. c4) is widely regarded as the best way to put immediate pressure on Black's center."
                black_suggestion = "Against the Queen's Gambit, you can choose to accept it (2... dxc4), decline it solidly (2... e6), or play the sharp Slav Defense (2... c6)."
            elif m2 == "g8f6": 
                if opening_name == "?": opening_name = "Indian Defense"
                white_suggestion = "When Black plays the Indian Defense, grabbing space with 2. c4 is the best standard response, preparing to face the King's Indian, Nimzo-Indian, or Grunfeld."
                black_suggestion = "To counter 1. d4, the hypermodern King's Indian Defense (...g6 and ...Bg7) or the Nimzo-Indian Defense (if White plays 2. c4 and 3. Nc3) are top choices."
            else: 
                if opening_name == "?": opening_name = "Queen's Pawn Game"
        elif m1 == "g1f3": 
            if opening_name == "?": opening_name = "Reti Opening"
            white_suggestion = "The Reti Opening is highly flexible. Usually, transitioning into a Queen's Gambit or an English Opening setup offers the best chances."
            black_suggestion = "Against 1. Nf3, establishing a solid center with 1... d5 or playing symmetrically with 1... Nf6 are the most robust responses."
        elif m1 == "c2c4": 
            if opening_name == "?": opening_name = "English Opening"
            white_suggestion = "In the English Opening, fighting for control of the d5 square and fianchettoing your light-squared bishop is a premier strategy."
            black_suggestion = "To challenge the English, the Reversed Sicilian (1... e5) or a solid Anglo-Indian setup (1... Nf6 followed by ...e6 or ...g6) are best."

        if opening_name == "?":
            opening_name = "Custom / Unknown Opening"

        # If we have an opening name from PGN headers but didn't match the hardcoded moves, try string matching on the name
        if "Sicilian" in opening_name and m2 != "c7c5":
            white_suggestion = "Against the Sicilian, the Open Sicilian is the best theoretical test. The Alapin (2. c3) is a strong practical choice."
            black_suggestion = "The Sicilian is Black's best fighting response to e4. Study setups like the Najdorf, Dragon, or Sveshnikov."
        elif "French" in opening_name and m2 != "e7e6":
            white_suggestion = "The best way to combat the French is via the Advance Variation or the Classical (Nc3/Nd2)."
            black_suggestion = "Strike at White's center with ...c5 and ...f6 to break their pawn chain."
        elif "Caro-Kann" in opening_name and m2 != "c7c6":
            white_suggestion = "Challenge the Caro-Kann with the Advance Variation (3. e5) or the classical Main Line."
            black_suggestion = "Develop your light-squared bishop before playing ...e6 to maintain a solid position."
        elif "Ruy Lopez" in opening_name or "Spanish" in opening_name:
            white_suggestion = "The Ruy Lopez is White's best opening after 1. e4 e5. Maintain the tension and build a strong center with c3 and d4."
            black_suggestion = "Against the Ruy Lopez, the Berlin Defense is incredibly solid, while the Morphy Defense (3... a6) offers more dynamic play."
        elif "Italian" in opening_name:
            white_suggestion = "The Italian Game (Giuoco Piano) is excellent. Build the center slowly with c3 and d3, or aggressively with d4."
            black_suggestion = "Respond to the Italian Game solidly with the Two Knights Defense (3... Nf6) or the classical 3... Bc5."
        elif "Queen's Gambit" in opening_name:
            white_suggestion = "The Queen's Gambit is the premier opening for 1. d4. Press Black's center immediately with c4."
            black_suggestion = "Decline the Queen's Gambit solidly with 2... e6, or challenge it dynamically with the Slav Defense (2... c6)."

        return json.dumps({
            "opening_name": opening_name,
            "white_suggestion": white_suggestion,
            "black_suggestion": black_suggestion
        })
    except Exception:
        return json.dumps({
            "opening_name": "Standard Game",
            "white_suggestion": "Control the center, develop knights before bishops, and castle early.",
            "black_suggestion": "Fight for the center, develop your pieces actively, and get your king to safety."
        })

async def suggest_opening(pgn: str) -> str | None:
    settings = get_settings()
    fallback_json = get_fallback_opening_suggestion(pgn)
    
    if not settings.openai_api_key:
        return fallback_json

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    system_prompt = (
        "You are a master chess coach. "
        "Review the first 10-15 moves of the provided PGN. "
        "Identify the opening played in the game. "
        "Then, explicitly provide two recommendations:\n"
        "1. For White: the best opening or system they can play against Black's setup.\n"
        "2. For Black: the best opening or system they can play against White's setup.\n"
        "Provide your answer ONLY as a JSON object with the following keys:\n"
        "- 'opening_name': The name of the opening played.\n"
        "- 'white_suggestion': Your advice for White.\n"
        "- 'black_suggestion': Your advice for Black.\n"
        "Do not use overly technical jargon. Ensure the response is valid JSON."
    )
    user_prompt = f"Game PGN:\n{pgn}\n\nIdentify the opening and suggest the best responses for both White and Black in JSON format."
    
    try:
        response = await client.chat.completions.create(
            model=settings.openai_model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=300,
        )
        return response.choices[0].message.content
    except Exception:
        return fallback_json
