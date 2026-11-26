"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import QRCode from "qrcode";
import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";
import { Progress } from "@/components/shadcn/progress";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/shadcn/sheet";
import { Icon, Ring, ConcentricRings, ITEM, MCard, STAGGER } from "./ui";
import { areaProgress, BADGES, FIXED_DATES, findSkill, levelOf, MANDATORY, MANDATORY_DONE_DEFAULT, MAX_LEVEL, roleFor, skillLevel, skillProgress, targetLevel, TEAM } from "@/lib/knowledge";
import type { AppState, Rec, Skill } from "@/lib/types";

const WD_LONG = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
export const longDate = (d: Date) => `${WD_LONG[d.getDay()]}, ${d.getDate()}. ${MONTHS[d.getMonth()]}`;

export const recLabel = (t: Rec["type"]) => (t === "Intern" ? "Lernen" : t);
export const recIcon = (t: Rec["type"]) => (t === "Üben" ? "cam" : t === "Extern" ? "pin" : t === "Ressource" ? "book" : "vid");

/** „Fallvorstellung Polytrauma, Fallbesprechung …“ → „Fallvorstellung Polytrauma“ */
export const shortTopic = (t?: string) => (t || "deine Präsentation").split(/,| vor | der | für /)[0].trim();

export function initials(name: string) {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("");
}

const SOURCE_LABEL: Record<string, string> = { Übung: "Aktivitäten", Selbst: "Selbstbild", Kollegen: "Kollegen" };

/* ---------------- Kompetenzen (alle Bereiche) ---------------- */

export function KompetenzenView({ state, onOpenArea, onBack }: { state: AppState; onOpenArea: (id: string) => void; onBack: () => void }) {
  const lvl = levelOf(state.xp);
  return (
    <motion.div className="scr" variants={STAGGER} initial="hidden" animate="show">
      <div className="hd">
        <button className="rb" onClick={onBack} aria-label="Zurück">
          <Icon name="back" />
        </button>
        <div className="t">
          Deine Kompetenzen
          <small>{state.areas.length} Bereiche</small>
        </div>
      </div>
      <MCard variants={ITEM}>
        <div className="row between" style={{ marginBottom: 6 }}>
          <h3 style={{ fontSize: 14 }}>Gesamt</h3>
          <span className="xp">{state.xp.toLocaleString("de-DE")} XP</span>
        </div>
        <div style={{ display: "grid", justifyItems: "center", margin: "24px 0 30px" }}>
          <ConcentricRings size={224} width={10} gap={18} outer={106} rings={state.areas.map((a) => ({ pct: areaProgress(a), color: a.color }))}>
            <b className="lvl-big">
              Level
              <br />
              <span>{lvl}</span>
            </b>
          </ConcentricRings>
        </div>
        <div className="legend-rows">
          {state.areas.map((a) => (
            <motion.button key={a.id} whileTap={{ scale: 0.98 }} className="lrow" onClick={() => onOpenArea(a.id)}>
              <i style={{ background: a.color }} />
              <span className="ell">{a.name}</span>
              <b>{areaProgress(a)} %</b>
              <Icon name="chev" className="mut" size={14} />
            </motion.button>
          ))}
        </div>
      </MCard>
    </motion.div>
  );
}

/* ---------------- Kompetenzbereich ---------------- */

