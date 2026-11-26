// Kennenlernen: 8 Themen in fester Reihenfolge, gilt für Text- und Sprachgespräch.
// Reihenfolge als Gesprächsbogen: heute (Rolle, Weg, Spaß/Meiden) → Zukunft (3 Jahre) →
// was dafür zu lernen ist → erster Meilenstein in 4 Wochen → wie und wann gelernt wird.
// `q` ist die Rückfall-Formulierung; live formuliert LENA jede Frage passend zur vorigen Antwort.
export type ObKey = "role" | "experience" | "likes" | "learn" | "vision" | "goal" | "preference" | "time";

export const OB_QUESTIONS: { key: ObKey; topic: string; q: string; chips: string[]; ph?: string; multi?: boolean }[] = [
  // Wer?
  { key: "role", topic: "aktuelle Rolle und Bereich", q: "Welche Rolle hast du aktuell?", chips: [], ph: "Deine Rolle und dein Bereich" },
  { key: "experience", topic: "bisherige berufliche Stationen, Weg in die Rolle", q: "Wie bist du dahin gekommen, welche Stationen hattest du bisher?", chips: ["Nach dem Abi ins FSJ, seit August hier auf der Wache"] },
  { key: "likes", topic: "was im Berufsalltag Spaß macht und was die Person meidet", q: "Was macht dir im Alltag Spaß, und was meidest du eher?", chips: ["Einsätze am Patienten mag ich, vor der Runde reden eher nicht."] },
  // Was?
  { key: "vision", topic: "wo die Person sich in 3 Jahren sieht", q: "Lass uns nach vorn schauen: Wo siehst du dich in 3 Jahren?", chips: ["Notfallsanitäterin, im Herbst starte ich die RS-Ausbildung"] },
  { key: "learn", topic: "was die Person dafür lernen möchte", q: "Was möchtest du dafür lernen?", chips: ["Einsätze sicher einschätzen und klar übergeben"] },
  { key: "goal", topic: "was davon sie in den nächsten 4 Wochen erreichen will", q: "Und was davon willst du in den nächsten 4 Wochen schaffen?", chips: ["Meinen Schlaganfall-Einsatz in der Fallbesprechung vorstellen"] },
  // Wie?
  { key: "preference", topic: "wie die Person am besten lernt (Auswahl folgt)", q: "Wie lernst du am besten?", chips: ["Praxis und Üben", "Videos", "Lesen", "Austausch"], multi: true },
  { key: "time", topic: "wann und wo Lernen in den Alltag passt", q: "Letzte Frage: Wann und wo passt Lernen in deinen Alltag?", chips: ["In ruhigen Phasen auf der Wache", "Nach dem Schichtwechsel"] },
];
