import { GoogleLogin } from "@react-oauth/google";
import { AlertTriangle, Brain, CheckCircle2, Loader2, LogIn, Mail, Shield, UserPlus } from "lucide-react";
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
  const [rememberMe, setRememberMe] = useState(false);
  
  const isRegister = mode === "register";
  const passwordReady = password.length >= 8;
  const emailReady = email.trim().length > 0 && email.includes("@");
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
      navigate("/dashboard");
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
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google Sign-In failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid min-h-screen place-items-center px-4 py-12 bg-coach-bg animate-fade-in relative overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-600/10 blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 h-[500px] w-[500px] translate-x-1/2 translate-y-1/2 rounded-full bg-blue-600/10 blur-[100px]" />
      </div>
      
      <div className="w-full max-w-md z-10">
        <Link to="/" className="mb-8 flex justify-center group">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg shadow-sky-500/30 group-hover:scale-105 transition-transform">
              <span className="text-2xl text-white">♞</span>
            </div>
            <span className="bg-gradient-to-r from-sky-200 to-white bg-clip-text text-xl font-bold tracking-tight text-transparent">
              AI Coach
            </span>
          </div>
        </Link>

        <form onSubmit={submit} className="rounded-2xl glass-panel p-8 sm:p-10 shadow-2xl border border-slate-700/50 backdrop-blur-xl">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-sm text-slate-400">
              {mode === "login" ? "Enter your credentials to access your dashboard" : "Start your journey to better chess intuition"}
            </p>
          </div>
          
          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-500">
                  <Mail size={18} />
                </div>
                <input
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/50 py-3 pl-11 pr-4 text-white outline-none transition-all focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-300">Password</label>
                {mode === "login" && (
                  <a href="#" className="text-xs font-medium text-sky-400 hover:text-sky-300 transition-colors">
                    Forgot password?
                  </a>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-500">
                  <Shield size={18} />
                </div>
                <input
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/50 py-3 pl-11 pr-4 text-white outline-none transition-all focus:border-sky-500 focus:ring-1 focus:ring-sky-500/50"
                  type="password"
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </div>
              {isRegister && (
                <div className="mt-2 flex items-center gap-2 text-xs font-medium">
                  <CheckCircle2 size={14} className={passwordReady ? "text-emerald-400" : "text-slate-600"} />
                  <span className={passwordReady ? "text-emerald-400" : "text-slate-500"}>At least 8 characters</span>
                </div>
              )}
            </div>

            {mode === "login" && (
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="remember" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900/50 text-sky-500 focus:ring-sky-500/50 focus:ring-offset-slate-900 h-4 w-4"
                />
                <label htmlFor="remember" className="text-sm text-slate-400 select-none cursor-pointer">Remember me</label>
              </div>
            )}
          </div>
          
          {error && (
            <div className="mt-6 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-400 flex items-start gap-2">
              <AlertTriangle size={18} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          
          <button
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-4 font-bold text-white shadow-lg shadow-sky-500/25 transition-all hover:scale-[1.02] disabled:scale-100 disabled:opacity-50"
            disabled={loading || !emailReady || !passwordReady}
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : isRegister ? <UserPlus size={18} /> : <LogIn size={18} />}
            {loading ? loadingLabel : isRegister ? "Create account" : "Sign in"}
          </button>

          <div className="my-6 flex items-center before:mt-0.5 before:flex-1 before:border-t before:border-slate-700 after:mt-0.5 after:flex-1 after:border-t after:border-slate-700">
            <span className="mx-4 text-xs font-semibold uppercase tracking-wider text-slate-500">or continue with</span>
          </div>
          
          <div className="flex justify-center w-full">
            <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={() => setError("Google Sign-In was cancelled or failed.")}
              theme="filled_black"
              text={isRegister ? "signup_with" : "signin_with"}
              shape="rectangular"
              size="large"
            />
          </div>
          
          <p className="mt-8 text-center text-sm text-slate-400">
            {mode === "login" ? "Don't have an account?" : "Already registered?"}{" "}
            <Link className="font-semibold text-sky-400 hover:text-sky-300 transition-colors" to={mode === "login" ? "/register" : "/login"}>
              {mode === "login" ? "Create one now" : "Log in"}
            </Link>
          </p>
        </form>
      </div>
    </section>
  );
}
