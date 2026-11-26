// Generated demo knowledge base. In a real deployment HR/L&D curates this.
import type { AppState, Area, Rec, Skill } from "./types";

export const COMPANY = {
  name: "Neckartal Systemtechnik GmbH",
  short: "Neckartal",
  about:
    "Mittelständischer Hersteller von Steuerungen und Software für Wärmepumpen, 850 Mitarbeitende, Sitz in Esslingen am Neckar.",
  vision: "Wir machen klimafreundliches Heizen für jedes Haus einfach.",
  goals: [
    "Software-Anteil am Umsatz bis 2027 verdoppeln",
    "Time-to-Market neuer Produkte um 30 % senken",
    "50 % der Führungspositionen aus eigenen Reihen besetzen",
  ],
  values: ["Neugier", "Verantwortung", "Miteinander"],
  roles: [
    {
      name: "Produktmanager/in",
      match: "produkt|product|pm\\b",
      mission: "Verantwortet Produkte von der Idee bis zum Markterfolg.",
      core: [
        { skill: "praes", soll: 4 },
        { skill: "pm", soll: 4 },
        { skill: "daten", soll: 3 },
        { skill: "mod", soll: 3 },
      ],
    },
    {
      name: "Entwickler/in",
      match: "entwick|develop|software|engineer|programm",
      mission: "Baut Steuerungen und Software für unsere Wärmepumpen.",
      core: [
        { skill: "wp", soll: 4 },
        { skill: "agil", soll: 4 },
        { skill: "fb", soll: 3 },
      ],
    },
    {
      name: "UX-Designer/in",
      match: "ux|design|nutzer",
      mission: "Macht unsere Produkte einfach und verständlich.",
      core: [
        { skill: "ux", soll: 5 },
        { skill: "praes", soll: 3 },
        { skill: "mod", soll: 3 },
      ],
    },
    {
      name: "Teamleiter/in",
      match: "team|leit|führ|lead|manager",
      mission: "Führt ein Team und entwickelt Menschen weiter.",
      core: [
        { skill: "fb", soll: 5 },
        { skill: "mod", soll: 4 },
        { skill: "resi", soll: 4 },
        { skill: "praes", soll: 4 },
      ],
    },
  ] as { name: string; match: string; mission: string; core: { skill: string; soll: number }[] }[],
};

export const CATALOG: { title: string; type: string; duration: string; skill: string }[] = [
  { title: "Wirkungsvoll präsentieren", type: "Interner Workshop", duration: "2 × 3 Stunden", skill: "praes" },
  { title: "Storytelling mit Daten", type: "Interner Workshop", duration: "1 Tag", skill: "praes" },
  { title: "Souverän mit Rückfragen umgehen", type: "E-Learning", duration: "45 Minuten", skill: "praes" },
  { title: "Folienvorlage und Präsentationsleitfaden", type: "Intranet-Ressource", duration: "15 Minuten", skill: "praes" },
  { title: "Moderation für Einsteiger", type: "Interner Workshop", duration: "1 Tag", skill: "mod" },
  { title: "Feedback nach dem SBI-Modell", type: "E-Learning", duration: "30 Minuten", skill: "fb" },
  { title: "SQL für Produktleute", type: "Lernpfad Neckartal Academy", duration: "6 × 1 Stunde", skill: "daten" },
  { title: "Wärmepumpe kompakt", type: "Interne Schulung", duration: "4 Stunden", skill: "wp" },
  { title: "Resilienz im Arbeitsalltag (mit der Betriebskrankenkasse)", type: "Workshop", duration: "3 Stunden", skill: "resi" },
  { title: "Mentoring-Programm Nachwuchsführung", type: "Programm", duration: "6 Monate", skill: "lernen" },
];

