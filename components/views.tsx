"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/shadcn/progress";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { motion } from "motion/react";
import { Card } from "@/components/shadcn/card";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/shadcn/sheet";
import QRCode from "qrcode";
import { Icon, Ring, ConcentricRings, Tag, ITEM, MCard, STAGGER } from "./ui";
import { areaProgress, BADGES, COMPANY, CATALOG, levelOf, METHODS, skillProgress, targetLevel, TEAM, XP_PER_LEVEL } from "@/lib/knowledge";
import { fmtDay } from "@/lib/clientUtil";
import type { AppState, Rec } from "@/lib/types";

const WD_LONG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
export const longDate = (d: Date) => `${WD_LONG[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]}`;

export const recLabel = (t: Rec["type"]) => (t === "Intern" ? "Lernen" : t);

export function initials(name: string) {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("");
}

/* ---------------- Home / Lernreise ---------------- */

export function Home({
  state,
  now,
  onOpenArea,
  onPractice,
  onFollowUp,
  followUpDue,
}: {
  state: AppState;
  now: Date;
  onOpenArea: (id: string) => void;
  onPractice: () => void;
  onFollowUp: () => void;
  followUpDue: boolean;
}) {
  const p = state.profile;
  const lvl = levelOf(state.xp);
  const inLevel = state.xp % XP_PER_LEVEL;
  const praes = state.areas[0].skills.find((s) => s.id === "praes");
  const praesPct = praes ? skillProgress(praes) : 0;
  const pres = state.presentation;
  return (
    <motion.div className="scr" variants={STAGGER} initial="hidden" animate="show">
      <div className="hd">
        <div className="t">
          <small>{longDate(now)}</small>
          Hallo {p?.name || state.username}
        </div>
        <span className="av">{initials(p?.name || state.username)}</span>
      </div>

      {followUpDue && (
        <button className="noti" onClick={onFollowUp}>
          <span className="ib">
            <Icon name="bell" />
          </span>
          <span className="noti-tx">
            <b>Wie ist deine Präsentation gelaufen?</b>
            <span className="mut">Zwei Minuten Reflexion, +60 XP</span>
          </span>
        </button>
      )}
      {!followUpDue && pres?.atLabel && state.phase === "waiting" && (
        <div className="noti">
          <span className="ib">
            <Icon name="bell" />
          </span>
          <span className="noti-tx">
            <b>
              {pres.atLabel.replace(" Uhr", "")} Uhr präsentierst du „{short(pres.topic, 40)}“.
            </b>
            <span className="mut">{pres.practiced ? "Generalprobe erledigt. Du bist gut vorbereitet!" : "Heute noch eine Generalprobe?"}</span>
            {!pres.practiced && (
              <Button size="sm" onClick={onPractice}>
                Jetzt üben
              </Button>
            )}
          </span>
        </div>
      )}

      <MCard variants={ITEM}>
        <div className="row between" style={{ marginBottom: 8 }}>
          <h3>Deine Lernreise</h3>
          <span className="mut xs">Fortschritt in %</span>
        </div>
        <div className="row" style={{ gap: 14 }}>
          <ConcentricRings size={104} rings={state.areas.map((a) => ({ pct: areaProgress(a), color: a.color }))}>
            <b className="lvl-in">
              Level
              <br />
              <span>{lvl}</span>
            </b>
          </ConcentricRings>
          <div className="legend">
            {state.areas.map((a) => (
              <button key={a.id} className="row lg" onClick={() => onOpenArea(a.id)}>
                <i style={{ background: a.color }} />
                <span className="ell">{a.name}</span>
                <b>{areaProgress(a)}</b>
                <Icon name="chev" size={14} className="mut" />
              </button>
            ))}
          </div>
        </div>
      </MCard>

      <MCard variants={ITEM} className="tight">
        <div className="row between">
          <b>{state.xp.toLocaleString("de-DE")} XP</b>
          <span className="mut xs">
            noch {XP_PER_LEVEL - inLevel} bis Level {lvl + 1}
          </span>
        </div>
        <Progress className="mt-2" value={(inLevel / XP_PER_LEVEL) * 100} />
      </MCard>

      <motion.button variants={ITEM} whileTap={{ scale: 0.98 }} className="card sug" onClick={() => onOpenArea("komm")}>
        <Ring size={42} width={4} pct={praesPct} color="var(--p1)">
          <b className="xs">{praesPct}</b>
        </Ring>
        <span className="tx">
          <Tag>Nächster Schritt</Tag>
          <b className="ell">{state.phase === "done" ? "Rückfragen souverän meistern" : `Präsentieren auf ${Math.min(100, praesPct + 15)} %`}</b>
        </span>
        <Icon name="send" className="mut" />
      </motion.button>
    </motion.div>
  );
}

