import { Brain, LineChart, Target, Zap } from "lucide-react";

export default function InsightsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 animate-fade-in">
      <div className="mb-8 flex items-center gap-4 border-b border-slate-800 pb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
          <Brain size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Coach Insights</h1>
          <p className="text-slate-400">Your psychological profile and learning journey</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Target className="text-sky-400" size={20} />
            <h3 className="font-semibold text-white">Player Archetype</h3>
          </div>
          <p className="text-3xl font-bold text-white mb-2">Analyzing...</p>
          <p className="text-sm text-slate-400">Play more games to reveal your true style.</p>
        </div>

        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="text-lesson-highlight" size={20} />
            <h3 className="font-semibold text-white">Recurring Issues</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-4 opacity-50">
            <p className="text-sm text-slate-400">No patterns detected yet.</p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <LineChart className="text-emerald-400" size={20} />
            <h3 className="font-semibold text-white">Improvement Trends</h3>
          </div>
          <div className="h-48 w-full border border-dashed border-slate-700 rounded-xl flex items-center justify-center bg-slate-900/50">
            <p className="text-slate-500 text-sm">Not enough data to graph improvement.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