export function AreaView({
  state,
  areaId,
  skillId,
  onSkill,
  onBack,
  onRec,
}: {
  state: AppState;
  areaId: string;
  skillId: string;
  onSkill: (id: string) => void;
  onBack: () => void;
  onRec: (r: Rec) => void;
}) {
  const area = state.areas.find((a) => a.id === areaId) ?? state.areas[0];
  const sk = area.skills.find((s) => s.id === skillId) ?? area.skills[0];
  const pct = skillProgress(sk);
  const soll = targetLevel(sk.id, state.focus, state.profile?.role);
  const role = roleFor(state.profile?.role).name;
  const rec = [...sk.recs].sort((a, b) => Number(b.type === "Üben") - Number(a.type === "Üben") || Number(!!b.fresh) - Number(!!a.fresh))[0];
  return (
    <motion.div className="scr" variants={STAGGER} initial="hidden" animate="show">
      <div className="hd">
        <button className="rb" onClick={onBack} aria-label="Zurück">
          <Icon name="back" />
        </button>
        <div className="t">
          {area.name}
          <small>Kompetenzbereich · {area.skills.length} Skills</small>
        </div>
      </div>
      <MCard variants={ITEM} style={{ padding: 12 }}>
        <div className="row" style={{ gap: 10, marginBottom: 10 }}>
          <Ring size={44} width={5} pct={areaProgress(area)} color={area.color}>
            <b style={{ fontSize: 11 }}>{areaProgress(area)}</b>
          </Ring>
          <div style={{ flex: 1 }}>
            <b style={{ fontSize: 13 }}>Bereich gesamt</b>
            <div className="mut xs">Durchschnitt deiner {area.skills.length} Skills</div>
          </div>
        </div>
        <div className="tiles">
          {area.skills.map((s) => (
            <button key={s.id} className={`tile ${s.id === sk.id ? "on" : ""}`} onClick={() => onSkill(s.id)}>
              <Ring size={38} width={4} pct={skillProgress(s)} color={area.color}>
                <b style={{ fontSize: 10 }}>{skillProgress(s)}</b>
              </Ring>
              <span>
                {s.name.split(" ").map((w, i) => (
                  <span key={i}>
                    {i > 0 && <br />}
                    {w.replace(/(management|analyse|führung)/i, "\u00AD$1")}
                  </span>
                ))}
              </span>
            </button>
          ))}
        </div>
      </MCard>

      <MCard variants={ITEM}>
        <div className="row between">
          <h3 style={{ fontSize: 15 }}>{sk.name}</h3>
          <span className="big" style={{ fontSize: 18 }}>
            {pct} %
          </span>
        </div>
        <div className="mut xs" style={{ margin: "2px 0 8px" }}>
          Soll für {role}: Stufe {soll} von {MAX_LEVEL}
        </div>
        <div style={{ display: "grid", gap: 7 }}>
          {sk.subs.map((s) => (
            <div key={s.id} className="row between" style={{ fontSize: 11.5 }}>
              <span>{s.name}</span>
              <span className="dots" aria-label={`Stufe ${s.level} von ${MAX_LEVEL}, Soll ${soll}`}>
                {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((n) => (
                  <i key={n} className={`${n <= s.level ? "f" : ""} ${n === soll ? "soll" : ""}`} style={n <= s.level ? { background: area.color } : undefined} />
                ))}
              </span>
            </div>
          ))}
        </div>
      </MCard>

      {rec && <RecCard r={rec} onClick={() => onRec(rec)} />}
      <AreaBadges areaId={area.id} badges={state.badges} />
    </motion.div>
  );
}

export function RecCard({ r, onClick, small }: { r: Rec; onClick?: () => void; small?: boolean }) {
  const hot = r.type === "Üben";
  const dur = r.meta && r.meta.length <= 14 ? r.meta : r.why && r.why.length <= 14 ? r.why : "";
  const xp = hot ? 80 : r.type === "Intern" ? 120 : r.type === "Extern" ? 60 : 15;
  return (
    <motion.button variants={ITEM} whileTap={onClick ? { scale: 0.98 } : undefined} className={`card sug ${hot ? "hot" : ""} ${small ? "sm" : ""}`} onClick={onClick} disabled={!onClick}>
      {!small && (
        <span className={`ck ${hot ? "a" : ""}`}>
          <Icon name={recIcon(r.type)} size={14} />
        </span>
      )}
      <div className="tx">
        <span className={`tag ${hot ? "acc" : ""}`}>
          {recLabel(r.type)}
          {dur ? ` · ${dur}` : ""}
        </span>
        <b>{r.title}</b>
      </div>
      {r.fresh ? <span className="xp neu">neu</span> : !small && <span className="xp">+{xp} XP</span>}
    </motion.button>
  );
}

/* ---------------- Lernpfad aktualisiert ---------------- */

