// Demo-Unternehmenskontext: DRK-Kreisverband Musterstadt e. V. (fiktiv, siehe docs/DRK_Personalentwicklung_Demodaten.md).
// In einem echten Betrieb pflegt die Personalentwicklung diese Daten.
import type { AppState, Area, ChallengeKind, GoalPathState, PathChallenge, Rec, Skill } from "./types";
import { SAA_SOURCE, SAA_TOC } from "./saa";

/** Kompetenzstufen des Kreisverbands (1 bis 4). Teilkompetenzen nutzen dieselbe Skala, 0 = noch nicht bewertet. */
export const MAX_LEVEL = 4;
export const LEVELS: { n: number; name: string; text: string }[] = [
  { n: 1, name: "Grundlagen", text: "Kennt grundlegende Zusammenhänge und benötigt Anleitung." },
  { n: 2, name: "Fortgeschritten", text: "Kann Aufgaben im normalen Arbeitsalltag selbstständig durchführen." },
  { n: 3, name: "Experte", text: "Beherrscht komplexe Aufgaben und kann andere fachlich unterstützen." },
  { n: 4, name: "Multiplikator", text: "Kann Wissen vermitteln, Prozesse gestalten und andere Mitarbeitende entwickeln." },
];

type Core = { name: string; skill?: string; soll: number };
export type RoleProfile = {
  id: string;
  name: string;
  dept: string;
  lead: string;
  match: string;
  mission: string;
  tasks: string[];
  core: Core[];
  growth: string[];
  /** Pflichtschulungen (IDs), die für das Jobprofil verpflichtend zugeordnet sind */
  pflicht: string[];
};

const ALL_P = ["P01", "P02", "P03", "P04", "P05"];

