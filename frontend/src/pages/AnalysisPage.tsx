import { Chess } from "chess.js";
import { RefreshCw, Volume2, VolumeX } from "lucide-react";
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

type MoveStatus = "excellent" | "normal" | "inaccuracy" | "mistake" | "blunder";

const statusLabels: Record<MoveStatus, string> = {
  excellent: "Excellent",
  normal: "Normal",
  inaccuracy: "Inaccuracy",
  mistake: "Mistake",
  blunder: "Blunder"
};

const statusBadgeColors: Record<MoveStatus, string> = {
  excellent: "bg-moss/15 text-green-800",
  normal: "bg-blue-100 text-blue-800",
  inaccuracy: "bg-yellow-100 text-yellow-800",
  mistake: "bg-orange-100 text-orange-800",
  blunder: "bg-red-100 text-red-800"
};

const statusArrowColors: Record<MoveStatus, string> = {
  excellent: "rgba(34, 139, 74, 0.9)",
  normal: "rgba(37, 99, 235, 0.85)",
  inaccuracy: "rgba(217, 119, 6, 0.85)",
  mistake: "rgba(234, 88, 12, 0.85)",
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
    return { ...squares, pieceName, side, san: san ?? uciMove };
  } catch {
    return { ...squares, pieceName, side, san: uciMove ?? "" };
  }
}

function isEngineMatch(move: Move) {
  return Boolean(move.best_move && move.played_move.slice(0, 4) === move.best_move.slice(0, 4));
}

function sameMove(first: string | null | undefined, second: string | null | undefined) {
  return Boolean(first && second && first.slice(0, 4) === second.slice(0, 4));
}

function getStoredMoveStatus(move: Move, mistake?: Mistake): MoveStatus {
  if (mistake) return mistake.type;
  if (isEngineMatch(move)) return "excellent";
  return "normal";
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

  const selectedMove = analysis?.moves.find((move) => move.id === selectedMoveId) ?? null;
  const selectedMistake = selectedMove ? mistakeByMove.get(selectedMove.id) : analysis?.mistakes[0];
  const boardPosition = selectedMove?.fen ?? "start";
  const playedDetails = selectedMove ? describeMove(selectedMove.fen, selectedMove.played_move) : null;
  const bestDetails = selectedMove ? describeMove(selectedMove.fen, selectedMove.best_move) : null;
  const triedDetails = selectedMove && triedMove ? describeMove(selectedMove.fen, triedMove.uci) : null;
  const isExcellentMove = selectedMove ? isEngineMatch(selectedMove) : false;
  const selectedStatus: MoveStatus = selectedMistake?.type ?? (isExcellentMove ? "excellent" : "normal");
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
    if (isExcellentMove && playedDetails) {
      return `Excellent move: move the ${playedDetails.side.toLowerCase()} ${playedDetails.pieceName} from ${playedDetails.from} to ${playedDetails.to}.`;
    }
    if (bestDetails) {
      return `Best move: move the ${bestDetails.side.toLowerCase()} ${bestDetails.pieceName} from ${bestDetails.from} to ${bestDetails.to}.`;
    }
    return "The engine did not return a clear best move for this position.";
  }, [bestDetails, isExcellentMove, playedDetails, selectedMove]);

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
        <button onClick={load} className="inline-flex items-center gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm">
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-3">
        {(["inaccuracy", "mistake", "blunder"] as const).map((type) => (
          <div key={type} className="rounded-lg border border-black/10 bg-white p-4">
            <p className="text-2xl font-semibold">{analysis.summary[type] ?? 0}</p>
            <p className="text-sm capitalize text-black/60">{type}</p>
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
                return (
                  <button
                    key={move.id}
                    type="button"
                    onClick={() => setSelectedMoveId(move.id)}
                    className={`mb-1 flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm ${
                      selected ? "bg-ink text-white" : "hover:bg-field"
                    }`}
                  >
                    <span>
                      {move.move_number}. {move.played_move}
                    </span>
                    <span className={`rounded px-2 py-0.5 text-xs ${selected ? "bg-white/20 text-white" : statusBadgeColors[status]}`}>
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
