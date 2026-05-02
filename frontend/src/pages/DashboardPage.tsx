import { Activity, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { apiFetch } from "../api";
import { useAuth } from "../state/auth";
import type { Game } from "../types";

const statusIcon = {
  uploaded: Clock,
  queued: Clock,
  analyzing: Activity,
  analyzed: CheckCircle2,
  failed: AlertTriangle
};

export default function DashboardPage() {
  const { token } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<Game[]>("/games", {}, token).then(setGames).catch((err) => setError(err.message));
  }, [token]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Game History</h1>
          <p className="text-sm text-black/60">Uploaded PGNs, cached analysis, and training-ready records.</p>
        </div>
        <Link to="/upload" className="rounded-md bg-moss px-4 py-2 text-sm font-medium text-white">
          Analyze a Game
        </Link>
      </div>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="overflow-hidden rounded-lg border border-black/10 bg-white">
        {games.length === 0 ? (
          <div className="px-6 py-12 text-center text-black/60">No games yet.</div>
        ) : (
          games.map((game) => {
            const Icon = statusIcon[game.status] ?? Clock;
            return (
              <Link
                key={game.id}
                to={`/analysis/${game.id}`}
                className="flex items-center justify-between gap-4 border-b border-black/10 px-4 py-4 last:border-b-0 hover:bg-field"
              >
                <div>
                  <p className="font-medium">Game #{game.id}</p>
                  <p className="text-sm text-black/55">{new Date(game.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2 rounded-md bg-field px-3 py-1 text-sm capitalize">
                  <Icon size={15} />
                  {game.status}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </section>
  );
}
