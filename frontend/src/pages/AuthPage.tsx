import { Brain, CheckCircle2, Loader2, LogIn, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { apiFetch } from "../api";
import { useAuth } from "../state/auth";

export default function AuthPage({ mode }: { mode: "login" | "register" }) {
  const navigate = useNavigate();
  const { setToken } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isRegister = mode === "register";
  const passwordReady = password.length >= 8;
  const emailReady = email.trim().length > 0;
  const loadingLabel = isRegister ? "Creating account..." : "Signing in...";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!emailReady || !passwordReady) {
      setError("Enter a valid email and a password with at least 8 characters.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<{ access_token: string }>(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setToken(response.access_token);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid min-h-screen place-items-center bg-field px-4 py-8">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-black/10 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-moss text-white">
            <Brain size={22} />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Chess Human Coach AI</h1>
            <p className="text-sm text-black/60">{mode === "login" ? "Welcome back" : "Create your account"}</p>
          </div>
        </div>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium">Email</span>
          <input
            className="w-full rounded-md border border-black/15 px-3 py-2 outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/15"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium">Password</span>
          <input
            className="w-full rounded-md border border-black/15 px-3 py-2 outline-none transition focus:border-moss focus:ring-2 focus:ring-moss/15"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            placeholder="Minimum 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
          {isRegister && (
            <span className={`mt-2 flex items-center gap-1.5 text-xs ${passwordReady ? "text-green-700" : "text-black/55"}`}>
              <CheckCircle2 size={13} />
              Use at least 8 characters.
            </span>
          )}
        </label>
        {error && <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-ink px-4 font-medium text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading || !emailReady || !passwordReady}
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : isRegister ? <UserPlus size={16} /> : <LogIn size={16} />}
          {loading ? loadingLabel : isRegister ? "Create account" : "Log in"}
        </button>
        <p className="mt-4 text-center text-sm text-black/60">
          {mode === "login" ? "No account?" : "Already registered?"}{" "}
          <Link className="font-medium text-moss" to={mode === "login" ? "/register" : "/login"}>
            {mode === "login" ? "Register" : "Log in"}
          </Link>
        </p>
      </form>
    </section>
  );
}
