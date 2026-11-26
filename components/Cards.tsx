"use client";

import { useState } from "react";
import { TEAM } from "@/lib/knowledge";
import type { PeerFeedback, Slide } from "@/lib/types";

export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : (
          p.split("\n").map((line, j, arr) => (
            <span key={`${i}-${j}`}>
              {line}
              {j < arr.length - 1 && <br />}
            </span>
          ))
        ),
      )}
    </>
  );
}

const ICON: Record<string, string> = {
  video: "M8 5v14l11-7z",
  read: "M4 5h7a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H4zM20 5h-7a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h8z",
  practice: "M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3",
};

export function OptionsCard({
  options,
  onPick,
}: {
  options: { kind: string; title: string; detail: string }[];
  onPick?: (label: string) => void;
}) {
  return (
    <div className="options">
      {options.map((o, i) => (
        <button key={i} className={`option o-${o.kind}`} disabled={!onPick} onClick={() => onPick?.(`${i + 1} · ${o.title}`)}>
          <span className="onum">{i + 1}</span>
          <svg viewBox="0 0 24 24" aria-hidden>
            <path d={ICON[o.kind] || ICON.video} />
          </svg>
          <span className="otext">
            <strong>{o.title}</strong>
            <small>{o.detail}</small>
          </span>
        </button>
      ))}
    </div>
  );
}

export function SlidesCard({ slides }: { slides: Slide[] }) {
  return (
    <div className="deck" tabIndex={0} aria-label="Folienentwurf">
      {slides.map((s, i) => (
        <div key={i} className="slide">
          <div className="slide-face">
            <span className="snum">{i + 1}</span>
            <h4>{s.title}</h4>
            <ul>
              {s.bullets.map((b, j) => (
                <li key={j}>{b}</li>
              ))}
            </ul>
          </div>
          <p className="note">
            <span>Sprechernotiz</span> {s.note}
          </p>
        </div>
      ))}
    </div>
  );
}

export function FeedbackCard({ good, improve, tip, frames }: { good: string[]; improve: string[]; tip: string; frames?: number }) {
  return (
    <div className="fbcard">
      <div className="fbcols">
        <div>
          <h4 className="ok">Das lief gut</h4>
          <ul>
            {good.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="next">Daran feilen</h4>
          <ul>
            {improve.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </div>
      </div>
      <p className="tip">
        <strong>Tipp für morgen:</strong> {tip}
      </p>
      {frames ? <p className="muted small">Ausgewertet: {frames} Standbilder und das Transkript</p> : null}
    </div>
  );
}

export function PeerSelectCard({ done, onSend }: { done?: boolean; onSend: (names: string[] | null) => void }) {
  const [sel, setSel] = useState<string[]>(TEAM.map((t) => t.name));
  return (
    <div className="peersel">
      {TEAM.map((t) => (
        <label key={t.name} className={sel.includes(t.name) ? "on" : ""}>
          <input
            type="checkbox"
            disabled={done}
            checked={sel.includes(t.name)}
            onChange={(e) => setSel((s) => (e.target.checked ? [...s, t.name] : s.filter((n) => n !== t.name)))}
          />
          <span className="avatar sm">{t.initials}</span>
          <span>
            <strong>{t.name}</strong>
            <small>{t.role}</small>
          </span>
        </label>
      ))}
      {!done && (
        <div className="row">
          <button className="btn primary" disabled={!sel.length} onClick={() => onSend(sel)}>
            Feedback anfragen
          </button>
          <button className="btn ghost" onClick={() => onSend(null)}>
            Nein, danke
          </button>
        </div>
      )}
    </div>
  );
}

export function PeerCard({ f }: { f: PeerFeedback }) {
  const t = TEAM.find((x) => x.name === f.name);
  return (
    <div className="peer">
      <span className="avatar sm">{t?.initials || f.name.slice(0, 2)}</span>
      <div>
        <div className="peer-head">
          <strong>{f.name}</strong>
          <span className="stars" aria-label={`${f.stars} von 5 Sternen`}>
            {"★".repeat(f.stars)}
            <span className="off">{"★".repeat(5 - f.stars)}</span>
          </span>
        </div>
        <p>{f.text}</p>
        <small className="muted">über den Kompass von {f.name.split(" ")[0]}</small>
      </div>
    </div>
  );
}

export function RecsCard({ recs }: { recs: { type: string; title: string; why: string }[] }) {
  return (
    <ul className="recs inchat">
      {recs.map((r, i) => (
        <li key={i} className="fresh">
          <span className={`rtype t-${r.type === "Üben" ? "ueben" : r.type.toLowerCase()}`}>{r.type}</span>
          <span className="rtitle">
            {r.title}
            <small>{r.why}</small>
          </span>
        </li>
      ))}
    </ul>
  );
}

const LOOP = ["Lernpfad zeigt Lücke", "Anlass im Alltag", "Üben mit Video", "Anwenden", "Reflektieren", "Feedback der Kollegen", "Neue Vorschläge"];

export function LoopCard() {
  return (
    <div className="loop">
      <strong>Learning Loop geschlossen</strong>
      <ol>
        {LOOP.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ol>
    </div>
  );
}

export function SummaryCard({ name, focus }: { name: string; focus: { name: string; pct: number }[] }) {
  return (
    <div className="sumcard">
      <span className="muted small">Lernpfad für {name} erstellt</span>
      <div className="focus">
        {focus.map((f) => (
          <div key={f.name}>
            <strong>{f.name}</strong>
            <div className="bar">
              <i style={{ width: `${f.pct}%` }} />
            </div>
            <small>{f.pct} %</small>
          </div>
        ))}
      </div>
    </div>
  );
}
