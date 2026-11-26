"use client";

import { useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/shadcn/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/shadcn/sheet";
import { Icon, Ring, ITEM, MCard, STAGGER } from "./ui";
import { initials, longDate, shortTopic } from "./views";
import {
  CHALLENGE_XP,
  FIXED_DATES,
  findSkill,
  GOAL_PATHS,
  goalPathKey,
  MANDATORY,
  MANDATORY_DONE_DEFAULT,
  MAX_LEVEL,
  mandatoryFor,
  trainingFor,
  OTHER_GOALS,
  PATH_DONE_DEFAULT,
  roleFor,
  skillLevel,
  SOPS,
  YEAR_GOALS,
  type Challenge,
} from "@/lib/knowledge";
import type { AppState } from "@/lib/types";

const Path3D = dynamic(() => import("./Path3D"), { ssr: false, loading: () => <div className="p3d p3d-off" /> });

const WD_LONG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MON_SHORT = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez."];
const WD_SHORT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const DAY = 864e5;
const dayStart = (d: Date) => new Date(d).setHours(0, 0, 0, 0);
const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const dm = (d: Date) => `${d.getDate()}. ${MON_SHORT[d.getMonth()]}`;

/** „Heute“, „Morgen“, „Fr, 4. Dez.“ */
function relDay(d: Date, now: Date) {
  const diff = Math.round((dayStart(d) - dayStart(now)) / DAY);
  if (diff === 0) return "Heute";
  if (diff === 1) return "Morgen";
  return `${WD_SHORT[d.getDay()]}, ${dm(d)}`;
}

/** „In 4 Wochen: sicher präsentieren“ → „Sicher präsentieren“ */
function goalText(g?: string) {
  const t = (g || "").replace(/^\s*in (den nächsten )?4 wochen[:,]?\s*(möchte ich |will ich |kann ich )?/i, "").trim();
  return t ? t[0].toUpperCase() + t.slice(1) : "";
}

/* ---------------- Daten für den Lernpfad ---------------- */

export type GoalPath = {
  title: string;
  week: number;
  challenges: Challenge[];
  done: string[];
  /** Index der nächsten offenen Challenge, -1 wenn alles erledigt */
  cur: number;
};

export function goalPath(state: AppState, now: Date): GoalPath | null {
  const p = state.profile;
  const raw = p?.card?.goal || p?.goal;
  if (!raw) return null;
  const key = goalPathKey(raw);
  const set = GOAL_PATHS[key];
  const done = state.pathDone ?? PATH_DONE_DEFAULT(key);
  const start = new Date(state.goalSetAt || state.createdAt);
  const week = Math.min(4, Math.max(1, Math.floor((dayStart(now) - dayStart(start)) / (7 * DAY)) + 1));
  return {
    title: (key !== "praes" ? set.title : "") || goalText(raw),
    week,
    challenges: set.challenges,
    done,
    cur: set.challenges.findIndex((c) => !done.includes(c.id)),
  };
}

const areaOf = (state: AppState, id: string) => state.areas.find((a) => a.id === id);

/* ---------------- Gemeinsame Bausteine ---------------- */

function BottomSheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto w-full max-w-[var(--aw,286px)] gap-3 rounded-t-[28px] border-0 bg-card px-4 pt-2.5 pb-[18px] text-[13px] leading-[1.45]"
        style={{ zoom: "var(--z, 1)" }}
        aria-describedby={undefined}
      >
        <i className="grab" />
        <SheetTitle className="sr-only">{title}</SheetTitle>
        {children}
      </SheetContent>
    </Sheet>
  );
}

/** Aufklappbare Karte: Titel, Zusammenfassung und Zähler, darunter der Inhalt. */
function Fold({ title, summary, badge, children }: { title: string; summary: ReactNode; badge?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <MCard variants={ITEM} className="fold">
      <button className="fold-hd" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <span className="tx">
          <b>{title}</b>
          <small>{summary}</small>
        </span>
        {badge}
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="mut" style={{ display: "grid" }}>
          <Icon name="down" size={16} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
            <div className="list fold-bd">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </MCard>
  );
}

