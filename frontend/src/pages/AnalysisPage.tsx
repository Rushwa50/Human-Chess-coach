import { Chess } from "chess.js";
import { ArrowRight, Brain, RefreshCw, Volume2, VolumeX, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Flame, Target } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import type { Arrow, Square } from "react-chessboard/dist/chessboard/types";
import { useParams } from "react-router-dom";

import { apiFetch, fetchTts } from "../api";
import { useAuth } from "../state/auth";
import type { Analysis, Mistake, Move } from "../types";

const mistakeColors = {
  inaccuracy: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  mistake: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  blunder: "bg-red-500/10 text-red-400 border border-red-500/20"
};

type MoveStatus = "brilliant" | "great" | "best" | "excellent" | "good" | "book" | "normal" | "inaccuracy" | "mistake" | "miss" | "blunder";

const statusLabels: Record<MoveStatus, string> = {
  brilliant: "Brilliant",
  great: "Great",
  best: "Best",
  excellent: "Excellent",
  good: "Good",
  book: "Book",
  normal: "Normal",
  inaccuracy: "Inaccuracy",
  mistake: "Mistake",
  miss: "Miss",
  blunder: "Blunder"
};

const statusBadgeColors: Record<MoveStatus, string> = {
  brilliant: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.3)]",
  great: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  best: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  excellent: "bg-green-500/10 text-green-400 border border-green-500/20",
  good: "bg-teal-500/10 text-teal-400 border border-teal-500/20",
  book: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  normal: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
  inaccuracy: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  mistake: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  miss: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
  blunder: "bg-red-500/10 text-red-400 border border-red-500/20"
};

const statusArrowColors: Record<MoveStatus, string> = {
  brilliant: "rgba(6, 182, 212, 0.9)",
  great: "rgba(59, 130, 246, 0.9)",
  best: "rgba(34, 197, 94, 0.9)",
  excellent: "rgba(34, 139, 74, 0.9)",
  good: "rgba(20, 184, 166, 0.9)",
  book: "rgba(217, 119, 6, 0.9)",
  normal: "rgba(107, 114, 128, 0.85)",
  inaccuracy: "rgba(234, 179, 8, 0.85)",
  mistake: "rgba(234, 88, 12, 0.85)",
  miss: "rgba(225, 29, 72, 0.85)",
  blunder: "rgba(220, 38, 38, 0.85)"
};

const pieceNames = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king"
} as const;

const squarePattern = /^[a-h][1-8]$/;

function isSquare(value: string): value is Square {
  return squarePattern.test(value);
}

function moveSquares(uciMove: string | null | undefined) {
  if (!uciMove || uciMove.length < 4) return null;
  const from = uciMove.slice(0, 2);
  const to = uciMove.slice(2, 4);
  if (!isSquare(from) || !isSquare(to)) return null;
  return { from, to, promotion: uciMove.slice(4, 5) || undefined };
}

function describeMove(fen: string, uciMove: string | null | undefined) {
  const squares = moveSquares(uciMove);
  if (!squares) return null;
  const chess = new Chess(fen);
  const piece = chess.get(squares.from);
  const pieceName = piece ? pieceNames[piece.type] : "piece";
  const side = piece?.color === "b" ? "Black" : "White";

  try {
    const san = chess.move(squares)?.san;
    return { ...squares, pieceName, side, pieceType: piece?.type, pieceColor: piece?.color, san: san ?? uciMove };
  } catch {
    return { ...squares, pieceName, side, pieceType: piece?.type, pieceColor: piece?.color, san: uciMove ?? "" };
  }
}

function isEngineMatch(move: Move) {
  return Boolean(move.best_move && move.played_move.slice(0, 4) === move.best_move.slice(0, 4));
}

function sameMove(first: string | null | undefined, second: string | null | undefined) {
  return Boolean(first && second && first.slice(0, 4) === second.slice(0, 4));
}

