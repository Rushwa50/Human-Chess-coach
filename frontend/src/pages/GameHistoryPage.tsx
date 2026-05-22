import { Calendar, History } from "lucide-react";

export default function GameHistoryPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 animate-fade-in">
      <div className="mb-8 flex items-center gap-4 border-b border-slate-800 pb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/50 text-slate-300">
          <History size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Game History</h1>
          <p className="text-slate-400">Review your past games and coaching lessons</p>
        </div>
      </div>

      {/* Empty State */}
      <div className="flex flex-col items-center justify-center py-20 text-center glass-panel rounded-2xl border-dashed border-slate-700">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/50 text-slate-500">
          <Calendar size={32} />
        </div>
        <h3 className="mb-2 text-xl font-semibold text-white">No games analyzed yet</h3>
        <p className="max-w-sm text-slate-400">
          Upload your first PGN to start building your game history and unlocking personalized coaching insights.
        </p>
      </div>
    </div>
  );
}
