import { Bell, Moon, Settings, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../state/theme";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [darkMode, setDarkMode] = useState(theme === "dark");
  const [showToast, setShowToast] = useState(false);
  const navigate = useNavigate();

  const handleSave = () => {
    setTheme(darkMode ? "dark" : "light");
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      navigate("/dashboard");
    }, 1500);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 animate-fade-in">
      <div className="mb-8 flex items-center gap-4 border-b border-coach-border pb-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-coach-card/50 text-coach-muted">
          <Settings size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-coach-text">Settings</h1>
          <p className="text-coach-muted">Manage your preferences and coaching style</p>
        </div>
      </div>

      <div className="space-y-6">
        <section className="glass-panel p-6 rounded-2xl">
          <h2 className="flex items-center gap-2 font-semibold text-coach-text mb-6">
            <Moon size={18} className="text-indigo-400" />
            Preferences
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-coach-text">Dark Mode</h4>
                <p className="text-sm text-coach-muted">Always use premium dark mentor theme</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold tracking-wider ${darkMode ? 'text-sky-400' : 'text-slate-500'}`}>
                  {darkMode ? 'ON' : 'OFF'}
                </span>
                <div 
                  className={`h-6 w-11 rounded-full p-1 cursor-pointer transition-colors ${darkMode ? 'bg-sky-500' : 'bg-slate-700'}`}
                  onClick={() => setDarkMode(!darkMode)}
                >
                  <div className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${darkMode ? 'translate-x-5' : 'translate-x-0'}`}></div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        <div className="flex justify-end pt-4">
          <button 
            onClick={handleSave}
            className="rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-6 py-2.5 font-semibold text-white shadow-lg shadow-sky-500/25 hover:scale-105 transition-all"
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 animate-fade-in z-50 flex items-center gap-3 rounded-xl bg-coach-card/90 p-4 shadow-2xl border border-coach-border backdrop-blur-sm">
          <div className="rounded-full bg-emerald-500/20 p-1">
            <CheckCircle2 size={20} className="text-emerald-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-coach-text">Settings Saved</h4>
            <p className="text-xs text-coach-muted">Redirecting to AI Coach...</p>
          </div>
        </div>
      )}
    </div>
  );
}
