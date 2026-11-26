"use client";

import { useEffect, useState } from "react";
import Coach from "@/components/Coach";
import { initialState } from "@/lib/knowledge";
import type { AppState } from "@/lib/types";

const KEY = "kompass-user";

export default function Home() {
  const [state, setState] = useState<AppState | null>(null);
  const [live, setLive] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function enter(raw: string) {
    const u = raw.trim().toLowerCase();
    if (!/^[a-z0-9._-]{2,30}$/.test(u)) {
      setError("2 bis 30 Zeichen: Buchstaben, Zahlen, Punkt, Minus oder Unterstrich.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [st, info] = await Promise.all([
        fetch(`/api/state?u=${encodeURIComponent(u)}`).then((r) => r.json()),
        fetch("/api/ai").then((r) => r.json()).catch(() => ({ live: false })),
      ]);
      setLive(Boolean(info.live));
      try {
        localStorage.setItem(KEY, u);
      } catch {}
      setState((st.state as AppState) || initialState(u));
    } catch {
      setError("Server nicht erreichbar. Bitte später noch einmal versuchen.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let saved = "";
    try {
      saved = localStorage.getItem(KEY) || "";
    } catch {}
    if (saved) void enter(saved);
    else setLoading(false);
  }, []);

  if (state) {
    return (
      <Coach
        key={state.username}
        initial={state}
        live={live}
        onLogout={() => {
          try {
            localStorage.removeItem(KEY);
          } catch {}
          setState(null);
        }}
      />
    );
  }

  return (
    <main className="gate">
      <div className="gate-card">
        <svg className="gate-logo" viewBox="0 0 32 32" aria-hidden>
          <circle cx="16" cy="16" r="14" />
          <path d="M16 6 L20 16 L16 26 L12 16 Z" />
        </svg>
        <h1>Kompass</h1>
        <p className="lead">Dein persönlicher Lern-Coach. Lernen da, wo es passiert: im Arbeitsalltag.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void enter(name);
          }}
        >
          <label htmlFor="u">Wähle einen Usernamen</label>
          <input id="u" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. lena.berger" autoComplete="username" autoCapitalize="none" />
          <button className="btn primary big" disabled={loading || !name.trim()}>
            {loading ? "Einen Moment …" : "Los geht's"}
          </button>
          {error && <p className="error small">{error}</p>}
        </form>
        <p className="muted small">Kein Passwort nötig. Mit demselben Usernamen kommst du später zurück.</p>
      </div>
    </main>
  );
}
