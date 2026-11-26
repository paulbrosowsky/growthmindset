import { NextRequest, NextResponse } from "next/server";
import { askJSON, hasKey, MODEL } from "@/lib/claude";
import { fallback } from "@/lib/fallbacks";
import { findSkill, skillProgress } from "@/lib/knowledge";
import type { AppState } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const str = { type: "string" } as const;
const strArr = { type: "array", items: str } as const;
const obj = (props: Record<string, unknown>) => ({
  type: "object",
  properties: props,
  required: Object.keys(props),
  additionalProperties: false,
});
const levelChanges = {
  type: "array",
  items: obj({ sub: str, level: { type: "integer" }, reason: str }),
};

function context(s: AppState): string {
  const p = s.profile;
  const lines: string[] = [];
  if (p)
    lines.push(
      `Profil: ${p.name}; Rolle: ${p.role}; im Unternehmen: ${p.tenure}; Erfahrung: ${p.experience}; Interessen: ${p.interests}; Challenge: ${p.challenge}; Lernpräferenz: ${p.preference}; Ziel: ${p.goal}.`,
    );
  lines.push(
    "Lernpfad (Skill: Fortschritt; Teilkompetenzen mit Stufe 0-5):\n" +
      s.areas
        .flatMap((a) =>
          a.skills.map(
            (sk) =>
              `- ${a.name} / ${sk.name} [${sk.id}]: ${skillProgress(sk)} % (${sk.subs.map((x) => `${x.name} [${x.id}] ${x.level}`).join(", ")})`,
          ),
        )
        .join("\n"),
  );
  if (s.journal.length)
    lines.push("Letzte Erfahrungen:\n" + s.journal.slice(0, 6).map((j) => `- ${j.kind}: ${j.title}${j.detail ? ` (${j.detail})` : ""}`).join("\n"));
  if (s.memory.length) lines.push("Was du dir über die Person gemerkt hast:\n" + s.memory.map((m) => `- ${m}`).join("\n"));
  if (s.presentation) lines.push(`Anstehende Präsentation: ${s.presentation.topic}${s.presentation.atLabel ? `, ${s.presentation.atLabel}` : ""}.`);
  return lines.join("\n\n");
}

type Body = {
  task: string;
  script?: boolean;
  state: AppState;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
};

export async function GET() {
  return NextResponse.json({ live: hasKey, model: hasKey ? MODEL : null });
}

