"use client";

import { useState } from "react";
import { areaProgress, BADGES, COMPANY, CATALOG, levelOf, METHODS, skillProgress, TEAM, XP_PER_LEVEL } from "@/lib/knowledge";
import { fmtDay } from "@/lib/clientUtil";
import type { AppState, Area } from "@/lib/types";

const POS: [number, number, number][] = [
  [104, 128, 46],
  [262, 96, 36],
  [420, 140, 40],
  [566, 92, 32],
];

function stars(seed: number) {
  const out: [number, number, number][] = [];
  let x = seed;
  for (let i = 0; i < 46; i++) {
    x = (x * 9301 + 49297) % 233280;
    const a = x / 233280;
    x = (x * 9301 + 49297) % 233280;
    const b = x / 233280;
    out.push([a * 640, b * 230, 0.6 + ((i * 7) % 5) * 0.25]);
  }
  return out;
}
const STARS = stars(7);

function Planets({ areas, selected, onSelect, focusArea }: { areas: Area[]; selected: string; onSelect: (id: string) => void; focusArea?: string }) {
  return (
    <svg className="planets" viewBox="0 0 640 230" role="img" aria-label="Deine Lernreise: Kompetenzbereiche als Planeten">
      <defs>
        {areas.map((a, i) => (
          <radialGradient key={a.id} id={`pg${i}`} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.85" />
            <stop offset="28%" stopColor={a.color} />
            <stop offset="100%" stopColor="#0b0d24" />
          </radialGradient>
        ))}
      </defs>
      {STARS.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity={0.25 + (i % 4) * 0.12} />
      ))}
      <path d="M20,190 C160,40 330,230 620,50" fill="none" stroke="#ffffff" strokeOpacity="0.18" strokeDasharray="3 7" />
      {areas.map((a, i) => {
        const [x, y, r] = POS[i] ?? [100, 100, 30];
        const p = areaProgress(a);
        const R = r + 9;
        const C = 2 * Math.PI * R;
        const sel = a.id === selected;
        return (
          <g key={a.id} className="planet" onClick={() => onSelect(a.id)} role="button" tabIndex={0} aria-label={`${a.name}, ${p} Prozent`} onKeyDown={(e) => e.key === "Enter" && onSelect(a.id)}>
            {sel && <circle cx={x} cy={y} r={R + 9} fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.5" />}
            <circle cx={x} cy={y} r={R} fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="5" />
            <circle
              cx={x}
              cy={y}
              r={R}
              fill="none"
              stroke={a.color}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${(C * p) / 100} ${C}`}
              transform={`rotate(-90 ${x} ${y})`}
              className="ring"
            />
            <circle cx={x} cy={y} r={r} fill={`url(#pg${i})`} />
            {a.skills.map((sk, j) => {
              const ang = (-140 + j * 55) * (Math.PI / 180);
              const mx = x + Math.cos(ang) * (R + 15);
              const my = y + Math.sin(ang) * (R + 15);
              const sp = skillProgress(sk);
              return <circle key={sk.id} cx={mx} cy={my} r={4 + sp / 25} fill={a.color} opacity={0.35 + sp / 160} stroke="#fff" strokeOpacity="0.6" strokeWidth="0.8" />;
            })}
            {focusArea === a.id && (
              <g transform={`translate(${x - 10} ${y - r - 40})`}>
                <path d="M10 0 C16 6 16 16 10 22 C4 16 4 6 10 0Z" fill="#fff" />
                <circle cx="10" cy="9" r="3" fill={a.color} />
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function Panel({
  state,
  highlight,
  area,
  setArea,
}: {
  state: AppState;
  highlight: string | null;
  area: string;
  setArea: (id: string) => void;
}) {
  const [tab, setTab] = useState<"path" | "journal" | "team" | "company">("path");
  const lvl = levelOf(state.xp);
  const inLevel = state.xp % XP_PER_LEVEL;
  const sel = state.areas.find((a) => a.id === area) ?? state.areas[0];
  const p = state.profile;

  return (
    <aside className="panel">
      <div className="me">
        <div className="avatar">{(p?.name || state.username).slice(0, 1).toUpperCase()}</div>
        <div className="me-text">
          <strong>{p?.name || state.username}</strong>
          <span className="muted small">{p?.role || "Onboarding läuft"}</span>
        </div>
        <div className="lvl">
          <span className="lvl-num">Level {lvl}</span>
          <div className="xpbar" aria-label={`${inLevel} von ${XP_PER_LEVEL} XP`}>
            <i style={{ width: `${(inLevel / XP_PER_LEVEL) * 100}%` }} />
          </div>
          <span className="muted small">
            {state.xp} XP · noch {XP_PER_LEVEL - inLevel} bis Level {lvl + 1}
          </span>
        </div>
      </div>

      <nav className="tabs" role="tablist">
        {(
          [
            ["path", "Lernreise"],
            ["journal", "Erfahrungen"],
            ["team", "Team"],
            ["company", "Unternehmen"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? "on" : ""} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      {tab === "path" && (
        <div className="tabbody">
          {!p ? (
            <div className="empty">
              <p>
                <strong>Deine Lernreise entsteht im Chat.</strong>
              </p>
              <p className="muted">Beantworte ein paar Fragen, dann erstelle ich deinen persönlichen Lernpfad aus dem Kompetenzmodell von {COMPANY.short}.</p>
            </div>
          ) : (
            <>
              <div className="space">
                <Planets areas={state.areas} selected={sel.id} onSelect={setArea} focusArea="komm" />
              </div>
              <div className="legend">
                {state.areas.map((a) => (
                  <button key={a.id} className={a.id === sel.id ? "on" : ""} onClick={() => setArea(a.id)}>
                    <i style={{ background: a.color }} />
                    {a.name} <b>{areaProgress(a)} %</b>
                  </button>
                ))}
              </div>
              {state.summary && <p className="summary">{state.summary}</p>}
              <div className="skills">
                {sel.skills.map((sk) => {
                  const sp = skillProgress(sk);
                  const focus = state.focus.includes(sk.id);
                  const open = focus || highlight === sk.id;
                  return (
                    <div key={sk.id} className={`skill ${highlight === sk.id ? "hl" : ""}`}>
                      <div className="skill-head">
                        <strong>{sk.name}</strong>
                        {focus && <span className="tag">Fokus</span>}
                        <span className="pct">{sp} %</span>
                      </div>
                      <div className="bar">
                        <i style={{ width: `${sp}%`, background: sel.color }} />
                      </div>
                      {open && (
                        <>
                          <ul className="subs">
                            {sk.subs.map((s) => (
                              <li key={s.id}>
                                <span>{s.name}</span>
                                <span className="dots" aria-label={`Stufe ${s.level} von 5`}>
                                  {[1, 2, 3, 4, 5].map((n) => (
                                    <i key={n} className={n <= s.level ? "f" : ""} style={n <= s.level ? { background: sel.color } : undefined} />
                                  ))}
                                </span>
                                <span className="src">{(s.sources || []).filter((x) => x !== "Start").join(" · ")}</span>
                              </li>
                            ))}
                          </ul>
                          {sk.recs.length > 0 && (
                            <ul className="recs">
                              {sk.recs.map((r) => (
                                <li key={r.id} className={r.fresh ? "fresh" : ""}>
                                  <span className={`rtype t-${r.type === "Üben" ? "ueben" : r.type.toLowerCase()}`}>{r.type}</span>
                                  <span className="rtitle">
                                    {r.title}
                                    {r.fresh && <em>neu</em>}
                                    {(r.why || r.meta) && <small>{r.why || r.meta}</small>}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              {state.firstStep && (
                <div className="firststep">
                  <span className="muted small">Erster Schritt diese Woche</span>
                  <p>{state.firstStep}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === "journal" && (
        <div className="tabbody">
          <h3>Abzeichen</h3>
          <div className="badges">
            {Object.entries(BADGES).map(([id, b]) => {
              const got = state.badges.includes(id);
              return (
                <div key={id} className={`badge ${got ? "got" : ""}`} title={b.text}>
                  <svg viewBox="0 0 40 44" aria-hidden>
                    <path d="M20 2 L37 12 V32 L20 42 L3 32 V12 Z" />
                  </svg>
                  <span>{b.name}</span>
                </div>
              );
            })}
          </div>
          {state.presentation?.atLabel && (
            <div className="reminder">
              <span className="muted small">Gemerkt</span>
              <p>
                Präsentation „{state.presentation.topic}“, {state.presentation.atLabel}
                {state.presentation.followedUp ? " · nachbesprochen" : " · ich frage danach nach"}
              </p>
            </div>
          )}
          <h3>Was Kompass sich merkt</h3>
          {state.memory.length ? (
            <ul className="memory">
              {state.memory.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          ) : (
            <p className="muted small">Noch nichts. Erkenntnisse aus deinen Erfahrungen landen hier.</p>
          )}
          <h3>Erfahrungen</h3>
          <ul className="journal">
            {state.journal.map((j) => (
              <li key={j.id}>
                <span className={`kind k-${j.kind}`}>{j.kind}</span>
                <div>
                  <strong>{j.title}</strong>
                  {j.detail && <small>{j.detail}</small>}
                </div>
                <span className="muted small nowrap">
                  {fmtDay(j.date)} · +{j.xp} XP
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "team" && (
        <div className="tabbody">
          <div className="challenge">
            <span className="muted small">Team-Challenge der Woche</span>
            <strong>10 Feedbacks im Team</strong>
            <div className="bar big">
              <i style={{ width: `${Math.min(100, state.teamChallenge * 10)}%` }} />
            </div>
            <span className="small">
              {Math.min(10, state.teamChallenge)} von 10 · gemeinsam statt Ranking{state.teamChallenge >= 10 ? " · geschafft!" : ""}
            </span>
          </div>
          <h3>Dein Team</h3>
          <ul className="team">
            {TEAM.map((t) => {
              const fb = state.feedbackReceived.find((f) => f.name === t.name);
              return (
                <li key={t.name}>
                  <div className="avatar sm">{t.initials}</div>
                  <div>
                    <strong>{t.name}</strong>
                    <small className="muted">{t.role} · eigener Kompass aktiv</small>
                    {fb && <p className="small">„{fb.text}“</p>}
                  </div>
                  {fb && <span className="stars">{"★".repeat(fb.stars)}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {tab === "company" && (
        <div className="tabbody company">
          <p className="muted small">Demo-Kontext, generiert. Im echten Betrieb pflegt HR/L&amp;D diese Inhalte.</p>
          <h3>{COMPANY.name}</h3>
          <p>{COMPANY.about}</p>
          <p>
            <strong>Vision:</strong> {COMPANY.vision}
          </p>
          <ul>
            {COMPANY.goals.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
          <h3>Rollen und Soll-Profile</h3>
          <ul>
            {COMPANY.roles.map((r) => (
              <li key={r.name}>
                <strong>{r.name}:</strong> {r.core.join(", ")}
              </li>
            ))}
          </ul>
          <h3>Fortbildungskatalog</h3>
          <ul>
            {CATALOG.map((c) => (
              <li key={c.title}>
                {c.title} <span className="muted">· {c.type}, {c.duration}</span>
              </li>
            ))}
          </ul>
          <h3>Lernmethoden</h3>
          <ul>
            {METHODS.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
