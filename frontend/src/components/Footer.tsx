import { Github, Twitter, Mail } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-slate-800 bg-coach-bg/50 pb-12 pt-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4 lg:gap-8">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-3 group inline-flex mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg shadow-sky-500/30">
                <span className="text-xl text-white">♞</span>
              </div>
              <span className="bg-gradient-to-r from-sky-200 to-white bg-clip-text text-lg font-bold tracking-tight text-transparent">
                Chess AI Coach
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-slate-400">
              Your premium, calm mentor for chess improvement. Upload your games, understand your mistakes, and build lasting intuition.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wider text-slate-200 uppercase">Product</h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li><Link to="/upload" className="hover:text-sky-400 transition-colors">Analyze Game</Link></li>
              <li><Link to="/dashboard" className="hover:text-sky-400 transition-colors">Dashboard</Link></li>
              <li><Link to="/insights" className="hover:text-sky-400 transition-colors">Coach Insights</Link></li>
              <li><Link to="/history" className="hover:text-sky-400 transition-colors">History</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-sm font-semibold tracking-wider text-slate-200 uppercase">Legal & Contact</h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li><a href="#" className="hover:text-sky-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-sky-400 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-sky-400 transition-colors">Contact Support</a></li>
            </ul>
            <div className="mt-6 flex gap-4">
              <a href="#" className="text-slate-400 hover:text-sky-400 transition-colors"><Twitter size={18} /></a>
              <a href="#" className="text-slate-400 hover:text-sky-400 transition-colors"><Github size={18} /></a>
              <a href="#" className="text-slate-400 hover:text-sky-400 transition-colors"><Mail size={18} /></a>
            </div>
          </div>
        </div>
        
        <div className="mt-12 border-t border-slate-800/50 pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Chess AI Coach. All rights reserved.</p>
          <p className="mt-2 md:mt-0">Crafted with precision for serious improvement.</p>
        </div>
      </div>
    </footer>
  );
}
