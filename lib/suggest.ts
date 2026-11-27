// „Passt zu deinen Zielen“: Vorschläge, die sich am persönlichen Lernpfad ausrichten.
// Reihenfolge: nächste offene Challenge, Ziele aus dem Chat, Lücken laut Stellenprofil, Austausch im Team.
// Lernweise aus dem Kennenlernen bestimmt, welche Formate nach vorn rücken.
import { findSkill, roleFor, skillLevel, TEAM, trainingFor, type Challenge } from "./knowledge";
import { saaLabel } from "./saa";
import type { AppState } from "./types";

export type SuggestKind = "uebung" | "leitlinie" | "fortbildung" | "kollege" | "ressource";

export type Suggestion = {
  id: string;
  kind: SuggestKind;
  /** Kompetenzbereich (für die Farbe) */
  area: string;
  label: string;
  title: string;
  meta: string;
  /** Wozu der Vorschlag passt */
  why: string;
  /** Frage an LENA im Coach; ohne prompt wird der Vorschlag vorgemerkt */
  prompt?: string;
};

type PathInfo = { challenges: Challenge[]; done: string[]; cur: number; title: string };

const areaOfSkill = (s: AppState, skill: string) => s.areas.find((a) => a.skills.some((k) => k.id === skill))?.id ?? "fach";
const short = (ref: string) => ref.replace(/^Handreichung /, "").replace(/<c>/, "c").replace(/ – Herangehensweise$/, "-Schema");

export function suggestions(state: AppState, path: PathInfo | null, max = 6): Suggestion[] {
  const out: (Suggestion & { score: number })[] = [];
  const how = `${state.profile?.preference || ""} ${(state.profile?.card?.wie ?? []).join(" ")}`.toLowerCase();
  const likes = {
    leitlinie: /les|zusammenfass|text|nachschlag/.test(how) ? 2 : 0,
    kollege: /austausch|kolleg|gespräch|team|andere/.test(how) ? 2 : 0,
    uebung: /praxis|üb|ausprobier|anwend|video/.test(how) ? 2 : 0,
    fortbildung: /kurs|seminar|präsenz|fortbild/.test(how) ? 1 : 0,
    ressource: 0,
  };
  const add = (s: Suggestion, base: number) => {
    if (out.some((x) => x.title.toLowerCase() === s.title.toLowerCase())) return;
    out.push({ ...s, score: base + likes[s.kind] });
  };

  // 1. Nächste offene Challenges des Lernpfads
  if (path && path.cur >= 0) {
    const open = path.challenges.map((c, i) => ({ c, i })).filter(({ c }) => !path.done.includes(c.id));
    open.slice(0, 2).forEach(({ c, i }, k) => {
      const why = k === 0 ? "Nächste Challenge" : `Zu Challenge ${i + 1}`;
      const ref = c.refs?.[0];
      if (ref && !c.title.toLowerCase().includes(short(ref).toLowerCase()) && !out.some((x) => x.meta === saaLabel(ref)))
        add(
          {
            id: `ref-${c.id}`,
            kind: "leitlinie",
            area: c.area,
            label: "Leitlinie · 10 min",
            title: `${short(ref)} nachlesen`,
            meta: saaLabel(ref),
            why,
            prompt: `Fass mir „${ref}“ aus den SAA und BPR kurz zusammen, mit Seitenangabe.`,
          },
          20 - k * 6,
        );
      add(
        {
          id: `ch-${c.id}`,
          kind: c.kind === "Lernen" ? "ressource" : "uebung",
          area: c.area,
          label: `${c.kind} · ${c.min} min`,
          title: c.title,
          meta: c.fromChat ? "Dein Ziel aus dem Chat" : "Mit LENA vorbereiten",
          why,
          prompt: `Hilf mir, die Challenge „${c.title}“ vorzubereiten.`,
        },
        19 - k * 6,
      );
    });
    // Ziele aus dem Chat, die weiter hinten im Pfad liegen
    open
      .slice(2)
      .filter(({ c }) => c.fromChat)
      .forEach(({ c, i }) =>
        add(
          { id: `chat-${c.id}`, kind: "uebung", area: c.area, label: `${c.kind} · ${c.min} min`, title: c.title, meta: "Dein Ziel aus dem Chat", why: `Zu Challenge ${i + 1}`, prompt: `Hilf mir, die Challenge „${c.title}“ vorzubereiten.` },
          12,
        ),
      );
  }

  // 2. Lücken laut Stellenprofil: passende Fortbildung und Material
  const role = roleFor(state.profile?.role);
  const gaps = role.core
    .map((c) => {
      const sk = c.skill ? findSkill(state.areas, c.skill) : undefined;
      return sk ? { c, sk, gap: c.soll - skillLevel(sk) } : null;
    })
    .filter((x): x is NonNullable<typeof x> => !!x && x.gap > 0)
    .sort((a, b) => b.gap - a.gap || Number(state.focus.includes(b.sk.id)) - Number(state.focus.includes(a.sk.id)));
  gaps.slice(0, 3).forEach(({ c, sk, gap }, k) => {
    const f = trainingFor(sk.id, role);
    const area = areaOfSkill(state, sk.id);
    if (f)
      add(
        {
          id: `fb-${f.id}`,
          kind: "fortbildung",
          area,
          label: `Fortbildung · ${f.duration}`,
          title: `${f.id} ${f.title}`,
          meta: f.turnus[0].toUpperCase() + f.turnus.slice(1),
          why: `Lücke ${c.name} (${gap} ${gap === 1 ? "Stufe" : "Stufen"})`,
        },
        10 - k * 2,
      );
    const rec = sk.recs.find((r) => r.type !== "Intern");
    if (rec)
      add(
        {
          id: `rec-${rec.id}`,
          kind: rec.type === "Üben" ? "uebung" : "ressource",
          area,
          label: `${rec.type === "Üben" ? "Übung" : "Material"}${rec.meta ? ` · ${rec.meta}` : ""}`,
          title: rec.title.replace(/\s*\(SAA und BPR 2025.*\)$/, ""),
          meta: sk.name,
          why: `Stärkt ${c.name}`,
          prompt: rec.type === "Üben" ? `Lass uns „${rec.title}“ üben.` : `Was steht in „${rec.title}“, das mir für mein Ziel hilft?`,
        },
        7 - k * 2,
      );
  });

  // 3. Austausch: Praxisanleitung im Team
  const mentor = TEAM.find((t) => /praxisanleit/i.test(t.role)) ?? TEAM[0];
  if (mentor && path) {
    const first = mentor.name.split(" ")[0];
    add(
      {
        id: `team-${mentor.initials}`,
        kind: "kollege",
        area: "komm",
        label: "Austausch · 20 min",
        title: `Mit ${first} über dein Ziel sprechen`,
        meta: mentor.role,
        why: likes.kollege ? "Passt zu „Austausch“" : "Lernen mit anderen",
        prompt: `Wie nutze ich ein kurzes Gespräch mit ${mentor.name} für mein Ziel „${path.title}“?`,
      },
      6,
    );
  }

  // Erste Kachel bleibt die nächste Challenge, der Rest nach Passung.
  const [first, ...rest] = out;
  if (!first) return [];
  return [first, ...rest.sort((a, b) => b.score - a.score)].slice(0, max).map(({ score, ...s }) => (void score, s));
}

