import { NextRequest, NextResponse } from "next/server";
import { askJSON, hasKey, MODEL } from "@/lib/claude";
import { fallback, type OnboardOut } from "@/lib/fallbacks";
import { saaExcerpt } from "@/lib/saaServer";
import { CATALOG, demoPath, findChallenge, findSkill, MANDATORY_DONE_DEFAULT, mandatoryFor, PATH_AREAS, roleFor, skillLevel, skillProgress, trainingFor } from "@/lib/knowledge";
import { SAA_TOC } from "@/lib/saa";
import type { PathChallenge } from "@/lib/types";
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

  const KINDS = ["Lernen", "Üben", "Anwenden", "Reflexion"];
  const chalSchema = obj({ area: { type: "string", enum: PATH_AREAS }, title: str, kind: { type: "string", enum: KINDS }, min: { type: "integer" }, text: str, refs: strArr });
  const saaTitles = new Set(SAA_TOC.map((e) => e.title));
  const cleanChal = (c: Omit<PathChallenge, "id">, id: string, fromChat = false): PathChallenge | null => {
    const title = (c.title || "").trim().replace(/[.!]$/, "");
    if (!title || title.split(/\s+/).length > 9) return null;
    return {
      id,
      area: PATH_AREAS.includes(c.area) ? c.area : "fach",
      title,
      kind: KINDS.includes(c.kind) ? c.kind : "Anwenden",
      min: Math.max(5, Math.min(60, Math.round(c.min || 15))),
      text: (c.text || "").trim(),
      refs: (c.refs || []).filter((r) => saaTitles.has(r)).slice(0, 2),
      ...(fromChat ? { fromChat } : {}),
    };
  };

  const run = async () => {
    switch (task) {
      case "welcome": {
        const out = await ask<ReturnType<typeof fallback.welcome>>(
          `${ctx}\n\nDas Onboarding ist abgeschlossen und das Lernziel gemeinsam vereinbart, du erstellst jetzt den persönlichen Lernpfad.\nsummary: 1 kurzer Satz an ${name} (max. 15 Wörter), der Fokus des Lernpfads.\nfocus: genau 3 Skill-IDs aus dem Kompetenzmodell, die für Rolle, Kompetenzlücken laut Jobprofil und Ziel jetzt am meisten bringen. „praes“ ist immer dabei.\nfirstStep: ein kleiner, konkreter erster Schritt aus dem Arbeitsalltag, der zum vereinbarten 4-Wochen-Lernziel, zur Lernweise und zum Zeitrahmen passt, Stichwort, max. 6 Wörter.`,
          obj({ summary: str, focus: strArr, firstStep: str }),
        );
        if (out && !out.focus.includes("praes")) out.focus = ["praes", ...out.focus].slice(0, 3);
        return out ?? fallback.welcome(state.profile);
      }
      case "onboard": {
        // Kennenlernen: Reaktion auf die Antwort, optional eine Nachfrage, Vorschläge für die nächste Frage.
        const history: { from: string; text: string }[] = payload.history || [];
        const left: number = payload.followUpsLeft ?? 0;
        const isFollowUpAnswer = Boolean(payload.isFollowUpAnswer);
        const who = payload.name || "die Person";
        const known = Object.entries((payload.answersSoFar || {}) as Record<string, string>)
          .filter(([k, v]) => k !== "name" && v)
          .map(([k, v]) => `- ${k}: ${v}`)
          .join("\n");
        const out = await ask<OnboardOut>(
          `Du lernst ${who} gerade im Onboarding kennen, um gemeinsam ein Lernziel zu finden. Du führst ein zusammenhängendes Gespräch durch 8 Themen in fester Reihenfolge: Rolle, bisherige Stationen, Spaß und Meiden, Perspektive in 3 Jahren, was sie dafür lernen will, Ziel für 4 Wochen, Lernweise, Zeitrahmen.\n${known ? `Bisher bekannt:\n${known}\n` : ""}\nGesprächsverlauf (die letzte Nachricht ist die Antwort von ${who}):\n${history.map((h) => `${h.from === "me" ? who : "Kompass"}: ${h.text}`).join("\n")}\n\nDeine zuletzt gestellte Frage: „${payload.question}“\nAntwort von ${who}: „${payload.answer}“\n${payload.nextTopic ? `Als Nächstes geht es um: ${payload.nextTopic}.` : "Das war die letzte Kernfrage, danach folgt die Zusammenfassung."}\n\nreaction: 1 kurzer Satz, der sich konkret auf genau diese Antwort bezieht (greif ein Detail daraus auf) und zur nächsten Frage hinführt, ohne sie vorwegzunehmen. Max. 12 Wörter, keine Frage, keine Floskel wie „Spannend“, kein Lob für Talent, nichts erfinden, was nicht gesagt wurde. Bei einer sehr kurzen oder ausweichenden Antwort („weiß nicht“) neutral und ermutigend.\nfollowUp: ${isFollowUpAnswer || left <= 0 ? "leer lassen." : `Meistens leer lassen. Nur wenn die Antwort für das Lernziel wirklich zu unklar ist oder etwas Zentrales andeutet (z. B. etwas, das die Person meidet), eine individuelle, offene Nachfrage, max. 14 Wörter. Noch ${left} Nachfrage(n) im ganzen Onboarding erlaubt.`}\nnextQuestion: ${payload.nextTopic ? `die nächste Frage zum Thema „${payload.nextTopic}“, so formuliert, dass sie an die Antwort von eben anknüpft und das Gespräch als roten Faden weiterführt (z. B. „Was musst du lernen, um dorthin zu kommen?“). Genau eine Frage, max. 16 Wörter, endet mit „?“, du-Form. Bleib beim Thema, frag nichts anderes. Wenn followUp gesetzt ist, trotzdem ausfüllen.` : "leer lassen."}\nsuggestions: ${payload.nextQuestion && !payload.nextIsChoice ? `0 bis 2 mögliche Antworten auf deine nextQuestion, so wie ${who} sie selbst tippen würde (Ich-Form oder Stichwort, max. 8 Wörter). Sie müssen zu Rolle, Stationen und allen bisherigen Antworten passen und dürfen ihnen nicht widersprechen. Leite sie aus dem Unternehmenskontext ab, sobald die Rolle bekannt ist: Jobprofil, Entwicklungsmöglichkeiten der Rolle, typische Kompetenzlücken und passende Fortbildungen des Kreisverbands. Nichts Erfundenes wie Zahlen oder Erlebnisse, die nicht genannt wurden. Lieber leer als unpassend.` : "leer lassen."}`,
          obj({ reaction: str, followUp: str, nextQuestion: str, suggestions: strArr }),
          { maxTokens: 1000 },
        );
        if (out) {
          if (isFollowUpAnswer || left <= 0) out.followUp = "";
          if (!payload.nextQuestion || payload.nextIsChoice) out.suggestions = [];
          if (!payload.nextTopic) out.nextQuestion = "";
          return out;
        }
        return fallback.onboard(payload.step, payload.answer || "", left, isFollowUpAnswer);
      }
      case "profile": {
        const a = payload.answers || {};
        const out = await ask<ReturnType<typeof fallback.profile>>(
          `Fasse das Onboarding-Gespräch mit ${a.name} als Profil-Karte zusammen. Antworten:\n- Rolle: ${a.role}\n- Bisherige Stationen: ${a.experience}\n- Macht Spaß / meidet: ${a.likes}\n- Möchte lernen: ${a.learn}\n- In 3 Jahren: ${a.vision}\n- In 4 Wochen erreichen: ${a.goal}\n- Lernt am besten: ${a.preference}\n- Zeitrahmen: ${a.time}\n${payload.correction ? `\nDie letzte Zusammenfassung passte noch nicht. Korrektur von ${a.name}: „${payload.correction}“. Übernimm sie.\n` : ""}\nwer, was, wie: je 2 bis 3 Stichworte (max. 5 Wörter), in Du-Form gedacht, ohne Namen. wer = Rolle, Erfahrung, was Spaß macht und was gemieden wird. was = Lernthema und Perspektive in 3 Jahren. wie = Lernweise und Zeitrahmen.\ngoal: das gemeinsame Lernziel für die nächsten 4 Wochen, konkret und überprüfbar, max. 12 Wörter, beginnt mit „In 4 Wochen“. Es bleibt das Ziel der Person; wenn es passt, knüpfe an eine Kompetenz aus ihrem Jobprofil an.\nintro: 1 kurzer Satz an ${a.name}, der zur Karte überleitet, max. 10 Wörter.`,
          obj({ intro: str, wer: strArr, was: strArr, wie: strArr, goal: str }),
          { maxTokens: 1500 },
        );
        return out && out.wer.length ? out : fallback.profile(a, payload.correction || "");
      }
      case "prep": {
        const out = await ask<ReturnType<typeof fallback.prep>>(
          `${ctx}\n\n${name} hat gesagt, morgen eine Präsentation zu halten, und möchte sich vorbereiten. Thema und Publikum: „${payload.topic}“.\ntext: max. 20 Wörter. Würdige kurz den Fortschritt im Skill Kommunikation (${praesPct} %) und leite zu drei Wegen über, z. B. „Drei Wege bis morgen, du entscheidest:“.\noptions: genau 3 in dieser Reihenfolge: kind "video" (kurzes Grundlagen-Video), kind "read" (etwas zum Lesen), kind "practice" (eigenes Video aufnehmen und üben, mit Feedback von dir). title: max. 40 Zeichen. detail: nur die Dauer, z. B. „12 min“.`,
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
          `${ctx}\n\n${saaExcerpt({ text: payload.topic, maxChars: 5000 })}\n\nErstelle einen Folienentwurf für die Präsentation „${payload.topic}“. Genau 5 Folien mit klarem Bogen passend zum Anlass. Bei einer Fallvorstellung: Einsatzanlass und Einstiegsbild, Lage und Ersteindruck, Versorgung (z. B. nach cABCDE), was gut lief und was nicht, Lernpunkte und Fragen an die Runde. Keine echten Patientendaten, alles anonymisiert. title max. 32 Zeichen, bullets: genau 3 Stichpunkte mit je max. 30 Zeichen, note: Sprechernotiz in 1 kurzen Satz (max. 14 Wörter), die gezielt die schwachen Teilkompetenzen trainiert (z. B. Pause, Blickkontakt, Umgang mit Rückfragen). Erfinde keine konkreten Werte oder Medikamentendosen, nutze Platzhalter wie „Vitalwert X“.`,
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
          `${ctx}\n\nSchließe den Learning Loop nach der Präsentation „${payload.topic}“.\nSelbsteinschätzung: lief „${payload.how}“, gut: „${payload.good}“, anders machen: „${payload.bad}“.\nFeedback der Kollegen:\n${(payload.feedback || []).map((f: { name: string; stars: number; text: string }) => `- ${f.name} (${f.stars}/5): ${f.text}`).join("\n")}\n\nsummary: max. 10 Wörter an ${name}: Ergebnis und nächster Hebel.\nlevelChanges: Teilkompetenzen des Skills praes (IDs struktur, folien, story, koerper, fragen), neue Stufe höchstens 1 über der aktuellen und max. 4, nur wo Selbst- und Fremdeinschätzung es begründen. reason kurz mit Quelle.\nrecommendations: genau 2 neue Vorschläge: eine Fortbildung aus dem Katalog des Kreisverbands mit ID am Anfang, z. B. „F13 Professionelle Gesprächsführung“ (type "Intern"), ein externer Inhalt (type "Extern"). title max. 48 Zeichen, why nur Dauer oder Zeitpunkt, z. B. „45 min“ oder „diese Woche“.\nmemory: 2 bis 3 Erkenntnisse über ${name} als Stichworte, je max. 6 Wörter.`,
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
      case "path": {
        // Persönlicher 4-Wochen-Lernpfad aus dem Onboarding: PLAN, EXPLORE, EXPERIMENT, REFLECT.
        const p = state.profile;
        const fb = demoPath(p?.card?.goal || p?.goal);
        if (!p) return fb;
        const out = await ask<{ title: string; challenges: Omit<PathChallenge, "id">[] }>(
          `${ctx}\n\nFortbildungskatalog: ${CATALOG.map((c) => `${c.id} ${c.title} (${c.duration})`).join("; ")}\nTitel in den SAA und BPR 2025 (für refs, nur exakt so): ${SAA_TOC.map((e) => e.title).join(" | ")}\n\nErstelle den persönlichen Lernpfad für die nächsten 4 Wochen zum vereinbarten Lernziel „${p.card?.goal || p.goal}“. Er führt von Planen über Erkunden und Ausprobieren im Arbeitsalltag bis zur Reflexion.\ntitle: das Ziel als kurze Frage oder Aussage in Du-Form, max. 8 Wörter, ohne „In 4 Wochen“.\nchallenges: 8 bis 10 kleine Schritte in sinnvoller Reihenfolge, die letzte ist eine Reflexion. Jede passt zu Rolle, Lernweise („${p.preference}“) und Zeitrahmen („${p.time || "offen"}“) und baut auf Kompetenzlücken laut Jobprofil auf, wo es zum Ziel passt.\n- area: fach (Fachkompetenz), meth (Methodenkompetenz), komm (Sozialkompetenz) oder selbst (Selbstkompetenz); mindestens zwei verschiedene.\n- title: max. 6 Wörter, konkret, ohne Punkt.\n- kind: Lernen, Üben, Anwenden oder Reflexion. min: realistische Minuten (5 bis 60).\n- text: 1 kurzer Satz, was genau zu tun ist, max. 14 Wörter.\n- refs: 0 bis 2 passende Titel aus den SAA und BPR, nur wenn fachlich passend, sonst leer. Eine Fortbildung aus dem Katalog darf als Anmelde-Schritt vorkommen (mit ID im Titel).`,
          obj({ title: str, challenges: { type: "array", items: chalSchema } }),
          { maxTokens: 3000 },
        );
        const list = (out?.challenges || []).map((c, i) => cleanChal(c, `g${i + 1}`)).filter(Boolean) as PathChallenge[];
        if (!out || list.length < 6) return fb;
        return { title: (out.title || "").trim().replace(/^in 4 wochen[:,]?\s*/i, "") || fb.title, challenges: list.slice(0, 12), source: "ai" as const };
      }
      case "chat": {
        const history: { from: string; text: string }[] = payload.history || [];
        // Fachliche Grundlage: passende Seiten aus SAA und BPR 2025 (Challenge-Verweise, Begriffe im Chat).
        const recent = [payload.text, ...history.slice(-4).map((h) => h.text)].join(" ");
        const chal = findChallenge(recent, state.goalPath);
        const saa = saaExcerpt({ refs: chal?.refs, text: recent, maxChars: 8000 });
        const out = await ask<{ text: string; goal: Omit<PathChallenge, "id"> }>(
          `${ctx}\n\nBisheriger Chat (Auszug):\n${history.map((h) => `${h.from === "me" ? name : "Kompass"}: ${h.text}`).join("\n")}\n\nNeue Nachricht von ${name}: „${payload.text}“\n${chal ? `Es geht um die Challenge „${chal.title}“ (${chal.kind}): ${chal.text}${/wissenscheck/i.test(chal.title) ? " Stell genau eine Frage pro Nachricht, warte die Antwort ab, gib kurz Rückmeldung mit Quelle und stell dann die nächste." : ""}\n` : ""}${saa ? `\n${saa}\n\nFachliche Aussagen nur auf Basis dieser Auszüge und mit Quelle (z. B. „BPR Polytrauma, S. 153“). Keine Dosierungen aus dem Gedächtnis.\n` : ""}\ntext: Deine Antwort als Lern-Coach, max. 2 kurze Sätze, konkret und mit Bezug auf Lernpfad, Jobprofil und Kompetenzlücken, Fortbildungen und Pflichtschulungen des Kreisverbands oder Lernmethoden. Wenn es passt, schlag einen kleinen nächsten Schritt vor.\ngoal: Nur wenn ${name} sich in der neuen Nachricht selbst ein konkretes Ziel oder Vorhaben setzt oder deinem vorgeschlagenen Schritt ausdrücklich zustimmt („mach ich“, „ich will … üben“), dieses Vorhaben als Challenge für den Lernpfad (area, title max. 6 Wörter, kind, min, text max. 14 Wörter, refs wie oben oder leer). Sonst alle Felder leer bzw. min 0. Wenn du ein Ziel übernimmst, sag im text kurz, dass es jetzt im Lernpfad steht.`,
          obj({ text: str, goal: chalSchema }),
          { maxTokens: 1500 },
        );
        if (!out) return fallback.chat(payload.text);
        const goal = out.goal?.title ? cleanChal(out.goal, `c${Date.now().toString(36)}`, true) : null;
        return { text: out.text, goal };
      }
      default:
        return null;
    }
  };

  const result = await run();
  if (!result) return NextResponse.json({ error: "Unbekannte Aufgabe" }, { status: 400 });
  return NextResponse.json({ result, live });
}