export const COMPANY = {
  name: "DRK-Kreisverband Musterstadt e. V.",
  short: "DRK Musterstadt",
  about:
    "Gemeinnützige Hilfsorganisation mit Rettungsdienst, rund 180 Mitarbeitende und 35 Ehrenamtliche, mehrere Rettungswachen und eine zentrale Verwaltung. Geschäftsfelder: Rettungsdienst, Ausbildung, Verwaltung, Materialwirtschaft und Logistik.",
  vision:
    "Eine starke Gemeinschaft, die Menschen in Not zuverlässig hilft. Mitarbeitende sind das wichtigste Kapital, ihre fachlichen, persönlichen und sozialen Kompetenzen werden kontinuierlich gefördert.",
  mission:
    "Professionelle Hilfe in Notfallsituationen, qualifizierte Nachwuchskräfte ausbilden, ein Arbeitsumfeld schaffen, in dem sich Mitarbeitende entwickeln und langfristig engagieren.",
  values: ["Menschlichkeit", "Professionalität", "Teamgeist", "Verantwortung", "Weiterentwicklung", "Verlässlichkeit"],
  dimensions: [
    "Fachkompetenz (berufsspezifisches Wissen und Können)",
    "Methodenkompetenz (Aufgaben strukturiert lösen, Dokumentation)",
    "Sozialkompetenz (Kommunikation, Teamfähigkeit, Empathie)",
    "Selbstkompetenz (Eigenverantwortung, Belastbarkeit, Zuverlässigkeit)",
    "Führungskompetenz (anleiten, Konflikte lösen, entscheiden)",
  ],
  general: "Für alle Mitarbeitenden gilt mindestens Stufe 2 in Teamfähigkeit, Kommunikation, Verantwortungsbewusstsein, Zuverlässigkeit, Datenschutzbewusstsein, Lernbereitschaft und digitaler Grundkompetenz.",
  // Reihenfolge = Prüfreihenfolge für die frei eingegebene Rolle (spezifische zuerst).
  roles: [
    {
      id: "azubi",
      name: "Azubi Notfallsanitäter/in",
      dept: "Rettungsdienst / Ausbildung",
      lead: "Praxisanleitung und Wachenleitung",
      match: "azubi|auszubild|ausbildung zum|in ausbildung",
      mission: "Erwerb der fachlichen und persönlichen Kompetenzen für den Beruf Notfallsanitäter/in.",
      tasks: ["Theoretische und praktische Ausbildung", "Rettungseinsätze begleiten", "Patientenversorgung unter Anleitung", "Ausbildungsinhalte dokumentieren"],
      core: [
        { name: "Notfallmedizinisches Fachwissen", skill: "notfall", soll: 2 },
        { name: "Patientenversorgung", skill: "patient", soll: 2 },
        { name: "Kommunikation", skill: "praes", soll: 2 },
        { name: "Teamfähigkeit", skill: "team", soll: 2 },
        { name: "Belastbarkeit", skill: "resi", soll: 2 },
        { name: "Lernbereitschaft", skill: "lernen", soll: 3 },
        { name: "Dokumentation", skill: "doku", soll: 2 },
        { name: "Selbstorganisation", skill: "orga", soll: 2 },
      ],
      growth: ["Erfolgreicher Ausbildungsabschluss", "Schrittweise Übernahme beruflicher Tätigkeiten", "Entwicklung zum/zur Notfallsanitäter/in"],
      pflicht: ["P01", "P02", "P04", "P05"],
    },
    {
      id: "praxisanleitung",
      name: "Praxisanleiter/in",
      dept: "Rettungsdienst / Ausbildung",
      lead: "Wachenleitung",
      match: "praxisanleit|anleiter",
      mission: "Fachliche und pädagogische Begleitung von Auszubildenden.",
      tasks: ["Praxisanleitungen planen und durchführen", "Azubis im Einsatzdienst begleiten", "Ausbildungsfortschritt bewerten", "Feedback- und Entwicklungsgespräche führen"],
      core: [
        { name: "Notfallmedizinisches Fachwissen", skill: "notfall", soll: 4 },
        { name: "Pädagogische Kompetenz", skill: "paed", soll: 3 },
        { name: "Kommunikationsfähigkeit", skill: "praes", soll: 4 },
        { name: "Feedbackkompetenz", skill: "fbk", soll: 3 },
        { name: "Konfliktmanagement", skill: "konflikt", soll: 3 },
        { name: "Organisationsfähigkeit", skill: "orga", soll: 3 },
        { name: "Führungskompetenz", skill: "fuehrung", soll: 3 },
        { name: "Dokumentation", skill: "doku", soll: 3 },
      ],
      growth: ["Weiterbildung in Erwachsenenbildung", "Pädagogische Kompetenzen erweitern", "Entwicklung zur Ausbildungskoordination"],
      pflicht: ALL_P,
    },
    {
      id: "wachenleitung",
      name: "Wachenleitung",
      dept: "Rettungsdienst",
      lead: "Geschäftsführung / Rettungsdienstleitung",
      match: "wachenleit|wachleit|leiter der wache|leitung der wache",
      mission: "Organisation, Führung und Sicherstellung eines reibungslosen Betriebs der Rettungswache.",
      tasks: ["Mitarbeitende führen und entwickeln", "Dienst- und Urlaubsplanung", "Qualitäts- und Sicherheitsstandards überwachen", "Fortbildungen und Pflichtschulungen planen"],
      core: [
        { name: "Führungskompetenz", skill: "fuehrung", soll: 4 },
        { name: "Personalmanagement", soll: 3 },
        { name: "Organisationsfähigkeit", skill: "orga", soll: 4 },
        { name: "Kommunikation", skill: "praes", soll: 4 },
        { name: "Konfliktmanagement", skill: "konflikt", soll: 3 },
        { name: "Rettungsdienstliches Fachwissen", skill: "notfall", soll: 3 },
        { name: "Qualitätsmanagement", soll: 3 },
        { name: "Entscheidungsfähigkeit", skill: "entscheid", soll: 4 },
        { name: "Personalentwicklung", skill: "fbk", soll: 3 },
      ],
      growth: ["Weiterbildung Führung und Management", "Qualifizierung im Qualitätsmanagement", "Entwicklung zur Rettungsdienstleitung"],
      pflicht: ALL_P,
    },
    {
      id: "notsan",
      name: "Notfallsanitäter/in",
      dept: "Rettungsdienst",
      lead: "Wachenleitung",
      match: "notfallsan|notsan|nfs\\b",
      mission: "Professionelle Versorgung und Betreuung von Notfallpatienten.",
      tasks: [
        "Notfallmedizinische Maßnahmen eigenverantwortlich durchführen",
        "Notfallsituationen einschätzen und beurteilen",
        "Lebensrettende Maßnahmen",
        "Betreuung und Transport von Patienten",
        "Einsätze dokumentieren",
        "Zusammenarbeit mit Ärzten, Kliniken und Einsatzkräften",
      ],
      core: [
        { name: "Notfallmedizinisches Fachwissen", skill: "notfall", soll: 4 },
        { name: "Patientenversorgung", skill: "patient", soll: 4 },
        { name: "Kommunikation", skill: "praes", soll: 3 },
        { name: "Teamfähigkeit", skill: "team", soll: 3 },
        { name: "Belastbarkeit", skill: "resi", soll: 3 },
        { name: "Entscheidungsfähigkeit", skill: "entscheid", soll: 3 },
        { name: "Dokumentation", skill: "doku", soll: 2 },
        { name: "Verantwortungsbewusstsein", skill: "verantw", soll: 3 },
      ],
      growth: ["Fachliche Spezialisierung in der Notfallmedizin", "Weiterbildung zum/zur Praxisanleiter/in", "Entwicklung zur Wachenleitung"],
      pflicht: ALL_P,
    },
    {
      id: "rettsan",
      name: "Rettungssanitäter/in",
      dept: "Rettungsdienst",
      lead: "Wachenleitung",
      match: "rettungssan|rettsan|\\brs\\b|krankentransport",
      mission: "Unterstützung der Notfallrettung und Durchführung qualifizierter Krankentransporte.",
      tasks: ["Patienten versorgen und betreuen", "Krankentransporte durchführen", "Notfallsanitäter unterstützen", "Rettungsmittel kontrollieren und pflegen"],
      core: [
        { name: "Medizinische Fachkompetenz", skill: "notfall", soll: 3 },
        { name: "Patientenbetreuung", skill: "patient", soll: 3 },
        { name: "Kommunikation", skill: "praes", soll: 2 },
        { name: "Teamfähigkeit", skill: "team", soll: 3 },
        { name: "Belastbarkeit", skill: "resi", soll: 3 },
        { name: "Fahrzeug- und Materialkunde", skill: "material", soll: 2 },
        { name: "Dokumentation", skill: "doku", soll: 2 },
        { name: "Verantwortungsbewusstsein", skill: "verantw", soll: 3 },
      ],
      growth: ["Weiterbildung zum/zur Notfallsanitäter/in", "Spezialisierung im Rettungsdienst"],
      pflicht: ALL_P,
    },
    {
      id: "fsj",
      name: "FSJler/in",
      dept: "Rettungsdienst",
      lead: "Praxisanleitung / Wachenleitung",
      match: "fsj|freiwillig|bufdi|bundesfreiwillig",
      mission: "Unterstützung des Rettungsdienstes und Einblick in soziale und medizinische Berufsfelder.",
      tasks: ["Organisatorische Tätigkeiten", "Fahrzeuge vorbereiten und reinigen", "Verbrauchsmaterial auffüllen", "Seminare und pädagogische Begleitung"],
      core: [
        { name: "Grundlegendes Fachwissen", skill: "notfall", soll: 1 },
        { name: "Kommunikation", skill: "praes", soll: 2 },
        { name: "Teamfähigkeit", skill: "team", soll: 2 },
        { name: "Zuverlässigkeit", soll: 2 },
        { name: "Lernbereitschaft", skill: "lernen", soll: 3 },
        { name: "Selbstorganisation", skill: "orga", soll: 2 },
        { name: "Verantwortungsbewusstsein", skill: "verantw", soll: 2 },
      ],
      growth: ["Erste Erfahrungen im Rettungsdienst", "Vorbereitung auf die Ausbildung zum/zur Rettungssanitäter/in", "Persönliche und soziale Weiterentwicklung"],
      pflicht: ["P02", "P04", "P05"],
    },
    {
      id: "lager",
      name: "Lagermitarbeiter/in",
      dept: "Materialwirtschaft",
      lead: "Bereichsleitung Materialwirtschaft",
      match: "lager|logistik|material",
      mission: "Sicherstellung der Materialversorgung und Lagerorganisation.",
      tasks: ["Waren annehmen und kontrollieren", "Materialien einlagern und verwalten", "Verbrauchsmaterial ausgeben", "Inventuren durchführen"],
      core: [
        { name: "Lagerwirtschaft", soll: 3 },
        { name: "Warenwirtschaftssysteme", soll: 2 },
        { name: "Materialkenntnisse", skill: "material", soll: 3 },
        { name: "Organisationsfähigkeit", skill: "orga", soll: 3 },
        { name: "Sorgfalt", skill: "verantw", soll: 3 },
        { name: "Teamfähigkeit", skill: "team", soll: 2 },
        { name: "Digitale Kompetenz", soll: 2 },
        { name: "Arbeitssicherheit", soll: 3 },
      ],
      growth: ["Weiterbildung in Lagerlogistik", "Zusatzqualifikationen in der Materialwirtschaft", "Entwicklung zur Lagerleitung"],
      pflicht: ["P04", "P05"],
    },
    {
      id: "personal",
      name: "Personaler/in",
      dept: "Personalwesen",
      lead: "Geschäftsführung",
      match: "personal|\\bhr\\b|recruit",
      mission: "Betreuung und Weiterentwicklung der Mitarbeitenden sowie Unterstützung der Personalprozesse.",
      tasks: ["Personaladministration", "Recruiting und Onboarding", "Fort- und Weiterbildungen organisieren", "Qualifikationen und Pflichtschulungen verwalten"],
      core: [
        { name: "Arbeitsrechtliche Kenntnisse", soll: 3 },
        { name: "Personalmanagement", soll: 3 },
        { name: "Kommunikation", skill: "praes", soll: 3 },
        { name: "Datenschutz", soll: 3 },
        { name: "Organisationsfähigkeit", skill: "orga", soll: 3 },
        { name: "Digitale Kompetenz", soll: 3 },
        { name: "Konfliktmanagement", skill: "konflikt", soll: 2 },
        { name: "Beratungskompetenz", skill: "fbk", soll: 3 },
      ],
      growth: ["Weiterbildung im Personalmanagement", "Spezialisierung auf Personalentwicklung", "Qualifizierung in HR-Analytics"],
      pflicht: ["P04", "P05"],
    },
    {
      id: "einkauf",
      name: "Mitarbeiter/in Materialeinkauf",
      dept: "Einkauf / Materialwirtschaft",
      lead: "Geschäftsführung / Bereichsleitung",
      match: "einkauf|beschaffung|lieferant",
      mission: "Wirtschaftliche und bedarfsgerechte Materialbeschaffung sicherstellen.",
      tasks: ["Bedarf ermitteln und Bestellungen planen", "Angebote einholen und vergleichen", "Mit Lieferanten kommunizieren", "Beschaffungsprozesse optimieren"],
      core: [
        { name: "Einkaufsmanagement", soll: 3 },
        { name: "Verhandlungsgeschick", skill: "praes", soll: 3 },
        { name: "Wirtschaftliches Denken", soll: 3 },
        { name: "Lieferantenmanagement", soll: 3 },
        { name: "Organisationsfähigkeit", skill: "orga", soll: 3 },
        { name: "Digitale Kompetenz", soll: 3 },
        { name: "Kommunikation", soll: 3 },
        { name: "Vertragskenntnisse", soll: 2 },
      ],
      growth: ["Weiterbildung im strategischen Einkauf", "Spezialisierung auf Vergaberecht", "Entwicklung zur Einkaufsleitung"],
      pflicht: ["P04", "P05"],
    },
  ] as RoleProfile[],
};