export const METHODS: string[] = [
  "70/20/10: 70 % lernen wir durch Erfahrung im Job, 20 % durch Austausch und Feedback, 10 % durch formale Formate. Deshalb echte Aufgaben zu Lernanlässen machen.",
  "Growth Mindset (Dweck): Fähigkeiten wachsen durch Anstrengung, gute Strategien und Feedback. Einsatz und Lernfortschritt loben, nicht Talent. Fehler als nächsten Lernschritt formulieren.",
  "Deliberate Practice: gezielt an einer Schwäche üben, mit sofortigem Feedback, in kurzen fokussierten Einheiten.",
  "Erfahrungslernen nach Kolb: Erleben, Reflektieren, Verallgemeinern, Ausprobieren. Ohne Reflexion bleibt Erfahrung ungenutzt.",
  "Feedback nach SBI: Situation, Verhalten (Behavior), Wirkung (Impact). Konkret und beobachtbar statt pauschal.",
  "Spaced Repetition: Wiederholen in wachsenden Abständen sichert Gelerntes.",
  "Selbstbestimmungstheorie: Motivation entsteht durch Autonomie (selbst wählen), Kompetenzerleben (Fortschritt sehen) und Verbundenheit (mit anderen lernen).",
  "Kleine Schritte: lieber 10 Minuten heute als ein Tag irgendwann. Lernen an konkrete Termine im Kalender koppeln.",
];

export const TEAM = [
  { name: "Jonas Krüger", role: "Entwickler", initials: "JK" },
  { name: "Aylin Demir", role: "UX-Designerin", initials: "AD" },
  { name: "Markus Weber", role: "Teamleiter", initials: "MW" },
];

export const BADGES: Record<string, { name: string; text: string }> = {
  start: { name: "Erste Schritte", text: "Onboarding abgeschlossen" },
  generalprobe: { name: "Generalprobe", text: "Erste Übung mit Videoanalyse" },
  feedback: { name: "Feedback-Sammler", text: "Erstes Feedback von Kollegen" },
  loop: { name: "Loop geschlossen", text: "Erfahrung bis zu neuen Vorschlägen geführt" },
  mutig: { name: "Mutig", text: "Eine Aufgabe außerhalb der Komfortzone angepackt" },
};

export type RoleProfile = (typeof COMPANY.roles)[number];

/** Stellenprofil zur frei eingegebenen Rolle; ohne Treffer das Produktmanagement-Profil (Demo-Persona). */
export function roleFor(role?: string): RoleProfile {
  const r = (role || "").toLowerCase();
  // Produkt zuerst prüfen, damit „Produktmanagerin“ nicht beim Teamleiter landet.
  return COMPANY.roles.find((x) => new RegExp(x.match, "i").test(r)) ?? COMPANY.roles[0];
}

/** Soll-Stufe eines Skills: aus dem Stellenprofil, sonst Demo-Heuristik. */
export function targetLevel(skillId: string, focus: string[], role?: string): number {
  const core = roleFor(role).core.find((c) => c.skill === skillId);
  if (core) return core.soll;
  return focus.includes(skillId) ? 4 : 3;
}

/** Ist-Stufe eines Skills (0 bis 5) aus dem Fortschritt. */
export const skillLevel = (sk: Skill) => Math.round(skillProgress(sk) / 20);

/** Pflichtfortbildungen; Fälligkeit in Tagen ab Start der Demo. */
export const MANDATORY: { id: string; title: string; meta: string; dueDays: number; desc: string; duration: string; last: string }[] = [
  { id: "arbeitsschutz", title: "Unterweisung Arbeitsschutz", meta: "jährlich · 20 min", dueDays: 12, duration: "20 min", last: "Dez. 2025", desc: "Die jährliche Pflichtunterweisung: Gefahren am Arbeitsplatz, Verhalten im Notfall, Erste Hilfe. Mit kurzem Abschlusstest." },
  { id: "infosec", title: "Informationssicherheit", meta: "jährlich · 30 min", dueDays: 26, duration: "30 min", last: "Jan. 2026", desc: "Phishing erkennen, sichere Passwörter, Umgang mit vertraulichen Daten. Mit Quiz am Ende." },
  { id: "dsgvo", title: "Datenschutz (DSGVO)", meta: "alle 2 Jahre · 25 min", dueDays: -40, duration: "25 min", last: "Okt. 2026", desc: "Grundlagen der DSGVO und was sie für deinen Arbeitsalltag bedeuten." },
  { id: "compliance", title: "Verhaltenskodex und Compliance", meta: "jährlich · 15 min", dueDays: -75, duration: "15 min", last: "Sept. 2026", desc: "Unser Verhaltenskodex in Beispielen: Geschenke, Interessenkonflikte, Fairness." },
];