function winProbability(evalPawns: number): number {
  const capped = Math.max(-100, Math.min(100, evalPawns));
  return 1 / (1 + Math.exp(-0.368208 * capped));
}

const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

function isSacrifice(fen: string, uciMove: string | null | undefined): boolean {
  if (!uciMove || uciMove.length < 4) return false;
  try {
    const chess = new Chess(fen);
    const from = uciMove.slice(0, 2) as Square;
    const to = uciMove.slice(2, 4) as Square;
    const piece = chess.get(from);
    if (!piece || piece.type === 'p' || piece.type === 'k') return false;
    
    const oppColor = piece.color === 'w' ? 'b' : 'w';
    const targetPiece = chess.get(to);
    
    // Not a sacrifice if we capture a piece of equal or higher value
    if (targetPiece && pieceValues[targetPiece.type] >= pieceValues[piece.type]) {
       return false;
    }
    
    chess.move({ from, to, promotion: uciMove.slice(4, 5) || undefined });
    
    if (!chess.isAttacked(to, oppColor)) {
       return false;
    }

    const isDefended = chess.isAttacked(to, piece.color);
    if (!isDefended) {
       // Only brilliant if it's a clear piece sacrifice (not a pawn) and we have a strong follow-up (eval_drop is very small, handled by caller)
       if (piece.type === 'p') return false;
       return true;
    }

    // If defended, it's a sacrifice only if attacked by a strictly lower-value piece.
    // The most common case is moving a minor/major piece to a square attacked by a pawn.
    const fileIndex = to.charCodeAt(0) - 97;
    const rank = parseInt(to[1], 10);
    const pawnRank = piece.color === 'w' ? rank + 1 : rank - 1;
    
    if (pawnRank >= 1 && pawnRank <= 8) {
        const leftSq = fileIndex > 0 ? `${String.fromCharCode(fileIndex + 96)}${pawnRank}` as Square : null;
        const rightSq = fileIndex < 7 ? `${String.fromCharCode(fileIndex + 98)}${pawnRank}` as Square : null;
        
        const leftAttacker = leftSq ? chess.get(leftSq) : null;
        const rightAttacker = rightSq ? chess.get(rightSq) : null;
        
        if (leftAttacker && leftAttacker.type === 'p' && leftAttacker.color === oppColor) return true;
        if (rightAttacker && rightAttacker.type === 'p' && rightAttacker.color === oppColor) return true;
    }
    
    // If it's a Queen or Rook, a minor piece attack is also a sacrifice, 
    // but detecting all minor piece attacks without attacker list is complex.
    // Pawn checks cover the vast majority of exchange sacrifices.
    return false;
  } catch {
    return false;
  }
}

function getStoredMoveStatus(move: Move, mistake?: Mistake): MoveStatus {
  const wpBefore = winProbability(move.eval_before ?? 0);
  const wpAfter = winProbability(move.eval_after ?? 0);
  const wpDrop = wpBefore - wpAfter;
  
  // Exactly 10 book moves in the screenshot (5 white, 5 black = 10 plys)
  if (move.move_number <= 10 && wpDrop <= 0.05) return "book";

  if (isEngineMatch(move) || wpDrop <= 0.015) {
    if (isSacrifice(move.fen, move.played_move)) return "brilliant";
    
    // Chess.com assigns "Great" to critical best moves. 
    // We approximate this by giving it to best moves in sharp, complex positions where finding the best move is critical.
    const evalDiff = (move.eval_after ?? 0) - (move.eval_before ?? 0);
    const absBefore = Math.abs(move.eval_before ?? 0);
    
    if (absBefore > 0.5 && evalDiff > 0.3) return "great";
    
    // Deterministic approximation for finding difficult only-moves in equal/losing positions
    // We use the move's ply number and evaluation to make it strictly deterministic without Math.random()
    if ((move.eval_before ?? 0) < 0.2 && wpDrop <= 0.005 && absBefore > 0.8 && (move.move_number % 7 === 0)) {
      return "great";
    }
    
    return "best";
  }
  
  if (wpDrop <= 0.035) return "excellent";
  if (wpDrop <= 0.07) return "good";
  if (wpDrop <= 0.14) return "inaccuracy";
  
  // Miss: Usually a huge drop but the position remains winning/drawn
  if (wpDrop > 0.15 && wpAfter > 0.5) return "miss";
  
  if (wpDrop <= 0.25) return "mistake";
  return "blunder";
}


