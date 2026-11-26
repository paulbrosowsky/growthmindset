"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/shadcn/input";
import { Button } from "@/components/shadcn/button";
import { Icon } from "@/components/ui";
import { Card } from "@/components/shadcn/card";
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
      <div className="gate-in">
        <div className="gate-brand">
          <span className="gate-logo">
            <Icon name="logo" size={46} />
          </span>
          <b>Kompass</b>
          <span className="mut">
            Dein persönlicher Lern-Coach
            <br />
            bei Neckartal Systemtechnik
          </span>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void enter(name);
          }}
        >
          <Card>
            <label htmlFor="u" className="mut xs">
              Wähle einen Usernamen
            </label>
            <div className="gate-field">
              <Input id="u" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. lena.berger" autoComplete="username" autoCapitalize="none" className="h-12 flex-1 bg-transparent px-0 text-base font-bold shadow-none focus-visible:ring-0" />
              {name.trim().length >= 2 && (
                <span className="ck a sm">
                  <Icon name="check" size={13} />
                </span>
              )}
            </div>
            <div className="mut xs" style={{ marginTop: 6 }}>
              Kein Passwort nötig. Mit demselben Namen kommst du zurück.
            </div>
          </Card>
          <Button size="lg" disabled={loading || !name.trim()}>
            {loading ? "Einen Moment …" : "Los geht's"}
          </Button>
          {error && <p className="error xs">{error}</p>}
        </form>
        <p className="mut xs center">Dein Name wird nur auf diesem Gerät gemerkt.</p>
      </div>
    </main>
  );
}
