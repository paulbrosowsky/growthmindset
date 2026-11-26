// Sprach-Coach über die OpenAI Realtime API: Anweisungen und Werkzeuge je Modus.
// Nur serverseitig importieren (enthält den Coach-Prompt mit Unternehmenskontext).
import { COACH_PROMPT } from "./claude";
import { CHALLENGE_KINDS, coachContext } from "./coachContext";
import { PATH_AREAS } from "./knowledge";
import { OB_QUESTIONS } from "./onboarding";
import type { AppState } from "./types";

export const REALTIME_MODEL = process.env.OPENAI_REALTIME_MODEL || "gpt-realtime";
export const REALTIME_VOICE = process.env.OPENAI_REALTIME_VOICE || "marin";
export const TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe";
export const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);

export type VoiceMode = "onboarding" | "chat";
export type VoiceTurn = { from: string; text: string };
export type VoiceRequest = {
  mode: VoiceMode;
  state: AppState;
  name?: string;
  /** Kennenlernen: bereits beantwortete Themen (key → Antwort). */
  answers?: Record<string, string>;
  history?: VoiceTurn[];
};

const VOICE = `SPRACHGESPRÄCH: Ihr sprecht miteinander, nicht per Text. Sprich natürlich, warm und ruhig, auf Deutsch, in kurzen gesprochenen Sätzen (meist 1 bis 2). Keine Aufzählungszeichen, kein Markdown, keine Emojis, keine Klammern. Fortbildungen nennst du mit ID („F zwei, Traumamanagement Advanced“). Wenn du etwas akustisch nicht verstanden hast, frag kurz nach. Alles Gesagte erscheint als Text im Chat der App. Halte die Werkzeug-Regeln unten genau ein; Werkzeuge rufst du still auf, ohne sie anzukündigen.`;

const fn = (name: string, description: string, properties: Record<string, unknown> = {}) => ({
  type: "function" as const,
  name,
  description,
  parameters: { type: "object", properties, required: Object.keys(properties), additionalProperties: false },
});

const str = (description: string) => ({ type: "string", description });

export function voiceTools(mode: VoiceMode) {
  if (mode === "onboarding")
    return [
      fn("antwort_speichern", "Speichert die Antwort der Person zu einem Thema des Kennenlernens, sobald das Thema beantwortet ist.", {
        thema: { type: "string", enum: OB_QUESTIONS.map((q) => q.key), description: "Schlüssel des Themas" },
        antwort: str("Die Antwort knapp in den Worten der Person, Ich-Form, max. 20 Wörter. Nachfragen dazu einbeziehen."),
      }),
      fn("profil_erstellen", "Erstellt die Profil-Karte (WER, WARUM, WAS, WIE und Lernziel), wenn alle 8 Themen gespeichert sind. Die Karte erscheint auf dem Bildschirm."),
      fn("profil_bestaetigen", "Die Person hat bestätigt, dass die Profil-Karte stimmt. Danach erstellt die App den Lernpfad."),
      fn("profil_anpassen", "Die Person möchte etwas an der Profil-Karte ändern.", { korrektur: str("Was geändert werden soll, in ihren Worten.") }),
    ];
  return [
    fn("ziel_in_lernpfad", "Übernimmt ein Ziel oder Vorhaben, das sich die Person selbst gesetzt oder dem sie ausdrücklich zugestimmt hat, als Challenge in ihren Lernpfad.", {
      area: { type: "string", enum: PATH_AREAS, description: "fach (Fachkompetenz), meth (Methodenkompetenz), komm (Sozialkompetenz), selbst (Selbstkompetenz)" },
      title: str("Titel der Challenge, max. 6 Wörter, ohne Punkt"),
      kind: { type: "string", enum: CHALLENGE_KINDS },
      min: { type: "integer", description: "Realistische Minuten, 5 bis 60" },
      text: str("Was genau zu tun ist, 1 Satz, max. 14 Wörter"),
    }),
    fn("fachwissen_nachschlagen", "Schlägt in den SAA und BPR 2025 (Rettungsdienst) nach. Immer nutzen, bevor du fachlich-medizinisch antwortest.", {
      thema: str("Stichworte, z. B. „Polytrauma“, „Anaphylaxie“, „cABCDE“"),
    }),
  ];
}

const turns = (h: VoiceTurn[] | undefined, name: string) =>
  (h || [])
    .filter((t) => t.text)
    .slice(-12)
    .map((t) => `${t.from === "me" ? name : "LENA"}: ${t.text}`)
    .join("\n");

