import { Link } from "react-router-dom";
import { ArrowRight, BrainCircuit, LineChart, Shield, Upload } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center overflow-hidden">
        <div className="absolute inset-0 z-[-1] overflow-hidden">
          <div className="absolute top-20 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-sky-600/20 blur-[120px]" />
        </div>
        
        <div className="animate-slide-up">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-sm font-medium mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>
            Next-Gen Chess Analysis
          </div>
          
          <h1 className="text-5xl md:text-7xl font-display font-bold tracking-tight text-white mb-6">
            AI Chess Coach That Understands <br className="hidden md:block" />
            <span className="bg-gradient-to-r from-sky-400 to-blue-600 bg-clip-text text-transparent">The Player, Not Just The Position.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-coach-muted max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            A calm, intelligent mentor helping you improve step-by-step. We distill complex engine analysis into one clear Core Lesson per game.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-8 py-4 text-lg font-bold text-white shadow-[0_0_30px_rgba(14,165,233,0.3)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(14,165,233,0.5)]">
              Analyze Your Game
              <ArrowRight size={20} />
            </Link>
            <Link to="/login" className="inline-flex items-center gap-2 rounded-xl glass-button px-8 py-4 text-lg font-bold">
              Login
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="py-24 bg-coach-bg/50 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Why is this different?</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Traditional engines give you numbers. Our AI gives you a calm mentor that actually teaches you how to think.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="glass-panel p-8 rounded-2xl">
              <div className="h-12 w-12 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center mb-6">
                <BrainCircuit size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Today's Core Lesson</h3>
              <p className="text-slate-400 leading-relaxed">We distill your entire game into one single, high-impact lesson. Instead of overwhelming you with 20 mistakes, we focus on the one pattern you need to fix today.</p>
            </div>
            
            <div className="glass-panel p-8 rounded-2xl">
              <div className="h-12 w-12 rounded-xl bg-lesson-highlight/10 text-lesson-highlight flex items-center justify-center mb-6">
                <LineChart size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Long-term Tracking</h3>
              <p className="text-slate-400 leading-relaxed">The coach remembers your past games. If you keep making the same pawn structure mistake, it will gently point out the recurring pattern.</p>
            </div>
            
            <div className="glass-panel p-8 rounded-2xl">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-6">
                <Shield size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Emotional Profiling</h3>
              <p className="text-slate-400 leading-relaxed">We analyze not just your moves, but your timing and reactions to find psychological leaks like time-pressure panic or post-blunder tilt.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Visual Demo Section Placeholder */}
      <section className="py-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold text-white mb-10">See the Coach in Action</h2>
        <div className="aspect-video w-full rounded-2xl glass-panel overflow-hidden border border-slate-700/50 shadow-2xl relative flex items-center justify-center group cursor-pointer">
           <div className="absolute inset-0 bg-gradient-to-t from-coach-bg to-transparent z-10 opacity-60"></div>
           <div className="z-20 text-center">
             <div className="h-20 w-20 mx-auto rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-white shadow-xl transition-transform duration-300 group-hover:scale-110">
               <Upload size={32} className="ml-1" />
             </div>
             <p className="mt-4 font-semibold text-lg text-white">Upload a PGN to Try</p>
           </div>
        </div>
      </section>
    </div>
  );
}
