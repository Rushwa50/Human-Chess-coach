import subprocess

import chess

from app.config import get_settings

MATE_SCORE = 10000


class StockfishUnavailable(RuntimeError):
    pass


def _require_stockfish_path() -> str:
    settings = get_settings()
    if not settings.stockfish_path:
        raise StockfishUnavailable("STOCKFISH_PATH is not configured.")
    return settings.stockfish_path


def _go_command() -> str:
    settings = get_settings()
    if settings.stockfish_time_limit > 0:
        return f"go movetime {int(settings.stockfish_time_limit * 1000)}"
    return f"go depth {settings.stockfish_depth}"


class StockfishSession:
    def __enter__(self) -> "StockfishSession":
        self.settings = get_settings()
        self.process = subprocess.Popen(
            [_require_stockfish_path()],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
        )
        self._send("uci")
        self._read_until("uciok")
        self._configure_engine()
        self._send("isready")
        self._read_until("readyok")
        self._send("ucinewgame")
        self._send("isready")
        self._read_until("readyok")
        return self

    def __exit__(self, exc_type, exc, traceback) -> None:
        if self.process.poll() is None:
            self._send("quit")
            self.process.terminate()

    def _send(self, command: str) -> None:
        if not self.process.stdin:
            raise RuntimeError("Stockfish stdin is unavailable.")
        self.process.stdin.write(command + "\n")
        self.process.stdin.flush()

    def _read_until(self, token: str) -> list[str]:
        if not self.process.stdout:
            raise RuntimeError("Stockfish stdout is unavailable.")
        lines: list[str] = []
        while True:
            line = self.process.stdout.readline()
            if line == "":
                raise RuntimeError("Stockfish stopped unexpectedly.")
            line = line.strip()
            lines.append(line)
            if line.startswith(token):
                return lines

    def _configure_engine(self) -> None:
        self._send(f"setoption name Threads value {self.settings.stockfish_threads}")
        self._send(f"setoption name Hash value {self.settings.stockfish_hash_mb}")
        self._send("setoption name MultiPV value 1")
        self._send("setoption name UCI_AnalyseMode value true")

    def _analyse(self, board: chess.Board) -> tuple[str | None, float]:
        if self.settings.stockfish_clear_hash_each_position:
            self._send("setoption name Clear Hash")
            self._send("isready")
            self._read_until("readyok")
        self._send(f"position fen {board.fen()}")
        self._send(_go_command())
        best_move: str | None = None
        score_cp = 0
        for line in self._read_until("bestmove"):
            parts = line.split()
            if line.startswith("bestmove") and len(parts) >= 2:
                best_move = parts[1]
            if "score" in parts:
                score_index = parts.index("score")
                if score_index + 2 < len(parts):
                    score_type = parts[score_index + 1]
                    raw_score = int(parts[score_index + 2])
                    if score_type == "cp":
                        score_cp = raw_score
                    elif score_type == "mate":
                        score_cp = MATE_SCORE if raw_score > 0 else -MATE_SCORE
        return best_move, score_cp / 100

    def analyze_position(self, board: chess.Board) -> tuple[str | None, float]:
        return self._analyse(board)

    def evaluate_position(self, board: chess.Board) -> float:
        return self._analyse(board)[1]


def analyze_position(board: chess.Board) -> tuple[str | None, float]:
    with StockfishSession() as engine:
        return engine.analyze_position(board)


def evaluate_position(board: chess.Board) -> float:
    with StockfishSession() as engine:
        return engine.evaluate_position(board)
