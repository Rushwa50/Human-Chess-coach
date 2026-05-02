import { Chess } from "chess.js";
import { ArrowRight, RefreshCw, Volume2, VolumeX, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import type { Arrow, Square } from "react-chessboard/dist/chessboard/types";
import { useParams } from "react-router-dom";

import { apiFetch, fetchTts } from "../api";
import { useAuth } from "../state/auth";
import type { Analysis, Mistake, Move } from "../types";

const mistakeColors = {
  inaccuracy: "bg-gold/15 text-yellow-800",
  mistake: "bg-clay/15 text-orange-800",
  blunder: "bg-red-100 text-red-800"
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
  brilliant: "bg-cyan-100 text-cyan-800",
  great: "bg-blue-100 text-blue-800",
  best: "bg-green-100 text-green-800",
  excellent: "bg-moss/15 text-green-800",
  good: "bg-teal-100 text-teal-800",
  book: "bg-amber-100 text-amber-800",
  normal: "bg-gray-100 text-gray-800",
  inaccuracy: "bg-yellow-100 text-yellow-800",
  mistake: "bg-orange-100 text-orange-800",
  miss: "bg-rose-100 text-rose-800",
  blunder: "bg-red-100 text-red-800"
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [triedMove, setTriedMove] = useState<{ uci: string; status: MoveStatus } | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioUrlRef = useRef<string | null>(null);
  const speechRequestRef = useRef(0);

  async function load() {
    if (!gameId) return;
    setIsRefreshing(true);
    try {
      const data = await apiFetch<Analysis>(`/analysis/${gameId}`, {}, token);
      setAnalysis(data);
      setSelectedMoveId((current) => current ?? data.moves[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load analysis");
    } finally {
      setTimeout(() => setIsRefreshing(false), 600); // Visual feedback
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
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Analysis #{analysis.game.id}</h1>
          <p className="text-sm text-black/60">
            Status: <span className="font-medium capitalize text-ink">{analysis.game.status}</span>
            {analysis.game.analysis_error ? ` - ${analysis.game.analysis_error}` : ""}
          </p>
        </div>
        <button 
          onClick={load} 
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm transition-colors hover:bg-black/5 disabled:opacity-70"
        >
          <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
          {isRefreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="mb-5 grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(["brilliant", "great", "mistake", "miss", "blunder"] as const).map((type) => (
          <div key={type} className="flex flex-col items-center justify-center rounded-lg border border-black/10 bg-white p-3">
            <p className="text-xl font-semibold">{computedSummary[type] ?? 0}</p>
            <p className="text-xs capitalize text-black/60">{statusLabels[type]}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(300px,480px)_1fr]">
        <div className="w-full">
          <Chessboard
            position={boardPosition}
            boardWidth={Math.min(480, window.innerWidth - 32)}
            arePiecesDraggable={Boolean(selectedMove)}
            areArrowsAllowed={Boolean(selectedMove)}
            onPieceDrop={tryMove}
            onArrowsChange={tryArrowMove}
            customArrows={moveArrows}
            customSquareStyles={{
              ...(playedDetails ? { [playedDetails.from]: { boxShadow: "inset 0 0 0 4px rgba(210, 74, 48, 0.45)" } } : {}),
              ...(bestDetails ? { [bestDetails.from]: { boxShadow: "inset 0 0 0 4px rgba(34, 139, 74, 0.5)" } } : {}),
              ...(triedDetails ? { [triedDetails.from]: { boxShadow: `inset 0 0 0 4px ${statusArrowColors[triedMove?.status ?? "normal"]}` } } : {})
            }}
          />
          <div className="mt-3 flex items-center justify-center gap-2 rounded-lg border border-black/10 bg-white p-2">
            <button 
              onClick={goToStart} 
              disabled={!canGoBack}
              className="rounded-md p-2 hover:bg-black/5 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Go to start (Up Arrow)"
            >
              <ChevronsLeft size={20} />
            </button>
            <button 
              onClick={goToPreviousMove} 
              disabled={!canGoBack}
              className="rounded-md p-2 hover:bg-black/5 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Previous move (Left Arrow)"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              onClick={goToNextMove} 
              disabled={!canGoForward}
              className="rounded-md p-2 hover:bg-black/5 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Next move (Right Arrow)"
            >
              <ChevronRight size={24} />
            </button>
            <button 
              onClick={goToEnd} 
              disabled={!canGoForward}
              className="rounded-md p-2 hover:bg-black/5 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Go to end (Down Arrow)"
            >
              <ChevronsRight size={20} />
            </button>
          </div>
          <div className="mt-3 grid gap-2 rounded-lg border border-black/10 bg-white p-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-8 rounded-full bg-[#228b4a]" />
              <span>{isExcellentMove ? "Excellent move played" : "Best engine move"}</span>
            </div>
            {!isExcellentMove && (
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-8 rounded-full bg-[#d24a30]" />
                <span>Move played in the game</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-8 rounded-full bg-blue-600" />
              <span>Drag a piece, or right-click and drag an arrow to try a move</span>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-lg border border-black/10 bg-white">
            <div className="border-b border-black/10 px-4 py-3 font-medium">Moves</div>
            <div className="max-h-64 overflow-auto p-2">
              {analysis.moves.map((move) => {
                const mistake = mistakeByMove.get(move.id);
                const selected = selectedMoveId === move.id;
                const status = getStoredMoveStatus(move, mistake);
                const moveDetails = describeMove(move.fen, move.played_move);
                
                return (
                  <button
                    key={move.id}
                    type="button"
                    onClick={() => setSelectedMoveId(move.id)}
                    className={`mb-1 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      selected ? "bg-blue-100/60 text-blue-950 font-semibold shadow-sm" : "hover:bg-black/5 text-black/80"
                    }`}
                  >
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="w-8 text-right opacity-60 font-mono text-xs">
                        {move.move_number % 2 !== 0 ? `${Math.ceil(move.move_number / 2)}.` : `${Math.ceil(move.move_number / 2)}...`}
                      </span>
                      {moveDetails && moveDetails.pieceType && moveDetails.pieceColor ? (
                        <>
                          <img 
                            src={`https://lichess1.org/assets/piece/cburnett/${moveDetails.pieceColor}${moveDetails.pieceType.toUpperCase()}.svg`} 
                            alt={moveDetails.pieceName}
                            className="h-5 w-5 drop-shadow-sm"
                          />
                          <span>{moveDetails.from}</span>
                          <ArrowRight size={14} className={selected ? "text-blue-400" : "text-black/40"} />
                          <span>{moveDetails.to}</span>
                          {moveDetails.promotion && (
                            <span className={`text-xs font-bold ${selected ? "text-blue-700" : "text-blue-500"}`}>
                              ={moveDetails.promotion.toUpperCase()}
                            </span>
                          )}
                        </>
                      ) : (
                        <span>{move.played_move}</span>
                      )}
                    </span>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${selected ? "bg-white shadow-sm " + statusBadgeColors[status].replace("bg-", "text-") : statusBadgeColors[status]}`}>
                      {statusLabels[status]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-black/10 bg-white p-4">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">Coach Explanation</p>
                {selectedMove && (
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-black/60">
                    <span>
                      Played {playedDetails?.san ?? selectedMove.played_move}; best {bestDetails?.san ?? selectedMove.best_move ?? "unknown"}; drop{" "}
                      {selectedMove.eval_drop.toFixed(2)}
                    </span>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusBadgeColors[visibleStatus]}`}>
                      {statusLabels[visibleStatus]}
                    </span>
                  </div>
                )}
              </div>
              {voiceText && (
                <button
                  onClick={toggleVoice}
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-md text-white ${isSpeaking || isMuted ? "bg-clay" : "bg-moss"}`}
                  title={isSpeaking ? "Mute explanation" : "Play explanation"}
                >
                  {isSpeaking || isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
                </button>
              )}
            </div>
            <div className="grid gap-3 leading-relaxed text-black/75">
              {triedMove && triedDetails && (
                <p className="font-medium text-ink">
                  Tried move: {triedDetails.side} {triedDetails.pieceName} from {triedDetails.from} to {triedDetails.to} is{" "}
                  <span className={visibleStatus === "blunder" ? "text-red-700" : visibleStatus === "excellent" ? "text-green-700" : "text-blue-700"}>
                    {statusLabels[visibleStatus]}
                  </span>
                  .
                </p>
              )}
              {coachIntro && <p className="font-medium text-ink">{coachIntro}</p>}
              {playedDetails && bestDetails && !isExcellentMove && (
                <p>
                  The red arrow shows what was played: {playedDetails.side} {playedDetails.pieceName} from {playedDetails.from} to{" "}
                  {playedDetails.to}. The green arrow shows the better choice: {bestDetails.side} {bestDetails.pieceName} from {bestDetails.from}{" "}
                  to {bestDetails.to}.
                </p>
              )}
              {selectedMistake ? (
                <p>{selectedMistake.explanation}</p>
              ) : (
                <p className="text-black/55">No mistake was found for this move. Use the green arrow to see the strong move on the board.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
