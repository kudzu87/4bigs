"use client";

import { useEffect, useState } from "react";
import { playHaptic } from "@/lib/haptics";
import { createClient } from "@/lib/supabase/client";

export type AuthModalProps = {
  onDismiss: () => void;
  onSuccess: () => void;
};

type View = "form" | "magic-link-sent";

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function AuthModal({ onDismiss, onSuccess }: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [view, setView] = useState<View>("form");
  const [loading, setLoading] = useState<"google" | "magic-link" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        onSuccess();
      }
    });

    return () => subscription.unsubscribe();
  }, [onSuccess]);

  const handleGoogleSignIn = async () => {
    playHaptic("click");
    setError(null);
    setLoading("google");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });

    if (authError) {
      setError(authError.message);
      setLoading(null);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email address.");
      return;
    }

    playHaptic("click");
    setError(null);
    setLoading("magic-link");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: window.location.origin },
    });

    setLoading(null);

    if (authError) {
      setError(authError.message);
      return;
    }

    setView("magic-link-sent");
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden">
        <div className="bg-poker-accent/10 border-b border-poker-accent/20 px-4 py-2 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-poker-accent">
            Beta — sync is free during beta
          </p>
        </div>

        <div className="p-6 space-y-5">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2.5">
              <img
                src="/icons/icon-192.png"
                alt=""
                className="w-10 h-10 rounded-xl"
              />
              <h2 className="text-2xl font-black text-white tracking-tight">
                4 Bigs
              </h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed px-2">
              Sign in to sync your sessions across devices
            </p>
          </div>

          {view === "magic-link-sent" ? (
            <div className="space-y-4 text-center py-2">
              <p className="text-sm font-semibold text-poker-primary">
                Check your email for a sign-in link.
              </p>
              <p className="text-xs text-slate-500">
                Sent to <span className="text-slate-300">{email.trim()}</span>
              </p>
              <button
                type="button"
                onClick={() => {
                  playHaptic("click");
                  setView("form");
                }}
                className="text-xs text-slate-400 hover:text-slate-200 underline underline-offset-2"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading !== null}
                className="w-full py-3.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-bold text-sm flex items-center justify-center gap-2.5 tap-scale transition-all disabled:opacity-60 disabled:pointer-events-none"
              >
                <GoogleIcon />
                {loading === "google" ? "Redirecting…" : "Continue with Google"}
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-800" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  or
                </span>
                <div className="flex-1 h-px bg-slate-800" />
              </div>

              <form onSubmit={handleMagicLink} className="space-y-3">
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading !== null}
                  className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-poker-primary text-white text-sm transition-colors focus:outline-none disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={loading !== null}
                  className="w-full py-3.5 bg-poker-primary hover:bg-emerald-400 text-slate-950 rounded-xl font-black text-xs transition-all glow-green disabled:opacity-60 disabled:pointer-events-none"
                >
                  {loading === "magic-link" ? "Sending…" : "Send Magic Link"}
                </button>
              </form>

              {error && (
                <p className="text-xs text-rose-400 text-center">{error}</p>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => {
              playHaptic("click");
              onDismiss();
            }}
            className="w-full text-center text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            Guest mode — continue without signing in
          </button>
        </div>
      </div>
    </div>
  );
}
