"use client";

import { motion } from "motion/react";
import VideoRecorder, { type VideoResult } from "./VideoRecorder";
import { Button } from "@/components/shadcn/button";
import { Icon, ITEM, MCard, Ring, STAGGER } from "./ui";
import { shortTopic } from "./views";
import type { VideoOut } from "@/lib/fallbacks";

export type RehearsalState = {
  phase: "record" | "analyzing" | "feedback";
  step: number;
  topic: string;
  video?: VideoResult;
  analysis?: VideoOut;
  before?: number;
  after?: number;
};

const frameUrl = (f?: string) => (f ? `url(data:image/jpeg;base64,${f})` : undefined);

/** Generalprobe als eigener Screen: Aufnahme, Analyse, Feedback (Screens 7 und 8 im Konzept). */
export default function Rehearsal({
  r,
  onRecorded,
  onBack,
  onRetry,
}: {
  r: RehearsalState;
  onRecorded: (v: VideoResult) => void;
  onBack: () => void;
  onRetry: () => void;
}) {
  const frames = r.video?.frames || [];
  const secs = Math.round(r.video?.duration || 30);
  const dur = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

  if (r.phase === "feedback" && r.analysis) {
    const a = r.analysis;
    return (
      <motion.div className="scr g8 nonav" variants={STAGGER} initial="hidden" animate="show">
        <div className="hd">
          <button className="rb" onClick={onBack} aria-label="Zurück zum Coach">
            <Icon name="back" />
          </button>
          <div className="t">
            Generalprobe
            <small>
              {shortTopic(r.topic)} · {dur}
            </small>
          </div>
        </div>
        <motion.div variants={ITEM} className="vid">
          {frames[0] ? <img src={`data:image/jpeg;base64,${frames[Math.min(2, frames.length - 1)]}`} alt="" /> : <SlideIllustration />}
          <span className="vid-pill">{frames.length ? `Analysiert aus ${frames.length} Standbildern${r.video?.transcript ? " und Transkript" : ""}` : "Beispiel-Analyse"}</span>
        </motion.div>
        <motion.div variants={ITEM} className="film">
          {[0, 1, 2, 3, 4].map((i) => (
            <i key={i} className={i === 2 ? "m" : ""} style={frames[i] ? { backgroundImage: frameUrl(frames[i]) } : undefined} />
          ))}
        </motion.div>
        <MCard variants={ITEM} className="fb">
          <span className="ck">
            <Icon name="check" size={14} />
          </span>
          <div>
            <b>Das lief gut</b>
            {a.good[0]}
          </div>
        </MCard>
        <MCard variants={ITEM} className="fb">
          <span className="ck a">
            <Icon name="up" size={14} />
          </span>
          <div>
            <b>Daran feilen</b>
            {a.improve[0]}
          </div>
        </MCard>
        <MCard variants={ITEM} className="fb">
          <span className="ck">
            <Icon name="bulb" size={14} />
          </span>
          <div>
            <b>Tipp für morgen</b>
            {a.tip}
          </div>
        </MCard>
        <MCard variants={ITEM} className="row between" style={{ padding: "10px 12px" }}>
          <span className="row" style={{ gap: 8 }}>
            <Ring size={38} width={4} pct={r.after ?? 0} color="var(--p1)">
              <b style={{ fontSize: 10 }}>{r.after}</b>
            </Ring>
            <span>
              <b>Kommunikation</b>
              <br />
              <span className="mut xs">vorher {r.before} %</span>
            </span>
          </span>
          <span className="xp" style={{ fontSize: 13 }}>
            +80 XP
          </span>
        </MCard>
      </motion.div>
    );
  }

  return (
    <div className="scr g9 nonav">
      <div className="hd">
        <button className="rb" onClick={onBack} aria-label="Zurück zum Coach" disabled={r.phase === "analyzing"}>
          <Icon name="back" />
        </button>
        <div className="t">
          Generalprobe
          <small>Sprich zu einer Person hinter der Kamera</small>
        </div>
      </div>
      {r.phase === "record" ? (
        <VideoRecorder onDone={onRecorded} />
      ) : (
        <>
          <div className="vid tall">
            {frames[0] ? <img src={`data:image/jpeg;base64,${frames[0]}`} alt="" /> : <PersonIllustration />}
            <span className="vid-badge">
              <i /> {dur}
            </span>
            {r.video?.transcript && <span className="vid-tx">… {r.video.transcript.slice(0, 80)} …</span>}
          </div>
          <MCard initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <b>Kompass analysiert</b>
              <span className="mut xs">ca. 15 s</span>
            </div>
            <div style={{ display: "grid", gap: 6, fontSize: 12 }}>
              {[
                `${frames.length || 5} Standbilder: Haltung, Blick, Gestik`,
                r.video?.transcript ? "Transkript: Struktur, Füllwörter, Tempo" : "Aufbau, Einstieg und Schluss",
                "Feedback formulieren …",
              ].map((t, i) => (
                <div key={t} className="row" style={{ gap: 8 }}>
                  <span className={`ck sm ${r.step > i ? "a" : ""}`}>
                    {r.step > i ? (
                      <Icon name="check" size={12} />
                    ) : r.step === i ? (
                      <motion.i className="pdot" animate={{ scale: [1, 0.6, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                    ) : null}
                  </span>
                  {t}
                </div>
              ))}
            </div>
          </MCard>
          <div className="row" style={{ gap: 8 }}>
            <Button variant="secondary" className="flex-1" disabled>
              Neu aufnehmen
            </Button>
            <Button variant="secondary" className="flex-1" onClick={onRetry} disabled>
              Clip hochladen
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function PersonIllustration() {
  return (
    <svg viewBox="0 0 268 220" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <circle cx="134" cy="92" r="30" fill="#c99a7c" />
      <path d="M102 86c0-22 14-32 32-32s32 10 32 32c-8-10-18-12-32-12s-24 2-32 12z" fill="#3a2a22" />
      <path d="M62 220c4-50 32-72 72-72s68 22 72 72z" fill="#e8e3dc" />
    </svg>
  );
}

function SlideIllustration() {
  return (
    <svg viewBox="0 0 268 168" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <rect x="150" y="30" width="96" height="62" rx="6" fill="#565e70" />
      <rect x="160" y="42" width="50" height="5" rx="2" fill="#8d96a8" />
      <rect x="160" y="54" width="70" height="4" rx="2" fill="#737c8e" />
      <rect x="160" y="64" width="60" height="4" rx="2" fill="#737c8e" />
      <circle cx="96" cy="70" r="24" fill="#c99a7c" />
      <path d="M70 64c0-18 12-26 26-26s26 8 26 26c-6-8-14-10-26-10s-20 2-26 10z" fill="#3a2a22" />
      <path d="M40 168c4-40 26-58 56-58s52 18 56 58z" fill="#e8e3dc" />
      <path d="M80 112l16 22 16-22" fill="none" stroke="#cfc8bd" strokeWidth="3" />
    </svg>
  );
}
