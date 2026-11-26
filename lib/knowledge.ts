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
      core: ["Präsentieren (Soll 4/5)", "Produktmanagement (Soll 4/5)", "Datenanalyse (Soll 3/5)", "Moderation (Soll 3/5)"],
    },
    {
      name: "Entwickler/in",
      core: ["Wärmepumpen-Technik (Soll 4/5)", "Agiles Arbeiten (Soll 4/5)", "Feedback geben (Soll 3/5)"],
    },
    {
      name: "UX-Designer/in",
      core: ["Nutzerforschung (Soll 5/5)", "Präsentieren (Soll 3/5)", "Moderation (Soll 3/5)"],
    },
    {
      name: "Teamleiter/in",
      core: ["Feedback geben (Soll 5/5)", "Moderation (Soll 4/5)", "Resilienz (Soll 4/5)", "Präsentieren (Soll 4/5)"],
    },
  ],
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

/** Target level (Soll) of a skill for the person's role; demo heuristic. */
export function targetLevel(skillId: string, focus: string[]): number {
  return skillId === "praes" || focus.includes(skillId) ? 4 : 3;
}

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
        s("markt", "Energiemarkt", [
          ["mfoer", "Förderlandschaft", 4],
          ["mwett", "Wettbewerb", 3],
          ["mtrend", "Trends", 3],
        ]),
        s("pm", "Produktmanagement", [
          ["disc", "Product Discovery", 3],
          ["road", "Roadmapping", 3],
          ["kpi", "Kennzahlen", 2],
        ]),
      ],
    },
    {
      id: "meth",
      name: "Methoden",
      color: "#7C9CD6",
      skills: [
        s("agil", "Agiles Arbeiten", [
          ["scrum", "Scrum", 4],
          ["kanban", "Kanban", 3],
          ["retro", "Retrospektiven", 3],
        ]),
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
        s("ux", "Nutzerforschung", [
          ["interv", "Interviews", 3],
          ["tests", "Usability-Tests", 2],
          ["synth", "Synthese", 2],
        ]),
      ],
    },
    {
      id: "selbst",
      name: "Selbstführung",
      color: "#E3907D",
      skills: [
        s("zeit", "Zeitmanagement", [
          ["prio", "Prioritäten setzen", 3],
          ["fokus", "Fokuszeiten", 3],
          ["nein", "Nein sagen", 2],
        ]),
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
        s("lernen", "Lernen lernen", [
          ["ziele", "Lernziele setzen", 2],
          ["reflex", "Reflektieren", 2],
          ["routine", "Lernroutine", 2],
        ]),
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
    `# Rollen mit Soll-Profil\n${COMPANY.roles.map((ro) => `- ${ro.name}: ${ro.core.join(", ")}`).join("\n")}`,
    `# Kompetenzmodell (Kompetenzbereiche > Skills [ID] > Teilkompetenzen [ID], Stufen 0 bis 5)\n${model}`,
    `# Fortbildungskatalog (nur diese internen Angebote nennen)\n${CATALOG.map((c) => `- ${c.title} (${c.type}, ${c.duration})`).join("\n")}`,
    `# Lernmethoden und Motivation\n${METHODS.map((m) => `- ${m}`).join("\n")}`,
    `# Team der Nutzerin bzw. des Nutzers (jede Person hat einen eigenen Kompass-Assistenten)\n${TEAM.map((t) => `- ${t.name}, ${t.role}`).join("\n")}`,
  ].join("\n\n");
}