export function SkillUpdateView({ state, onBack }: { state: AppState; onBack: () => void }) {
  const sk = findSkill(state.areas, "praes") as Skill;
  const pct = skillProgress(sk);
  const before = state.presentation?.pctBefore ?? pct;
  const bySource = (src: string) => {
    const subs = sk.subs.filter((s) => s.sources?.includes(src as never));
    return subs.length ? Math.round((subs.reduce((a, s) => a + s.level, 0) / (subs.length * MAX_LEVEL)) * 100) : 0;
  };
  const sources = ["Übung", "Selbst", "Kollegen"].map((s) => ({ name: SOURCE_LABEL[s], v: bySource(s) })).filter((s) => s.v > 0);
  const recs = sk.recs.filter((r) => r.fresh);
  const rest = sk.recs.filter((r) => !r.fresh && r.type !== "Üben").slice(0, Math.max(0, 3 - recs.length));
  return (
    <motion.div className="scr g8" variants={STAGGER} initial="hidden" animate="show">
      <div className="hd">
        <button className="rb" onClick={onBack} aria-label="Zurück">
          <Icon name="back" />
        </button>
        <div className="t">
          {sk.name}
          <small>Lernpfad aktualisiert</small>
        </div>
      </div>
      <MCard variants={ITEM} className="row" style={{ gap: 14 }}>
        <Ring size={70} width={7} pct={pct} color="var(--p1)">
          <b style={{ fontSize: 17 }}>{pct}</b>
        </Ring>
        <div style={{ flex: 1 }}>
          <span className="xp">+{pct - before} % seit gestern</span>
          <div className="src-row">
            {sources.map((s) => (
              <div key={s.name} className="row">
                <span>{s.name}</span>
                <Progress className="h-1.5 flex-1" value={s.v} style={{ ["--c" as string]: "var(--p1)" }} />
              </div>
            ))}
          </div>
        </div>
      </MCard>
      {state.memory[0] && (
        <motion.div variants={ITEM} className="noti" style={{ padding: "10px 12px" }}>
          <span className="ib sm">
            <Icon name="bulb" size={15} />
          </span>
          <div style={{ fontSize: 12 }}>
            <b>LENA hat gelernt</b>
            <br />
            {state.memory[0]}
          </div>
        </motion.div>
      )}
      <motion.b variants={ITEM} style={{ fontSize: 13, marginTop: 2 }}>
        Neue Vorschläge
      </motion.b>
      {[...recs, ...rest].slice(0, 3).map((r) => (
        <RecCard key={r.id} r={r} small />
      ))}
    </motion.div>
  );
}

/* ---------------- Team ---------------- */

const PEER_COLORS = ["var(--p1)", "var(--p2)", "var(--p3)"];

export function TeamView({ state }: { state: AppState }) {
  const topic = state.presentation?.topic;
  const got = state.feedbackReceived;
  return (
    <motion.div className="scr g8" variants={STAGGER} initial="hidden" animate="show">
      <div className="hd">
        <div className="t">
          Team
          <small>{got.length && topic ? `Feedback zu „${shortTopic(topic)}“` : "Deine Kollegen mit eigener LENA"}</small>
        </div>
        {got.length > 0 && <span className="tag acc">{`${got.length} von ${TEAM.length}`}</span>}
      </div>
      {TEAM.map((t, i) => {
        const fb = got.find((f) => f.name === t.name);
        return (
          <MCard variants={ITEM} key={t.name} className="fb">
            <span className="av sm" style={{ background: PEER_COLORS[i] }}>
              {t.initials}
            </span>
            <div>
              <b>
                {t.name} <span className="mut" style={{ fontWeight: 500 }}>· {t.role}</span>
              </b>
              {fb ? fb.text : <span className="mut">Noch kein Feedback</span>}
            </div>
          </MCard>
        );
      })}
      <Challenge value={state.teamChallenge} />
    </motion.div>
  );
}

function Challenge({ value, week, dark }: { value: number; week?: React.ReactNode; dark?: boolean }) {
  const v = Math.min(10, value);
  return (
    <MCard variants={ITEM}>
      <div className="row between">
        <h3 style={{ fontSize: 14 }}>Team-Challenge</h3>
        <span className={dark ? "mut xs" : "tag acc"}>{v >= 10 ? "geschafft" : "diese Woche"}</span>
      </div>
      <div className={dark ? "" : "mut"} style={{ margin: dark ? "4px 0 8px" : "2px 0 8px" }}>
        10 Feedbacks im Team diese Woche
      </div>
      <div className="row">
        <Progress className="flex-1" value={v * 10} style={dark ? { ["--c" as string]: "var(--sl)" } : undefined} />
        <b>{v}/10</b>
      </div>
      {week}
    </MCard>
  );
}