/* ---------- Persönliche Ziele: Lernpfad mit Challenges ---------- */

export type ChallengeKind = "Lernen" | "Üben" | "Anwenden" | "Reflexion";
export type Challenge = { id: string; area: string; title: string; kind: ChallengeKind; min: number; text: string };

export const CHALLENGE_XP: Record<ChallengeKind, number> = { Lernen: 30, Üben: 60, Anwenden: 80, Reflexion: 40 };

const ch = (id: string, area: string, title: string, kind: ChallengeKind, min: number, text: string): Challenge => ({ id, area, title, kind, min, text });

/** Zwei Demo-Pfade: Konflikte (Standard) und Präsentieren. Gewählt nach dem Lernziel aus dem Onboarding. */
export const GOAL_PATHS: Record<"konflikt" | "praes", { title: string; challenges: Challenge[] }> = {
  konflikt: {
    title: "Wie gehe ich mit Konfliktsituationen um?",
    challenges: [
      ch("k1", "fach", "Konfliktstufen nach Glasl", "Lernen", 15, "Neun Stufen, an denen du erkennst, wie weit ein Konflikt schon ist."),
      ch("k2", "komm", "Ich-Botschaften üben", "Üben", 10, "Sag, was du wahrnimmst und was du brauchst, ohne Vorwurf."),
      ch("k3", "fach", "Interessen statt Positionen", "Lernen", 15, "Frag nach dem Warum hinter einer Forderung."),
      ch("k4", "meth", "Gespräch mit Leitfaden strukturieren", "Anwenden", 20, "Ein klarer Ablauf nimmt Druck raus. Probier ihn im nächsten Gespräch aus."),
      ch("k5", "komm", "Feedback nach SBI", "Lernen", 30, "Situation, Verhalten, Wirkung: Feedback, das ankommt."),
      ch("k6", "fach", "Konflikttypen im Team erkennen", "Lernen", 20, "Sach-, Beziehungs- oder Rollenkonflikt? Die Art bestimmt den Weg."),
      ch("k7", "komm", "Schwieriges Gespräch simulieren", "Üben", 15, "Übe mit Kompass ein Gespräch, bei dem es hakt."),
      ch("k8", "meth", "Hitzige Runde moderieren", "Anwenden", 30, "Bring eine Runde zurück zur Sache, wenn es laut wird."),
      ch("k9", "komm", "Klärungsgespräch führen", "Anwenden", 30, "Führe das Gespräch, das du schon länger vor dir herschiebst."),
      ch("k10", "meth", "Reflexion nach dem Gespräch", "Reflexion", 10, "Was lief gut, was nimmst du mit?"),
    ],
  },
  praes: {
    title: "",
    challenges: [
      ch("p1", "fach", "Storyline nach dem Pyramidenprinzip", "Lernen", 15, "Die Kernaussage zuerst, dann die Argumente."),
      ch("p2", "komm", "Einstieg in 30 Sekunden", "Üben", 10, "Ein Satz, der die Runde sofort abholt."),
      ch("p3", "fach", "Zahlen anschaulich zeigen", "Lernen", 15, "Eine Folie, eine Aussage, eine Zahl."),
      ch("p4", "meth", "Generalprobe mit Video", "Üben", 15, "Nimm dich auf und lass Kompass Feedback geben."),
      ch("p5", "komm", "Mit Fragen souverän umgehen", "Lernen", 20, "Zuhören, wiederholen, kurz antworten."),
      ch("p6", "fach", "Roadmap-Folie schärfen", "Anwenden", 20, "Weniger Punkte, klarere Prioritäten."),
      ch("p7", "komm", "Stimme und Pausen", "Üben", 10, "Pausen wirken sicherer als schnelle Sätze."),
      ch("p8", "meth", "Präsentation halten", "Anwenden", 30, "Der echte Termin. Du bist vorbereitet."),
      ch("p9", "komm", "Feedback einholen", "Anwenden", 15, "Frag zwei Kolleg/innen, was hängen blieb."),
      ch("p10", "meth", "Reflexion danach", "Reflexion", 10, "Was nimmst du für die nächste Runde mit?"),
    ],
  },
};

