import { LogOut, Upload } from "lucide-react";
import { Link, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "./state/auth";

export default function App() {
  const { token, logout } = useAuth();
  const location = useLocation();
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

  return (
    <main className="min-h-screen">
      {!isAuthPage && token && (
        <div className="sticky top-0 z-50 pt-4 px-4 pb-4">
          <header className="glass-panel mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-6 py-4 transition-all duration-300 shadow-sky-900/10 hover:shadow-sky-500/20">
            <Link to="/" className="text-xl font-bold tracking-tight text-white flex items-center gap-3 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg shadow-sky-500/30 group-hover:shadow-sky-400/50 transition-all duration-300">
                <span className="text-2xl">♞</span>
              </div>
              <span className="bg-gradient-to-r from-sky-200 to-white bg-clip-text text-transparent">AI Coach</span>
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition-all duration-300 hover:scale-105 hover:shadow-sky-500/40"
              >
                <Upload size={18} />
                Upload Game
              </Link>
              <button
                type="button"
                onClick={logout}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl glass-button text-slate-300 hover:text-white"
                title="Log out"
              >
                <LogOut size={18} />
              </button>
            </nav>
          </header>
        </div>
      )}
      <Outlet />
    </main>
  );
}