/* ---------------- Erfolge (pro Kompetenzbereich) ---------------- */

const BADGE_ICON: Record<string, string> = { generalprobe: "cam", feedback: "team", loop: "orb", mutig: "star" };
const BADGE_LABEL: Record<string, React.ReactNode> = {
  generalprobe: <>General&shy;probe</>,
  feedback: (
    <>
      Feedback-
      <br />
      Sammler
    </>
  ),
  loop: <>Loop ge&shy;schlossen</>,
  mutig: "Mutig",
};

/** Erfolge einer Reisekategorie: nur verdiente Badges, nur wenn es welche gibt. */
const BADGE_AREA: Record<string, string> = { generalprobe: "komm", feedback: "komm", loop: "komm" };

function AreaBadges({ areaId, badges }: { areaId: string; badges: string[] }) {
  const ids = Object.keys(BADGE_AREA).filter((id) => BADGE_AREA[id] === areaId && badges.includes(id));
  if (!ids.length) return null;
  return (
    <MCard variants={ITEM}>
      <h3 style={{ fontSize: 14, marginBottom: 10 }}>Erfolge</h3>
      <div className="row" style={{ justifyContent: "space-around" }}>
        {ids.map((id, i) => (
          <motion.span
            key={id}
            className="badge"
            title={BADGES[id]?.text}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 16, delay: 0.15 + i * 0.06 }}
          >
            <i>
              <Icon name={BADGE_ICON[id]} size={22} />
            </i>
            {BADGE_LABEL[id]}
          </motion.span>
        ))}
      </div>
    </MCard>
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
  onRestart,
  onShare,
}: {
  open: boolean;
  onClose: () => void;
  canJump: boolean;
  onJump: () => void;
  live: boolean;
  script: boolean;
  setScript: (v: boolean) => void;
  onReset: () => void;
  onRestart: () => void;
  onShare: () => void;
}) {
  const [qr, setQr] = useState("");
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
        className="mx-auto w-full max-w-[var(--aw,286px)] gap-2.5 rounded-t-[28px] border-0 bg-card px-4 pt-2.5 pb-[18px] text-[13px]"
        style={{ zoom: "var(--z, 1)" }}
      >
        <i className="grab" />
        <div className="row between">
          <SheetTitle className="text-[16px] font-bold whitespace-nowrap">Demo-Steuerung</SheetTitle>
          <SheetDescription className="text-[11px] text-muted-foreground">nur für den Pitch</SheetDescription>
        </div>
        <Card className="row sheet-card">
          <div style={{ flex: 1 }}>
            <b>Zeitsprung</b>
            <div className="mut xs">zu „nach der Präsentation“</div>
          </div>
          <Button className="h-8" disabled={!canJump} onClick={onJump}>
            Springen
          </Button>
        </Card>
        <Card className="row sheet-card">
          <b style={{ flex: 1 }}>KI-Modus</b>
          <span className="seg">
            <button className={!script && live ? "on" : ""} disabled={!live} onClick={() => setScript(false)}>
              Live
            </button>
            <button className={script || !live ? "on" : ""} onClick={() => setScript(true)}>
              Skript
            </button>
          </span>
        </Card>
        <Card className="row sheet-card">
          <div style={{ flex: 1 }}>
            <b>Unternehmenssicht</b>
            <div className="mut xs">Erfolg teilen, dann Dashboard zeigen</div>
          </div>
          <Button className="h-8" variant="outline" onClick={onShare}>
            Teilen
          </Button>
          <Button className="h-8" asChild>
            <a href="/dashboard">Dashboard</a>
          </Button>
        </Card>
        <Card className="row sheet-card" style={{ gap: 12 }}>
          {qr ? <span className="qr" dangerouslySetInnerHTML={{ __html: qr }} /> : <span className="qr" />}
          <div style={{ flex: 1 }}>
            <b>QR-Code für die Jury</b>
            <div className="mut xs">Öffnet die App auf dem eigenen Handy</div>
          </div>
        </Card>
        <Button variant="secondary" onClick={onRestart}>
          Konversation neu starten
        </Button>
        <Button variant="secondary" onClick={onReset}>
          Profil zurücksetzen
        </Button>
      </SheetContent>
    </Sheet>
  );
}