/** Fortbildungsangebote des Kreisverbands (F01 bis F15), mit dem Skill, auf den sie einzahlen. */
export const CATALOG: { id: string; title: string; target: string; duration: string; turnus: string; skill: string }[] = [
  { id: "F01", title: "Kommunikation in schwierigen Einsatzsituationen", target: "Rettungsdienst, Wachenleitung", duration: "1 Tag", turnus: "alle 2 Jahre", skill: "praes" },
  { id: "F02", title: "Traumamanagement Advanced", target: "Notfallsanitäter/innen", duration: "2 Tage", turnus: "alle 2 Jahre", skill: "patient" },
  { id: "F03", title: "Pädagogik für Praxisanleiter", target: "Praxisanleiter/innen", duration: "2 Tage", turnus: "alle 2 Jahre", skill: "paed" },
  { id: "F04", title: "Führungskräftetraining", target: "Wachenleitung", duration: "2 Tage", turnus: "alle 2 Jahre", skill: "fuehrung" },
  { id: "F05", title: "Konfliktmanagement", target: "Wachenleitung, Personaler/innen", duration: "1 Tag", turnus: "alle 2 Jahre", skill: "konflikt" },
  { id: "F06", title: "Stressbewältigung und Resilienz", target: "Alle Mitarbeitenden", duration: "1 Tag", turnus: "jährlich empfohlen", skill: "resi" },
  { id: "F07", title: "Personalentwicklung und Mitarbeitergespräche", target: "Personaler/innen, Wachenleitung", duration: "1 Tag", turnus: "alle 2 Jahre", skill: "fbk" },
  { id: "F08", title: "Warenwirtschaft und Lagerlogistik", target: "Lagermitarbeitende", duration: "2 Tage", turnus: "alle 3 Jahre", skill: "material" },
  { id: "F09", title: "Strategischer Einkauf", target: "Materialeinkauf", duration: "2 Tage", turnus: "alle 3 Jahre", skill: "" },
  { id: "F10", title: "Excel und digitale Arbeitsprozesse", target: "Verwaltung, Einkauf", duration: "1 Tag", turnus: "nach Bedarf", skill: "orga" },
  { id: "F11", title: "Berufliche Orientierung im Rettungsdienst", target: "FSJler/innen, Azubis", duration: "1 Tag", turnus: "jährlich", skill: "lernen" },
  { id: "F12", title: "Notfallmedizinische Fallbesprechungen", target: "Notfallsanitäter/innen, Rettungssanitäter/innen", duration: "1 Tag", turnus: "jährlich", skill: "notfall" },
  { id: "F13", title: "Professionelle Gesprächsführung", target: "Alle Mitarbeitenden", duration: "1 Tag", turnus: "alle 2 Jahre", skill: "praes" },
  { id: "F14", title: "Qualitätsmanagement im Rettungsdienst", target: "Notfallsanitäter/innen, Wachenleitung", duration: "1 Tag", turnus: "alle 2 Jahre", skill: "doku" },
  { id: "F15", title: "Ausbildung und Anleitung von Nachwuchskräften", target: "Praxisanleiter/innen", duration: "1 Tag", turnus: "jährlich", skill: "paed" },
];

