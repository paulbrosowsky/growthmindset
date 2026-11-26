import { NextRequest, NextResponse } from "next/server";
import { askJSON, hasKey, MODEL } from "@/lib/claude";
import { fallback } from "@/lib/fallbacks";
import { findSkill, MANDATORY, MANDATORY_DONE_DEFAULT, roleFor, skillProgress } from "@/lib/knowledge";
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
  const role = roleFor(p?.role);
  lines.push(`Stellenprofil: ${role.name} (Soll: ${role.core.map((c) => `${c.skill} ${c.soll}/5`).join(", ")})`);
  const done = s.mandatoryDone ?? MANDATORY_DONE_DEFAULT;
  const open = MANDATORY.filter((m) => !done.includes(m.id));
  if (open.length) lines.push(`Offene Pflichtfortbildungen: ${open.map((m) => m.title).join(", ")}`);
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
          `${ctx}\n\nDas Onboarding ist abgeschlossen und das Lernziel gemeinsam vereinbart, du erstellst jetzt den persönlichen Lernpfad.\nsummary: 1 kurzer Satz an ${name} (max. 15 Wörter), der Fokus des Lernpfads.\nfocus: genau 3 Skill-IDs aus dem Kompetenzmodell, die für Rolle und Ziel jetzt am meisten bringen. „praes“ ist immer dabei.\nfirstStep: ein kleiner, konkreter erster Schritt aus dem Arbeitsalltag, der zum vereinbarten 4-Wochen-Lernziel, zur Lernweise und zum Zeitrahmen passt, Stichwort, max. 6 Wörter.`,
          obj({ summary: str, focus: strArr, firstStep: str }),
        );
        if (out && !out.focus.includes("praes")) out.focus = ["praes", ...out.focus].slice(0, 3);
        return out ?? fallback.welcome(state.profile);
      }
      case "onboard": {
        // Kennenlernen: kurze Reaktion auf die Antwort, optional eine individuelle Nachfrage.
        const history: { from: string; text: string }[] = payload.history || [];
        const left: number = payload.followUpsLeft ?? 0;
        const isFollowUpAnswer = Boolean(payload.isFollowUpAnswer);
        const out = await ask<{ reaction: string; followUp: string }>(
          `Du lernst ${payload.name || "die Person"} gerade im Onboarding kennen, um gemeinsam ein Lernziel zu finden. Du stellst 8 Kernfragen nach Wer, Was und Wie.\nBisheriges Gespräch:\n${history.map((h) => `${h.from === "me" ? payload.name || "Person" : "Kompass"}: ${h.text}`).join("\n")}\n\nAktuelle Kernfrage: „${payload.question}“\nAntwort: „${payload.answer}“\n${payload.nextQuestion ? `Danach folgt die Kernfrage: „${payload.nextQuestion}“ (stellt die App selbst).` : "Das war die letzte Kernfrage, danach fasst du das Profil zusammen."}\n\nfollowUp: ${isFollowUpAnswer || left <= 0 ? "leer lassen, keine Nachfrage mehr." : `Meistens leer lassen. Nur wenn die Antwort für das Lernziel wirklich zu unklar ist oder etwas Zentrales andeutet (z. B. etwas, das die Person meidet), eine individuelle, offene Nachfrage, max. 14 Wörter. Noch ${left} Nachfrage(n) im ganzen Onboarding erlaubt, spare sie für das Wichtigste.`}\nreaction: 1 kurzer, persönlicher Satz, der konkret aufgreift, was gesagt wurde, max. 12 Wörter, keine Frage, kein Lob für Talent. Wiederhole nicht die nächste Kernfrage.`,
          obj({ reaction: str, followUp: str }),
          { maxTokens: 800 },
        );
        if (out) {
          if (isFollowUpAnswer || left <= 0) out.followUp = "";
          return out;
        }
        return fallback.onboard(payload.step, payload.answer || "", left, isFollowUpAnswer);
      }
      case "profile": {
        const a = payload.answers || {};
        const out = await ask<ReturnType<typeof fallback.profile>>(
          `Fasse das Onboarding-Gespräch mit ${a.name} als Profil-Karte zusammen. Antworten:\n- Rolle: ${a.role}\n- Bisherige Stationen: ${a.experience}\n- Macht Spaß / meidet: ${a.likes}\n- Möchte lernen: ${a.learn}\n- In 3 Jahren: ${a.vision}\n- In 4 Wochen erreichen: ${a.goal}\n- Lernt am besten: ${a.preference}\n- Zeitrahmen: ${a.time}\n${payload.correction ? `\nDie letzte Zusammenfassung passte noch nicht. Korrektur von ${a.name}: „${payload.correction}“. Übernimm sie.\n` : ""}\nwer, was, wie: je 2 bis 3 Stichworte (max. 5 Wörter), in Du-Form gedacht, ohne Namen. wer = Rolle, Erfahrung, was Spaß macht und was gemieden wird. was = Lernthema und Perspektive in 3 Jahren. wie = Lernweise und Zeitrahmen.\ngoal: das gemeinsame Lernziel für die nächsten 4 Wochen, konkret und überprüfbar, max. 12 Wörter, beginnt mit „In 4 Wochen“.\nintro: 1 kurzer Satz an ${a.name}, der zur Karte überleitet, max. 10 Wörter.`,
          obj({ intro: str, wer: strArr, was: strArr, wie: strArr, goal: str }),
          { maxTokens: 1500 },
        );
        return out && out.wer.length ? out : fallback.profile(a, payload.correction || "");
      }
      case "prep": {
        const out = await ask<ReturnType<typeof fallback.prep>>(
          `${ctx}\n\n${name} hat gesagt, morgen eine Präsentation zu halten, und möchte sich vorbereiten. Thema und Publikum: „${payload.topic}“.\ntext: max. 20 Wörter. Würdige kurz den Fortschritt im Skill Präsentieren (${praesPct} %) und leite zu drei Wegen über, z. B. „Drei Wege bis morgen, du entscheidest:“.\noptions: genau 3 in dieser Reihenfolge: kind "video" (kurzes Grundlagen-Video), kind "read" (etwas zum Lesen), kind "practice" (eigenes Video aufnehmen und üben, mit Feedback von dir). title: max. 40 Zeichen. detail: nur die Dauer, z. B. „12 min“.`,
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
          `${ctx}\n\nErstelle einen Folienentwurf für die Präsentation „${payload.topic}“. Genau 5 Folien mit Storytelling-Bogen: Einstieg mit einer kurzen Geschichte, Kernaussage, Zahlen mit Bedeutung, Risiken und Optionen, klare Bitte am Ende. title max. 32 Zeichen, bullets: genau 3 Stichpunkte mit je max. 30 Zeichen, note: Sprechernotiz in 1 kurzen Satz (max. 14 Wörter), die gezielt die schwachen Teilkompetenzen trainiert (z. B. Pause, Blickkontakt, Umgang mit Rückfragen). Erfinde keine konkreten Zahlen, nutze Platzhalter wie „Kennzahl X“.`,
          obj({ slides: { type: "array", items: obj({ title: str, bullets: strArr, note: str }) } }),
          { maxTokens: 3000 },
        );
        return out && out.slides.length ? out : fallback.slides(payload.topic);
      }
      case "video": {
        const frames: string[] = (payload.frames || []).slice(0, 6);
        const transcript: string = (payload.transcript || "").slice(0, 6000);
        const out = await ask<ReturnType<typeof fallback.video>>(
          `${ctx}\n\nDas ist eine Generalprobe: ${name} hat sich bei der Übung der Präsentation „${payload.topic}“ selbst aufgenommen. Dauer: ${Math.round(payload.duration || 0)} Sekunden. Du siehst ${frames.length} Standbilder aus dem Video in zeitlicher Reihenfolge.\nTranskript der Spracherkennung: ${transcript ? `„${transcript}“` : "(keins vorhanden, äußere dich dann nicht zum Gesagten)"}\n\nBewerte nur, was du in den Bildern siehst (Haltung, Blickkontakt zur Kamera, Gestik, Mimik, Licht und Bildausschnitt) und was im Transkript steht (Struktur, Einstieg, Schluss, Füllwörter, Länge). Ton und Stimme kannst du nicht hören, erfinde dazu nichts. Wenn die Bilder keine präsentierende Person zeigen, sag das freundlich in improve.\ngood: genau 1 Eintrag, die wichtigste Stärke als Stichwort, max. 8 Wörter. improve: genau 1 Eintrag, der wichtigste nächste Lernschritt, max. 8 Wörter. tip: max. 10 Wörter, was ${name} bis morgen noch üben soll.\nlevelChanges: nur Teilkompetenzen des Skills praes (IDs struktur, folien, story, koerper, fragen), neue Stufe höchstens 1 über der aktuellen, nur wenn die Übung es begründet; sonst leer. reason kurz.`,
          obj({ good: strArr, improve: strArr, tip: str, levelChanges }),
          { images: frames, maxTokens: 3000, effort: "medium" },
        );
        return out ?? fallback.video();
      }
      case "react": {
        const out = await ask<{ text: string }>(
          `${ctx}\n\nDie Präsentation ist vorbei. Du hast gefragt, wie sie gelaufen ist. Antwort von ${name}: „${payload.answer}“.\ntext: max. 12 Wörter. Reagiere kurz empathisch und frage, was gut lief und was schwierig war.`,
          obj({ text: str }),
          { maxTokens: 800 },
        );
        return out ?? fallback.react(payload.answer || "");
      }
      case "reflect": {
        const out = await ask<{ text: string }>(
          `${ctx}\n\nReflexion nach der Präsentation. Wie lief es: „${payload.how}“. Was gut war: „${payload.good}“. Was ${name} anders machen würde: „${payload.bad}“.\ntext: max. 20 Wörter. Würdige den Fortschritt und gib einen konkreten Tipp zur Schwäche. Keine Frage.`,
          obj({ text: str }),
          { maxTokens: 1000 },
        );
        return out ?? fallback.reflect();
      }
      case "peers": {
        const names: string[] = payload.names || [];
        const out = await ask<ReturnType<typeof fallback.peers>>(
          `${ctx}\n\nSimuliere für die Demo die Rückmeldungen, die die Kompass-Assistenten dieser Kollegen eingeholt haben: ${names.join(", ")}. Sie haben die Präsentation „${payload.topic}“ gesehen. Selbsteinschätzung von ${name}: lief „${payload.how}“, gut war „${payload.good}“, anders machen würde sie/er „${payload.bad}“.\nfeedback: je Kollege ein Eintrag mit exakt dem Namen, stars 1 bis 5, text max. 10 Wörter, konkret und konstruktiv, realistisch und unterschiedlich je Rolle. Die Kollegen bestätigen manches aus der Selbsteinschätzung, ergänzen aber auch einen Punkt, den ${name} nicht genannt hat.`,
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
          `${ctx}\n\nSchließe den Learning Loop nach der Präsentation „${payload.topic}“.\nSelbsteinschätzung: lief „${payload.how}“, gut: „${payload.good}“, anders machen: „${payload.bad}“.\nFeedback der Kollegen:\n${(payload.feedback || []).map((f: { name: string; stars: number; text: string }) => `- ${f.name} (${f.stars}/5): ${f.text}`).join("\n")}\n\nsummary: max. 10 Wörter an ${name}: Ergebnis und nächster Hebel.\nlevelChanges: Teilkompetenzen des Skills praes (IDs struktur, folien, story, koerper, fragen), neue Stufe höchstens 1 über der aktuellen und max. 5, nur wo Selbst- und Fremdeinschätzung es begründen. reason kurz mit Quelle.\nrecommendations: genau 2 neue Vorschläge: ein internes Angebot aus dem Katalog (type "Intern"), ein externer Inhalt (type "Extern"). title max. 40 Zeichen, why nur Dauer oder Zeitpunkt, z. B. „45 min“ oder „diese Woche“.\nmemory: 2 bis 3 Erkenntnisse über ${name} als Stichworte, je max. 6 Wörter.`,
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
          `${ctx}\n\nBisheriger Chat (Auszug):\n${history.map((h) => `${h.from === "me" ? name : "Kompass"}: ${h.text}`).join("\n")}\n\nNeue Nachricht von ${name}: „${payload.text}“\ntext: Deine Antwort als Lern-Coach, max. 2 kurze Sätze, konkret und mit Bezug auf Lernpfad, Unternehmen oder Lernmethoden. Wenn es passt, schlag einen kleinen nächsten Schritt vor.`,
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
