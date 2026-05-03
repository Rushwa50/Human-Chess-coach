import { FileUp, Send } from "lucide-react";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiFetch } from "../api";
import { useAuth } from "../state/auth";
import type { Game } from "../types";

export default function UploadPage() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [pgn, setPgn] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData();
    if (pgn.trim()) form.append("pgn", pgn);
    if (file) form.append("file", file);
    try {
      const game = await apiFetch<Game>("/games/upload", { method: "POST", body: form }, token);
      navigate(`/analysis/${game.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-white mb-3">Upload Game</h1>
        <p className="text-slate-400 max-w-lg mx-auto">Paste a PGN or attach a `.pgn` file. Our AI Coach will run a deep, full-engine analysis in the background.</p>
      </div>
      
      <form onSubmit={submit} className="rounded-2xl glass-panel p-8 shadow-[0_0_40px_rgba(14,165,233,0.1)] border border-sky-900/30">
        <label className="block">
          <span className="mb-3 block text-sm font-semibold tracking-wide text-sky-400 uppercase">PGN Data</span>
          <textarea
            className="min-h-72 w-full resize-y rounded-xl border border-slate-700 bg-slate-900/50 p-4 font-mono text-sm text-slate-300 outline-none transition-all duration-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50 shadow-inner"
            value={pgn}
            onChange={(event) => setPgn(event.target.value)}
            placeholder='[Event "Example"]...'
          />
        </label>
        
        <label className="mt-6 flex cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-600 bg-slate-800/40 px-6 py-8 transition-all duration-300 hover:border-sky-500 hover:bg-sky-900/20 group">
          <FileUp size={28} className="text-slate-400 group-hover:text-sky-400 transition-colors duration-300" />
          <span className="text-base font-medium text-slate-300 group-hover:text-white transition-colors duration-300">
            {file ? file.name : "Choose PGN file to upload"}
          </span>
          <input className="hidden" type="file" accept=".pgn,.txt" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
        
        {error && <p className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-400">{error}</p>}
        
        <div className="mt-8 flex justify-end">
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-8 py-3.5 font-semibold tracking-wide text-white shadow-[0_0_20px_rgba(14,165,233,0.3)] transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(14,165,233,0.5)] disabled:opacity-50 disabled:hover:scale-100"
            disabled={loading}
          >
            <Send size={18} />
            {loading ? "Analyzing..." : "Analyze Game"}
          </button>
        </div>
      </form>
    </section>
  );
}