/** Passende Fortbildung für eine Kompetenzlücke: bevorzugt eine, deren Zielgruppe zur Rolle passt. */
export function trainingFor(skillId: string, role?: RoleProfile) {
  const all = CATALOG.filter((c) => c.skill === skillId);
  const stem = (role?.name || "").split(/[\s/]/)[0].toLowerCase().slice(0, 8);
  return all.find((c) => stem && c.target.toLowerCase().includes(stem)) ?? all.find((c) => /alle/i.test(c.target)) ?? all[0];
}

export const METHODS: string[] = [
  "70/20/10: 70 % lernen wir durch Erfahrung im Einsatz und im Job, 20 % durch Austausch und Feedback (z. B. Nachbesprechung mit der Crew, Praxisanleitung), 10 % durch formale Formate. Deshalb echte Einsätze und Aufgaben zu Lernanlässen machen.",
  "Growth Mindset (Dweck): Fähigkeiten wachsen durch Anstrengung, gute Strategien und Feedback. Einsatz und Lernfortschritt loben, nicht Talent. Fehler als nächsten Lernschritt formulieren.",
  "Deliberate Practice: gezielt an einer Schwäche üben, mit sofortigem Feedback, in kurzen fokussierten Einheiten, z. B. Skills-Training am Phantom.",
  "Erfahrungslernen nach Kolb: Erleben, Reflektieren, Verallgemeinern, Ausprobieren. Ohne Reflexion (z. B. Debriefing nach dem Einsatz) bleibt Erfahrung ungenutzt.",
  "Feedback nach SBI: Situation, Verhalten (Behavior), Wirkung (Impact). Konkret und beobachtbar statt pauschal.",
  "Spaced Repetition: Wiederholen in wachsenden Abständen sichert Gelerntes, gerade bei seltenen, kritischen Maßnahmen.",
  "Selbstbestimmungstheorie: Motivation entsteht durch Autonomie (selbst wählen), Kompetenzerleben (Fortschritt sehen) und Verbundenheit (mit anderen lernen).",
  "Kleine Schritte: lieber 10 Minuten in einer ruhigen Phase auf der Wache als ein Tag irgendwann. Lernen an konkrete Termine oder Schichten koppeln.",
];

export const TEAM = [
  { name: "Thomas Weber", role: "Wachenleitung", initials: "TW" },
  { name: "Lisa Schneider", role: "Azubi Notfallsanitäterin", initials: "LS" },
  { name: "Jonas Wagner", role: "Notfallsanitäter, Praxisanleiter", initials: "JW" },
];

export const BADGES: Record<string, { name: string; text: string }> = {
  start: { name: "Erste Schritte", text: "Onboarding abgeschlossen" },
  generalprobe: { name: "Generalprobe", text: "Erste Übung mit Videoanalyse" },
  feedback: { name: "Feedback-Sammler", text: "Erstes Feedback von Kollegen" },
  loop: { name: "Loop geschlossen", text: "Erfahrung bis zu neuen Vorschlägen geführt" },
  mutig: { name: "Mutig", text: "Eine Aufgabe außerhalb der Komfortzone angepackt" },
};

/** Jobprofil zur frei eingegebenen Rolle; ohne Treffer Notfallsanitäter/in (Demo-Persona Max Müller). */
export function roleFor(role?: string): RoleProfile {
  const r = (role || "").toLowerCase();
  return COMPANY.roles.find((x) => new RegExp(x.match, "i").test(r)) ?? COMPANY.roles.find((x) => x.id === "notsan")!;
}

/** Soll-Stufe eines Skills: aus dem Jobprofil, sonst die übergreifende Soll-Stufe 2 (im Fokus 3). */
export function targetLevel(skillId: string, focus: string[], role?: string): number {
  const core = roleFor(role).core.find((c) => c.skill === skillId);
  if (core) return core.soll;
  return focus.includes(skillId) ? 3 : 2;
}

/** Ist-Stufe eines Skills (0 bis 4) aus dem Fortschritt. */
export const skillLevel = (sk: Skill) => Math.round(skillProgress(sk) / (100 / MAX_LEVEL));

/** Jährliche Pflichtschulungen P01 bis P05. Fälligkeit in Tagen ab Start der Demo (negativ = abgelaufen). */
export const MANDATORY: { id: string; title: string; meta: string; dueDays: number; desc: string; duration: string; last: string; format: string }[] = [
  { id: "P01", title: "Reanimationskurs", meta: "jährlich · 4 Stunden", dueDays: 74, duration: "4 Std.", last: "Feb. 2026", format: "Präsenz", desc: "Reanimation, CPR und AED nach aktuellen Leitlinien. Nächster Termin im Februar, Nachholtermin im September." },
  { id: "P02", title: "Hygieneschulung", meta: "jährlich · 2 Stunden", dueDays: 110, duration: "2 Std.", last: "März 2026", format: "Präsenz", desc: "Infektionsprävention, Händehygiene und Schutzkleidung im Einsatz und auf der Wache." },
  { id: "P03", title: "Fahrsicherheitstraining", meta: "jährlich · 1 Tag", dueDays: -21, duration: "1 Tag", last: "Juni 2025", format: "Präsenz", desc: "Sicheres Fahren, Einsatzfahrten mit Sonderrechten und Gefahrensituationen. Dein letzter Nachweis ist abgelaufen, buch dir am besten gleich einen Termin." },
  { id: "P04", title: "Datenschutz", meta: "jährlich · 2 Stunden", dueDays: 42, duration: "2 Std.", last: "Jan. 2026", format: "E-Learning", desc: "DSGVO, Umgang mit Patientendaten und Schweigepflicht. Mit kurzem Abschlusstest." },
  { id: "P05", title: "Brandschutz", meta: "jährlich · 2 Stunden", dueDays: 135, duration: "2 Std.", last: "Apr. 2026", format: "Präsenz", desc: "Brandverhütung, Verhalten im Brandfall und Umgang mit dem Feuerlöscher." },
];
/** Gültige Nachweise der Demo-Persona: alles außer dem Fahrsicherheitstraining. */
export const MANDATORY_DONE_DEFAULT = ["P01", "P02", "P04", "P05"];

