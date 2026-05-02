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
        <header className="border-b border-black/10 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link to="/" className="text-lg font-semibold text-ink">
              Chess Human Coach AI
            </Link>
            <nav className="flex items-center gap-2">
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 rounded-md bg-moss px-3 py-2 text-sm font-medium text-white"
              >
                <Upload size={16} />
                Upload
              </Link>
              <button
                type="button"
                onClick={logout}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-black/10 bg-white"
                title="Log out"
              >
                <LogOut size={16} />
              </button>
            </nav>
          </div>
        </header>
      )}
      <Outlet />
    </main>
  );
}
