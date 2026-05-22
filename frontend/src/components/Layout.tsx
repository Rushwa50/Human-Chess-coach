import { useState, useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Brain, History, LayoutDashboard, LogOut, Settings, Upload } from "lucide-react";
import { useAuth } from "../state/auth";
import Footer from "./Footer";

export default function Layout() {
  const { logout } = useAuth();
  const location = useLocation();

  const navLinks = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Coach Review", path: "/upload", icon: Upload },
    { name: "Growth Trends", path: "/history", icon: History },
    { name: "Coach Insights", path: "/insights", icon: Brain },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-coach-bg text-coach-text font-inter pb-16 md:pb-0">
      {/* Desktop Header */}
      <header className="hidden md:block sticky top-0 z-50 border-b border-slate-800 bg-coach-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg shadow-sky-500/30 group-hover:shadow-sky-400/50 transition-all duration-300">
              <span className="text-xl text-white">♞</span>
            </div>
            <span className="bg-gradient-to-r from-sky-200 to-white bg-clip-text text-lg font-bold tracking-tight text-transparent">
              AI Coach
            </span>
          </Link>

          <nav className="flex items-center gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path || (link.path === "/dashboard" && location.pathname === "/");
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-300 ${
                    isActive 
                      ? "bg-coach-accent/10 text-coach-accent" 
                      : "text-coach-muted hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <Icon size={16} />
                  {link.name}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center">
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-coach-muted hover:bg-slate-800 hover:text-rose-400 transition-colors"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Header (Just Logo) */}
      <header className="md:hidden sticky top-0 z-50 border-b border-slate-800 bg-coach-bg/90 backdrop-blur-md">
        <div className="flex h-14 items-center justify-center px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl text-coach-accent">♞</span>
            <span className="font-bold tracking-tight text-white">
              AI Coach
            </span>
          </Link>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <Outlet />
      </main>

      <div className="hidden md:block">
        <Footer />
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-800 bg-coach-bg/95 backdrop-blur-lg pb-safe">
        <div className="flex items-center justify-around px-2 py-2">
          {navLinks.slice(0, 4).map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path || (link.path === "/dashboard" && location.pathname === "/");
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${
                  isActive 
                    ? "text-coach-accent" 
                    : "text-coach-muted hover:text-slate-300"
                }`}
              >
                <div className={`flex items-center justify-center w-8 h-8 rounded-full mb-0.5 ${isActive ? 'bg-coach-accent/10' : ''}`}>
                  <Icon size={20} />
                </div>
                <span className="text-[10px] font-medium leading-none">{link.name.split(' ')[1] || link.name}</span>
              </Link>
            );
          })}
          
          <button
            onClick={logout}
            className="flex flex-col items-center justify-center w-16 h-12 rounded-xl text-coach-muted hover:text-rose-400 transition-colors"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full mb-0.5">
              <LogOut size={20} />
            </div>
            <span className="text-[10px] font-medium leading-none">Logout</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