function short(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

/* ---------------- Kompetenzbereich ---------------- */

export function AreaView({ state, areaId, skillId, onSkill, onBack }: { state: AppState; areaId: string; skillId: string; onSkill: (id: string) => void; onBack: () => void }) {
  const area = state.areas.find((a) => a.id === areaId) ?? state.areas[0];
  const sk = area.skills.find((s) => s.id === skillId) ?? area.skills[0];
  const pct = skillProgress(sk);
  const soll = targetLevel(sk.id, state.focus);
  const role = state.profile?.role?.split(",")[0] || "deine Rolle";
  const sources = Array.from(new Set(sk.subs.flatMap((s) => s.sources || []).filter((x) => x !== "Start")));
  const learned = state.memory[0];
  const recs = [...sk.recs].sort((a, b) => Number(!!b.fresh) - Number(!!a.fresh) || Number(b.type === "Üben") - Number(a.type === "Üben")).slice(0, 2);
  return (
    <div className="scr">
      <div className="hd">
        <button className="rb" onClick={onBack} aria-label="Zurück">
          <Icon name="back" />
        </button>
        <div className="t">
          {area.name}
          <small>Kompetenzbereich · {area.skills.length} Skills</small>
        </div>
      </div>
      <Card>
        <div className="row" style={{ gap: 10, marginBottom: 10 }}>
          <Ring size={46} width={5} pct={areaProgress(area)} color={area.color}>
            <b className="xs">{areaProgress(area)}</b>
          </Ring>
          <div style={{ flex: 1 }}>
            <b>Bereich gesamt</b>
            <div className="mut xs">Durchschnitt deiner {area.skills.length} Skills</div>
          </div>
        </div>
        <div className="tiles">
          {area.skills.map((s) => (
            <button key={s.id} className={`tile ${s.id === sk.id ? "on" : ""}`} onClick={() => onSkill(s.id)}>
              <Ring size={40} width={4} pct={skillProgress(s)} color={area.color}>
                <b className="xxs">{skillProgress(s)}</b>
              </Ring>
              <span>{s.name}</span>
              {state.focus.includes(s.id) && <em>Fokus</em>}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="row between">
          <h3>{sk.name}</h3>
          <span className="big">{pct} %</span>
        </div>
        <div className="mut xs" style={{ margin: "2px 0 10px" }}>
          Soll für {role}: Stufe {soll} von 5
        </div>
        <div className="subs">
          {sk.subs.map((s) => (
            <div key={s.id} className="sub">
              <div className="row between">
                <span>{s.name}</span>
                <span className="dots" aria-label={`Stufe ${s.level} von 5, Soll ${soll}`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <i key={n} className={`${n <= s.level ? "f" : ""} ${n === soll ? "soll" : ""}`} style={n <= s.level ? { background: area.color } : undefined} />
                  ))}
                </span>
              </div>
            </div>
          ))}
        </div>
        {sources.length > 0 && <p className="src" style={{ marginTop: 12 }}>Aus {sources.join(" · ")}</p>}
      </Card>

      {learned && sk.id === "praes" && state.phase === "done" && (
        <div className="noti">
          <span className="ib sm">
            <Icon name="bulb" size={15} />
          </span>
          <span className="noti-tx">
            <b>Kompass hat gelernt</b>
            <span>{learned}</span>
          </span>
        </div>
      )}

      {recs.map((r) => (
        <div key={r.id} className={`card sug ${r.type === "Üben" ? "hot" : ""}`}>
          <span className={`ck ${r.type === "Üben" ? "a" : ""}`}>
            <Icon name={r.type === "Üben" ? "cam" : r.type === "Extern" ? "pin" : r.type === "Ressource" ? "book" : "vid"} size={14} />
          </span>
          <span className="tx">
            <Tag accent={r.type === "Üben"}>
              {recLabel(r.type)}
              {r.meta && r.meta.length <= 12 ? ` · ${r.meta}` : r.why && r.why.length <= 14 ? ` · ${r.why}` : ""}
            </Tag>
            <b>{r.title}</b>
          </span>
          {r.fresh ? <Badge variant="accent">neu</Badge> : <span className="xp">+{r.type === "Üben" ? 80 : r.type === "Intern" ? 120 : 15}</span>}
        </div>
      ))}
    </div>
  );
}

/* ---------------- Team ---------------- */

export function TeamView({ state }: { state: AppState }) {
  const topic = state.presentation?.topic;
  const got = state.feedbackReceived;
  const colors = ["var(--p1)", "var(--p2)", "var(--p3)"];
  return (
    <div className="scr">
      <div className="hd">
        <div className="t">
          Team
          <small>{got.length && topic ? `Feedback zu „${short(topic, 34)}“` : "Dein Team bei " + COMPANY.short}</small>
        </div>
        {got.length > 0 && <Tag accent>{`${got.length} von ${TEAM.length}`}</Tag>}
      </div>
      {TEAM.map((t, i) => {
        const fb = got.find((f) => f.name === t.name);
        return (
          <div key={t.name} className="card fb">
            <span className="av sm" style={{ background: colors[i] }}>
              {t.initials}
            </span>
            <div>
              <b>
                {t.name} <span className="mut normal">· {t.role}</span>
              </b>
              {fb ? (
                <>
                  <span>{fb.text}</span>
                  <span className="stars" aria-label={`${fb.stars} von 5`}>
                    {"★".repeat(fb.stars)}
                    <span className="off">{"★".repeat(5 - fb.stars)}</span>
                  </span>
                </>
              ) : (
                <span className="mut">Eigener Kompass aktiv · noch kein Feedback</span>
              )}
            </div>
          </div>
        );
      })}
      <Challenge value={state.teamChallenge} />
      <p className="mut xs center">Gezählt wird der Teamfortschritt, nicht wer vorne liegt.</p>
    </div>
  );
}

function Challenge({ value, week }: { value: number; week?: React.ReactNode }) {
  const v = Math.min(10, value);
  return (
    <Card>
      <div className="row between">
        <h3>Team-Challenge</h3>
        <Tag accent={v >= 10}>{v >= 10 ? "geschafft" : "diese Woche"}</Tag>
      </div>
      <div className="mut" style={{ margin: "2px 0 8px" }}>
        10 Feedbacks im Team diese Woche
      </div>
      <div className="row">
        <Progress className="flex-1" style={{ ["--c" as string]: "var(--sl)" }} value={v * 10} />
        <b>{v}/10</b>
      </div>
      {week}
    </Card>
  );
}

/* ---------------- Erfolge ---------------- */

const BADGE_ICON: Record<string, string> = { start: "logo", generalprobe: "cam", feedback: "team", loop: "orb", mutig: "star" };

export function ErfolgeView({ state, now }: { state: AppState; now: Date }) {
  const lvl = levelOf(state.xp);
  const inLevel = state.xp % XP_PER_LEVEL;
  // Week streak: days of the current (demo) week with any activity.
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const todayIdx = (now.getDay() + 6) % 7;
  const active = new Set(
    state.journal
      .map((j) => new Date(j.date))
      .filter((d) => d >= monday)
      .map((d) => (d.getDay() + 6) % 7),
  );
  // Demo seed: Lena was already active at the start of the week.
  [0, 1].forEach((d) => d < todayIdx && active.add(d));
  const days = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
  const week = (
    <div className="week">
      {days.map((d, i) => (
        <span key={d} className={`day ${i === todayIdx ? "now" : ""}`}>
          <i className={active.has(i) ? "" : "no"}>
            <Icon name="fire" size={15} />
          </i>
          {d}
        </span>
      ))}
    </div>
  );
  return (
    <div className="scr">
      <div className="hd">
        <div className="t">
          Erfolge
          <small>{longDate(now)}</small>
        </div>
        <span className="av">{initials(state.profile?.name || state.username)}</span>
      </div>
      <Card className="row" style={{ gap: 14 }}>
        <Ring size={72} width={7} pct={(inLevel / XP_PER_LEVEL) * 100} color="var(--acc)">
          <b className="lvl-big">{lvl}</b>
        </Ring>
        <div>
          <Tag accent>{state.badges.includes("loop") ? "Level-Up" : `${state.xp.toLocaleString("de-DE")} XP`}</Tag>
          <b className="h-md">Level {lvl}</b>
          <span className="mut">
            {state.badges.includes("loop") ? "Loop geschlossen: geübt, angewendet, Feedback geholt." : `Noch ${XP_PER_LEVEL - inLevel} XP bis Level ${lvl + 1}.`}
          </span>
        </div>
      </Card>
      <Card>
        <h3 style={{ marginBottom: 10 }}>Badges</h3>
        <div className="badges">
          {Object.entries(BADGES).map(([id, b]) => (
            <motion.span
              key={id}
              className={`badge ${state.badges.includes(id) ? "" : "off"}`}
              title={b.text}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.05 * Object.keys(BADGES).indexOf(id) }}
            >
              <i>
                <Icon name={BADGE_ICON[id] || "star"} size={22} />
              </i>
              {b.name}
            </motion.span>
          ))}
        </div>
      </Card>
      <Challenge value={state.teamChallenge} week={<div style={{ marginTop: 12 }}>{week}</div>} />
      {state.memory.length > 0 && (
        <Card>
          <h3 style={{ marginBottom: 6 }}>Was Kompass sich merkt</h3>
          <ul className="plain">
            {state.memory.slice(0, 3).map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </Card>
      )}
      <Card>
        <h3 style={{ marginBottom: 6 }}>Erfahrungen</h3>
        <ul className="journal">
          {state.journal.slice(0, 5).map((j) => (
            <li key={j.id}>
              <span className="tag">{j.kind}</span>
              <b>{j.title}</b>
              <span className="mut xs nowrap">
                {fmtDay(j.date)} · +{j.xp} XP
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ---------------- Unternehmen (im Demo-Menü) ---------------- */

export function CompanyInfo() {
  return (
    <div className="company">
      <p className="mut xs">Demo-Kontext, generiert. Im echten Betrieb pflegt HR/L&amp;D diese Inhalte.</p>
      <b>{COMPANY.name}</b>
      <p>{COMPANY.about}</p>
      <p>Vision: {COMPANY.vision}</p>
      <b>Fortbildungskatalog</b>
      <ul className="plain">
        {CATALOG.map((c) => (
          <li key={c.title}>
            {c.title} <span className="mut">· {c.type}</span>
          </li>
        ))}
      </ul>
      <b>Lernmethoden</b>
      <ul className="plain">
        {METHODS.map((m) => (
          <li key={m}>{m}</li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- Demo-Steuerung ---------------- */

export function DemoSheet({
  open,
  onClose,
  canJump,
  onJump,
  live,
  script,
  setScript,
  onReset,
  onLogout,
}: {
  open: boolean;
  onClose: () => void;
  canJump: boolean;
  onJump: () => void;
  live: boolean;
  script: boolean;
  setScript: (v: boolean) => void;
  onReset: () => void;
  onLogout: () => void;
}) {
  const [qr, setQr] = useState("");
  const [showCompany, setShowCompany] = useState(false);
  useEffect(() => {
    if (!open || qr) return;
    QRCode.toString(window.location.origin, { type: "svg", margin: 0, color: { dark: "#17181C", light: "#0000" } })
      .then(setQr)
      .catch(() => {});
  }, [open, qr]);
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="mx-auto max-h-[88dvh] w-full max-w-[440px] gap-2.5 overflow-y-auto rounded-t-[28px] border-0 bg-background px-4 pt-2.5 pb-6"
      >
        <i className="grab" />
        <div className="row between">
          <SheetTitle className="h-md">Demo-Steuerung</SheetTitle>
          <SheetDescription className="mut xs">nur für den Pitch</SheetDescription>
        </div>
        <div className="row card line">
          <div style={{ flex: 1 }}>
            <b>Zeitsprung</b>
            <div className="mut xs">zu „nach der Präsentation“</div>
          </div>
          <Button disabled={!canJump} onClick={onJump}>
            Springen
          </Button>
        </div>
        <div className="row card line">
          <div style={{ flex: 1 }}>
            <b>KI-Modus</b>
            <div className="mut xs">{live ? "Live mit Claude oder Skript als Fallback" : "Kein API-Key: nur Skript"}</div>
          </div>
          <span className="seg">
            <button className={!script && live ? "on" : ""} disabled={!live} onClick={() => setScript(false)}>
              Live
            </button>
            <button className={script || !live ? "on" : ""} onClick={() => setScript(true)}>
              Skript
            </button>
          </span>
        </div>
        <div className="row card line" style={{ gap: 12 }}>
          {qr ? <span className="qr" dangerouslySetInnerHTML={{ __html: qr }} /> : <span className="qr" />}
          <div style={{ flex: 1 }}>
            <b>QR-Code für die Jury</b>
            <div className="mut xs">Öffnet die App auf dem eigenen Handy</div>
          </div>
        </div>
        <Button variant="secondary" onClick={() => setShowCompany((v) => !v)}>
          {showCompany ? "Firmenkontext ausblenden" : "Firmenkontext ansehen"}
        </Button>
        {showCompany && <CompanyInfo />}
        <div className="row" style={{ gap: 8 }}>
          <Button variant="secondary" className="flex-1" onClick={onReset}>
            Profil zurücksetzen
          </Button>
          <Button variant="secondary" className="flex-1" onClick={onLogout}>
            Abmelden
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
