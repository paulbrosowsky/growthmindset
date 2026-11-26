// SAA und BPR 2025 (Standardarbeitsanweisungen und Behandlungspfade im Rettungsdienst, ÄLRD BW, BB, MV, NW, SN, ST).
// Fachliche Grundlage für die Weiterbildung des Rettungsdienstpersonals. Volltext: docs/SAA_BPR_Rettungsdienst_2025.txt,
// neu erzeugen mit `python3 scripts/build-saa.py`.
import toc from "./saa-toc.json";

export type SaaEntry = { title: string; kind: "SAA" | "BPR"; group: string; page: number };

export const SAA_SOURCE = "SAA und BPR 2025 der Ärztlichen Leitungen Rettungsdienst (Stand Juli 2025)";
export const SAA_TOC = toc as SaaEntry[];

const norm = (t: string) => t.toLowerCase().replace(/<c>/g, "c").replace(/[–-]/g, " ").replace(/\s+/g, " ").trim();

/** Eintrag zu einem (Teil-)Titel, z. B. „Polytrauma“, „SINNHAFT“, „<c>ABCDE – Herangehensweise“. */
export function saaEntry(title: string): SaaEntry | undefined {
  const q = norm(title);
  return SAA_TOC.find((e) => norm(e.title) === q) ?? SAA_TOC.find((e) => norm(e.title).includes(q));
}

/** Kurzverweis für die Oberfläche, z. B. „BPR Polytrauma, S. 153“. */
export function saaLabel(title: string): string {
  const e = saaEntry(title);
  return e ? `${e.kind} ${e.title.replace(/^Handreichung /, "")}, S. ${e.page}` : title;
}

/** Seiten eines Eintrags: bis zum nächsten Eintrag, höchstens 3. */
export function saaPages(e: SaaEntry): number[] {
  const i = SAA_TOC.indexOf(e);
  const next = SAA_TOC[i + 1]?.page ?? e.page + 2;
  const n = Math.max(1, Math.min(3, next - e.page));
  return Array.from({ length: n }, (_, k) => e.page + k);
}

/** Einträge, deren Titel in einem Text vorkommt (für die Auswahl passender Auszüge). */
export function saaMatches(text: string): SaaEntry[] {
  const t = norm(text);
  const hits = SAA_TOC.filter((e) => {
    const key = norm(e.title)
      .replace(/^(handreichung|erfassung der situation|erfassung der akuten symptomatik|beurteilung der bewusstseinslage) /, "")
      .split(/ \(| – | abfrageschema /)[0]
      .replace(/[„“"]/g, "");
    return key.length >= 5 && t.includes(key);
  });
  if (/abcde/.test(t)) hits.push(...SAA_TOC.filter((e) => /abcde – herangehensweise/i.test(e.title)));
  if (/sinnhaft|übergabe/.test(t)) hits.push(...SAA_TOC.filter((e) => /sinnhaft/i.test(e.title)));
  return [...new Set(hits)];
}
