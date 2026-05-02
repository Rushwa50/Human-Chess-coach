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
    <section className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-semibold">Upload Game</h1>
      <p className="mb-6 text-sm text-black/60">Paste a PGN or attach a `.pgn` file. Analysis starts in the background.</p>
      <form onSubmit={submit} className="rounded-lg border border-black/10 bg-white p-5">
        <label className="block">
          <span className="mb-2 block text-sm font-medium">PGN</span>
          <textarea
            className="min-h-72 w-full resize-y rounded-md border border-black/15 p-3 font-mono text-sm outline-none focus:border-moss"
            value={pgn}
            onChange={(event) => setPgn(event.target.value)}
            placeholder='[Event "Example"]...'
          />
        </label>
        <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-black/20 bg-field px-4 py-4">
          <FileUp size={20} />
          <span className="text-sm">{file ? file.name : "Choose PGN file"}</span>
          <input className="hidden" type="file" accept=".pgn,.txt" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
        {error && <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2 font-medium text-white disabled:opacity-60"
          disabled={loading}
        >
          <Send size={16} />
          {loading ? "Uploading..." : "Analyze Game"}
        </button>
      </form>
    </section>
  );
}
