import { NextRequest, NextResponse } from "next/server";
import { createVoiceSession, hasOpenAI, voiceInstructions, voiceTools, type VoiceRequest } from "@/lib/realtime";
import { cleanChal } from "@/lib/coachContext";
import { saaExcerpt } from "@/lib/saaServer";
import type { PathChallenge } from "@/lib/types";

export const runtime = "nodejs";

/** Ist der Sprachmodus eingerichtet (OPENAI_API_KEY)? */
export async function GET() {
  return NextResponse.json({ available: hasOpenAI });
}

type Body = VoiceRequest & {
  action: "session" | "instructions" | "saa" | "goal";
  query?: string;
  goal?: Omit<PathChallenge, "id">;
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  switch (body.action) {
    case "session": {
      if (!hasOpenAI) return NextResponse.json({ error: "OPENAI_API_KEY fehlt" }, { status: 503 });
      try {
        return NextResponse.json(await createVoiceSession(body));
      } catch (err) {
        console.error("[realtime] session", err);
        return NextResponse.json({ error: "Sprachsitzung konnte nicht gestartet werden" }, { status: 502 });
      }
    }
    case "instructions":
      // Wechsel im laufenden Gespräch, z. B. vom Kennenlernen in den Coach-Chat.
      return NextResponse.json({ instructions: voiceInstructions(body), tools: voiceTools(body.mode) });
    case "saa": {
      const text = saaExcerpt({ text: body.query || "", maxChars: 6000 });
      return NextResponse.json({ text: text || "Kein passender Abschnitt in den SAA und BPR 2025 gefunden. Sag das ehrlich und verweise auf das Verzeichnis." });
    }
    case "goal": {
      const goal = body.goal ? cleanChal(body.goal, `c${Date.now().toString(36)}`, true) : null;
      return NextResponse.json({ goal });
    }
    default:
      return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
  }
}
