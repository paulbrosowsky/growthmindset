// Nur serverseitig importieren: enthält den Text der SAA und BPR 2025 je Seite (~230 KB).
import pages from "./saa-pages.json";
import { SAA_SOURCE, saaEntry, saaMatches, saaPages, type SaaEntry } from "./saa";

const PAGES = pages as Record<string, string>;

/** Auszüge für den Prompt: zu den genannten Titeln und zu allem, was im Text vorkommt. Gekürzt auf maxChars. */
export function saaExcerpt(opts: { refs?: string[]; text?: string; maxChars?: number }): string {
  const entries: SaaEntry[] = [];
  for (const r of opts.refs || []) {
    const e = saaEntry(r);
    if (e) entries.push(e);
  }
  if (opts.text) entries.push(...saaMatches(opts.text));
  const uniq = [...new Set(entries)].slice(0, 3);
  if (!uniq.length) return "";
  const max = opts.maxChars ?? 7000;
  const per = Math.floor(max / uniq.length);
  const parts = uniq.map((e) => {
    const body = saaPages(e)
      .map((n) => (PAGES[String(n)] ? `[S. ${n}]\n${PAGES[String(n)]}` : ""))
      .join("\n")
      .slice(0, per);
    return `## ${e.kind} ${e.title} (ab S. ${e.page})\n${body}`;
  });
  return `Auszüge aus den ${SAA_SOURCE} (Rohtext aus PDF-Flussdiagrammen, Reihenfolge kann springen; Quelle mit Seite nennen):\n${parts.join("\n\n")}`;
}