export const goalPathKey = (goal?: string): "konflikt" | "praes" => (/präsent|praesent|vortrag|vorstell|roadmap|pitch|rede/i.test(goal || "") ? "praes" : "konflikt");
export const PATH_DONE_DEFAULT = (key: "konflikt" | "praes") => GOAL_PATHS[key].challenges.slice(0, 3).map((c) => c.id);

/** Weitere (zugeklappte) Ziele der Demo-Persona. */
export const OTHER_GOALS: { id: string; title: string; status: "pausiert" | "erreicht"; meta: string; done: number; total: number; color: string; text: string }[] = [
  { id: "daten", title: "Mit Daten überzeugen", status: "pausiert", meta: "pausiert · 2 von 8", done: 2, total: 8, color: "#E9B949", text: "Pausiert, solange du an deinem aktuellen Ziel arbeitest." },
  { id: "praesentieren", title: "Sicher vor großen Runden präsentieren", status: "erreicht", meta: "erreicht · Oktober", done: 8, total: 8, color: "#7FB5A3", text: "Alle 8 Challenges geschafft. Stark." },
];

/* ---------- Stellenprofil: Jahresziele und SOPs ---------- */

export const YEAR_GOALS: { id: string; title: string; meta: string; color: string }[] = [
  { id: "roadmap", title: "Roadmap-Planung für Q1 übernehmen", meta: "bis März · mit Markus Weber vereinbart", color: "#7C9CD6" },
  { id: "konflikt", title: "Konflikte im Team früh ansprechen", meta: "Teil deines aktuellen Ziels", color: "#E3907D" },
];

export const SOPS: { id: string; title: string; version: string; changed: string; summary: string; readDefault?: boolean }[] = [
  { id: "release", title: "Release-Freigabe", version: "3.2", changed: "20. Nov.", summary: "Neu: Freigaben brauchen zusätzlich ein Okay aus dem Support. Die Checkliste hat dafür einen eigenen Schritt." },
  { id: "anforderungen", title: "Anforderungen dokumentieren", version: "2.0", changed: "2. Okt.", summary: "Anforderungen stehen jetzt als User Stories mit Akzeptanzkriterien im Board.", readDefault: true },
];
export const MANDATORY_DONE_DEFAULT = ["dsgvo", "compliance"];

/** Feste Demo-Termine; Tage ab Start der Demo, Uhrzeit. */
export const FIXED_DATES: { id: string; title: string; sub: string; days: number; hour: number }[] = [
  { id: "jg", title: "Entwicklungsgespräch", sub: "mit Markus Weber", days: 19, hour: 10 },
];

const r = (id: string, type: Rec["type"], title: string, meta: string): Rec => ({ id, type, title, meta });

const s = (id: string, name: string, subs: [string, string, number][], recs: Rec[] = []): Skill => ({
  id,
  name,
  subs: subs.map(([sid, sname, level]) => ({ id: sid, name: sname, level, sources: ["Start"] })),
  recs,
});

