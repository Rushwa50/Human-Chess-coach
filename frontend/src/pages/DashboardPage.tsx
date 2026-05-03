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
    <section className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Game History</h1>
          <p className="text-sm text-slate-400">Uploaded PGNs, cached analysis, and training-ready records.</p>
        </div>
        <Link to="/upload" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition-all duration-300 hover:scale-105 hover:shadow-sky-500/40">
          Analyze New Game
        </Link>
      </div>
      {error && <p className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-400">{error}</p>}
      
      <div className="overflow-hidden rounded-2xl glass-panel shadow-[0_0_30px_rgba(14,165,233,0.05)]">
        {games.length === 0 ? (
          <div className="px-6 py-16 text-center text-slate-400 font-medium">No games yet. Start by uploading your first PGN!</div>
        ) : (
          games.map((game) => {
            const Icon = statusIcon[game.status] ?? Clock;
            const statusColor = game.status === 'analyzed' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' 
                              : game.status === 'failed' ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                              : 'text-sky-400 bg-sky-500/10 border border-sky-500/20';
                              
            return (
              <Link
                key={game.id}
                to={`/analysis/${game.id}`}
                className="flex items-center justify-between gap-4 border-b border-slate-700/50 px-6 py-5 last:border-b-0 hover:bg-slate-800/60 transition-colors duration-200 group"
              >
                <div>
                  <p className="font-semibold text-slate-200 group-hover:text-sky-400 transition-colors duration-200 text-lg">Game #{game.id}</p>
                  <p className="text-sm text-slate-500 mt-1">{new Date(game.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
                <div className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-semibold capitalize tracking-wide shadow-inner ${statusColor}`}>
                  <Icon size={16} />
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
