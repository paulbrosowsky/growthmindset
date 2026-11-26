// Scripted answers used when the Claude API is not configured or does not answer in time.
import type { LevelChange, PeerFeedback, Profile, Rec, Slide } from "./types";

export type WelcomeOut = { summary: string; focus: string[]; firstStep: string };
export type PrepOut = { text: string; options: { kind: "video" | "read" | "practice"; title: string; detail: string }[] };
export type SlidesOut = { slides: Slide[] };
export type VideoOut = { good: string[]; improve: string[]; tip: string; levelChanges: LevelChange[] };
export type OnboardOut = { reaction: string; followUp: string; nextQuestion?: string; suggestions?: string[] };
export type ProfileOut = { intro: string; wer: string[]; was: string[]; wie: string[]; goal: string };
export type TextOut = { text: string };
export type PeersOut = { feedback: PeerFeedback[] };
export type SynthOut = {
  summary: string;
  levelChanges: LevelChange[];
  recommendations: { type: Rec["type"]; title: string; why: string }[];
  memory: string[];
};

// Neutral, damit sie zu jeder Antwort passen (im Live-Modus formuliert Claude sie individuell).
const REACTIONS = ["Danke.", "Danke, das hilft mir.", "Danke für deine Offenheit.", "Ein klares Bild.", "Verstanden.", "Gut, daran arbeiten wir.", "Gut zu wissen.", "Danke."];

/** Antwort in kurze Stichworte zerlegen (Nachfrage-Antworten in Klammern fallen weg). */
const clauses = (t: string | undefined, maxWords = 6) =>
  (t || "")
    .replace(/\s*\([^)]*\)/g, "")
    .split(/[,.;]\s*/)
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => c.split(/\s+/).slice(0, maxWords).join(" "))
    .map((c) => c.charAt(0).toUpperCase() + c.slice(1));

