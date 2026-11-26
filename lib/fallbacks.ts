// Scripted answers used when the Claude API is not configured or does not answer in time.
import type { LevelChange, PeerFeedback, Profile, Rec, Slide } from "./types";

export type WelcomeOut = { summary: string; focus: string[]; firstStep: string };
export type PrepOut = { text: string; options: { kind: "video" | "read" | "practice"; title: string; detail: string }[] };
export type SlidesOut = { slides: Slide[] };
export type VideoOut = { good: string[]; improve: string[]; tip: string; levelChanges: LevelChange[] };
export type TextOut = { text: string };
export type PeersOut = { feedback: PeerFeedback[] };
export type SynthOut = {
  summary: string;
  levelChanges: LevelChange[];
  recommendations: { type: Rec["type"]; title: string; why: string }[];
  memory: string[];
};

export const fallback = {
  welcome(p: Profile | null): WelcomeOut {
    const name = p?.name || "du";
    return {
      summary: `${name}, dein Lernpfad baut auf dem auf, was du schon kannst: Struktur und gute Folien sitzen. Damit du dein Ziel „${p?.goal || "dich weiterzuentwickeln"}“ erreichst, liegt der Fokus jetzt auf sicherem Auftreten vor großen Runden, Datenkompetenz und Moderation.`,
      focus: ["praes", "daten", "mod"],
      firstStep: "Halte diese Woche im Team-Weekly einen 60-Sekunden-Pitch zu deinem aktuellen Projekt.",
    };
  },
  prep(topic: string, progress: number): PrepOut {
    return {
      text: `Bei „${topic}“ kommt es vor allem auf eine klare Geschichte hinter den Zahlen und einen sicheren Auftritt an. Struktur und Folien beherrschst du schon (${progress} % geschafft), Luft nach oben hast du bei Storytelling mit Daten, Körpersprache und dem Umgang mit Rückfragen. Drei Wege, wie du die Zeit bis morgen nutzen kannst:`,
      options: [
        { kind: "video", title: "Grundlagen-Video: Präsentationsstruktur in 12 Minuten", detail: "Kurz und kompakt, ideal für heute Abend" },
        { kind: "read", title: "Leitfaden lesen: Mit Zahlen Geschichten erzählen", detail: "10 Minuten Lesezeit im Intranet" },
        { kind: "practice", title: "Selbst üben: Generalprobe mit Video", detail: "Du nimmst dich auf, ich gebe dir Feedback" },
      ],
    };
  },
  slides(topic: string): SlidesOut {
    return {
      slides: [
        {
          title: topic.length > 60 ? topic.slice(0, 57) + "…" : topic,
          bullets: ["Worum es heute geht", "Was wir erreicht haben", "Wo wir Ihre Entscheidung brauchen"],
          note: "Starte mit einer kurzen Geschichte aus dem Alltag eines Kunden, nicht mit der Agenda.",
        },
        {
          title: "Wo wir stehen",
          bullets: ["Die eine Kennzahl, die zählt", "Plan gegen Ist", "Was besser lief als erwartet"],
          note: "Eine Kernaussage pro Folie. Lies die Zahlen nicht vor, sondern sag, was sie bedeuten.",
        },
        {
          title: "Die Geschichte hinter den Zahlen",
          bullets: ["Was wir gelernt haben", "Ein konkretes Beispiel", "Warum das für unser Ziel wichtig ist"],
          note: "Hier gewinnt deine Story. Pause nach dem Beispiel und Blickkontakt halten.",
        },
        {
          title: "Risiken und Optionen",
          bullets: ["Was uns bremsen kann", "Zwei Optionen mit Aufwand", "Unsere Empfehlung"],
          note: "Rechne hier mit Rückfragen. Kurz Luft holen, Frage wiederholen, dann antworten.",
        },
        {
          title: "Unsere Bitte an Sie",
          bullets: ["Entscheidung heute", "Nächste Schritte", "Wer was bis wann"],
          note: "Schließe mit einer klaren Bitte und schau dabei in die Runde, nicht auf die Folie.",
        },
      ],
    };
  },
  video(): VideoOut {
    return {
      good: [
        "Klarer Einstieg: Du nennst das Ziel in den ersten Sekunden.",
        "Offene, aufrechte Haltung, die Hände sind sichtbar.",
        "Ruhiges Tempo bei den Kernaussagen.",
      ],
      improve: [
        "Dein Blick wandert oft zur Seite. Halte mehr Blickkontakt zur Kamera bzw. zum Publikum.",
        "Bei den Zahlen wirst du schneller. Eine Kernaussage pro Folie und kurze Pausen helfen.",
        "Der Schluss ist leise. Formuliere deine Bitte klar und mit fester Stimme.",
      ],
      tip: "Übe morgen früh nur Einstieg und Schluss laut, je 60 Sekunden. Das gibt Sicherheit für den Rest.",
      levelChanges: [
        { sub: "koerper", level: 3, reason: "Generalprobe mit Videoanalyse" },
        { sub: "story", level: 3, reason: "Storyline mit Slides erarbeitet" },
      ],
    };
  },
  react(mood: string): TextOut {
    if (/schwierig|schlecht|nicht/i.test(mood))
      return { text: "Danke, dass du ehrlich bist. Gerade aus Situationen, die nicht rund laufen, lernt man am meisten. Was hat trotzdem gut geklappt?" };
    if (/gemischt|so lala|okay/i.test(mood))
      return { text: "Gemischt ist ein ehrliches Ergebnis und eine gute Grundlage zum Lernen. Fangen wir mit dem Positiven an: Was hat gut geklappt?" };
    return { text: "Super, das freut mich! Die Generalprobe hat sich offenbar gelohnt. Was hat besonders gut geklappt?" };
  },
  reflect(): TextOut {
    return {
      text: "Stark, dass dein Einstieg so gut ankam, genau daran hast du bei der Generalprobe gearbeitet. Unsicherheit bei Rückfragen ist völlig normal und gut trainierbar: Frage kurz wiederholen, einmal durchatmen, dann antworten. Das nehmen wir als nächsten Schwerpunkt in deinen Lernpfad.",
    };
  },
  peers(names: string[]): PeersOut {
    const all: PeerFeedback[] = [
      {
        name: "Jonas Krüger",
        stars: 4,
        text: "Der rote Faden war von Anfang an klar und die Kundenstory hat alle abgeholt. Die Folie mit den Zahlen war mir etwas zu voll.",
      },
      {
        name: "Aylin Demir",
        stars: 5,
        text: "Du bist sehr sicher aufgetreten und hast viel Blickkontakt gehalten. Bei den Rückfragen hast du sehr schnell geantwortet, eine kurze Pause würde dir mehr Ruhe geben.",
      },
      {
        name: "Markus Weber",
        stars: 4,
        text: "Gute Vorbereitung, die Kernbotschaft ist angekommen. Nächster Schritt: Rückfragen souveräner moderieren und die Entscheidung am Ende klarer einfordern.",
      },
    ];
    return { feedback: all.filter((f) => names.includes(f.name)) };
  },
  synth(): SynthOut {
    return {
      summary:
        "Deine Präsentation ist gut angekommen: Struktur, Einstieg und Auftreten wurden von dir und deinen Kollegen gelobt. Der klare nächste Hebel ist der Umgang mit Rückfragen.",
      levelChanges: [
        { sub: "story", level: 4, reason: "Kundenstory kam laut Kollegen sehr gut an" },
        { sub: "koerper", level: 4, reason: "Sicherer Auftritt und Blickkontakt (Aylin)" },
        { sub: "fragen", level: 2, reason: "Selbst- und Fremdeinschätzung: noch zu schnell bei Rückfragen" },
      ],
      recommendations: [
        { type: "Intern", title: "E-Learning „Souverän mit Rückfragen umgehen“", why: "Dein nächster Hebel laut dir und deinen Kollegen, 45 Minuten" },
        { type: "Üben", title: "Challenge: Moderiere die Fragerunde im nächsten Team-Weekly", why: "Rückfragen üben, wo es nichts kostet" },
        { type: "Extern", title: "Meetup: Rhetorik-Stammtisch Stuttgart", why: "Monatlich, Stegreif-Antworten in lockerer Runde trainieren" },
      ],
      memory: [
        "Präsentation zum Thema gehalten, Einstieg mit Kundenstory wirkt bei ihr sehr gut",
        "Antwortet bei Rückfragen zu schnell, Pause vor der Antwort üben",
        "Lernt gut durch Generalprobe mit Video",
      ],
    };
  },
  chat(): TextOut {
    return {
      text: "Gute Frage! Im Demo-Modus ohne KI kann ich dazu nichts Eigenes sagen. Schreib mir zum Beispiel „Ich muss morgen präsentieren“, dann zeige ich dir, wie ich dich vorbereite.",
    };
  },
};
