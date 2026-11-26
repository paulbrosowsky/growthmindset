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
      summary: `Dein Lernpfad steht, ${name}. Fokus: sicher auftreten, mit Daten erzählen, moderieren.`,
      focus: ["praes", "daten", "mod"],
      firstStep: "60-Sekunden-Pitch im Team-Weekly",
    };
  },
  prep(topic: string, progress: number): PrepOut {
    return {
      text: `Gut, dass du dich meldest! Deine Struktur ist schon solide. Drei Wege bis morgen, du entscheidest:`,
      options: [
        { kind: "video", title: "Grundlagen der Präsentationsstruktur", detail: "12 min" },
        { kind: "read", title: "Folienvorlage und Leitfaden", detail: "15 min" },
        { kind: "practice", title: "Generalprobe mit Video", detail: "10 min" },
      ],
    };
  },
  slides(topic: string): SlidesOut {
    return {
      slides: [
        {
          title: topic.split(/,| vor | der /)[0].slice(0, 32),
          bullets: ["Worum es geht", "Was wir erreicht haben", "Was wir brauchen"],
          note: "Mit einer Kundengeschichte starten, nicht mit der Agenda.",
        },
        {
          title: "Q4: drei Prioritäten",
          bullets: ["Releases", "App-Steuerung", "Service"],
          note: "Mit der Kernzahl starten: 30 % schneller zum Release. Dann kurz Pause.",
        },
        {
          title: "Die Story hinter den Zahlen",
          bullets: ["Was wir gelernt haben", "Ein Beispiel", "Warum es zählt"],
          note: "Nach dem Beispiel Pause, Blickkontakt halten.",
        },
        {
          title: "Risiken und Optionen",
          bullets: ["Was uns bremsen kann", "Zwei Optionen mit Aufwand", "Unsere Empfehlung"],
          note: "Rückfragen erwarten: wiederholen, atmen, antworten.",
        },
        {
          title: "Unsere Bitte an Sie",
          bullets: ["Entscheidung heute", "Nächste Schritte", "Wer was bis wann"],
          note: "Klare Bitte, Blick in die Runde.",
        },
      ],
    };
  },
  video(): VideoOut {
    return {
      good: ["Kernbotschaft steht in den ersten 10 Sekunden."],
      improve: ["Viele Füllwörter. Bei Bild 3 Blick auf den Laptop statt ins Publikum."],
      tip: "Vor der Kernzahl einatmen und zwei Sekunden Pause.",
      levelChanges: [
        { sub: "koerper", level: 3, reason: "Generalprobe mit Videoanalyse" },
        { sub: "story", level: 3, reason: "Storyline mit Slides erarbeitet" },
      ],
    };
  },
  react(mood: string): TextOut {
    if (/schwierig|schlecht|nicht/i.test(mood))
      return { text: "Danke für deine Ehrlichkeit. Was lief gut, was war schwierig?" };
    if (/gemischt|so lala|okay/i.test(mood))
      return { text: "Danke. Was lief gut, was war schwierig?" };
    return { text: "Freut mich! Was lief gut, was war schwierig?" };
  },
  reflect(): TextOut {
    return {
      text: "Stark, dass du es durchgezogen hast! Rückfragen lassen sich üben.",
    };
  },
  peers(names: string[]): PeersOut {
    const all: PeerFeedback[] = [
      {
        name: "Jonas Krüger",
        stars: 4,
        text: "Die Roadmap-Folie war sofort klar. Die Zahlen hätte ich gern größer gesehen.",
      },
      {
        name: "Aylin Demir",
        stars: 5,
        text: "Ruhiger Einstieg, gute Story. Beim Budget hast du schneller gesprochen.",
      },
      {
        name: "Markus Weber",
        stars: 4,
        text: "Starker roter Faden. Bei Rückfragen ruhig kurz Pause machen.",
      },
    ];
    return { feedback: all.filter((f) => names.includes(f.name)) };
  },
  synth(): SynthOut {
    return {
      summary: "Dein Lernpfad ist aktualisiert. Nächster Hebel: Rückfragen.",
      levelChanges: [
        { sub: "story", level: 4, reason: "Kundenstory kam laut Kollegen sehr gut an" },
        { sub: "koerper", level: 4, reason: "Sicherer Auftritt und Blickkontakt (Aylin)" },
        { sub: "fragen", level: 2, reason: "Selbst- und Fremdeinschätzung: noch zu schnell bei Rückfragen" },
      ],
      recommendations: [
        { type: "Intern", title: "Souverän mit Rückfragen umgehen", why: "45 min" },
        { type: "Extern", title: "Rhetorik-Stammtisch Stuttgart", why: "monatlich" },
      ],
      memory: [
        "Bei Rückfragen sprichst du schneller. Erst zwei Sekunden Pause.",
        "Einstieg mit Kundenstory wirkt",
        "Lernt gut mit Video-Generalprobe",
      ],
    };
  },
  chat(): TextOut {
    return {
      text: "Im Skript-Modus kann ich das nicht frei beantworten. Probier: „Ich muss morgen präsentieren“.",
    };
  },
};