/** Pflichtschulungen, die dem Jobprofil zugeordnet sind. */
export const mandatoryFor = (role?: string) => {
  const ids = roleFor(role).pflicht;
  return MANDATORY.filter((m) => ids.includes(m.id));
};

/* ---------- Persönliche Ziele: Lernpfad mit Challenges ---------- */

export type { ChallengeKind } from "./types";
/** refs: Titel aus den SAA und BPR 2025, auf die sich die Challenge stützt (siehe lib/saa.ts). */
export type Challenge = PathChallenge;

export const CHALLENGE_XP: Record<ChallengeKind, number> = { Lernen: 30, Üben: 60, Anwenden: 80, Reflexion: 40 };

const ch = (id: string, area: string, title: string, kind: ChallengeKind, min: number, text: string, refs?: string[]): Challenge => ({ id, area, title, kind, min, text, refs });

export type PathKey = "praes" | "trauma" | "resi";

/** Drei Demo-Pfade, gewählt nach dem Lernziel aus dem Onboarding: Fallvorstellung, Traumaversorgung, Belastbarkeit (Standard). */
export const GOAL_PATHS: Record<PathKey, { title: string; challenges: Challenge[] }> = {
  praes: {
    title: "",
    challenges: [
      ch("p1", "fach", "Fall nach <c>ABCDE aufbereiten", "Lernen", 15, "Ordne den Einsatz entlang der <c>ABCDE-Herangehensweise, bevor du Folien baust.", ["<c>ABCDE – Herangehensweise"]),
      ch("p2", "komm", "Einstieg in 30 Sekunden", "Üben", 10, "Ein Satz, der die Runde sofort an die Einsatzstelle holt."),
      ch("p3", "meth", "Einsatzprotokoll als Quelle", "Lernen", 15, "Zeitstrahl und Befunde aus der Doku, vollständig anonymisiert."),
      ch("p4", "komm", "Generalprobe mit Video", "Üben", 15, "Nimm dich auf und lass Kompass Feedback geben."),
      ch("p5", "komm", "Souverän mit Rückfragen", "Lernen", 20, "Zuhören, wiederholen, kurz antworten."),
      ch("p6", "fach", "Bezug zum BPR Polytrauma", "Anwenden", 20, "Zeig, wo ihr nach dem Behandlungspfad vorgegangen seid und wo bewusst nicht.", ["Polytrauma"]),
      ch("p7", "komm", "Stimme und Pausen", "Üben", 10, "Pausen wirken sicherer als schnelle Sätze."),
      ch("p8", "meth", "Fall in der Fallbesprechung vorstellen", "Anwenden", 30, "Der echte Termin (F12). Du bist vorbereitet."),
      ch("p9", "komm", "Feedback einholen", "Anwenden", 15, "Frag zwei Kolleg/innen, was hängen blieb."),
      ch("p10", "selbst", "Reflexion danach", "Reflexion", 10, "Was nimmst du für die nächste Fallvorstellung mit?"),
    ],
  },
  trauma: {
    title: "Traumaversorgung sicher nach SAA und BPR",
    challenges: [
      ch("t1", "fach", "<c>ABCDE-Herangehensweise auffrischen", "Lernen", 15, "Die Reihenfolge aus dem BPR, die in jedem Traumaeinsatz trägt.", ["<c>ABCDE – Herangehensweise"]),
      ch("t2", "fach", "Kritische Blutung stoppen", "Üben", 15, "Kompression bis Tourniquet am Phantom, entlang BPR und SAA.", ["Kritische Blutung", "Tourniquet"]),
      ch("t3", "fach", "Beckenschlinge anlegen", "Üben", 15, "Indikation und sichere Anlage nach SAA, mit einer Kollegin üben.", ["Beckenschlinge"]),
      ch("t4", "meth", "Wissenscheck BPR Polytrauma", "Lernen", 10, "Kompass stellt dir fünf Fragen zum Behandlungspfad, eine nach der anderen.", ["Polytrauma"]),
      ch("t5", "komm", "Closed-Loop im Team", "Üben", 10, "Ansage, Wiederholen, Bestätigen: klare Kommunikation unter Druck."),
      ch("t6", "fach", "Für F02 anmelden", "Anwenden", 10, "Traumamanagement Advanced, 2 Tage. Sprich den Termin mit der Wachenleitung ab."),
      ch("t7", "komm", "Übergabe nach SINNHAFT", "Üben", 10, "Strukturierte Übergabe im Schockraum nach der Handreichung, in unter einer Minute.", ["SINNHAFT"]),
      ch("t8", "meth", "Fallbeispiel Polytrauma durchspielen", "Üben", 20, "Kompass spielt einen Einsatz mit dir durch, du entscheidest Schritt für Schritt.", ["Polytrauma", "Schock"]),
      ch("t9", "meth", "Debriefing nach dem Einsatz", "Reflexion", 10, "Drei Fragen mit der Crew: Was lief gut, was nicht, was ändern wir?"),
      ch("t10", "selbst", "Reflexion: Was sitzt jetzt?", "Reflexion", 10, "Wo stehst du in der Patientenversorgung, was fehlt noch?"),
    ],
  },
  resi: {
    title: "Nach belastenden Einsätzen stabil bleiben",
    challenges: [
      ch("r1", "selbst", "Stressreaktionen verstehen", "Lernen", 15, "Was Körper und Kopf nach einem schweren Einsatz machen, ist normal."),
      ch("r2", "selbst", "Atemtechnik für die Anfahrt", "Üben", 5, "4 Sekunden ein, 6 aus. Probier es auf der nächsten Anfahrt."),
      ch("r3", "komm", "Mit der Crew nachbesprechen", "Anwenden", 15, "Nach einem belastenden Einsatz kurz gemeinsam sortieren."),
      ch("r4", "meth", "Ritual zum Schichtende", "Üben", 10, "Ein kleiner Ablauf, der den Dienst bewusst abschließt."),
      ch("r5", "selbst", "Für F06 anmelden", "Anwenden", 10, "Stressbewältigung und Resilienz, 1 Tag, jährlich empfohlen."),
      ch("r6", "komm", "Ansprechpartner kennen", "Lernen", 10, "Wer im Kreisverband bei der Einsatznachsorge (PSNV) hilft."),
      ch("r7", "selbst", "Erholung im Schichtplan", "Anwenden", 15, "Plane bewusst freie Zeit nach Nachtdiensten ein."),
      ch("r8", "komm", "Grenzen ansprechen", "Anwenden", 20, "Sag im Team, wenn ein Einsatz dich noch beschäftigt."),
      ch("r9", "meth", "Wochencheck Belastung", "Reflexion", 5, "Eine Minute: Wie voll ist dein Akku gerade?"),
      ch("r10", "selbst", "Reflexion nach 4 Wochen", "Reflexion", 10, "Was hilft dir wirklich, was nimmst du mit?"),
    ],
  },
};