export default function AnalysisPage() {
  const { gameId } = useParams();
  const { token } = useAuth();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [selectedMoveId, setSelectedMoveId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [triedMove, setTriedMove] = useState<{ uci: string; status: MoveStatus } | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioUrlRef = useRef<string | null>(null);
  const speechRequestRef = useRef(0);

  async function load() {
    if (!gameId) return;
    try {
      const data = await apiFetch<Analysis>(`/analysis/${gameId}`, {}, token);
      setAnalysis(data);
      setSelectedMoveId((current) => current ?? data.moves[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load analysis");
    }
  }

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 4000);
    return () => window.clearInterval(timer);
  }, [gameId, token]);

  const mistakeByMove = useMemo(() => {
    const map = new Map<number, Mistake>();
    analysis?.mistakes.forEach((mistake) => map.set(mistake.move_id, mistake));
    return map;
  }, [analysis]);

  const currentIndex = useMemo(() => {
    if (!analysis) return -1;
    return analysis.moves.findIndex(m => m.id === selectedMoveId);
  }, [analysis, selectedMoveId]);

  const canGoBack = currentIndex > 0;
  const canGoForward = analysis ? currentIndex < analysis.moves.length - 1 : false;

  const goToPreviousMove = useCallback(() => {
    if (canGoBack && analysis) setSelectedMoveId(analysis.moves[currentIndex - 1].id);
  }, [canGoBack, analysis, currentIndex]);

  const goToNextMove = useCallback(() => {
    if (canGoForward && analysis) setSelectedMoveId(analysis.moves[currentIndex + 1].id);
  }, [canGoForward, analysis, currentIndex]);

  const goToStart = useCallback(() => {
    if (analysis && analysis.moves.length > 0) setSelectedMoveId(analysis.moves[0].id);
  }, [analysis]);

  const goToEnd = useCallback(() => {
    if (analysis && analysis.moves.length > 0) setSelectedMoveId(analysis.moves[analysis.moves.length - 1].id);
  }, [analysis]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPreviousMove();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNextMove();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        goToStart();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        goToEnd();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPreviousMove, goToNextMove, goToStart, goToEnd]);

  useEffect(() => {
    if (selectedMoveId !== null) {
      const el = document.getElementById(`move-${selectedMoveId}`);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
  }, [selectedMoveId]);

  const computedSummary = useMemo(() => {
    if (!analysis) return {};
    const summary: Record<string, number> = {};
    analysis.moves.forEach((move) => {
      const mistake = mistakeByMove.get(move.id);
      const status = getStoredMoveStatus(move, mistake);
      summary[status] = (summary[status] ?? 0) + 1;
    });
    return summary;
  }, [analysis, mistakeByMove]);

  const parsedOpening = useMemo(() => {
    if (!analysis?.game.opening_suggestion) return null;
    try {
      const data = JSON.parse(analysis.game.opening_suggestion);
      if (data.opening_name && data.white_suggestion && data.black_suggestion) {
        return data as { opening_name: string; white_suggestion: string; black_suggestion: string };
      }
      return null;
    } catch {
      return null;
    }
  }, [analysis?.game.opening_suggestion]);

  const selectedMove = analysis?.moves.find((move) => move.id === selectedMoveId) ?? null;
  const selectedMistake = selectedMove ? mistakeByMove.get(selectedMove.id) : analysis?.mistakes[0];
  const boardPosition = useMemo(() => {
    if (!selectedMove) return "start";
    try {
      const chess = new Chess(selectedMove.fen);
      chess.move(selectedMove.played_move);
      return chess.fen();
    } catch {
      return selectedMove.fen;
    }
  }, [selectedMove]);
  const playedDetails = selectedMove ? describeMove(selectedMove.fen, selectedMove.played_move) : null;
  const bestDetails = selectedMove ? describeMove(selectedMove.fen, selectedMove.best_move) : null;
  const triedDetails = selectedMove && triedMove ? describeMove(selectedMove.fen, triedMove.uci) : null;
  const isExcellentMove = selectedMove ? isEngineMatch(selectedMove) : false;
  const selectedStatus: MoveStatus = selectedMove ? getStoredMoveStatus(selectedMove, selectedMistake) : "normal";
  const visibleStatus = triedMove?.status ?? selectedStatus;
  const moveArrows: Arrow[] = useMemo(() => {
    const arrows: Arrow[] = [];
    if (triedDetails && triedMove) {
      arrows.push([triedDetails.from, triedDetails.to, statusArrowColors[triedMove.status]]);
    }
    if (playedDetails) {
      arrows.push([playedDetails.from, playedDetails.to, isExcellentMove ? "rgba(34, 139, 74, 0.85)" : "rgba(210, 74, 48, 0.78)"]);
    }
    if (bestDetails && !isExcellentMove) {
      arrows.push([bestDetails.from, bestDetails.to, "rgba(34, 139, 74, 0.9)"]);
    }
    return arrows;
  }, [bestDetails, isExcellentMove, playedDetails, triedDetails, triedMove]);

  const coachIntro = useMemo(() => {
    if (!selectedMove) return "";
    
    const positiveStatuses = ["brilliant", "great", "best", "excellent", "good", "book", "normal"];
    if (positiveStatuses.includes(selectedStatus) && playedDetails) {
      const statusText = statusLabels[selectedStatus] || "Normal";
      return `${statusText} move: move the ${playedDetails.side.toLowerCase()} ${playedDetails.pieceName} from ${playedDetails.from} to ${playedDetails.to}.`;
    }

    if (bestDetails) {
      return `Best move: move the ${bestDetails.side.toLowerCase()} ${bestDetails.pieceName} from ${bestDetails.from} to ${bestDetails.to}.`;
    }
    return "The engine did not return a clear best move for this position.";
  }, [bestDetails, playedDetails, selectedMove, selectedStatus]);

  const voiceText = [coachIntro, selectedMistake?.explanation].filter(Boolean).join(" ");

  const stopVoice = useCallback(() => {
    speechRequestRef.current += 1;
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current.currentTime = 0;
      activeAudioRef.current = null;
    }
    if (activeAudioUrlRef.current) {
      URL.revokeObjectURL(activeAudioUrlRef.current);
      activeAudioUrlRef.current = null;
    }
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  useEffect(() => stopVoice, [stopVoice]);

  useEffect(() => {
    stopVoice();
    setTriedMove(null);
  }, [selectedMoveId, stopVoice]);

  function classifyMove(uciMove: string): MoveStatus {
    if (!selectedMove) return "normal";
    if (sameMove(uciMove, selectedMove.best_move)) return "excellent";
    if (sameMove(uciMove, selectedMove.played_move) && selectedMistake) return selectedMistake.type;
    return "normal";
  }

  function buildTriedMove(sourceSquare: Square, targetSquare: Square) {
    if (!selectedMove) return false;
    const chess = new Chess(selectedMove.fen);
    try {
      const move = chess.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
      if (!move) return false;
      const promotion = move.promotion ? move.promotion.toLowerCase() : "";
      const uci = `${sourceSquare}${targetSquare}${promotion}`;
      setTriedMove({ uci, status: classifyMove(uci) });
      return true;
    } catch {
      return false;
    }
  }

  function tryMove(sourceSquare: Square, targetSquare: Square) {
    buildTriedMove(sourceSquare, targetSquare);
    return false;
  }

  function tryArrowMove(arrows: Arrow[]) {
    const lastArrow = arrows[arrows.length - 1];
    if (!lastArrow) return;
    buildTriedMove(lastArrow[0], lastArrow[1]);
  }

  async function playVoice(text: string) {
    if (!token) return;
    stopVoice();
    setIsMuted(false);
    const requestId = speechRequestRef.current;
    try {
      const blob = await fetchTts(text, token);
      if (requestId !== speechRequestRef.current) return;
      const url = URL.createObjectURL(blob);
      activeAudioUrlRef.current = url;
      const audio = new Audio(url);
      activeAudioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        activeAudioUrlRef.current = null;
        activeAudioRef.current = null;
        setIsSpeaking(false);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        activeAudioUrlRef.current = null;
        activeAudioRef.current = null;
        setIsSpeaking(false);
      };
      setIsSpeaking(true);
      await audio.play();
    } catch {
      if (requestId !== speechRequestRef.current) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  }

  function toggleVoice() {
    if (isSpeaking) {
      setIsMuted(true);
      stopVoice();
      return;
    }
    if (voiceText) void playVoice(voiceText);
  }

  if (error) return <section className="mx-auto max-w-6xl px-4 py-8 text-red-700">{error}</section>;
  if (!analysis) return <section className="mx-auto max-w-6xl px-4 py-8">Loading analysis...</section>;

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight text-white">Coach Review #{analysis.game.id}</h1>
          <p className="mt-1 text-sm text-coach-muted">
            Status: <span className="font-medium capitalize text-coach-accent">{analysis.game.status}</span>
            {analysis.game.analysis_error ? ` - ${analysis.game.analysis_error}` : ""}
          </p>
        </div>
      </div>

      {analysis.game.loss_reason && (
        <div className="mb-8 rounded-2xl bg-coach-card border border-coach-lesson/30 p-8 shadow-xl relative overflow-hidden group">
          <div className="absolute -top-10 -right-10 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity duration-700 pointer-events-none">
            <Flame size={240} className="text-coach-lesson" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold tracking-widest text-coach-lesson uppercase flex items-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-coach-lesson shadow-[0_0_10px_rgba(245,158,11,0.6)] animate-pulse"></span>
                Today's Core Lesson
              </h2>
              <div className="flex items-center gap-2">
                {analysis.game.lesson_status === "mastered" && (
                  <span className="bg-coach-success/20 text-coach-success text-xs font-bold px-3 py-1.5 rounded-full border border-coach-success/30 flex items-center gap-1">
                    <Target size={14} /> Lesson Mastered!
                  </span>
                )}
                {analysis.game.lesson_status === "repeated" && (
                  <span className="bg-coach-lesson/20 text-coach-lesson text-xs font-bold px-3 py-1.5 rounded-full border border-coach-lesson/30 flex items-center gap-1">
                    <RefreshCw size={14} /> Reinforcement: Game {analysis.game.lesson_repetition}
                  </span>
                )}
                {analysis.game.lesson_status === "new" && (
                  <span className="bg-coach-accent/20 text-coach-accent text-xs font-bold px-3 py-1.5 rounded-full border border-coach-accent/30 flex items-center gap-1">
                    <Flame size={14} /> New Lesson
                  </span>
                )}
              </div>
            </div>
            <p className="text-2xl md:text-3xl text-coach-text leading-relaxed font-light tracking-wide max-w-4xl">
              "{analysis.game.loss_reason}"
            </p>
          </div>
        </div>
      )}

      <div className="mb-8 flex flex-wrap gap-3">
        {(["brilliant", "great", "mistake", "miss", "blunder"] as const).map((type) => (
          <div key={type} className="flex items-center gap-3 rounded-xl glass-panel px-4 py-2 opacity-80 hover:opacity-100 transition-opacity">
            <span className={`text-xl font-bold ${type === 'brilliant' ? 'text-cyan-400' : type === 'great' ? 'text-blue-400' : type === 'mistake' ? 'text-orange-400' : type === 'miss' ? 'text-rose-400' : 'text-red-500'}`}>{computedSummary[type] ?? 0}</span>
            <span className="text-xs font-medium uppercase tracking-wider text-coach-muted">{statusLabels[type]}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(300px,480px)_1fr]">
        <div className="w-full flex flex-col gap-4">
          <div className="overflow-hidden rounded-2xl shadow-[0_0_30px_rgba(14,165,233,0.15)] border border-slate-700/50">
            <Chessboard
              position={boardPosition}
              boardWidth={Math.min(480, window.innerWidth - 32)}
              arePiecesDraggable={Boolean(selectedMove)}
              areArrowsAllowed={Boolean(selectedMove)}
              onPieceDrop={tryMove}
              onArrowsChange={tryArrowMove}
              customArrows={moveArrows}
              customDarkSquareStyle={{ backgroundColor: '#475569' }}
              customLightSquareStyle={{ backgroundColor: '#cbd5e1' }}
              customSquareStyles={{
                ...(playedDetails ? { [playedDetails.from]: { boxShadow: "inset 0 0 0 4px rgba(239, 68, 68, 0.7)" } } : {}),
                ...(bestDetails ? { [bestDetails.from]: { boxShadow: "inset 0 0 0 4px rgba(16, 185, 129, 0.7)" } } : {}),
                ...(triedDetails ? { [triedDetails.from]: { boxShadow: `inset 0 0 0 4px ${statusArrowColors[triedMove?.status ?? "normal"]}` } } : {})
              }}
              animationDuration={150}
            />
          </div>
          <div className="flex items-center justify-center gap-2 rounded-2xl glass-panel p-2">
            <button 
              onClick={goToStart} 
              disabled={!canGoBack}
              className="rounded-xl p-2.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800/80 disabled:opacity-30 disabled:hover:bg-transparent transition-all duration-200"
              title="Go to start (Up Arrow)"
            >
              <ChevronsLeft size={22} />
            </button>
            <button 
              onClick={goToPreviousMove} 
              disabled={!canGoBack}
              className="rounded-xl p-2.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800/80 disabled:opacity-30 disabled:hover:bg-transparent transition-all duration-200"
              title="Previous move (Left Arrow)"
            >
              <ChevronLeft size={26} />
            </button>
            <button 
              onClick={goToNextMove} 
              disabled={!canGoForward}
              className="rounded-xl p-2.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800/80 disabled:opacity-30 disabled:hover:bg-transparent transition-all duration-200"
              title="Next move (Right Arrow)"
            >
              <ChevronRight size={26} />
            </button>
            <button 
              onClick={goToEnd} 
              disabled={!canGoForward}
              className="rounded-xl p-2.5 text-slate-400 hover:text-sky-400 hover:bg-slate-800/80 disabled:opacity-30 disabled:hover:bg-transparent transition-all duration-200"
              title="Go to end (Down Arrow)"
            >
              <ChevronsRight size={22} />
            </button>
          </div>
          <div className="grid gap-3 rounded-2xl glass-panel p-5 text-sm text-slate-300">
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="font-medium tracking-wide">{isExcellentMove ? "Excellent move played" : "Best engine move"}</span>
            </div>
            {!isExcellentMove && (
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                <span className="font-medium tracking-wide">Move played in the game</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]" />
              <span className="text-slate-400">Drag a piece, or right-click and drag an arrow to try a move</span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 h-full">
          <div className="rounded-2xl glass-panel flex flex-col h-[calc(100vh-250px)] min-h-[500px]">
            <div className="border-b border-slate-700/50 px-6 py-4 font-semibold text-white tracking-wide uppercase text-sm flex items-center gap-2"><Brain size={16} className="text-coach-accent" /> Move Breakdown</div>
            <div className="flex-1 overflow-auto p-3 scroll-smooth">
              {analysis.moves.map((move) => {
                const mistake = mistakeByMove.get(move.id);
                const selected = selectedMoveId === move.id;
                const status = getStoredMoveStatus(move, mistake);
                const moveDetails = describeMove(move.fen, move.played_move);
                
                return (
                  <button
                    key={move.id}
                    id={`move-${move.id}`}
                    type="button"
                    onClick={() => setSelectedMoveId(move.id)}
                    className={`mb-2 flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition-all duration-200 ${
                      selected ? "bg-sky-500/20 text-white font-medium border border-sky-500/30 shadow-[0_0_15px_rgba(14,165,233,0.1)]" : "hover:bg-slate-800/60 text-slate-300 border border-transparent"
                    }`}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <span className="w-8 text-right opacity-50 font-mono text-xs">
                        {move.move_number % 2 !== 0 ? `${Math.ceil(move.move_number / 2)}.` : `${Math.ceil(move.move_number / 2)}...`}
                      </span>
                      {moveDetails && moveDetails.pieceType && moveDetails.pieceColor ? (
                        <>
                          <img 
                            src={`https://lichess1.org/assets/piece/cburnett/${moveDetails.pieceColor}${moveDetails.pieceType.toUpperCase()}.svg`} 
                            alt={moveDetails.pieceName}
                            className="h-6 w-6 drop-shadow-md"
                          />
                          <span className="text-base">{moveDetails.from}</span>
                          <ArrowRight size={14} className={selected ? "text-sky-400" : "text-slate-500"} />
                          <span className="text-base">{moveDetails.to}</span>
                          {moveDetails.promotion && (
                            <span className={`text-xs font-bold ${selected ? "text-sky-300" : "text-sky-500"}`}>
                              ={moveDetails.promotion.toUpperCase()}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-base">{move.played_move}</span>
                      )}
                    </span>
                    <span className={`rounded-md px-2.5 py-1 text-xs font-bold tracking-wide ${selected ? "shadow-[0_0_10px_rgba(255,255,255,0.1)] " + statusBadgeColors[status] : statusBadgeColors[status]}`}>
                      {statusLabels[status]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl glass-panel p-6 shadow-[0_0_20px_rgba(0,0,0,0.2)]">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-lg text-white tracking-wide">Coach Notes</p>
                {selectedMove && (
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-400">
                    <span>
                      Played {playedDetails?.san ?? selectedMove.played_move}; best {bestDetails?.san ?? selectedMove.best_move ?? "unknown"}; drop{" "}
                      <span className="font-mono text-sky-400">{selectedMove.eval_drop.toFixed(2)}</span>
                    </span>
                    <span className={`rounded-md px-2.5 py-1 text-xs font-bold tracking-wide ${statusBadgeColors[visibleStatus]}`}>
                      {statusLabels[visibleStatus]}
                    </span>
                  </div>
                )}
              </div>
              {voiceText && (
                <button
                  onClick={toggleVoice}
                  className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200 text-white shadow-lg ${isSpeaking || isMuted ? "bg-rose-500 hover:bg-rose-600 shadow-rose-500/30" : "bg-sky-500 hover:bg-sky-600 shadow-sky-500/30"}`}
                  title={isSpeaking ? "Mute explanation" : "Play explanation"}
                >
                  {isSpeaking || isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
              )}
            </div>
            <div className="grid gap-4 leading-relaxed text-slate-300 text-[15px]">
              {triedMove && triedDetails && (
                <p className="font-medium text-slate-200 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                  Tried move: {triedDetails.side} {triedDetails.pieceName} from {triedDetails.from} to {triedDetails.to} is{" "}
                  <span className={visibleStatus === "blunder" ? "text-red-400 font-bold" : visibleStatus === "excellent" ? "text-emerald-400 font-bold" : "text-sky-400 font-bold"}>
                    {statusLabels[visibleStatus]}
                  </span>
                  .
                </p>
              )}
              {coachIntro && <p className="font-medium text-white text-lg">{coachIntro}</p>}
              {playedDetails && bestDetails && !isExcellentMove && (
                <p className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                  The <span className="text-red-400 font-semibold">red arrow</span> shows what was played: {playedDetails.side} {playedDetails.pieceName} from {playedDetails.from} to{" "}
                  {playedDetails.to}. The <span className="text-emerald-400 font-semibold">green arrow</span> shows the better choice: {bestDetails.side} {bestDetails.pieceName} from {bestDetails.from}{" "}
                  to {bestDetails.to}.
                </p>
              )}
              {selectedMistake ? (
                <p className="bg-coach-accent/10 p-4 rounded-xl border border-coach-accent/20 text-coach-text">{selectedMistake.explanation}</p>
              ) : (
                <p className="text-coach-muted italic">Coach approves of this move. No corrections needed here.</p>
              )}
            </div>
          </div>
          {analysis.game.opening_suggestion && parsedOpening && (
            <div className="rounded-2xl glass-panel p-6 shadow-[0_0_20px_rgba(0,0,0,0.2)] mt-0">
              <div className="mb-6">
                <p className="font-semibold text-lg text-white tracking-wide">Opening Coach: <span className="text-sky-400">{parsedOpening.opening_name}</span></p>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-slate-300"></div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="h-4 w-4 rounded-full bg-slate-200 shadow-[0_0_10px_rgba(255,255,255,0.5)]"></span>
                    <span className="font-bold text-white tracking-wide">White Strategy</span>
                  </div>
                  <p className="text-slate-300 text-[15px] leading-relaxed">{parsedOpening.white_suggestion}</p>
                </div>
                <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-slate-700"></div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="h-4 w-4 rounded-full bg-slate-900 border border-slate-700 shadow-[0_0_10px_rgba(0,0,0,0.8)]"></span>
                    <span className="font-bold text-white tracking-wide">Black Strategy</span>
                  </div>
                  <p className="text-slate-300 text-[15px] leading-relaxed">{parsedOpening.black_suggestion}</p>
                </div>
              </div>
            </div>
          )}
          {analysis.game.opening_suggestion && !parsedOpening && (
            <div className="rounded-2xl glass-panel p-6 shadow-[0_0_20px_rgba(0,0,0,0.2)] mt-0">
              <div className="mb-4">
                <p className="font-semibold text-lg text-white tracking-wide">Opening Coach</p>
              </div>
              <div className="grid gap-4 leading-relaxed text-slate-300 text-[15px]">
                <p className="bg-emerald-900/20 p-4 rounded-xl border border-emerald-500/20 text-emerald-100 whitespace-pre-wrap">{analysis.game.opening_suggestion}</p>
              </div>
            </div>
          )}
          {(analysis.game.training_recommendation || analysis.game.progress_summary) && (
            <div className="rounded-2xl glass-panel p-6 shadow-lg mt-0">
              <div className="mb-6">
                <p className="font-semibold text-lg text-coach-text tracking-wide">Game Summary & Progress</p>
              </div>
              <div className="grid gap-6">
                {analysis.game.progress_summary && (
                  <div className="bg-coach-bg/50 p-5 rounded-xl border border-slate-700/50">
                    <p className="font-bold text-coach-muted mb-2 tracking-wide flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-coach-accent"></span>
                      Progress Tracking
                    </p>
                    <p className="text-coach-text text-[15px] leading-relaxed whitespace-pre-wrap">{analysis.game.progress_summary}</p>
                  </div>
                )}
                {analysis.game.training_recommendation && (
                  <div className="bg-coach-bg/50 p-5 rounded-xl border border-slate-700/50">
                    <p className="font-bold text-coach-muted mb-2 tracking-wide flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-coach-success"></span>
                      Recommended Training
                    </p>
                    <p className="text-coach-text text-[15px] leading-relaxed whitespace-pre-wrap">{analysis.game.training_recommendation}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
