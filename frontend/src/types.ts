export type Game = {
  id: number;
  pgn_hash: string;
  status: "uploaded" | "queued" | "analyzing" | "analyzed" | "failed";
  analysis_error?: string | null;
  opening_suggestion?: string | null;
  loss_reason?: string | null;
  training_recommendation?: string | null;
  progress_summary?: string | null;
  game_story?: string | null;
  lesson_status?: "new" | "repeated" | "mastered" | null;
  lesson_repetition?: number | null;
  created_at: string;
  moves?: Move[];
};

export type Move = {
  id: number;
  move_number: number;
  fen: string;
  played_move: string;
  best_move: string | null;
  eval_before: number | null;
  eval_after: number | null;
  eval_drop: number;
};

export type Mistake = {
  id: number;
  move_id: number;
  type: "brilliant" | "great" | "best" | "excellent" | "good" | "book" | "inaccuracy" | "mistake" | "miss" | "blunder";
  explanation: string;
  created_at: string;
  move?: Move | null;
};

export type Analysis = {
  game: Game;
  moves: Move[];
  mistakes: Mistake[];
  summary: Record<string, number>;
};

export type Trait = {
  name: string;
  score_label: string;
  description: string;
};

export type PlayerProfile = {
  primary_style: string;
  traits: Trait[];
};

