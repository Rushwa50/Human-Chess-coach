import { BrainCircuit, Play, Upload, X } from "lucide-react";
import { Link } from "react-router-dom";

export default function OnboardingModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-coach-bg/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl glass-panel shadow-2xl p-8 border border-sky-500/30 overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-sky-500/20 blur-[80px]" />
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg shadow-sky-500/30">
            <span className="text-3xl text-white">♞</span>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-center text-white mb-2">Welcome to your AI Coach</h2>
        <p className="text-center text-slate-400 mb-8">
          We don't just show you engine lines. We build your intuition.
        </p>

        <div className="space-y-6 mb-8 relative z-10">
          <div className="flex gap-4">
            <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
              <Upload size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">1. Upload a Game</h3>
              <p className="text-sm text-slate-400">Paste a PGN from your recent games on Chess.com or Lichess.</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-lesson-highlight/10 text-lesson-highlight">
              <BrainCircuit size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">2. Today's Core Lesson</h3>
              <p className="text-sm text-slate-400">We analyze your mistakes and distill them into one single, high-impact lesson for you to focus on today.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Play size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">3. Play & Improve</h3>
              <p className="text-sm text-slate-400">Apply the lesson in your next games. The coach tracks your progress over time.</p>
            </div>
          </div>
        </div>

        <Link 
          to="/upload"
          className="relative z-10 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-4 text-base font-bold text-white shadow-lg shadow-sky-500/30 transition-transform hover:scale-105"
        >
          <Upload size={20} />
          Upload Your First Game
        </Link>
      </div>
    </div>
  );
}