export function initialAreas(): Area[] {
  return [
    {
      id: "komm",
      name: "Kommunikation",
      color: "#E9B949",
      skills: [
        s(
          "praes",
          "Präsentieren",
          [
            ["struktur", "Struktur und roter Faden", 4],
            ["folien", "Folien gestalten", 4],
            ["story", "Storytelling mit Daten", 2],
            ["koerper", "Körpersprache und Stimme", 2],
            ["fragen", "Umgang mit Fragen", 1],
          ],
          [
            r("p4", "Üben", "Generalprobe mit Video", "10 min"),
            r("p1", "Intern", "Storytelling mit Daten", "1 Tag"),
            r("p2", "Ressource", "Folienvorlage und Leitfaden", "15 min"),
            r("p3", "Intern", "Grundlagen der Präsentationsstruktur", "12 min"),
          ],
        ),
        s(
          "mod",
          "Moderation",
          [
            ["mvorb", "Meetings vorbereiten", 2],
            ["mleit", "Diskussionen leiten", 1],
            ["mkonf", "Mit Konflikten umgehen", 1],
          ],
          [r("m1", "Intern", "Workshop „Moderation für Einsteiger“", "Neckartal Academy · 1 Tag")],
        ),
        s(
          "fb",
          "Feedback geben",
          [
            ["sbi", "Konkret nach SBI", 3],
            ["fannehmen", "Feedback annehmen", 3],
            ["fkultur", "Feedbackkultur im Team", 2],
          ],
          [r("f1", "Intern", "E-Learning „Feedback nach dem SBI-Modell“", "30 Minuten")],
        ),
      ],
    },
    {
      id: "fach",
      name: "Fachwissen",
      color: "#7FB5A3",
      skills: [
        s(
          "wp",
          "Wärmepumpen-Technik",
          [
            ["wgrund", "Funktionsprinzip", 3],
            ["wsteu", "Regelung und Steuerung", 2],
            ["wnorm", "Normen und Förderung", 1],
          ],
          [r("w1", "Intern", "Schulung „Wärmepumpe kompakt“", "4 Stunden")],
        ),
        s(
          "markt",
          "Energiemarkt",
          [
            ["mfoer", "Förderlandschaft", 4],
            ["mwett", "Wettbewerb", 3],
            ["mtrend", "Trends", 3],
          ],
          [r("e1", "Ressource", "Marktreport „Wärmepumpen 2027“", "20 min")],
        ),
        s(
          "pm",
          "Produktmanagement",
          [
            ["disc", "Product Discovery", 3],
            ["road", "Roadmapping", 3],
            ["kpi", "Kennzahlen", 2],
          ],
          [r("pm1", "Intern", "Workshop „Produktkennzahlen und OKRs“", "Neckartal Academy · 1 Tag")],
        ),
      ],
    },
    {
      id: "meth",
      name: "Methoden",
      color: "#7C9CD6",
      skills: [
        s(
          "agil",
          "Agiles Arbeiten",
          [
            ["scrum", "Scrum", 4],
            ["kanban", "Kanban", 3],
            ["retro", "Retrospektiven", 3],
          ],
          [r("a1", "Ressource", "Leitfaden „Retrospektiven, die wirken“", "15 min")],
        ),
        s(
          "daten",
          "Datenanalyse",
          [
            ["sql", "SQL", 1],
            ["dash", "Dashboards", 2],
            ["stat", "Statistik-Grundlagen", 1],
          ],
          [r("d1", "Intern", "Lernpfad „SQL für Produktleute“", "6 × 1 Stunde")],
        ),
        s(
          "ux",
          "Nutzerforschung",
          [
            ["interv", "Interviews", 3],
            ["tests", "Usability-Tests", 2],
            ["synth", "Synthese", 2],
          ],
          [r("u1", "Intern", "Hospitation bei den Usability-Tests im UX-Team", "2 Stunden")],
        ),
      ],
    },
    {
      id: "selbst",
      name: "Selbstführung",
      color: "#E3907D",
      skills: [
        s(
          "zeit",
          "Zeitmanagement",
          [
            ["prio", "Prioritäten setzen", 3],
            ["fokus", "Fokuszeiten", 3],
            ["nein", "Nein sagen", 2],
          ],
          [r("z1", "Ressource", "Methode „Eisenhower-Matrix“ mit Vorlage", "10 min")],
        ),
        s(
          "resi",
          "Resilienz",
          [
            ["pausen", "Pausen und Erholung", 2],
            ["stress", "Mit Druck umgehen", 2],
            ["energie", "Energie-Management", 1],
          ],
          [r("r1", "Intern", "Workshop „Resilienz im Arbeitsalltag“", "3 Stunden · mit der Betriebskrankenkasse")],
        ),
        s(
          "lernen",
          "Lernen lernen",
          [
            ["ziele", "Lernziele setzen", 2],
            ["reflex", "Reflektieren", 2],
            ["routine", "Lernroutine", 2],
          ],
          [r("l1", "Ressource", "Vorlage „Wochenreflexion in 5 Minuten“", "5 min")],
        ),
      ],
    },
  ];
}