/** Challenge zu einem Titel (z. B. aus „Hilf mir, die Challenge „…“ vorzubereiten“), auch aus dem persönlichen Pfad. */
export const findChallenge = (title: string, own?: GoalPathState) =>
  [...(own?.challenges ?? []), ...Object.values(GOAL_PATHS).flatMap((p) => p.challenges)].find((c) => title.includes(c.title));

/** Demo-Pfad als persönlicher Lernpfad (Skript-Modus, ohne KI oder wenn die KI nichts Brauchbares liefert). */
export function demoPath(goal?: string): GoalPathState {
  const key = goalPathKey(goal);
  return { title: GOAL_PATHS[key].title, challenges: GOAL_PATHS[key].challenges.map((c) => ({ ...c })), source: "demo" };
}

export const PATH_AREAS = ["fach", "meth", "komm", "selbst"];
export const PATH_MAX = 14;

/** Neue Challenge aus dem Chat einsortieren: hinter die nächste offene, vor die Abschluss-Reflexion. */
export function addToPath(path: GoalPathState, c: PathChallenge, done: string[]): GoalPathState {
  if (path.challenges.some((x) => x.title.toLowerCase() === c.title.toLowerCase())) return path;
  const list = [...path.challenges];
  const cur = list.findIndex((x) => !done.includes(x.id));
  let at = cur < 0 ? list.length : cur + 1;
  const last = list[list.length - 1];
  if (last?.kind === "Reflexion" && at >= list.length) at = list.length - 1;
  list.splice(at, 0, c);
  // Zu lang: die älteste offene Challenge ohne Chat-Bezug weiter hinten fällt raus, nie die neue.
  while (list.length > PATH_MAX) {
    const i = list.findLastIndex((x, k) => k > at && !x.fromChat && !done.includes(x.id) && x.kind !== "Reflexion");
    if (i < 0) break;
    list.splice(i, 1);
  }
  return { ...path, challenges: list };
}

export const goalPathKey = (goal?: string): PathKey => {
  const g = goal || "";
  if (/präsent|praesent|vortrag|vorstell|fallbesprech|fallvorstell|pitch|rede/i.test(g)) return "praes";
  if (/trauma|abcde|polytrauma|patientenversorg|versorgung|blutung/i.test(g)) return "trauma";
  return "resi";
};
export const PATH_DONE_DEFAULT = (key: PathKey) => GOAL_PATHS[key].challenges.slice(0, 3).map((c) => c.id);

/** Weitere (zugeklappte) Ziele der Demo-Persona, abgeleitet aus der Kompetenzbewertung. */
export const OTHER_GOALS: { id: string; title: string; status: "pausiert" | "erreicht"; meta: string; done: number; total: number; color: string; text: string }[] = [
  { id: "belastbarkeit", title: "Belastbarkeit stärken", status: "pausiert", meta: "pausiert · 2 von 10", done: 2, total: 10, color: "#E3907D", text: "Belastbarkeit Ist 2, Soll 3. Pausiert, solange du an deinem aktuellen Ziel arbeitest. Passend: F06 Stressbewältigung und Resilienz." },
  { id: "doku", title: "Digitale Einsatzdokumentation", status: "erreicht", meta: "erreicht · September", done: 8, total: 8, color: "#7C9CD6", text: "Dokumentation steht auf Stufe 3, eine über dem Soll. Stark." },
];

/* ---------- Stellenprofil: Jahresziele und SOPs ---------- */

export const YEAR_GOALS: { id: string; title: string; meta: string; color: string }[] = [
  { id: "trauma", title: "Patientenversorgung auf Stufe 4: Traumamanagement Advanced (F02)", meta: "bis Juni · mit Thomas Weber vereinbart", color: "#7FB5A3" },
  { id: "p03", title: "Fahrsicherheitstraining (P03) nachholen", meta: "abgelaufen · Termin im Januar", color: "#E3907D" },
  { id: "praxisanleitung", title: "Erste Schritte Richtung Praxisanleitung", meta: "Perspektive aus dem Gespräch", color: "#B58BC9" },
];

