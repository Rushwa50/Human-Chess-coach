import { Activity, AlertTriangle, BrainCircuit, CheckCircle2, Clock, Flame, Fingerprint, RefreshCw, Scale, Shield, Sword, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { apiFetch } from "../api";
import { useAuth } from "../state/auth";
import type { Game, PlayerProfile } from "../types";
import OnboardingModal from "../components/OnboardingModal";
import LoadingSpinner from "../components/LoadingSpinner";

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
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const fetchedGames = await apiFetch<Game[]>("/games", {}, token);
        setGames(fetchedGames);
        if (fetchedGames.length === 0) {
          setShowOnboarding(true);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load games");
      }
      
      try {
        const fetchedProfile = await apiFetch<PlayerProfile>("/profile", {}, token);
        setProfile(fetchedProfile);
      } catch (err) {
        // Ignore profile fetch error if it doesn't exist yet
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const handleReanalyze = async (e: React.MouseEvent, gameId: number) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await apiFetch(`/games/analyze/${gameId}`, { method: "POST" }, token);
      const updatedGames = await apiFetch<Game[]>("/games", {}, token);
      setGames(updatedGames);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to re-analyze");
    }
  };

  if (isLoading) return <LoadingSpinner fullScreen />;

  return (
    <div className="animate-fade-in max-w-5xl mx-auto space-y-12">
      {showOnboarding && <OnboardingModal onClose={() => setShowOnboarding(false)} />}
      
      {error && <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-400">{error}</p>}

      {/* Hero Core Lesson - HIGHEST HIERARCHY */}
      <section className="relative">
        {/* Glow effect strictly behind the card */}
        <div className="absolute inset-0 z-0 flex justify-center opacity-30 pointer-events-none">
          <div className="h-[200px] w-[80%] rounded-full bg-coach-lesson blur-[80px]" />
        </div>
        
        <div className="relative z-10 rounded-2xl bg-coach-card border border-coach-lesson/40 p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 shadow-[0_10px_40px_rgba(245,158,11,0.15)] text-center md:text-left transition-transform duration-500 hover:-translate-y-1">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-coach-lesson/20 text-coach-lesson shadow-inner">
            <BrainCircuit size={40} />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold tracking-widest text-coach-lesson uppercase mb-3 flex items-center justify-center md:justify-start gap-2">
              <span className="h-2 w-2 rounded-full bg-coach-lesson animate-pulse"></span>
              Today's Core Lesson
            </h2>
            {games.length > 0 ? (
               <h3 className="text-2xl md:text-3xl font-display font-semibold text-white mb-3">Watch your King Safety before initiating attacks</h3>
            ) : (
               <h3 className="text-2xl md:text-3xl font-display font-semibold text-white mb-3">Upload a game to get your first Core Lesson</h3>
            )}
            <p className="text-coach-muted text-base md:text-lg max-w-2xl leading-relaxed">
              {games.length > 0 ? "You've been consistently launching attacks on the flank while your king is exposed in the center. We'll focus on securing the king first today." : "The AI Coach will analyze your mistakes and distill them into a single, high-impact lesson."}
            </p>
          </div>
          <div className="shrink-0 flex flex-col items-center gap-3">
             <Link to={games.length > 0 ? `/analysis/${games[0].id}` : "/upload"} className="rounded-xl bg-coach-lesson px-8 py-4 font-semibold text-amber-950 hover:bg-amber-400 transition-colors shadow-lg shadow-coach-lesson/20 hover-lift">
               {games.length > 0 ? "Review Lesson" : "Upload Game"}
             </Link>
             {games.length > 0 && (
               <span className="text-xs font-semibold text-coach-success uppercase tracking-wider">Active Focus</span>
             )}
          </div>
        </div>
      </section>

      {/* Emotional Feedback Mock (Subtle) */}
      {games.length > 0 && (
        <p className="text-center text-sm font-medium text-coach-accent bg-coach-accent/10 py-3 rounded-lg border border-coach-accent/20 mx-auto max-w-2xl">
          "You handled pressure much better in your last game. Keep that composure." — Coach
        </p>
      )}

      {/* Secondary Sections Grid */}
      <div className="grid md:grid-cols-3 gap-8">
        
        {/* Profile / Archetype (Subdued) */}
        <section className="md:col-span-1 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-semibold tracking-tight text-white">Player Archetype</h2>
            <Link to="/insights" className="text-xs font-medium text-coach-accent hover:text-sky-300">View Full</Link>
          </div>
          
          <div className="rounded-2xl glass-panel p-6 flex flex-col gap-6 flex-1">
            {profile ? (
              <>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-slate-300">
                    {profile.primary_style.includes('Attacking') ? <Sword size={24} /> : 
                     profile.primary_style.includes('Defensive') ? <Shield size={24} /> : 
                     profile.primary_style === 'Unknown' ? <Fingerprint size={24} /> :
                     <Scale size={24} />}
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white tracking-wide">
                      {profile.primary_style}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-auto">
                  {profile.traits.slice(0,4).map((trait, idx) => (
                    <div key={idx} className="bg-coach-bg/50 rounded-lg p-2.5 text-center">
                       <span className="block text-[10px] font-semibold text-coach-muted uppercase tracking-wider mb-1">{trait.name}</span>
                       <span className="block text-sm font-bold text-slate-200">{trait.score_label}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
               <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                 <Fingerprint size={24} className="text-coach-muted mb-2 opacity-50" />
                 <p className="text-sm text-coach-muted">Play more games to reveal your style.</p>
               </div>
            )}
          </div>
        </section>

        {/* Recent Games */}
        <section className="md:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-semibold tracking-tight text-white">Recent Coach Reviews</h2>
            <Link to="/history" className="text-xs font-medium text-coach-accent hover:text-sky-300">View All</Link>
          </div>
          
          <div className="rounded-2xl glass-panel overflow-hidden flex-1 flex flex-col">
            {games.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                 <Clock size={32} className="text-coach-muted mb-4 opacity-50" />
                 <p className="text-sm text-coach-muted">No reviews yet. Your journey starts here.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {games.slice(0, 4).map((game) => {
                  const Icon = statusIcon[game.status] ?? Clock;
                  const statusColor = game.status === 'analyzed' ? 'text-coach-success' : 'text-coach-muted';
                                    
                  return (
                    <Link
                      key={game.id}
                      to={`/analysis/${game.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-800/40 transition-colors group"
                    >
                      <div>
                        <p className="font-semibold text-slate-200 group-hover:text-coach-accent transition-colors text-sm">Game #{game.id}</p>
                        <p className="text-xs text-coach-muted mt-0.5">{new Date(game.created_at).toLocaleString(undefined, { dateStyle: 'medium' })}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1.5 text-xs font-semibold capitalize ${statusColor}`}>
                          <Icon size={14} />
                          {game.status}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
