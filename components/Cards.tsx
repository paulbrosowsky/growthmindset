"use client";

import { useState } from "react";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";
import { TEAM } from "@/lib/knowledge";
import type { PeerFeedback, Slide } from "@/lib/types";
import { motion } from "motion/react";
import { Icon, Ring, Tag, ITEM, MCard, STAGGER } from "./ui";

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

const KIND: Record<string, { icon: string; tag: string; xp: number }> = {
  video: { icon: "vid", tag: "Lernen", xp: 15 },
  read: { icon: "book", tag: "Ressource", xp: 15 },
  practice: { icon: "cam", tag: "Üben", xp: 80 },
};

export function OptionsCard({
  options,
  onPick,
}: {
  options: { kind: string; title: string; detail: string }[];
  onPick?: (label: string) => void;
}) {
  return (
    <motion.div className="stack" variants={STAGGER} initial="hidden" animate="show">
      {options.map((o, i) => {
        const k = KIND[o.kind] || KIND.video;
        const hot = o.kind === "practice";
        return (
          <motion.button
            key={i}
            variants={ITEM}
            whileHover={onPick ? { y: -2 } : undefined}
            whileTap={onPick ? { scale: 0.97 } : undefined}
            className={`card sug ${hot ? "hot" : ""}`}
            disabled={!onPick}
            onClick={() => onPick?.(`${i + 1} · ${o.title}`)}
          >
            <span className={`ck ${hot ? "a" : ""}`}>
              <Icon name={k.icon} size={14} />
            </span>
            <span className="tx">
              <Tag accent={hot}>
                {k.tag} · {o.detail}
              </Tag>
              <b>{o.title}</b>
            </span>
            <span className="xp">+{k.xp}</span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}

export function SlidesCard({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0);
  const s = slides[i];
  if (!s) return null;
  return (
    <Card className="slides">
      <div className="slide-face">
        <Tag accent>
          Folie {i + 1} von {slides.length}
        </Tag>
        <b>{s.title}</b>
        <ul>
          {s.bullets.map((b, j) => (
            <li key={j}>{b}</li>
          ))}
        </ul>
      </div>
      <div className="row between" style={{ margin: "8px 0 6px" }}>
        <button className="rb sm" disabled={i === 0} onClick={() => setI(i - 1)} aria-label="Vorherige Folie">
          <Icon name="back" size={14} />
        </button>
        <span className="dots">
          {slides.map((_, j) => (
            <i key={j} className={j === i ? "f acc" : ""} onClick={() => setI(j)} />
          ))}
        </span>
        <button className="rb sm" disabled={i === slides.length - 1} onClick={() => setI(i + 1)} aria-label="Nächste Folie">
          <Icon name="chev" size={14} />
        </button>
      </div>
      <div className="xs-text">
        <b>Sprechernotiz:</b> {s.note}
      </div>
    </Card>
  );
}

export function FeedbackCard({
  good,
  improve,
  tip,
  frames,
  before,
  after,
}: {
  good: string[];
  improve: string[];
  tip: string;
  frames?: number;
  before?: number;
  after?: number;
}) {
  return (
    <motion.div className="stack" variants={STAGGER} initial="hidden" animate="show">
      <MCard variants={ITEM} className="fb">
        <span className="ck">
          <Icon name="check" size={14} />
        </span>
        <div>
          <b>Das lief gut</b>
          {good.map((g, i) => (
            <span key={i}>{g}</span>
          ))}
        </div>
      </MCard>
      <MCard variants={ITEM} className="fb">
        <span className="ck a">
          <Icon name="up" size={14} />
        </span>
        <div>
          <b>Daran feilen</b>
          {improve.map((g, i) => (
            <span key={i}>{g}</span>
          ))}
        </div>
      </MCard>
      <MCard variants={ITEM} className="fb">
        <span className="ck">
          <Icon name="bulb" size={14} />
        </span>
        <div>
          <b>Tipp für morgen</b>
          <span>{tip}</span>
        </div>
      </MCard>
      {after != null && (
        <MCard variants={ITEM} className="row between tight">
          <span className="row" style={{ gap: 8 }}>
            <Ring size={40} width={4} pct={after} color="var(--p1)">
              <b className="xxs">{after}</b>
            </Ring>
            <span>
              <b>Präsentieren</b>
              <br />
              <span className="mut xs">vorher {before} %</span>
            </span>
          </span>
          <span className="xp big-xp">+80 XP</span>
        </MCard>
      )}
    </motion.div>
  );
}

export function PeerAskCard({ done, onSend }: { done?: boolean; onSend: (names: string[] | null) => void }) {
  return (
    <div className="stack">
      <div className="row avatars">
        {TEAM.map((t, i) => (
          <span key={t.name} className="av sm" style={{ background: ["var(--p1)", "var(--p2)", "var(--p3)"][i] }} title={`${t.name}, ${t.role}`}>
            {t.initials}
          </span>
        ))}
        <span className="mut xs">{TEAM.map((t) => t.name.split(" ")[0]).join(", ")}</span>
      </div>
      {!done && (
        <div className="row" style={{ gap: 8 }}>
          <Button className="flex-1" onClick={() => onSend(TEAM.map((t) => t.name))}>
            Ja, anfragen
          </Button>
          <Button variant="secondary" onClick={() => onSend(null)}>
            Später
          </Button>
        </div>
      )}
    </div>
  );
}

export function PeerCard({ f }: { f: PeerFeedback }) {
  const i = TEAM.findIndex((x) => x.name === f.name);
  const t = TEAM[i];
  return (
    <Card className="fb">
      <span className="av sm" style={{ background: ["var(--p1)", "var(--p2)", "var(--p3)"][i] || "var(--sl)" }}>
        {t?.initials || f.name.slice(0, 2)}
      </span>
      <div>
        <b>
          {f.name} <span className="mut normal">· {t?.role}</span>
        </b>
        <span>{f.text}</span>
        <span className="stars" aria-label={`${f.stars} von 5 Sternen`}>
          {"★".repeat(f.stars)}
          <span className="off">{"★".repeat(5 - f.stars)}</span>
        </span>
      </div>
    </Card>
  );
}

export function UpdateCard({
  before,
  after,
  learned,
  recs,
}: {
  before: number;
  after: number;
  learned?: string;
  recs: { type: string; title: string; why: string }[];
}) {
  return (
    <motion.div className="stack" variants={STAGGER} initial="hidden" animate="show">
      <MCard variants={ITEM} className="row" style={{ gap: 14 }}>
        <Ring size={70} width={7} pct={after} color="var(--p1)">
          <b className="h-md">{after}</b>
        </Ring>
        <div style={{ flex: 1 }}>
          <b>Präsentieren</b>
          <span className="xp" style={{ display: "block" }}>
            +{after - before} % durch diese Erfahrung
          </span>
        </div>
      </MCard>
      {learned && (
        <motion.div variants={ITEM} className="noti">
          <span className="ib sm">
            <Icon name="bulb" size={15} />
          </span>
          <span className="noti-tx">
            <b>Kompass hat gelernt</b>
            <span>{learned}</span>
          </span>
        </motion.div>
      )}
      <motion.b variants={ITEM} className="sect">
        Neue Vorschläge
      </motion.b>
      {recs.slice(0, 2).map((r, i) => (
        <motion.div key={i} variants={ITEM} className={`card sug ${r.type === "Üben" ? "hot" : ""}`}>
          <span className="tx">
            <Tag accent={r.type === "Üben"}>
              {r.type === "Intern" ? "Lernen" : r.type}
              {r.why && r.why.length <= 14 ? ` · ${r.why}` : ""}
            </Tag>
            <b>{r.title}</b>
          </span>
          <Badge variant="accent">neu</Badge>
        </motion.div>
      ))}
    </motion.div>
  );
}

const LOOP = ["Geübt", "Angewendet", "Reflektiert", "Feedback", "Neue Ziele"];

export function LoopCard() {
  return (
    <Card className="loop">
      <b>Learning Loop geschlossen</b>
      <div className="chips">
        {LOOP.map((l) => (
          <Badge key={l} className="gap-1 px-2.5 py-1">
            <Icon name="check" size={13} />
            {l}
          </Badge>
        ))}
      </div>
    </Card>
  );
}

export function SummaryCard({ name, focus }: { name: string; focus: { name: string; pct: number; color?: string }[] }) {
  return (
    <Card>
      <span className="mut xs">Lernpfad für {name} erstellt · deine Fokus-Skills</span>
      <div className="tiles" style={{ marginTop: 8 }}>
        {focus.map((f) => (
          <div key={f.name} className="tile">
            <Ring size={40} width={4} pct={f.pct} color={f.color || "var(--p1)"}>
              <b className="xxs">{f.pct}</b>
            </Ring>
            <span>{f.name}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