export const fallback = {
  /** Skript-Modus: feste Reaktionen, Nachfragen nur bei „meiden“ und bei einem sehr knappen 4-Wochen-Ziel. */
  onboard(step: number, answer: string, left: number, isFollowUpAnswer: boolean): OnboardOut {
    if (isFollowUpAnswer) return { reaction: "Danke, das verstehe ich jetzt besser.", followUp: "" };
    let followUp = "";
    if (left > 0 && step === 3 && /meide|vermeide|ungern|scheue|umgehe/i.test(answer)) followUp = "Was genau macht das für dich unangenehm?";
    else if (left > 0 && step === 6 && answer.split(/\s+/).length < 6) followUp = "Woran würdest du merken, dass du es geschafft hast?";
    return { reaction: followUp ? (step === 3 ? "Danke für deine Offenheit." : "Okay.") : REACTIONS[step - 1] || "Danke.", followUp };
  },
  profile(a: Partial<Profile>, correction = ""): ProfileOut {
    const fix = correction.replace(/^(ziel|lernziel)?\s*(lieber|eher|bitte)?\s*:?\s*/i, "").trim();
    const goal = fix || clauses(a.goal, 10).join(", ");
    return {
      intro: "So habe ich dich verstanden:",
      wer: [clauses(a.role)[0], clauses(a.experience)[0], ...clauses(a.likes)].filter(Boolean).slice(0, 4),
      was: [clauses(a.vision)[0], clauses(a.learn)[0]].filter(Boolean),
      wie: [...clauses(a.preference), ...clauses(a.time)].filter(Boolean).slice(0, 4),
      goal: `In 4 Wochen: ${goal || "einen Einsatz sicher in der Fallbesprechung vorstellen"}`,
    };
  },
  welcome(p: Profile | null): WelcomeOut {
    const name = p?.name || "du";
    return {
      summary: `Dein Lernpfad steht, ${name}. Fokus: Fallvorstellung, Traumaversorgung, Belastbarkeit.`,
      focus: ["praes", "patient", "resi"],
      firstStep: "Einsatz nach cABCDE aufbereiten",
    };
  },
  prep(topic: string, progress: number): PrepOut {
    return {
      text: `Gut, dass du dich meldest! Deine Struktur ist schon solide. Drei Wege bis morgen, du entscheidest:`,
      options: [
        { kind: "video", title: "Fallvorstellung klar strukturieren", detail: "12 min" },
        { kind: "read", title: "Vorlage Fallvorstellung der Wache", detail: "15 min" },
        { kind: "practice", title: "Generalprobe mit Video", detail: "10 min" },
      ],
    };
  },
  slides(topic: string): SlidesOut {
    return {
      slides: [
        {
          title: topic.split(/,| vor | der /)[0].slice(0, 32),
          bullets: ["Einsatzanlass", "Was wir vorfanden", "Was wir lernen können"],
          note: "Mit dem Bild an der Einsatzstelle starten, nicht mit der Agenda.",
        },
        {
          title: "Lage und Ersteindruck",
          bullets: ["Unfallmechanismus", "Ersteindruck Patient", "Nachforderung Notarzt"],
          note: "Den Kernbefund zuerst nennen, dann kurz Pause.",
        },
        {
          title: "Versorgung nach cABCDE",
          bullets: ["Kritische Blutung", "Atemweg und Atmung", "Kreislauf und Transport"],
          note: "Bei jedem Schritt Blickkontakt in die Runde.",
        },
        {
          title: "Was gut lief, was nicht",
          bullets: ["Absprachen im Team", "Zeit an der Einsatzstelle", "Übergabe im Schockraum"],
          note: "Rückfragen erwarten: wiederholen, atmen, antworten.",
        },
        {
          title: "Fragen an die Runde",
          bullets: ["Was hättet ihr anders gemacht?", "Was nehmen wir mit?", "Nächste Schritte"],
          note: "Offene Frage stellen, Blick in die Runde, aushalten.",
        },
      ],
    };
  },
  video(): VideoOut {
    return {
      good: ["Klarer Einstieg mit dem Bild der Einsatzstelle."],
      improve: ["Viele Füllwörter. Bei Bild 3 Blick auf den Laptop statt in die Runde."],
      tip: "Vor dem Kernbefund einatmen und zwei Sekunden Pause.",
      levelChanges: [
        { sub: "koerper", level: 4, reason: "Generalprobe mit Videoanalyse" },
        { sub: "folien", level: 3, reason: "Fallvorstellung mit Folien erarbeitet" },
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
        name: "Thomas Weber",
        stars: 4,
        text: "Starker roter Faden. Bei Rückfragen ruhig kurz Pause machen.",
      },
      {
        name: "Lisa Schneider",
        stars: 5,
        text: "Die cABCDE-Folie hat mir als Azubi richtig geholfen.",
      },
      {
        name: "Jonas Wagner",
        stars: 4,
        text: "Ruhiger Einstieg. Beim Zeitstrahl hast du schneller gesprochen.",
      },
    ];
    return { feedback: all.filter((f) => names.includes(f.name)) };
  },
  synth(): SynthOut {
    return {
      summary: "Dein Lernpfad ist aktualisiert. Nächster Hebel: Rückfragen.",
      levelChanges: [
        { sub: "story", level: 4, reason: "Einstieg mit dem Einsatzbild kam laut Kollegen sehr gut an" },
        { sub: "struktur", level: 4, reason: "Klarer roter Faden nach cABCDE (Thomas, Lisa)" },
        { sub: "fragen", level: 3, reason: "Selbst- und Fremdeinschätzung: bei Rückfragen noch zu schnell" },
      ],
      recommendations: [
        { type: "Intern", title: "F13 Professionelle Gesprächsführung", why: "1 Tag" },
        { type: "Extern", title: "Rhetorik-Stammtisch in Musterstadt", why: "monatlich" },
      ],
      memory: [
        "Bei Rückfragen sprichst du schneller. Erst zwei Sekunden Pause.",
        "Einstieg mit dem Einsatzbild wirkt",
        "Lernt gut mit Video-Generalprobe",
      ],
    };
  },
  chat(): TextOut {
    return {
      text: "Im Skript-Modus kann ich das nicht frei beantworten. Probier: „Ich muss morgen bei der Fallbesprechung vorstellen“.",
    };
  },
};
