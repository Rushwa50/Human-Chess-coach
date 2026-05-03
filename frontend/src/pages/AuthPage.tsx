import { GoogleLogin } from "@react-oauth/google";
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

  async function handleGoogleLogin(credentialResponse: any) {
    if (!credentialResponse.credential) return;
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch<{ access_token: string }>("/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential: credentialResponse.credential })
      });
      setToken(response.access_token);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google Sign-In failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid min-h-[calc(100vh-80px)] place-items-center px-4 py-12">
      <div className="absolute inset-0 z-[-1] overflow-hidden">
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-sky-600/20 blur-[100px]" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-blue-600/20 blur-[100px]" />
      </div>
      
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl glass-panel p-8 shadow-[0_0_40px_rgba(14,165,233,0.1)]">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg shadow-sky-500/30 text-white">
            <span className="text-4xl">♞</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Chess AI Coach</h1>
            <p className="mt-1 text-sm text-slate-400">{mode === "login" ? "Welcome back to your premium dashboard" : "Create your account for deep analysis"}</p>
          </div>
        </div>
        
        <label className="mb-5 block">
          <span className="mb-2 block text-sm font-semibold tracking-wide text-slate-300">Email address</span>
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-white outline-none transition-all duration-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        
        <label className="mb-6 block">
          <span className="mb-2 block text-sm font-semibold tracking-wide text-slate-300">Password</span>
          <input
            className="w-full rounded-xl border border-slate-700 bg-slate-900/50 px-4 py-3 text-white outline-none transition-all duration-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            placeholder="Minimum 8 characters"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
          />
          {isRegister && (
            <span className={`mt-2 flex items-center gap-2 text-xs font-medium ${passwordReady ? "text-emerald-400" : "text-slate-500"}`}>
              <CheckCircle2 size={14} className={passwordReady ? "text-emerald-400" : "text-slate-600"} />
              Use at least 8 characters.
            </span>
          )}
        </label>
        
        {error && <p className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-400">{error}</p>}
        
        <button
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 font-bold text-white shadow-[0_0_20px_rgba(14,165,233,0.3)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(14,165,233,0.5)] disabled:scale-100 disabled:opacity-50 disabled:shadow-none"
          disabled={loading || !emailReady || !passwordReady}
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : isRegister ? <UserPlus size={18} /> : <LogIn size={18} />}
          {loading ? loadingLabel : isRegister ? "Create account" : "Log in to Dashboard"}
        </button>

        <div className="mt-6 mb-6 flex items-center before:mt-0.5 before:flex-1 before:border-t before:border-slate-700 after:mt-0.5 after:flex-1 after:border-t after:border-slate-700">
          <p className="mx-4 mb-0 text-center font-semibold text-sm text-slate-400">or</p>
        </div>
        
        <div className="flex justify-center w-full">
          <GoogleLogin
            onSuccess={handleGoogleLogin}
            onError={() => setError("Google Sign-In was cancelled or failed.")}
            theme="filled_black"
            text={isRegister ? "signup_with" : "signin_with"}
            shape="rectangular"
          />
        </div>
        
        <p className="mt-6 text-center text-sm font-medium text-slate-400">
          {mode === "login" ? "Don't have an account?" : "Already registered?"}{" "}
          <Link className="text-sky-400 hover:text-sky-300 transition-colors" to={mode === "login" ? "/register" : "/login"}>
            {mode === "login" ? "Create one now" : "Log in"}
          </Link>
        </p>
      </form>
    </section>
  );
}
