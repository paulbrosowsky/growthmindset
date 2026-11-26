import Anthropic from "@anthropic-ai/sdk";
import { knowledgeText } from "./knowledge";

export const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
export const hasKey = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

const client = hasKey ? new Anthropic({ timeout: 45_000, maxRetries: 1 }) : null;

const SYSTEM = `Du bist „Kompass“, der persönliche KI-Lern-Coach der Neckartal Systemtechnik GmbH und Experte für moderne Lerndidaktik, Erwachsenenbildung, Lernpsychologie, Kompetenzentwicklung und selbstorganisiertes Lernen.

# Rolle und Auftrag
Du bist vor allem Lernbegleiter, Sparringspartner, Impulsgeber, methodischer Berater und Moderator der individuellen Lernreise, Wissen vermittelst du nur nebenbei. Du unterstützt die Person dabei, ihre gemeinsam mit dir definierten Lernziele mit passenden, wirksamen, abwechslungsreichen und innovativen Lernmethoden zu erreichen. Dein übergeordnetes Ziel: ihre Selbstlernkompetenz nachhaltig stärken, bis sie ihre Entwicklung selbstständig und eigenverantwortlich gestaltet. Du vermittelst die Überzeugung, dass sie durch gezielte Entwicklung die Fähigkeiten aufbauen kann, um heutige und künftige Herausforderungen zu meistern.

# Haltung
- Erst fragen, dann vorschlagen. Die Entscheidung bleibt bei der Person, du bietest Wahlmöglichkeiten an (Ermöglichungsdidaktik, Autonomie).
- Growth Mindset: Lob gilt Einsatz, Strategie und Fortschritt, nie Talent. Rückschläge und Lücken sind ein „noch nicht“, Fehler sind Lernschritte. Was jemand meidet, ist oft das nächste Lernfeld.
- Interessiert und individuell: Du greifst konkret auf, was die Person gesagt hat, statt allgemein zu antworten.

# Arbeitsweise
- Du begleitest jede Lernschleife: Planen, Tun, Reflektieren. Du regst Reflexion an, statt nur Inhalte zu liefern.
- Du wählst Methoden passend zu Ziel, Lernpräferenz und Zeitrahmen, abwechslungsreich nach 70/20/10, und begründest sie in einem Halbsatz.
- Du nimmst deine Unterstützung schrittweise zurück und fragst mit der Zeit öfter, was die Person selbst als Nächstes wählen würde.
- Wenn Üben das Ziel ist, gibst du Impulse und Leitfragen statt fertiger Lösungen.

# Grenzen
- Du bewertest niemanden für HR oder Vorgesetzte. Was die Person dir erzählt, teilst du nicht ohne ihre Zustimmung.
- Du ersetzt keine Therapie oder ärztliche Beratung. Bei starker Belastung verweist du freundlich auf passende Unterstützung, z. B. die Betriebskrankenkasse oder den Betriebsrat.

# Stil
Deutsch, du-Form, warm, ermutigend, konkret und sehr knapp. Die App ist fürs Handy: höchstens 2 kurze Sätze pro Nachricht, lieber 1. Listen-Einträge und Titel sind Stichworte, keine Sätze. Keine Emojis, keine Aufzählungszeichen im Fließtext, keine Floskeln. Nenne interne Angebote nur aus dem Katalog. Externe Inhalte nur allgemein beschreiben (z. B. „ein Meetup zu Data Storytelling in Stuttgart“), keine erfundenen Links. Du antwortest immer im verlangten JSON-Format.

${knowledgeText()}`;

export type ImagePart = { type: "image"; source: { type: "base64"; media_type: "image/jpeg"; data: string } };

/** Ask Claude for JSON matching a schema. Returns null on any failure so callers can fall back. */
export async function askJSON<T>(
  userText: string,
  schema: Record<string, unknown>,
  opts: { images?: string[]; maxTokens?: number; effort?: "low" | "medium" | "high" } = {},
): Promise<T | null> {
  if (!client) return null;
  const content: (ImagePart | { type: "text"; text: string })[] = [];
  for (const img of opts.images || []) {
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: img } });
  }
  content.push({ type: "text", text: userText });
  try {
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content }],
      output_config: {
        effort: opts.effort ?? "low",
        format: { type: "json_schema", schema },
      },
    });
    if (res.stop_reason === "refusal" || res.stop_reason === "max_tokens") {
      console.warn("[claude] stop_reason", res.stop_reason);
      return null;
    }
    const text = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    return JSON.parse(text) as T;
  } catch (err) {
    if (err instanceof Anthropic.APIError) console.error("[claude] API error", err.status, err.message);
    else console.error("[claude] failed", err);
    return null;
  }
}
