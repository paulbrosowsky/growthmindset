"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/shadcn/input";
import { Button } from "@/components/shadcn/button";
import { Icon } from "@/components/ui";
import { Card } from "@/components/shadcn/card";
import Coach from "@/components/Coach";
import { initialAreas, initialState } from "@/lib/knowledge";
import type { AppState } from "@/lib/types";

const KEY = "kompass-user";
const RESET_KEY = (u: string) => `kompass-reset-${u}`;

export default function Home() {
  const [state, setState] = useState<AppState | null>(null);
  const [live, setLive] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [gen, setGen] = useState(0);

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
        fetch(`/api/state?u=${encodeURIComponent(u)}`, { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/ai").then((r) => r.json()).catch(() => ({ live: false })),
      ]);
      setLive(Boolean(info.live));
      try {
        localStorage.setItem(KEY, u);
      } catch {}
      let loaded = st.state as AppState | null;
      // Nach einem Neustart: älteren Server-Stand ignorieren (z. B. verspätetes Speichern oder andere Server-Instanz).
      let resetAt = "";
      try {
        resetAt = localStorage.getItem(RESET_KEY(u)) || "";
      } catch {}
      if (loaded && resetAt && (loaded.createdAt || "") < resetAt) loaded = null;
      if (loaded) {
        // Ältere Profile: fehlende Vorschläge aus den Standard-Inhalten ergänzen.
        const base = initialAreas();
        for (const a of loaded.areas) for (const sk of a.skills) if (!sk.recs?.length) sk.recs = base.flatMap((x) => x.skills).find((x) => x.id === sk.id)?.recs ?? [];
      }
      setState(loaded || initialState(u));
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
        key={`${state.username}-${gen}`}
        initial={state}
        live={live}
        onRestart={(fresh) => {
          try {
            localStorage.setItem(RESET_KEY(fresh.username), fresh.createdAt);
          } catch {}
          setState(fresh);
          setGen((g) => g + 1);
        }}
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
            <Icon name="logo" size={46} style={{ strokeWidth: 1.5 }} />
          </span>
          <b>Kompass</b>
          <span className="mut">
            Dein persönlicher Lern-Coach
            <br />
            beim DRK-Kreisverband Musterstadt
          </span>
        </div>
        <form
          style={{ display: "grid", gap: 14 }}
          onSubmit={(e) => {
            e.preventDefault();
            void enter(name);
          }}
        >
          <Card>
            <label htmlFor="u" className="mut" style={{ fontWeight: 700, fontSize: 12 }}>
              Wähle einen Usernamen
            </label>
            <div className="gate-field">
              <Input id="u" value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. lena.berger" autoComplete="username" autoCapitalize="none" className="h-full flex-1 rounded-none bg-transparent px-0 text-[15px] font-bold shadow-none focus-visible:ring-0" />
              {name.trim().length >= 2 && (
                <span className="ck a" style={{ width: 22, height: 22, borderRadius: 7 }}>
                  <Icon name="check" size={13} />
                </span>
              )}
            </div>
            <div className="mut" style={{ fontSize: 11, marginTop: 6 }}>
              {name.trim().length >= 2 ? "Verfügbar. Kein Passwort nötig." : "Kein Passwort nötig."}
            </div>
          </Card>
          <Button size="lg" disabled={loading || !name.trim()}>
            {loading ? "Einen Moment …" : "Los geht's"}
          </Button>
          {error && <p className="error xs">{error}</p>}
        </form>
        <p className="mut" style={{ textAlign: "center", fontSize: 11 }}>
          Dein Name wird nur auf diesem Gerät gemerkt.
        </p>
      </div>
    </main>
  );
}