export const SOPS: { id: string; title: string; version: string; changed: string; summary: string; readDefault?: boolean }[] = [
  { id: "hygiene", title: "Hygieneplan Rettungswache", version: "4.1", changed: "20. Nov.", summary: "Neu: Nach jedem Infektionstransport wird die Desinfektion von Trage und Patientenraum auf der Checkliste im Fahrzeug abgezeichnet." },
  { id: "saa2025", title: "SAA und BPR 2025", version: "2025", changed: "1. Nov.", summary: "Ab sofort Grundlage für Einsätze und Fortbildung im Kreisverband: Standardarbeitsanweisungen für invasive Maßnahmen und Medikamente sowie die Behandlungspfade der ÄLRD (Stand Juli 2025). Für deinen Lernpfad wichtig: <c>ABCDE (S. 75), Kritische Blutung (S. 98), Polytrauma (S. 153), Übergabe nach SINNHAFT (S. 83)." },
  { id: "uebergabe", title: "Patientenübergabe in der Notaufnahme", version: "2.0", changed: "2. Okt.", summary: "Übergaben folgen einheitlich der Handreichung SINNHAFT aus den BPR (S. 83), das Protokoll geht digital vorab an die Klinik.", readDefault: true },
];

/** Feste Demo-Termine; Tage ab Start der Demo, Uhrzeit. */
export const FIXED_DATES: { id: string; title: string; sub: string; days: number; hour: number }[] = [
  { id: "jg", title: "Entwicklungsgespräch", sub: "mit Thomas Weber", days: 19, hour: 10 },
];

const r = (id: string, type: Rec["type"], title: string, meta: string): Rec => ({ id, type, title, meta });

const s = (id: string, name: string, subs: [string, string, number][], recs: Rec[] = []): Skill => ({
  id,
  name,
  subs: subs.map(([sid, sname, level]) => ({ id: sid, name: sname, level, sources: ["Start"] })),
  recs,
});

/**
 * Kompetenzen der Demo-Persona Max Müller (Notfallsanitäter, 5 Jahre im Kreisverband).
 * Stufen 1 bis 4 wie im Kompetenzmodell; die Skill-Stufen entsprechen der Kompetenzbewertung:
 * Fachwissen 4, Patientenversorgung 3, Kommunikation 3, Belastbarkeit 2, Dokumentation 3, Teamfähigkeit 3.
 */
export function initialAreas(): Area[] {
  return [
    {
      id: "fach",
      name: "Fachkompetenz",
      color: "#7FB5A3",
      skills: [
        s(
          "notfall",
          "Notfallmedizinisches Fachwissen",
          [
            ["leitlinien", "Aktuelle Leitlinien", 4],
            ["pharma", "Medikamente und Dosierungen", 4],
            ["krankheit", "Krankheitsbilder erkennen", 3],
          ],
          [r("n1", "Intern", "F12 Notfallmedizinische Fallbesprechungen", "1 Tag"), r("n2", "Ressource", "SAA und BPR 2025 der ÄLRD", "Nachschlagen")],
        ),
        s(
          "patient",
          "Patientenversorgung",
          [
            ["abcde", "Untersuchung nach ABCDE", 4],
            ["trauma", "Traumaversorgung", 2],
            ["kinder", "Kindernotfälle", 3],
            ["invasiv", "Invasive Maßnahmen", 3],
          ],
          [
            r("pv1", "Intern", "F02 Traumamanagement Advanced", "2 Tage"),
            r("pv2", "Üben", "Kritische Blutung stoppen am Phantom", "15 min"),
            r("pv3", "Ressource", "BPR Polytrauma (SAA und BPR 2025, S. 153)", "10 min"),
          ],
        ),
        s(
          "material",
          "Fahrzeug- und Materialkunde",
          [
            ["mpg", "Medizinprodukte", 3],
            ["rtwcheck", "Fahrzeugcheck RTW", 3],
            ["fahren", "Sicher im Einsatz fahren", 2],
          ],
          [r("ma1", "Intern", "P03 Fahrsicherheitstraining", "1 Tag")],
        ),
      ],
    },
    {
      id: "meth",
      name: "Methodenkompetenz",
      color: "#7C9CD6",
      skills: [
        s(
          "doku",
          "Dokumentation",
          [
            ["protokoll", "Einsatzprotokoll", 3],
            ["digital", "Digitale Dokumentation", 3],
            ["dsgvo", "Datenschutz bei Patientendaten", 3],
          ],
          [r("d1", "Intern", "F14 Qualitätsmanagement im Rettungsdienst", "1 Tag")],
        ),
        s(
          "entscheid",
          "Entscheidungsfähigkeit",
          [
            ["lage", "Lage schnell einschätzen", 3],
            ["prio", "Prioritäten im Einsatz", 3],
            ["ziel", "Transportziel und Nachforderung", 2],
          ],
          [r("e1", "Üben", "Fallbeispiel mit Kompass durchspielen", "20 min")],
        ),
        s(
          "orga",
          "Organisationsfähigkeit",
          [
            ["abl", "Abläufe planen", 2],
            ["selborg", "Selbstorganisation im Schichtdienst", 2],
            ["digi", "Digitale Grundkompetenz", 3],
          ],
          [r("o1", "Intern", "F10 Excel und digitale Arbeitsprozesse", "1 Tag")],
        ),
      ],
    },
    {
      id: "komm",
      name: "Sozialkompetenz",
      color: "#E9B949",
      skills: [
        s(
          "praes",
          "Kommunikation",
          [
            ["struktur", "Fall strukturiert vorstellen", 3],
            ["folien", "Folien und Visualisierung", 2],
            ["story", "Anschaulich erzählen", 3],
            ["koerper", "Auftreten und Stimme", 3],
            ["fragen", "Umgang mit Rückfragen", 2],
          ],
          [
            r("p4", "Üben", "Generalprobe mit Video", "10 min"),
            r("p1", "Intern", "F13 Professionelle Gesprächsführung", "1 Tag"),
            r("p2", "Ressource", "Vorlage Fallvorstellung der Wache", "15 min"),
            r("p3", "Intern", "F01 Kommunikation in schwierigen Einsatzsituationen", "1 Tag"),
          ],
        ),
        s(
          "team",
          "Teamfähigkeit",
          [
            ["crm", "Crew Resource Management", 3],
            ["absprache", "Klare Absprachen im Einsatz", 3],
            ["unterst", "Kolleg/innen unterstützen", 3],
          ],
          [r("tm1", "Ressource", "Leitfaden Debriefing nach dem Einsatz", "10 min")],
        ),
        s(
          "konflikt",
          "Konfliktmanagement",
          [
            ["deeskal", "Deeskalation im Einsatz", 2],
            ["konfteam", "Konflikte im Team ansprechen", 1],
            ["kfb", "Kritik sachlich äußern", 2],
          ],
          [r("k1", "Intern", "F05 Konfliktmanagement", "1 Tag")],
        ),
      ],
    },
    {
      id: "selbst",
      name: "Selbstkompetenz",
      color: "#E3907D",
      skills: [
        s(
          "resi",
          "Belastbarkeit",
          [
            ["stress", "Mit Druck im Einsatz umgehen", 2],
            ["verarbeiten", "Belastende Einsätze verarbeiten", 1],
            ["erholung", "Erholung im Schichtdienst", 2],
          ],
          [r("rs1", "Intern", "F06 Stressbewältigung und Resilienz", "1 Tag")],
        ),
        s(
          "verantw",
          "Verantwortungsbewusstsein",
          [
            ["sorgfalt", "Sorgfalt und Hygiene", 3],
            ["nachweise", "Pflichtschulungen im Blick", 2],
            ["eigenschutz", "Eigenschutz", 4],
          ],
          [r("v1", "Ressource", "Hygieneplan Rettungswache, Version 4.1", "10 min")],
        ),
        s(
          "lernen",
          "Lernbereitschaft",
          [
            ["ziele", "Lernziele setzen", 2],
            ["reflex", "Einsätze reflektieren", 3],
            ["routine", "Lernroutine", 2],
          ],
          [r("l1", "Ressource", "Vorlage Wochenreflexion in 5 Minuten", "5 min")],
        ),
      ],
    },
    {
      id: "fuehr",
      name: "Führungskompetenz",
      color: "#B58BC9",
      skills: [
        s(
          "paed",
          "Pädagogische Kompetenz",
          [
            ["anleiten", "Praxisanleitung planen", 1],
            ["zeigen", "Maßnahmen erklären und zeigen", 2],
            ["bewerten", "Lernfortschritt einschätzen", 1],
          ],
          [r("pd1", "Intern", "F03 Pädagogik für Praxisanleiter", "2 Tage")],
        ),
        s(
          "fbk",
          "Feedbackkompetenz",
          [
            ["sbi", "Konkret nach SBI", 2],
            ["annehmen", "Feedback annehmen", 3],
            ["gespraech", "Feedbackgespräche führen", 1],
          ],
          [r("fb1", "Ressource", "Feedback nach dem SBI-Modell", "30 min")],
        ),
        s(
          "fuehrung",
          "Führung im Einsatz",
          [
            ["anweisen", "Einsatzteam anleiten", 2],
            ["vertreten", "Entscheidungen vertreten", 2],
            ["entwickeln", "Andere entwickeln", 1],
          ],
          [r("fu1", "Intern", "F15 Ausbildung und Anleitung von Nachwuchskräften", "1 Tag")],
        ),
      ],
    },
  ];
}

