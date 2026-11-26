// Gemeinsamer Kontext für Text-Coach (Claude) und Sprach-Coach (OpenAI Realtime).
import { findSkill, MANDATORY_DONE_DEFAULT, mandatoryFor, PATH_AREAS, roleFor, skillLevel, skillProgress, trainingFor } from "./knowledge";
import { SAA_TOC } from "./saa";
import type { AppState, ChallengeKind, PathChallenge } from "./types";

/** Profil, Kompetenzen, Jobprofil, Lernpfad und Gemerktes als Prompt-Kontext. */
export function coachContext(s: AppState): string {
  const p = s.profile;
  const lines: string[] = [];
  if (p) {
    const fields: [string, string | undefined][] = [
      ["Name", p.name],
      ["Rolle", p.role],
      ["Bisherige Stationen", p.experience],
      ["Macht Spaß / meidet", p.likes],
      ["Möchte lernen", p.learn],
      ["In 3 Jahren", p.vision],
      ["Lernziel nächste 4 Wochen (gemeinsam vereinbart)", p.goal],
      ["Lernt am besten", p.preference],
      ["Zeitrahmen fürs Lernen", p.time],
      ["Im Unternehmen", p.tenure],
      ["Interessen", p.interests],
      ["Challenge", p.challenge],
    ];
    lines.push("Profil:\n" + fields.filter(([, v]) => v).map(([k, v]) => `- ${k}: ${v}`).join("\n"));
  }
  lines.push(
    "Lernpfad (Skill: Fortschritt; Teilkompetenzen mit Stufe 0-4):\n" +
      s.areas
        .flatMap((a) =>
          a.skills.map(
            (sk) =>
              `- ${a.name} / ${sk.name} [${sk.id}]: ${skillProgress(sk)} % (${sk.subs.map((x) => `${x.name} [${x.id}] ${x.level}`).join(", ")})`,
          ),
        )
        .join("\n"),
  );
  const role = roleFor(p?.role);
  const rows = role.core.map((c) => {
    const sk = c.skill ? findSkill(s.areas, c.skill) : undefined;
    if (!sk) return { text: `${c.name}: Soll ${c.soll}, Ist noch nicht bewertet`, gap: "" };
    const ist = skillLevel(sk);
    const fb = ist < c.soll ? trainingFor(sk.id, role) : undefined;
    return {
      text: `${c.name} [${sk.id}]: Ist ${ist}, Soll ${c.soll}`,
      gap: ist < c.soll ? `${c.name} (Ist ${ist}, Soll ${c.soll})${fb ? `: passend ${fb.id} ${fb.title}` : ""}` : "",
    };
  });
  lines.push(`Jobprofil: ${role.name} (${role.dept})\nKompetenzbewertung (Stufen 1 bis 4):\n${rows.map((r) => `- ${r.text}`).join("\n")}\nEntwicklungsmöglichkeiten: ${role.growth.join("; ")}`);
  const gaps = rows.map((r) => r.gap).filter(Boolean);
  if (gaps.length) lines.push(`Kompetenzlücken laut Jobprofil: ${gaps.join("; ")}`);
  const done = s.mandatoryDone ?? MANDATORY_DONE_DEFAULT;
  const open = mandatoryFor(p?.role).filter((m) => !done.includes(m.id));
  if (open.length) lines.push(`Offene oder abgelaufene Pflichtschulungen: ${open.map((m) => `${m.id} ${m.title}`).join(", ")}`);
  if (s.journal.length)
    lines.push("Letzte Erfahrungen:\n" + s.journal.slice(0, 6).map((j) => `- ${j.kind}: ${j.title}${j.detail ? ` (${j.detail})` : ""}`).join("\n"));
  if (s.goalPath?.challenges.length) {
    const done = s.pathDone ?? [];
    lines.push(
      `Persönlicher 4-Wochen-Lernpfad „${s.goalPath.title}“ (Challenges in Reihenfolge):\n` +
        s.goalPath.challenges.map((c) => `- ${done.includes(c.id) ? "[erledigt] " : ""}${c.title} (${c.kind}, ${c.min} min)${c.fromChat ? " – im Chat gesetzt" : ""}`).join("\n"),
    );
  }
  if (s.memory.length) lines.push("Was du dir über die Person gemerkt hast:\n" + s.memory.map((m) => `- ${m}`).join("\n"));
  if (s.presentation) lines.push(`Anstehende Präsentation: ${s.presentation.topic}${s.presentation.atLabel ? `, ${s.presentation.atLabel}` : ""}.`);
  return lines.join("\n\n");
}


export const CHALLENGE_KINDS: ChallengeKind[] = ["Lernen", "Üben", "Anwenden", "Reflexion"];
const saaTitles = new Set(SAA_TOC.map((e) => e.title));

/** KI-Vorschlag für eine Challenge prüfen und normalisieren; null, wenn unbrauchbar. */
export function cleanChal(c: Omit<PathChallenge, "id">, id: string, fromChat = false): PathChallenge | null {
  const title = (c.title || "").trim().replace(/[.!]$/, "");
  if (!title || title.split(/\s+/).length > 9) return null;
  return {
    id,
    area: PATH_AREAS.includes(c.area) ? c.area : "fach",
    title,
    kind: CHALLENGE_KINDS.includes(c.kind) ? c.kind : "Anwenden",
    min: Math.max(5, Math.min(60, Math.round(c.min || 15))),
    text: (c.text || "").trim(),
    refs: (c.refs || []).filter((r) => saaTitles.has(r)).slice(0, 2),
    ...(fromChat ? { fromChat } : {}),
  };
}
