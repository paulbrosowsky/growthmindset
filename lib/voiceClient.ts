"use client";
// Sprachgespräch mit der OpenAI Realtime API im Browser (WebRTC). Das kurzlebige Client-Secret
// kommt von /api/realtime; der OPENAI_API_KEY verlässt den Server nie.

export type VoiceStatus = "connecting" | "listening" | "hearing" | "thinking" | "speaking";

export type VoiceHandlers = {
  onUserText: (text: string) => void;
  onBotText: (text: string) => void;
  /** Werkzeugaufruf des Modells; Rückgabe geht als Ergebnis an das Modell. */
  onTool: (name: string, args: Record<string, unknown>) => Promise<string>;
  onStatus: (s: VoiceStatus) => void;
  onEnd: (error?: string) => void;
};

type FnCall = { type: string; name?: string; call_id?: string; arguments?: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServerEvent = { type: string; [k: string]: any };

export class VoiceSession {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private mic: MediaStream | null = null;
  private audio: HTMLAudioElement;
  private closed = false;
  private toolsRunning = 0;

  constructor(private h: VoiceHandlers) {
    // Im Klick erzeugen, damit mobile Browser die Wiedergabe erlauben.
    this.audio = new Audio();
    this.audio.autoplay = true;
  }

  /** Mikrofon zuerst (Berechtigung), dann Token holen, dann verbinden. */
  async start(getSession: () => Promise<{ token: string; model: string }>) {
    this.h.onStatus("connecting");
    try {
      this.mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    } catch {
      return this.end("Ohne Mikrofon geht das Sprachgespräch nicht. Bitte den Zugriff erlauben.");
    }
    if (this.closed) return this.release();
    try {
      const { token, model } = await getSession();
      if (this.closed) return this.release();
      const pc = new RTCPeerConnection();
      this.pc = pc;
      pc.ontrack = (e) => {
        this.audio.srcObject = e.streams[0];
        void this.audio.play().catch(() => {});
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") this.end("Die Verbindung ist abgebrochen.");
      };
      for (const t of this.mic.getAudioTracks()) pc.addTrack(t, this.mic);
      const dc = pc.createDataChannel("oai-events");
      this.dc = dc;
      dc.onmessage = (e) => {
        try {
          void this.onEvent(JSON.parse(e.data) as ServerEvent);
        } catch {}
      };
      dc.onopen = () => {
        this.h.onStatus("thinking");
        // LENA beginnt das Gespräch (Begrüßung bzw. Anknüpfen laut Anweisungen).
        this.send({ type: "response.create" });
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      const res = await fetch(`https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(model)}`, {
        method: "POST",
        body: offer.sdp,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/sdp" },
      });
      if (!res.ok) throw new Error(`Realtime ${res.status}`);
      const sdp = await res.text();
      if (this.closed) return this.release();
      await pc.setRemoteDescription({ type: "answer", sdp });
    } catch (err) {
      console.error("[voice] start", err);
      this.end("Das Sprachgespräch konnte nicht starten.");
    }
  }

  get active() {
    return !this.closed;
  }

  send(ev: Record<string, unknown>) {
    if (this.dc?.readyState === "open") this.dc.send(JSON.stringify(ev));
  }

  /** Getippte Nachricht im laufenden Sprachgespräch. */
  sendText(text: string) {
    this.send({ type: "response.cancel" });
    this.send({ type: "conversation.item.create", item: { type: "message", role: "user", content: [{ type: "input_text", text }] } });
    this.send({ type: "response.create" });
  }

  /** Anweisungen und Werkzeuge wechseln, z. B. nach dem Kennenlernen in den Coach-Chat. */
  updateSession(instructions: string, tools: unknown[]) {
    this.send({ type: "session.update", session: { type: "realtime", instructions, tools } });
  }

  stop() {
    this.end();
  }

  private end(error?: string) {
    if (this.closed) return;
    this.closed = true;
    this.release();
    this.h.onEnd(error);
  }

  private release() {
    try {
      this.dc?.close();
    } catch {}
    try {
      this.pc?.close();
    } catch {}
    this.mic?.getTracks().forEach((t) => t.stop());
    this.audio.srcObject = null;
  }

  private async onEvent(ev: ServerEvent) {
    switch (ev.type) {
      case "input_audio_buffer.speech_started":
        this.h.onStatus("hearing");
        break;
      case "input_audio_buffer.speech_stopped":
      case "response.created":
        this.h.onStatus("thinking");
        break;
      case "output_audio_buffer.started":
        this.h.onStatus("speaking");
        break;
      case "output_audio_buffer.stopped":
      case "output_audio_buffer.cleared":
        if (!this.toolsRunning) this.h.onStatus("listening");
        break;
      case "conversation.item.input_audio_transcription.completed": {
        const t = String(ev.transcript || "").trim();
        if (t) this.h.onUserText(t);
        break;
      }
      case "response.output_audio_transcript.done":
      case "response.audio_transcript.done":
      case "response.output_text.done":
      case "response.text.done": {
        const t = String(ev.transcript ?? ev.text ?? "").trim();
        if (t) this.h.onBotText(t);
        break;
      }
      case "response.done": {
        const calls = ((ev.response?.output || []) as FnCall[]).filter((o) => o.type === "function_call" && o.call_id && o.name);
        if (!calls.length) {
          if (ev.response?.status === "failed") console.warn("[voice] response failed", ev.response?.status_details);
          break;
        }
        this.toolsRunning++;
        this.h.onStatus("thinking");
        try {
          for (const c of calls) {
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(c.arguments || "{}");
            } catch {}
            let output: string;
            try {
              output = await this.h.onTool(c.name!, args);
            } catch (err) {
              console.error("[voice] tool", c.name, err);
              output = "Das hat gerade nicht geklappt. Sag es kurz und mach weiter.";
            }
            if (this.closed) return;
            this.send({ type: "conversation.item.create", item: { type: "function_call_output", call_id: c.call_id, output } });
          }
        } finally {
          this.toolsRunning--;
        }
        this.send({ type: "response.create" });
        break;
      }
      case "error":
        console.warn("[voice] error", ev.error);
        break;
    }
  }
}
