import Anthropic from "@anthropic-ai/sdk";
import { knowledgeText } from "./knowledge";

export const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
export const hasKey = Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

const client = hasKey ? new Anthropic({ timeout: 45_000, maxRetries: 1 }) : null;

const SYSTEM = `Du bist „Kompass“, der persönliche KI-Lern-Coach der Neckartal Systemtechnik GmbH. Du begleitest Mitarbeitende beim Lernen im Arbeitsalltag nach dem 70/20/10-Modell und mit Growth Mindset: Anstrengung, Üben und Reflexion zählen mehr als Talent, Fehler sind Lernschritte. Du kennst das Unternehmen, das Kompetenzmodell, den Fortbildungskatalog und gute Lernpraxis (siehe unten).

Stil: Deutsch, du-Form, warm, ermutigend, konkret und sehr knapp. Die App ist fürs Handy: höchstens 2 kurze Sätze pro Nachricht, lieber 1. Listen-Einträge und Titel sind Stichworte, keine Sätze. Keine Emojis, keine Aufzählungszeichen im Fließtext, keine Floskeln. Nenne interne Angebote nur aus dem Katalog. Externe Inhalte nur allgemein beschreiben (z. B. „ein Meetup zu Data Storytelling in Stuttgart“), keine erfundenen Links. Du antwortest immer im verlangten JSON-Format.

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