export function skillProgress(skill: Skill): number {
  const sum = skill.subs.reduce((a, b) => a + b.level, 0);
  return Math.round((sum / (MAX_LEVEL * skill.subs.length)) * 100);
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
        title: "Polytrauma-Einsatz mit der Crew nachbesprochen",
        detail: "Teilkompetenz Einsätze reflektieren bestätigt",
        kind: "Reflexion",
        xp: 60,
      },
      {
        id: "seed2",
        date: new Date(now - 21 * day).toISOString(),
        title: "Azubi Lisa beim Zugang legen angeleitet",
        detail: "Teilkompetenz Maßnahmen erklären und zeigen",
        kind: "Anwenden",
        xp: 60,
      },
      {
        id: "seed3",
        date: new Date(now - 28 * day).toISOString(),
        title: "S3-Leitlinie Polytrauma quergelesen",
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

/** Unternehmenskontext kompakt als JSON für den System-Prompt (gecacht). */
export function knowledgeJSON(): string {
  const pflichtRoles = (id: string) => COMPANY.roles.filter((r) => r.pflicht.includes(id)).map((r) => r.name);
  return JSON.stringify({
    unternehmen: { name: COMPANY.name, profil: COMPANY.about, vision: COMPANY.vision, mission: COMPANY.mission, werte: COMPANY.values },
    kompetenzmodell: {
      dimensionen: COMPANY.dimensions,
      stufen: Object.fromEntries(LEVELS.map((l) => [l.n, `${l.name}: ${l.text}`])),
      uebergreifend: COMPANY.general,
    },
    jobprofile: COMPANY.roles.map((r) => ({
      name: r.name,
      abteilung: r.dept,
      vorgesetzt: r.lead,
      ziel: r.mission,
      aufgaben: r.tasks,
      soll: Object.fromEntries(r.core.map((c) => [c.skill ? `${c.name} [${c.skill}]` : c.name, c.soll])),
      entwicklung: r.growth,
      pflichtschulungen: r.pflicht,
    })),
    fortbildungen: CATALOG.map((c) => ({ id: c.id, titel: c.title, zielgruppe: c.target, dauer: c.duration, turnus: c.turnus })),
    pflichtschulungen: MANDATORY.map((m) => ({ id: m.id, titel: m.title, intervall: m.meta, format: m.format, verpflichtend_fuer: pflichtRoles(m.id) })),
    kompass_skills: initialAreas().map((a) => ({
      bereich: a.name,
      skills: a.skills.map((sk) => ({ id: sk.id, name: sk.name, teilkompetenzen: Object.fromEntries(sk.subs.map((x) => [x.id, x.name])) })),
    })),
    team: TEAM.map((t) => `${t.name} (${t.role})`),
    saa_bpr: {
      quelle: SAA_SOURCE,
      nutzung: "Fachliche Grundlage für Weiterbildung, Challenges und Wissenschecks im Rettungsdienst. Auszüge werden bei Bedarf mitgeschickt.",
      verzeichnis: SAA_TOC.map((e) => `${e.kind} ${e.title} S.${e.page}`),
    },
  });
}
