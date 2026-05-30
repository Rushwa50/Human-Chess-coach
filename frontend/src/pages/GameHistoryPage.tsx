import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, History, ArrowRight, Loader2, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useAuth } from "../state/auth";
import { apiFetch } from "../api";
import type { Game } from "../types";

export default function GameHistoryPage() {
  const { token } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        setIsLoading(true);
        const data = await apiFetch<Game[]>("/games", {}, token);
        setGames(data);
      } catch (err: any) {
        setError(err.message || "Failed to load game history.");
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchGames();
    }
  }, [token]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusConfig = (status: Game['status']) => {
    switch (status) {
      case "analyzed":
        return { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10", text: "Analyzed" };
      case "queued":
      case "analyzing":
        return { icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10", text: "Analyzing" };
      case "failed":
        return { icon: AlertTriangle, color: "text-rose-400", bg: "bg-rose-400/10", text: "Failed" };
      default:
        return { icon: Clock, color: "text-slate-400", bg: "bg-slate-800", text: "Unknown" };
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 animate-fade-in">
      <div className="mb-8 flex items-center gap-4 border-b border-coach-border pb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-coach-accent/10 text-coach-accent">
          <History size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Game History</h1>
          <p className="text-coach-muted">Review your past games and coaching lessons</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-coach-accent mb-4" />
          <p className="text-coach-muted">Loading your games...</p>
        </div>
      ) : error ? (
        <div className="glass-panel rounded-2xl p-6 text-center border border-rose-500/20">
          <AlertTriangle className="mx-auto h-12 w-12 text-rose-400 mb-4" />
          <h3 className="mb-2 text-xl font-semibold text-white">Oops, something went wrong</h3>
          <p className="text-rose-400">{error}</p>
        </div>
      ) : games.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center glass-panel rounded-2xl border-dashed border-coach-border">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-coach-bg text-coach-muted">
            <Calendar size={32} />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-white">No games analyzed yet</h3>
          <p className="max-w-sm text-coach-muted mb-6">
            Upload your first PGN to start building your game history and unlocking personalized coaching insights.
          </p>
          <Link to="/upload" className="btn-primary">
            Upload a Game
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => {
            const statusConfig = getStatusConfig(game.status);
            const StatusIcon = statusConfig.icon;
            
            return (
              <Link 
                key={game.id} 
                to={`/analysis/${game.id}`}
                className="group flex flex-col justify-between glass-panel rounded-2xl p-5 border border-coach-border hover:border-coach-accent/50 hover:shadow-lg hover:shadow-coach-accent/10 transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-coach-accent/5 blur-[50px] -mr-16 -mt-16 rounded-full"></div>
                
                <div>
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <span className="text-sm font-medium text-coach-muted">
                      {formatDate(game.created_at)}
                    </span>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.color}`}>
                      <StatusIcon size={12} />
                      {statusConfig.text}
                    </div>
                  </div>
                  
                  {game.status === 'analyzed' && game.loss_reason ? (
                    <div className="mb-4 relative z-10">
                      <h4 className="text-sm font-semibold text-white mb-1">Key Insight</h4>
                      <p className="text-sm text-coach-muted line-clamp-3 leading-relaxed">
                        {game.loss_reason}
                      </p>
                    </div>
                  ) : game.status === 'analyzed' ? (
                     <div className="mb-4 relative z-10">
                      <h4 className="text-sm font-semibold text-white mb-1">Lesson Available</h4>
                      <p className="text-sm text-coach-muted">
                        Review your mistakes and discover your core lesson.
                      </p>
                    </div>
                  ) : (
                     <div className="mb-4 relative z-10">
                      <h4 className="text-sm font-semibold text-white mb-1">Processing</h4>
                      <p className="text-sm text-coach-muted">
                        The AI coach is currently analyzing this game...
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2 text-sm font-medium text-coach-accent group-hover:translate-x-1 transition-transform relative z-10 mt-4">
                  View Analysis <ArrowRight size={16} />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  );
}
