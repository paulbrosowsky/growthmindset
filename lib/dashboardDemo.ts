/**
 * Dummy-Daten für die Unternehmenssicht (Demo). Personen und Bewertungen aus docs/DRK_Personalentwicklung_Demodaten.md,
 * alle Kennzahlen, Standorte und weiteren Namen sind erfunden.
 */

export type Status = "ok" | "warn" | "bad" | "info" | "muted";

export type TeamMember = {
  name: string;
  initials: string;
  role: string;
  gaps: string[];
  pflicht: { label: string; status: Status };
  plan: { label: string; status: Status; detail: string };
  /** Jahresbewertung (Ist-Stufe je Kompetenz), Eigentum des Unternehmens */
  ist: Record<string, number>;
};

export const WACHE = { name: "Rettungswache Nord", size: 12, lead: { name: "Thomas Weber", role: "Wachenleitung", initials: "TW" } };

export const TEAM_ROWS: TeamMember[] = [
  {
    name: "Lena Berger",
    initials: "LB",
    role: "FSJlerin",
    gaps: ["Kommunikation"],
    pflicht: { label: "P02 offen", status: "warn" },
    plan: { label: "In Bearbeitung", status: "info", detail: "Lernpfad Fallvorstellung" },
    ist: { "Notfallmedizinisches Fachwissen": 1, Kommunikation: 1, Teamfähigkeit: 2, Lernbereitschaft: 3, Organisationsfähigkeit: 2, Verantwortungsbewusstsein: 2 },
  },
  {
    name: "Lisa Schneider",
    initials: "LS",
    role: "Azubi NotSan, 2. Jahr",
    gaps: ["Patientenversorgung", "Dokumentation"],
    pflicht: { label: "P03 nicht absolviert", status: "bad" },
    plan: { label: "In Bearbeitung", status: "info", detail: "Praxisanleitung" },
    ist: { Patientenversorgung: 1, Dokumentation: 1, Kommunikation: 2, Teamfähigkeit: 3 },
  },
  {
    name: "Jonas Wagner",
    initials: "JW",
    role: "Notfallsanitäter, Praxisanleiter",
    gaps: [],
    pflicht: { label: "alle gültig", status: "ok" },
    plan: { label: "Geplant", status: "muted", detail: "F15 Anleitung" },
    ist: {},
  },
  {
    name: "Sarah Hoffmann",
    initials: "SH",
    role: "Rettungssanitäterin",
    gaps: ["Notfallmed. Fachwissen"],
    pflicht: { label: "alle gültig", status: "ok" },
    plan: { label: "Angemeldet", status: "warn", detail: "F12 Fallbesprechungen" },
    ist: {},
  },
  {
    name: "Ali Yilmaz",
    initials: "AY",
    role: "FSJler",
    gaps: [],
    pflicht: { label: "alle gültig", status: "ok" },
    plan: { label: "Abgeschlossen", status: "ok", detail: "F11 Orientierung" },
    ist: {},
  },
];

export const TEAM_GAPS = [
  { name: "Belastbarkeit", n: 4, color: "var(--chart-4)" },
  { name: "Patientenversorgung", n: 3, color: "var(--chart-1)" },
  { name: "Dokumentation", n: 2, color: "var(--chart-3)" },
  { name: "Notfallmed. Fachwissen", n: 1, color: "var(--chart-2)" },
];

/** Ältere geteilte Erfolge im Team (Dummy), damit der Feed nicht leer ist. */
export const PAST_SHARED = [
  { name: "Jonas Wagner", initials: "JW", title: "Praxisanleitung: Feedbackgespräch mit Lisa geführt", competence: "Kommunikation", daysAgo: 3 },
  { name: "Lisa Schneider", initials: "LS", title: "Challenge „Übergabe nach SINNHAFT“ geschafft", competence: "Dokumentation", daysAgo: 6 },
];

/* ---------- Personalabteilung ---------- */

export const HR = { name: "Anna Fischer", role: "Personalabteilung", initials: "AF", staff: 179, kompass: 122, plans: 64, sharedQuarter: 38, pflichtPct: 91 };

/** Geteilte Erfolge pro Woche, letztes Quartal (13 Wochen). */
export const WEEKLY_SHARED = [1, 1, 2, 2, 3, 2, 3, 4, 3, 4, 4, 4, 5];
export const WEEK_LABELS = ["2. Sep", "30. Sep", "28. Okt", "25. Nov"];

export const ORG_GAPS = [
  { name: "Konfliktmanagement", group: "Wachenleitung", pct: 50, color: "var(--chart-3)" },
  { name: "Patientenversorgung", group: "Azubis NotSan", pct: 44, color: "var(--chart-1)" },
  { name: "Belastbarkeit", group: "Notfallsanitäter/innen", pct: 38, color: "var(--chart-4)" },
  { name: "Dokumentation", group: "Azubis NotSan", pct: 33, color: "var(--chart-2)" },
];

/** Themen der geteilten Erfolge (zusammengefasst), Schlüssel = Kompetenz. */
export const TOPICS: { name: string; n: number }[] = [
  { name: "Belastbarkeit", n: 14 },
  { name: "Kommunikation", n: 9 },
  { name: "Praxisanleitung", n: 7 },
  { name: "Dokumentation", n: 5 },
];

export const TRAININGS = [
  { id: "F06", title: "Stressbewältigung und Resilienz", target: "Alle Mitarbeitenden", need: 46, seats: 24, status: { label: "2 Termine fehlen", status: "bad" as Status } },
  { id: "F02", title: "Traumamanagement Advanced", target: "Notfallsanitäter/innen", need: 18, seats: 16, status: { label: "knapp", status: "warn" as Status } },
  { id: "F12", title: "Notfallmed. Fallbesprechungen", target: "NotSan, RettSan", need: 40, seats: 48, status: { label: "ausreichend", status: "ok" as Status } },
  { id: "F05", title: "Konfliktmanagement", target: "Wachenleitung, Personal", need: 6, seats: 8, status: { label: "ausreichend", status: "ok" as Status } },
];

export const PFLICHT_COLS = ["P01 Reanimation", "P02 Hygiene", "P03 Fahrsicherheit", "P04 Datenschutz", "P05 Brandschutz"];
export const PFLICHT_ROWS: { site: string; vals: (number | null)[] }[] = [
  { site: "Rettungswache Nord", vals: [100, 100, 83, 92, 100] },
  { site: "Rettungswache Süd", vals: [97, 100, 71, 94, 97] },
  { site: "Rettungswache Mitte", vals: [100, 96, 80, 100, 100] },
  { site: "Verwaltung und Logistik", vals: [null, 100, null, 88, 100] },
];
