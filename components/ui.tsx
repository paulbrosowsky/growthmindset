"use client";

import { motion } from "motion/react";
import { Card } from "@/components/shadcn/card";

import type { CSSProperties, ReactNode } from "react";

const PATHS: Record<string, ReactNode> = {
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  orb: (
    <>
      <circle cx="12" cy="12" r="4" />
      <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(-25 12 12)" />
    </>
  ),
  team: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c.5-4 3-6 6-6s5.5 2 6 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16 14c3 0 4.6 2 5 5" />
    </>
  ),
  star: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
  bell: (
    <>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" />
      <path d="M10 21h4" />
    </>
  ),
  back: <path d="M15 5l-7 7 7 7" />,
  send: <path d="M5 12h13M13 6l6 6-6 6" />,
  cam: (
    <>
      <rect x="3" y="6" width="13" height="12" rx="3" />
      <path d="M16 10l5-3v10l-5-3" />
    </>
  ),
  book: (
    <>
      <path d="M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1z" />
      <path d="M12 6v14" />
    </>
  ),
  vid: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M10 9v6l5-3z" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6-6-6-11a6 6 0 0 1 12 0c0 5-6 11-6 11z" />
      <circle cx="12" cy="10" r="2" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  up: <path d="M12 19V5M6 11l6-6 6 6" />,
  bulb: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />,
  fire: <path d="M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.4 2-4.4.2 1.6 1 2.4 2 2.4 0-3 0-5.5 1-8z" fill="currentColor" stroke="none" />,
  logo: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.8 9.2l-1.6 4-4 1.6 1.6-4z" fill="currentColor" />
    </>
  ),
  upload: <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />,
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
    </>
  ),
  cal: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="3" />
      <path d="M4 10h16M9 3v4M15 3v4" />
    </>
  ),
  shield: <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />,
  chev: <path d="M9 5l7 7-7 7" />,
  down: <path d="M6 9l6 6 6-6" />,
  ext: <path d="M7 17L17 7M9 7h8v8" />,
  restart: <path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4.5h4.5" />,
};

export function Icon({ name, size = 18, style, className }: { name: string; size?: number; style?: CSSProperties; className?: string }) {
  return (
    <svg className={`ic ${className || ""}`} viewBox="0 0 24 24" width={size} height={size} style={{ width: size, height: size, ...style }} aria-hidden>
      {PATHS[name]}
    </svg>
  );
}

const SPRING = { type: "spring", stiffness: 60, damping: 18, mass: 1 } as const;

/** Fortschrittsring; füllt sich mit Motion beim ersten Zeigen und bei jeder Änderung. */
export function Ring({ size, width, pct, color, children }: { size: number; width: number; pct: number; color: string; children?: ReactNode }) {
  const R = (size - width) / 2;
  return (
    <span className="rg" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="#ECECE7" strokeWidth={width} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={R}
          fill="none"
          stroke={color}
          strokeWidth={width}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: Math.max(0.001, pct / 100) }}
          transition={SPRING}
        />
      </svg>
      {children}
    </span>
  );
}

export function ConcentricRings({
  size,
  rings,
  children,
  width = 6,
  gap = 9,
  outer,
}: {
  size: number;
  rings: { pct: number; color: string }[];
  children?: ReactNode;
  width?: number;
  gap?: number;
  outer?: number;
}) {
  const c = size / 2;
  const w = width;
  const R0 = outer ?? c - 3;
  return (
    <span className="rg" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`}>
        {rings.map((r, i) => {
          const R = R0 - i * gap;
          return (
            <g key={i}>
              <circle cx={c} cy={c} r={R} fill="none" stroke="#ECECE7" strokeWidth={w} />
              <motion.circle
                cx={c}
                cy={c}
                r={R}
                fill="none"
                stroke={r.color}
                strokeWidth={w}
                strokeLinecap="round"
                transform={`rotate(-90 ${c} ${c})`}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: Math.max(0.001, r.pct / 100) }}
                transition={{ ...SPRING, delay: 0.08 * i }}
              />
            </g>
          );
        })}
      </svg>
      {children}
    </span>
  );
}

export function Tag({ children, accent }: { children: ReactNode; accent?: boolean }) {
  return <span className={`tag ${accent ? "acc" : ""}`}>{children}</span>;
}

/** Motion-Varianten: Kinder erscheinen nacheinander. */
export const STAGGER = { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } } };
export const ITEM = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 360, damping: 28 } },
};
export const MCard = motion.create(Card);