export function voiceInstructions(r: VoiceRequest): string {
  const name = r.name || r.state.profile?.name || "die Person";
  const history = turns(r.history, name);
  if (r.mode === "onboarding") {
    const answers = r.answers || {};
    const open = OB_QUESTIONS.filter((q) => !answers[q.key]);
    const known = OB_QUESTIONS.filter((q) => answers[q.key]).map((q) => `- ${q.key} (${q.topic}): ${answers[q.key]}`);
    const fresh = !history;
    return `${COACH_PROMPT}

${VOICE}

AUFGABE JETZT: Kennenlernen mit ${name}, um gemeinsam ein Lernziel für 4 Wochen zu finden. Du führst ein zusammenhängendes Gespräch durch diese 8 Themen in fester Reihenfolge, eine Frage pro Wortmeldung:
${OB_QUESTIONS.map((q, i) => `${i + 1}. ${q.key}: ${q.topic}${q.multi ? " (Möglichkeiten: Praxis und Üben, Videos, Lesen, Austausch; mehrere sind okay, keine Lerntypen)" : ""}`).join("\n")}
${known.length ? `\nBereits beantwortet, nicht erneut fragen:\n${known.join("\n")}\n` : ""}${history ? `\nBisheriger Gesprächsverlauf im Chat:\n${history}\n` : ""}
ABLAUF:
- ${fresh ? `Beginne mit: „Hallo ${name}, ich bin LENA, dein Lern-Coach. Lass uns gemeinsam dein Lernziel finden, was du mir erzählst, bleibt bei dir.“ und stell dann die Frage zum Thema ${open[0]?.key || "role"}.` : open.length ? `Knüpf kurz an das Bisherige an und stell die Frage zum Thema ${open[0].key}.` : "Alle Themen sind beantwortet: ruf profil_erstellen auf."}
- Nach jeder Antwort rufst du sofort antwort_speichern auf (Thema und Antwort). Danach 1 kurzer Satz, der ein konkretes Detail der Antwort aufgreift (keine Floskel wie „Spannend“, kein Lob für Talent, nichts erfinden), und die Frage zum nächsten Thema, die an die Antwort anknüpft, als roter Faden.
- Höchstens 2 Nachfragen im ganzen Gespräch, nur wenn eine Antwort für das Lernziel zu unklar ist. Bei „weiß nicht“ neutral ermutigen, ohne klares Ziel max. 2 Entwicklungsoptionen mit Nutzen anbieten.
- Vor dem letzten Thema (time) sag „Letzte Frage“.
- Sind alle 8 Themen gespeichert, ruf profil_erstellen auf. Du bekommst die Profil-Karte zurück, die ${name} jetzt auf dem Bildschirm sieht. Nenne das Lernziel in einem Satz und frag „Stimmt das so?“
- Bestätigt ${name}, ruf profil_bestaetigen auf. Soll etwas geändert werden, ruf profil_anpassen mit der Korrektur auf und frag danach wieder „Stimmt das so?“
- Den Lernpfad erstellst du nicht selbst, das macht die App nach der Bestätigung.`;
  }
  return `${COACH_PROMPT}

${VOICE}

KONTEXT ZU ${name.toUpperCase()}:
${coachContext(r.state)}
${history ? `\nBisheriger Chat:\n${history}\n` : ""}
AUFGABE JETZT: Coaching-Gespräch mit ${name}.
- ${history ? "Knüpf an den bisherigen Chat an: Wenn die letzte Nachricht von " + name + " ist, antworte darauf, sonst frag in einem Satz, worüber ihr sprechen wollt." : `Begrüß ${name} in einem Satz und frag, worüber ihr sprechen wollt.`}
- Antworte als Lern-Coach kurz (1 bis 2 Sätze), konkret und mit Bezug auf Lernpfad, Jobprofil und Kompetenzlücken, Fortbildungen und Pflichtschulungen des Kreisverbands oder Lernmethoden. Wenn es passt, schlag einen kleinen nächsten Schritt vor.
- Setzt sich ${name} selbst ein konkretes Ziel oder stimmt deinem vorgeschlagenen Schritt ausdrücklich zu („mach ich“, „ich will … üben“), ruf ziel_in_lernpfad auf und sag danach kurz, dass es jetzt im Lernpfad steht.
- Vor fachlich-medizinischen Aussagen ruf fachwissen_nachschlagen auf und antworte nur auf Basis des Auszugs, mit Quelle („laut BPR Polytrauma, Seite 153“). Keine Dosierungen aus dem Gedächtnis.
- Bei einem Wissenscheck: genau eine Frage, Antwort abwarten, kurz Rückmeldung mit Quelle, dann die nächste.`;
}

/** Kurzlebiges Client-Secret für die Realtime-Sitzung im Browser (WebRTC). Der API-Key bleibt auf dem Server. */
export async function createVoiceSession(r: VoiceRequest): Promise<{ token: string; model: string; expiresAt?: number }> {
  const res = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      expires_after: { anchor: "created_at", seconds: 600 },
      session: {
        type: "realtime",
        model: REALTIME_MODEL,
        instructions: voiceInstructions(r),
        tools: voiceTools(r.mode),
        tool_choice: "auto",
        audio: {
          input: {
            transcription: { model: TRANSCRIBE_MODEL, language: "de" },
            noise_reduction: { type: "near_field" },
            turn_detection: { type: "semantic_vad", eagerness: "medium" },
          },
          output: { voice: REALTIME_VOICE },
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { value?: string; expires_at?: number; client_secret?: { value: string } };
  const token = json.value || json.client_secret?.value;
  if (!token) throw new Error("OpenAI: kein Client-Secret in der Antwort");
  return { token, model: REALTIME_MODEL, expiresAt: json.expires_at };
}
