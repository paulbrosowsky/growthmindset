"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/shadcn/button";
import type { Slide } from "@/lib/types";
import { Icon, ITEM, MCard, Ring, STAGGER } from "./ui";

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

/** Drei Wege (Konzept-Screen 5): Üben ist die stärkste Karte. */
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
        const dur = o.detail && o.detail.length <= 14 ? ` · ${o.detail}` : "";
        return (
          <motion.button
            key={i}
            variants={ITEM}
            whileTap={onPick ? { scale: 0.97 } : undefined}
            className={`card sug ${hot ? "hot" : ""}`}
            disabled={!onPick}
            onClick={() => onPick?.(`${i + 1} · ${o.title}`)}
          >
            <span className={`ck ${hot ? "a" : ""}`}>
              <Icon name={k.icon} size={14} />
            </span>
            <div className="tx">
              <span className={`tag ${hot ? "acc" : ""}`}>
                {k.tag}
                {dur}
              </span>
              <b>{o.title}</b>
            </div>
            <span className="xp">+{k.xp}</span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}

const BAR_COLORS = ["var(--p1)", "var(--p2)", "var(--p3)"];
const BAR_WIDTHS = [80, 55, 35];

/** Folienentwurf (Konzept-Screen 6): eine Folie, Punkte, Sprechernotiz. */
export function SlidesCard({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(slides.length > 1 ? 1 : 0);
  const s = slides[i];
  if (!s) return null;
  return (
    <MCard style={{ padding: 10 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <button className="slide-face" style={{ width: "100%", textAlign: "left" }} onClick={() => setI((i + 1) % slides.length)} aria-label="Nächste Folie">
        <span className="tag acc">
          Folie {i + 1} von {slides.length}
        </span>
        <b>{s.title}</b>
        <div className="pts">
          {s.bullets.slice(0, 3).map((b, j) => (
            <div key={j} className="row">
              <span>{b}</span>
              <div className="bar s6" style={{ flex: 1 }}>
                <motion.i
                  style={{ display: "block", height: "100%", borderRadius: 9, background: BAR_COLORS[j] }}
                  initial={{ width: 0 }}
                  animate={{ width: `${BAR_WIDTHS[j]}%` }}
                  transition={{ type: "spring", stiffness: 60, damping: 18, delay: 0.1 * j }}
                />
              </div>
            </div>
          ))}
        </div>
      </button>
      <div className="dots pager" style={{ justifyContent: "center", margin: "8px 0 6px", display: "flex" }}>
        {slides.map((_, j) => (
          <i key={j} className={j === i ? "cur" : ""} onClick={() => setI(j)} />
        ))}
      </div>
      <div style={{ fontSize: 11.5 }}>
        <b>Sprechernotiz:</b> {s.note}
      </div>
    </MCard>
  );
}

/** Kollegen fragen (Konzept-Screen 9). */
export function PeerAskCard({ done, onSend, names }: { done?: boolean; onSend: (ok: boolean) => void; names: string[] }) {
  if (done) return null;
  return (
    <motion.div className="row" style={{ gap: 8 }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Button className="flex-1" onClick={() => onSend(true)} aria-label={`Ja, ${names.join(", ")} anfragen`}>
        Ja, anfragen
      </Button>
      <Button variant="secondary" onClick={() => onSend(false)}>
        Später
      </Button>
    </motion.div>
  );
}

/** Kurzer Hinweis mit Sprung in einen anderen Bereich der App. */
export function LinkCard({ icon, title, sub, onOpen }: { icon: string; title: string; sub?: string; onOpen: () => void }) {
  return (
    <motion.button className="card sug" onClick={onOpen} whileTap={{ scale: 0.98 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <span className="ck">
        <Icon name={icon} size={14} />
      </span>
      <div className="tx">
        {sub && <span className="tag">{sub}</span>}
        <b>{title}</b>
      </div>
      <Icon name="send" className="mut" />
    </motion.button>
  );
}

/** Abschluss des Onboardings: Fokus-Skills als Ringe. */
export function SummaryCard({ focus }: { focus: { name: string; pct: number; color?: string }[] }) {
  return (
    <MCard style={{ padding: 12 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="mut xs" style={{ marginBottom: 8 }}>
        Deine Fokus-Skills
      </div>
      <div className="tiles">
        {focus.map((f, i) => (
          <div key={f.name} className={`tile ${i === 0 ? "on" : ""}`}>
            <Ring size={38} width={4} pct={f.pct} color={f.color || "var(--p1)"}>
              <b style={{ fontSize: 10 }}>{f.pct}</b>
            </Ring>
            <span>{f.name}</span>
          </div>
        ))}
      </div>
    </MCard>
  );
}
