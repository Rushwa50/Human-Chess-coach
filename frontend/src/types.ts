export type Game = {
  id: number;
  pgn_hash: string;
  status: "uploaded" | "queued" | "analyzing" | "analyzed" | "failed";
  analysis_error?: string | null;
  created_at: string;
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
  type: "inaccuracy" | "mistake" | "blunder";
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