export async function POST(req: NextRequest) {
  const { task, state, payload, script } = (await req.json()) as Body;
  const live = hasKey && !script;
  const ask: typeof askJSON = live ? askJSON : ((async () => null) as typeof askJSON);
  const ctx = context(state);
  const name = state.profile?.name || "die Person";
  const praes = findSkill(state.areas, "praes");
  const praesPct = praes ? skillProgress(praes) : 50;

  const run = async () => {
    switch (task) {
      case "welcome": {
        const out = await ask<ReturnType<typeof fallback.welcome>>(
          `${ctx}\n\nDas Onboarding ist abgeschlossen, du erstellst jetzt den persönlichen Lernpfad.\nsummary: 2 bis 3 Sätze direkt an ${name}, die Rolle, Ziel und Challenge aufgreifen und zeigen, worauf der Lernpfad aufbaut und wohin er führt.\nfocus: genau 3 Skill-IDs aus dem Kompetenzmodell, die für Rolle und Ziel jetzt am meisten bringen. „praes“ ist immer dabei.\nfirstStep: ein kleiner, konkreter erster Schritt für diese Woche aus dem Arbeitsalltag (70-Prozent-Lernen), ein Satz.`,
          obj({ summary: str, focus: strArr, firstStep: str }),
        );
        if (out && !out.focus.includes("praes")) out.focus = ["praes", ...out.focus].slice(0, 3);
        return out ?? fallback.welcome(state.profile);
      }
      case "prep": {
        const out = await ask<ReturnType<typeof fallback.prep>>(
          `${ctx}\n\n${name} hat gesagt, morgen eine Präsentation zu halten, und möchte sich vorbereiten. Thema und Publikum: „${payload.topic}“.\ntext: 2 Sätze. Würdige den Fortschritt im Skill Präsentieren (${praesPct} %), nenne konkret, worauf es bei dieser Präsentation ankommt, bezogen auf die schwächsten Teilkompetenzen. Ende mit einer Überleitung zu drei Vorschlägen (ohne sie zu nennen).\noptions: genau 3 in dieser Reihenfolge: kind "video" (kurzes Grundlagen-Video), kind "read" (etwas zum Lesen), kind "practice" (eigenes Video aufnehmen und üben, mit Feedback von dir). title: kurz und konkret auf das Thema bezogen, max. 60 Zeichen. detail: Dauer oder Nutzen, max. 60 Zeichen.`,
          obj({
            text: str,
            options: { type: "array", items: obj({ kind: { type: "string", enum: ["video", "read", "practice"] }, title: str, detail: str }) },
          }),
        );
        if (out && out.options.length === 3) return out;
        return fallback.prep(payload.topic, praesPct);
      }
      case "slides": {
        const out = await ask<ReturnType<typeof fallback.slides>>(
          `${ctx}\n\nErstelle einen Folienentwurf für die Präsentation „${payload.topic}“. Genau 5 Folien mit Storytelling-Bogen: Einstieg mit einer kurzen Geschichte, Kernaussage, Zahlen mit Bedeutung, Risiken und Optionen, klare Bitte am Ende. title max. 50 Zeichen, bullets: genau 3 Stichpunkte mit je max. 45 Zeichen, note: Sprechernotiz mit 1 bis 2 Sätzen, die gezielt die schwachen Teilkompetenzen trainiert (z. B. Pause, Blickkontakt, Umgang mit Rückfragen). Erfinde keine konkreten Zahlen, nutze Platzhalter wie „Kennzahl X“.`,
          obj({ slides: { type: "array", items: obj({ title: str, bullets: strArr, note: str }) } }),
          { maxTokens: 3000 },
        );
        return out && out.slides.length ? out : fallback.slides(payload.topic);
      }
      case "video": {
        const frames: string[] = (payload.frames || []).slice(0, 6);
        const transcript: string = (payload.transcript || "").slice(0, 6000);
        const out = await ask<ReturnType<typeof fallback.video>>(
          `${ctx}\n\nDas ist eine Generalprobe: ${name} hat sich bei der Übung der Präsentation „${payload.topic}“ selbst aufgenommen. Dauer: ${Math.round(payload.duration || 0)} Sekunden. Du siehst ${frames.length} Standbilder aus dem Video in zeitlicher Reihenfolge.\nTranskript der Spracherkennung: ${transcript ? `„${transcript}“` : "(keins vorhanden, äußere dich dann nicht zum Gesagten)"}\n\nBewerte nur, was du in den Bildern siehst (Haltung, Blickkontakt zur Kamera, Gestik, Mimik, Licht und Bildausschnitt) und was im Transkript steht (Struktur, Einstieg, Schluss, Füllwörter, Länge). Ton und Stimme kannst du nicht hören, erfinde dazu nichts. Wenn die Bilder keine präsentierende Person zeigen, sag das freundlich in improve.\ngood: 3 konkrete Stärken, je 1 Satz. improve: 3 konkrete Verbesserungen, je 1 Satz, als nächster Lernschritt formuliert. tip: 1 Satz, was ${name} bis morgen noch üben soll.\nlevelChanges: nur Teilkompetenzen des Skills praes (IDs struktur, folien, story, koerper, fragen), neue Stufe höchstens 1 über der aktuellen, nur wenn die Übung es begründet; sonst leer. reason kurz.`,
          obj({ good: strArr, improve: strArr, tip: str, levelChanges }),
          { images: frames, maxTokens: 3000, effort: "medium" },
        );
        return out ?? fallback.video();
      }
      case "react": {
        const out = await ask<{ text: string }>(
          `${ctx}\n\nDie Präsentation ist vorbei. Du hast gefragt, wie sie gelaufen ist. Antwort von ${name}: „${payload.answer}“.\ntext: 1 bis 2 Sätze. Reagiere empathisch und passend auf die Antwort und frage dann, was gut geklappt hat. Nur eine Frage.`,
          obj({ text: str }),
          { maxTokens: 800 },
        );
        return out ?? fallback.react(payload.answer || "");
      }
      case "reflect": {
        const out = await ask<{ text: string }>(
          `${ctx}\n\nReflexion nach der Präsentation. Wie lief es: „${payload.how}“. Was gut war: „${payload.good}“. Was ${name} anders machen würde: „${payload.bad}“.\ntext: 2 bis 3 Sätze. Würdige den Fortschritt (Growth Mindset, beziehe dich wenn passend auf die Generalprobe), formuliere die Schwäche als nächsten Lernschritt mit einem konkreten Tipp. Keine Frage am Ende.`,
          obj({ text: str }),
          { maxTokens: 1000 },
        );
        return out ?? fallback.reflect();
      }
      case "peers": {
        const names: string[] = payload.names || [];
        const out = await ask<ReturnType<typeof fallback.peers>>(
          `${ctx}\n\nSimuliere für die Demo die Rückmeldungen, die die Kompass-Assistenten dieser Kollegen eingeholt haben: ${names.join(", ")}. Sie haben die Präsentation „${payload.topic}“ gesehen. Selbsteinschätzung von ${name}: lief „${payload.how}“, gut war „${payload.good}“, anders machen würde sie/er „${payload.bad}“.\nfeedback: je Kollege ein Eintrag mit exakt dem Namen, stars 1 bis 5, text 2 Sätze nach SBI, konstruktiv, realistisch und unterschiedlich je Rolle. Die Kollegen bestätigen manches aus der Selbsteinschätzung, ergänzen aber auch einen Punkt, den ${name} nicht genannt hat.`,
          obj({ feedback: { type: "array", items: obj({ name: str, stars: { type: "integer" }, text: str }) } }),
          { maxTokens: 2000 },
        );
        if (out && out.feedback.length) {
          out.feedback = out.feedback.filter((f) => names.includes(f.name)).map((f) => ({ ...f, stars: Math.max(1, Math.min(5, f.stars)) }));
          if (out.feedback.length) return out;
        }
        return fallback.peers(names);
      }
      case "synth": {
        const out = await ask<ReturnType<typeof fallback.synth>>(
          `${ctx}\n\nSchließe den Learning Loop nach der Präsentation „${payload.topic}“.\nSelbsteinschätzung: lief „${payload.how}“, gut: „${payload.good}“, anders machen: „${payload.bad}“.\nFeedback der Kollegen:\n${(payload.feedback || []).map((f: { name: string; stars: number; text: string }) => `- ${f.name} (${f.stars}/5): ${f.text}`).join("\n")}\n\nsummary: 2 Sätze an ${name}: was die Erfahrung zeigt und der klare nächste Hebel.\nlevelChanges: Teilkompetenzen des Skills praes (IDs struktur, folien, story, koerper, fragen), neue Stufe höchstens 1 über der aktuellen und max. 5, nur wo Selbst- und Fremdeinschätzung es begründen. reason kurz mit Quelle.\nrecommendations: genau 3 neue Vorschläge nach 70/20/10: eine Übung oder Challenge im Arbeitsalltag (type "Üben"), ein internes Angebot aus dem Katalog (type "Intern"), ein externer Inhalt (type "Extern"). title max. 70 Zeichen, why 1 kurzer Satz mit Bezug zum Feedback.\nmemory: 2 bis 3 kurze Erkenntnisse über ${name}, die du dir für künftige Sessions merkst.`,
          obj({
            summary: str,
            levelChanges,
            recommendations: { type: "array", items: obj({ type: { type: "string", enum: ["Intern", "Ressource", "Extern", "Üben"] }, title: str, why: str }) },
            memory: strArr,
          }),
          { maxTokens: 3000, effort: "medium" },
        );
        return out ?? fallback.synth();
      }
      case "chat": {
        const history: { from: string; text: string }[] = payload.history || [];
        const out = await ask<{ text: string }>(
          `${ctx}\n\nBisheriger Chat (Auszug):\n${history.map((h) => `${h.from === "me" ? name : "Kompass"}: ${h.text}`).join("\n")}\n\nNeue Nachricht von ${name}: „${payload.text}“\ntext: Deine Antwort als Lern-Coach, max. 4 Sätze, konkret und mit Bezug auf Lernpfad, Unternehmen oder Lernmethoden. Wenn es passt, schlag einen kleinen nächsten Schritt vor.`,
          obj({ text: str }),
          { maxTokens: 1500 },
        );
        return out ?? fallback.chat();
      }
      default:
        return null;
    }
  };

  const result = await run();
  if (!result) return NextResponse.json({ error: "Unbekannte Aufgabe" }, { status: 400 });
  return NextResponse.json({ result, live });
}