/** Schlanke Punkte-Leiste: alle Challenges eines Ziels, erledigte mit Haken, die nächste mit Ring. */
function DotStrip({ path, state }: { path: GoalPath; state: AppState }) {
  return (
    <div className="gstrip" aria-label={`${path.done.length} von ${path.challenges.length} Challenges erledigt`}>
      {path.challenges.map((c, i) => {
        const col = areaOf(state, c.area)?.color || "#6B6E76";
        const ok = path.done.includes(c.id);
        return (
          <span key={c.id} className="gseg">
            {i > 0 && <i className={`gln ${ok || i <= path.cur ? "f" : ""}`} />}
            <span className={`gdot ${i === path.cur ? "cur" : ""}`} style={ok ? { background: col } : { boxShadow: `inset 0 0 0 2px ${col}` }}>
              {ok && <Icon name="check" size={8} style={{ strokeWidth: 4, color: "#fff" }} />}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/* ---------------- Ziele (Übersicht) ---------------- */

type DateItem = { id: string; at: Date; title: string; sub: string; kind: "pres" | "pflicht" | "ziel" | "termin"; allDay?: boolean };

function collectDates(state: AppState, now: Date): DateItem[] {
  const base = new Date(state.createdAt);
  const at = (days: number, hour = 9) => {
    const d = new Date(dayStart(base) + days * DAY);
    d.setHours(hour, 0, 0, 0);
    return d;
  };
  const done = state.mandatoryDone ?? MANDATORY_DONE_DEFAULT;
  const items: DateItem[] = [];
  const pres = state.presentation;
  if (pres?.at && !pres.followedUp) items.push({ id: "pres", at: new Date(pres.at), title: shortTopic(pres.topic), sub: "Präsentation", kind: "pres" });
  for (const m of mandatoryFor(state.profile?.role)) if (!done.includes(m.id)) items.push({ id: m.id, at: at(m.dueDays), title: m.title, sub: "Frist Pflichtschulung", kind: "pflicht", allDay: true });
  if (state.profile) {
    const g = new Date(dayStart(new Date(state.goalSetAt || state.createdAt)) + 28 * DAY);
    g.setHours(9, 0, 0, 0);
    items.push({ id: "ziel", at: g, title: "Lernziel-Check-in", sub: "mit Kompass", kind: "ziel" });
  }
  for (const f of FIXED_DATES) items.push({ id: f.id, at: at(f.days, f.hour), title: f.title, sub: f.sub, kind: "termin" });
  return items.filter((i) => dayStart(i.at) >= dayStart(now)).sort((a, b) => a.at.getTime() - b.at.getTime());
}

const whenText = (d: DateItem, now: Date) => {
  const r = relDay(d.at, now);
  const day = r === "Heute" || r === "Morgen" ? r : WD_LONG[d.at.getDay()];
  return d.allDay ? day : `${day}, ${hhmm(d.at)}`;
};

export function GoalsView({
  state,
  now,
  onOpenPath,
  onOpenProfile,
  onMandatory,
  onPractice,
  onFollowUp,
  followUpDue,
}: {
  state: AppState;
  now: Date;
  onOpenPath: () => void;
  onOpenProfile: () => void;
  onMandatory: (id: string) => void;
  onPractice: () => void;
  onFollowUp: () => void;
  followUpDue: boolean;
}) {
  const p = state.profile;
  const pres = state.presentation;
  const path = goalPath(state, now);
  const done = state.mandatoryDone ?? MANDATORY_DONE_DEFAULT;
  const mine = mandatoryFor(p?.role);
  const open = mine.filter((m) => !done.includes(m.id));
  const dates = collectDates(state, now).slice(0, 5);
  const role = roleFor(p?.role);
  const base = new Date(state.createdAt);
  const dueOf = (days: number) => new Date(dayStart(base) + days * DAY);
  const [otherOpen, setOtherOpen] = useState("");
  const [training, setTraining] = useState("");
  const tr = MANDATORY.find((m) => m.id === training);
  const rated = role.core.filter((c) => c.skill && findSkill(state.areas, c.skill));
  const onSoll = rated.filter((c) => {
    const sk = findSkill(state.areas, c.skill!);
    return sk && skillLevel(sk) >= c.soll;
  }).length;
  const otherGoals = path ? OTHER_GOALS : [];

  return (
    <motion.div className="scr" variants={STAGGER} initial="hidden" animate="show">
      <div className="hd">
        <div className="t">
          <small>{longDate(now)}</small>
          Deine Ziele
        </div>
        <span className="av">{initials(p?.name || state.username)}</span>
      </div>

      {followUpDue && (
        <motion.button variants={ITEM} className="noti" onClick={onFollowUp}>
          <span className="ib">
            <Icon name="bell" />
          </span>
          <div style={{ flex: 1 }}>
            <b>Wie ist deine Präsentation gelaufen?</b>
            <div className="mut">
              Zwei Minuten Reflexion, <span style={{ whiteSpace: "nowrap" }}>+60 XP</span>
            </div>
          </div>
        </motion.button>
      )}
      {!followUpDue && pres?.at && state.phase === "waiting" && !pres.practiced && (
        <motion.div variants={ITEM} className="noti">
          <span className="ib">
            <Icon name="bell" />
          </span>
          <div style={{ flex: 1 }}>
            <b>
              {relDay(new Date(pres.at), now)} präsentierst du die {shortTopic(pres.topic)}.
            </b>
            <div className="mut" style={{ margin: "2px 0 6px" }}>
              Heute noch eine Generalprobe?
            </div>
            <Button onClick={onPractice}>Jetzt üben</Button>
          </div>
        </motion.div>
      )}

      {/* Persönliche Ziele */}
      <MCard variants={ITEM}>
        <div className="row between">
          <h3 className="sec">Persönliche Ziele</h3>
          {path && <span className="mut xs">{1 + otherGoals.length} Ziele</span>}
        </div>
        {path ? (
          <>
            <div className="gmeta">In 4 Wochen · Woche {path.week} von 4</div>
            <b className="goal">{path.title}</b>
            <DotStrip path={path} state={state} />
            <div className="row between xs" style={{ marginTop: 4 }}>
              <span className="mut">
                {path.done.length} von {path.challenges.length} Challenges
              </span>
              <button className="glink" onClick={onOpenPath}>
                {path.cur < 0 ? "Pfad ansehen" : "Weiter lernen"}
                <Icon name="chev" size={14} />
              </button>
            </div>
            <div className="gother">
              {otherGoals.map((g) => {
                const isOpen = otherOpen === g.id;
                return (
                  <div key={g.id}>
                    <button className="gz" aria-expanded={isOpen} onClick={() => setOtherOpen(isOpen ? "" : g.id)}>
                      <span className="gzd" style={{ background: g.color }}>
                        {g.status === "erreicht" && <Icon name="check" size={8} style={{ strokeWidth: 4, color: "#fff" }} />}
                      </span>
                      <span className="tx">
                        <b>{g.title}</b>
                        <small>{g.meta}</small>
                      </span>
                      <motion.span animate={{ rotate: isOpen ? 180 : 0 }} className="mut" style={{ display: "grid" }}>
                        <Icon name="down" size={16} />
                      </motion.span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                          <div className="gz-bd">
                            <div className="bar thin">
                              <i style={{ display: "block", height: "100%", width: `${(g.done / g.total) * 100}%`, background: g.color, borderRadius: 9 }} />
                            </div>
                            <span className="mut xs">{g.text}</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="mut xs">Dein Lernziel vereinbarst du mit Kompass im Coach.</div>
        )}
      </MCard>

      {/* Pflichtschulungen */}
      <Fold
        title="Pflichtschulungen"
        summary={
          open.length
            ? `${open[0].title}: ${open[0].dueDays < 0 && dueOf(open[0].dueDays) < now ? "abgelaufen" : `Frist ${dm(dueOf(open[0].dueDays))}`}`
            : `Alle ${mine.length} gültig`
        }
        badge={<span className={open.length ? "fold-n" : "fold-n mut"}>{open.length ? `${open.length} offen` : "✓"}</span>}
      >
        {[...open, ...mine.filter((m) => done.includes(m.id))].map((m) => {
          const ok = done.includes(m.id);
          const late = !ok && dueOf(m.dueDays) < now;
          return (
            <button key={m.id} className={`li ${ok ? "done" : ""}`} onClick={() => setTraining(m.id)}>
              <span className={`ck sm ${ok ? "a" : "o"}`}>{ok && <Icon name="check" size={12} />}</span>
              <span className="tx">
                <b>{m.title}</b>
                <small>{m.meta}</small>
              </span>
              <small className={ok ? "mut" : "due"}>{ok ? "gültig" : late ? "abgelaufen" : `bis ${dm(dueOf(m.dueDays))}`}</small>
            </button>
          );
        })}
      </Fold>

      {/* Termine und Deadlines */}
      <Fold
        title="Termine und Deadlines"
        summary={dates[0] ? `${whenText(dates[0], now)} · ${dates[0].title}` : "Keine Termine"}
        badge={dates.length ? <span className="fold-n">{dates.length}</span> : undefined}
      >
        {dates.map((d) => (
          <div key={d.id} className="li">
            <span className={`cal ${d.kind === "pres" ? "a" : ""}`}>
              <b>{d.at.getDate()}</b>
              <small>{MON_SHORT[d.at.getMonth()]}</small>
            </span>
            <span className="tx">
              <b>{d.title}</b>
              <small>
                {d.sub} · {whenText(d, now)}
              </small>
            </span>
          </div>
        ))}
      </Fold>

      {/* Stellenprofil */}
      <MCard variants={ITEM} className="p-0">
        <button className="fold-hd" style={{ padding: "6px 14px" }} onClick={onOpenProfile}>
          <span className="tx">
            <b>Stellenprofil</b>
            <small>
              {role.name} · {onSoll} von {rated.length} Kompetenzen auf Soll
            </small>
          </span>
          <Icon name="chev" size={16} />
        </button>
      </MCard>

      <BottomSheet open={!!tr} onClose={() => setTraining("")} title={tr?.title || "Pflichtschulung"}>
        {tr && (
          <MandatoryBody
            m={tr}
            ok={done.includes(tr.id)}
            due={dueOf(tr.dueDays)}
            now={now}
            onGo={() => {
              onMandatory(tr.id);
              setTraining("");
            }}
            onClose={() => setTraining("")}
          />
        )}
      </BottomSheet>
    </motion.div>
  );
}

function MandatoryBody({ m, ok, due, now, onGo, onClose }: { m: (typeof MANDATORY)[number]; ok: boolean; due: Date; now: Date; onGo: () => void; onClose: () => void }) {
  const days = Math.round((dayStart(due) - dayStart(now)) / DAY);
  return (
    <>
      <div className="row between">
        <span className="tag" style={{ ["--tc" as string]: "#E3907D" }}>
          <span style={{ color: "var(--t2)" }}>
            {m.id} · Pflicht · {m.meta.split(" · ")[0]} · {m.format}
          </span>
        </span>
        <span className="xp">{ok ? "gültig" : days > 0 ? `Frist in ${days} Tagen` : days === 0 ? "Frist heute" : "abgelaufen"}</span>
      </div>
      <div>
        <b className="sh-t">{m.title}</b>
        <span className="mut" style={{ display: "block", marginTop: 4 }}>
          {m.desc}
        </span>
      </div>
      <div className="facts">
        <div>
          <small>Dauer</small>
          <b>{m.duration}</b>
        </div>
        <div>
          <small>{ok ? "Gültig bis" : "Frist"}</small>
          <b>{dm(due)}</b>
        </div>
        <div>
          <small>Zuletzt</small>
          <b>{m.last}</b>
        </div>
      </div>
      <div className="row" style={{ gap: 8, marginTop: 2 }}>
        {!ok && (
          <Button className="h-11 flex-1 rounded-full" onClick={onGo}>
            {m.format === "E-Learning" ? "Zum E-Learning" : "Termin buchen"} <Icon name="ext" size={14} />
          </Button>
        )}
        <Button variant="outline" className={`h-11 rounded-full ${ok ? "flex-1" : ""}`} onClick={onClose}>
          {ok ? "Schließen" : "Später"}
        </Button>
      </div>
    </>
  );
}

/* ---------------- Lernpfad (3D) ---------------- */

export function PathView({ state, now, onBack, onPrepare, onDone }: { state: AppState; now: Date; onBack: () => void; onPrepare: (c: Challenge) => void; onDone: (c: Challenge) => void }) {
  const path = goalPath(state, now);
  const [sel, setSel] = useState(-1);
  if (!path) return null;
  const c = path.challenges[sel];
  const cState = (i: number): 0 | 1 | 2 => (path.done.includes(path.challenges[i].id) ? 1 : i === path.cur ? 2 : 0);
  const areaIds = [...new Set(path.challenges.map((x) => x.area))];
  const ca = c ? areaOf(state, c.area) : undefined;
  return (
    <div className="pfad">
      <Path3D
        stones={path.challenges.map((x, i) => ({ title: x.title, color: areaOf(state, x.area)?.color || "#6B6E76", state: cState(i) }))}
        onPick={setSel}
        insetTop={128}
        insetBottom={110}
      />
      <div className="pfad-top">
        <div className="hd">
          <button className="rb" onClick={onBack} aria-label="Zurück">
            <Icon name="back" />
          </button>
          <div className="t">
            <small>
              Woche {path.week} von 4 · {path.done.length} von {path.challenges.length}
            </small>
            {path.title}
          </div>
        </div>
        <div className="pfad-lg">
          {areaIds.map((id) => {
            const a = areaOf(state, id);
            const all = path.challenges.filter((x) => x.area === id);
            const n = all.filter((x) => path.done.includes(x.id)).length;
            return (
              <span key={id} className="pfad-chip">
                <Ring size={16} width={3} pct={(n / all.length) * 100} color={a?.color || "#6B6E76"} />
                {a?.name}
                <b>
                  {n}/{all.length}
                </b>
              </span>
            );
          })}
        </div>
      </div>
      <span className="p3d-hint">Wischen zum Laufen · Tippen zum Öffnen</span>

      <BottomSheet open={!!c} onClose={() => setSel(-1)} title={c?.title || "Challenge"}>
        {c && (
          <>
            <div className="row between">
              <span className="tag" style={{ ["--tc" as string]: ca?.color }}>
                <span style={{ color: "var(--t2)" }}>
                  {ca?.name} · {c.kind} · {c.min} min
                </span>
              </span>
              <span className="xp">{cState(sel) === 1 ? "erledigt" : `+${CHALLENGE_XP[c.kind]} XP`}</span>
            </div>
            <div className="row" style={{ alignItems: "flex-start", gap: 10 }}>
              <span className="sh-ic">
                <Icon name={cState(sel) === 1 ? "check" : "target"} size={14} />
              </span>
              <div>
                <b className="sh-t">{c.title}</b>
                <span className="mut" style={{ display: "block", marginTop: 4 }}>
                  {cState(sel) === 0 ? "Kommt später auf deinem Weg." : cState(sel) === 1 ? "Erledigt. Stark, dass du drangeblieben bist." : c.text}
                </span>
              </div>
            </div>
            <div className="row" style={{ gap: 8, marginTop: 4 }}>
              {cState(sel) === 2 ? (
                <>
                  <Button
                    className="h-11 flex-1 rounded-full"
                    onClick={() => {
                      setSel(-1);
                      onPrepare(c);
                    }}
                  >
                    Mit Kompass vorbereiten
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 rounded-full px-5"
                    onClick={() => {
                      setSel(-1);
                      onDone(c);
                    }}
                  >
                    Erledigt
                  </Button>
                </>
              ) : (
                <Button variant="outline" className="h-11 flex-1 rounded-full" onClick={() => setSel(-1)}>
                  Schließen
                </Button>
              )}
            </div>
          </>
        )}
      </BottomSheet>
    </div>
  );
}

/* ---------------- Stellenprofil ---------------- */

export function ProfileView({ state, onBack, onOpenAll, onSopRead }: { state: AppState; onBack: () => void; onOpenAll: () => void; onSopRead: (id: string) => void }) {
  const role = roleFor(state.profile?.role);
  const read = state.sopRead ?? SOPS.filter((x) => x.readDefault).map((x) => x.id);
  const unread = SOPS.filter((x) => !read.includes(x.id)).length;
  const [sop, setSop] = useState("");
  const so = SOPS.find((x) => x.id === sop);
  return (
    <motion.div className="scr" variants={STAGGER} initial="hidden" animate="show">
      <div className="hd">
        <button className="rb" onClick={onBack} aria-label="Zurück">
          <Icon name="back" />
        </button>
        <div className="t">
          <small>Stellenprofil</small>
          {role.name}
        </div>
      </div>

      <MCard variants={ITEM}>
        <div className="row between">
          <h3 className="sec">Fähigkeiten</h3>
          <span className="mut xs">Strich = Soll</span>
        </div>
        <div className="skl">
          {role.core.map((c) => {
            const sk = c.skill ? findSkill(state.areas, c.skill) : undefined;
            if (!sk)
              return (
                <div key={c.name} className="skl-i">
                  <div className="row between">
                    <span className="tag">
                      <b style={{ color: "var(--t)", fontSize: 13 }}>{c.name}</b>
                    </span>
                    <span className="xp">Soll {c.soll} · noch nicht bewertet</span>
                  </div>
                </div>
              );
            const area = state.areas.find((a) => a.skills.some((k) => k.id === sk.id));
            const ist = skillLevel(sk);
            const gap = c.soll - ist;
            const fb = gap > 0 ? trainingFor(sk.id, role) : undefined;
            return (
              <div key={c.name} className="skl-i">
                <div className="row between">
                  <span className="tag" style={{ ["--tc" as string]: area?.color }}>
                    <b style={{ color: "var(--t)", fontSize: 13 }}>{c.name}</b>
                  </span>
                  <span className={`xp ${gap <= 0 ? "ok" : ""}`}>{gap <= 0 ? "auf Soll" : `${gap} ${gap === 1 ? "Stufe" : "Stufen"} offen`}</span>
                </div>
                <div className="lvl" aria-label={`Ist ${ist} von ${MAX_LEVEL}, Soll ${c.soll}`}>
                  {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((n) => (
                    <i key={n} className={n === c.soll ? "soll" : ""} style={n <= ist ? { background: area?.color } : undefined} />
                  ))}
                </div>
                {fb && (
                  <small className="mut xs">
                    Vorschlag: {fb.id} {fb.title} · {fb.duration}
                  </small>
                )}
                {gap > 0 && !fb && state.focus.includes(sk.id) && <small className="mut xs">Wächst mit deinem aktuellen Ziel</small>}
              </div>
            );
          })}
        </div>
        <button className="more" onClick={onOpenAll}>
          Alle Kompetenzen
          <Icon name="chev" size={14} />
        </button>
      </MCard>

      <MCard variants={ITEM}>
        <div className="row between">
          <h3 className="sec">Entwicklungswege</h3>
          <span className="mut xs">{role.dept}</span>
        </div>
        <div className="list">
          {role.growth.map((g) => (
            <div key={g} className="li">
              <Icon name="chev" size={14} className="mut" />
              <span className="tx">
                <b>{g}</b>
              </span>
            </div>
          ))}
        </div>
      </MCard>

      <MCard variants={ITEM}>
        <div className="row between">
          <h3 className="sec">Aus dem Jahreszielgespräch</h3>
          <span className="pill-n">neu</span>
        </div>
        <div className="list">
          {YEAR_GOALS.map((g) => (
            <div key={g.id} className="li">
              <span className="gzd" style={{ background: g.color, width: 8, height: 8 }} />
              <span className="tx">
                <b>{g.title}</b>
                <small>{g.meta}</small>
              </span>
            </div>
          ))}
        </div>
      </MCard>

      <MCard variants={ITEM}>
        <div className="row between">
          <h3 className="sec">Geänderte SOPs</h3>
          <span className="mut xs">{unread ? `${unread} ungelesen` : "alles gelesen"}</span>
        </div>
        <div className="list">
          {SOPS.map((x) => {
            const ok = read.includes(x.id);
            return (
              <button key={x.id} className="li" onClick={() => setSop(x.id)}>
                <span className="tx">
                  <b>{x.title}</b>
                  <small>
                    Version {x.version} · {ok ? "gelesen" : `geändert am ${x.changed}`}
                  </small>
                </span>
                {ok ? <Icon name="check" size={16} style={{ color: "#5E9683", strokeWidth: 2.5 }} /> : <span className="pill-n">lesen</span>}
              </button>
            );
          })}
        </div>
      </MCard>

      <BottomSheet open={!!so} onClose={() => setSop("")} title={so?.title || "SOP"}>
        {so && (
          <>
            <div className="row between">
              <span className="tag">
                <span style={{ color: "var(--t2)" }}>SOP · Version {so.version}</span>
              </span>
              <span className="xp">geändert am {so.changed}</span>
            </div>
            <div>
              <b className="sh-t">{so.title}</b>
              <span className="mut" style={{ display: "block", marginTop: 4 }}>
                {so.summary}
              </span>
            </div>
            <div className="row" style={{ gap: 8, marginTop: 4 }}>
              {!read.includes(so.id) ? (
                <Button
                  className="h-11 flex-1 rounded-full"
                  onClick={() => {
                    onSopRead(so.id);
                    setSop("");
                  }}
                >
                  Gelesen
                </Button>
              ) : null}
              <Button variant="outline" className={`h-11 rounded-full ${read.includes(so.id) ? "flex-1" : "px-5"}`} onClick={() => setSop("")}>
                {read.includes(so.id) ? "Schließen" : "Später"}
              </Button>
            </div>
          </>
        )}
      </BottomSheet>
    </motion.div>
  );
}