export function skillProgress(skill: Skill): number {
  const sum = skill.subs.reduce((a, b) => a + b.level, 0);
  return Math.round((sum / (5 * skill.subs.length)) * 100);
}

export function areaProgress(area: Area): number {
  const p = area.skills.map(skillProgress);
  return Math.round(p.reduce((a, b) => a + b, 0) / p.length);
}

export function findSkill(areas: Area[], id: string): Skill | undefined {
  for (const a of areas) for (const sk of a.skills) if (sk.id === id) return sk;
  return undefined;
}

export const XP_PER_LEVEL = 400;
export const levelOf = (xp: number) => Math.floor(xp / XP_PER_LEVEL) + 1;

export function initialState(username: string): AppState {
  const now = Date.now();
  const day = 864e5;
  return {
    username,
    createdAt: new Date(now).toISOString(),
    profile: null,
    focus: [],
    areas: initialAreas(),
    xp: 1240,
    badges: [],
    mandatoryDone: [...MANDATORY_DONE_DEFAULT],
    sopRead: SOPS.filter((x) => x.readDefault).map((x) => x.id),
    journal: [
      {
        id: "seed1",
        date: new Date(now - 14 * day).toISOString(),
        title: "Workshop „Folien gestalten“ abgeschlossen",
        kind: "Lernen",
        xp: 120,
      },
      {
        id: "seed2",
        date: new Date(now - 21 * day).toISOString(),
        title: "Projekt-Update im Team-Weekly vorgestellt",
        detail: "Teilkompetenz Struktur und roter Faden bestätigt",
        kind: "Anwenden",
        xp: 60,
      },
      {
        id: "seed3",
        date: new Date(now - 28 * day).toISOString(),
        title: "Artikel zur Pyramiden-Struktur gelesen",
        kind: "Lernen",
        xp: 15,
      },
    ],
    memory: [],
    phase: "new",
    presentation: null,
    timeOffsetMs: 0,
    teamChallenge: 6,
    feedbackReceived: [],
    messages: [],
  };
}

/** Stable knowledge block for the system prompt (cached). */
export function knowledgeText(): string {
  const model = initialAreas()
    .map(
      (a) =>
        `- Kompetenzbereich ${a.name}: ` +
        a.skills.map((sk) => `${sk.name} [${sk.id}] (Teilkompetenzen: ${sk.subs.map((x) => `${x.name} [${x.id}]`).join(", ")})`).join("; "),
    )
    .join("\n");
  return [
    `# Unternehmen\n${COMPANY.name}: ${COMPANY.about}\nVision: ${COMPANY.vision}\nZiele: ${COMPANY.goals.join("; ")}\nWerte: ${COMPANY.values.join(", ")}`,
    `# Rollen mit Soll-Profil\n${COMPANY.roles.map((ro) => `- ${ro.name}: ${ro.core.map((c) => `${c.skill} Soll ${c.soll}/5`).join(", ")}`).join("\n")}`,
    `# Pflichtfortbildungen\n${MANDATORY.map((m) => `- ${m.title} (${m.meta})`).join("\n")}`,
    `# Kompetenzmodell (Kompetenzbereiche > Skills [ID] > Teilkompetenzen [ID], Stufen 0 bis 5)\n${model}`,
    `# Fortbildungskatalog (nur diese internen Angebote nennen)\n${CATALOG.map((c) => `- ${c.title} (${c.type}, ${c.duration})`).join("\n")}`,
    `# Lernmethoden und Motivation\n${METHODS.map((m) => `- ${m}`).join("\n")}`,
    `# Team der Nutzerin bzw. des Nutzers (jede Person hat einen eigenen Kompass-Assistenten)\n${TEAM.map((t) => `- ${t.name}, ${t.role}`).join("\n")}`,
  ].join("\n\n");
}
