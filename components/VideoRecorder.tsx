"use client";

import { useEffect, useRef, useState } from "react";
import { extractFrames } from "@/lib/clientUtil";
import { Icon } from "./ui";
import { Button } from "@/components/shadcn/button";

export type VideoResult = {
  frames: string[];
  transcript: string;
  duration: number;
  url?: string;
  demo?: boolean;
};

type SR = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
};

function makeRecognizer(): SR | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  const C = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!C) return null;
  const r = new C();
  r.lang = "de-DE";
  r.continuous = true;
  r.interimResults = true;
  return r;
}

export default function VideoRecorder({ onDone, disabled }: { onDone: (r: VideoResult) => void; disabled?: boolean }) {
  const [mode, setMode] = useState<"idle" | "live" | "recording" | "processing">("idle");
  const [error, setError] = useState("");
  const [secs, setSecs] = useState(0);
  const [live, setLive] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const srRef = useRef<SR | null>(null);
  const finalText = useRef("");
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  async function openCamera() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
      streamRef.current = stream;
      setMode("live");
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch {
      setError("Kein Zugriff auf Kamera oder Mikrofon. Du kannst stattdessen ein Video hochladen.");
    }
  }

  function start() {
    const stream = streamRef.current;
    if (!stream) return;
    chunks.current = [];
    finalText.current = "";
    setLive("");
    const mime = ["video/webm;codecs=vp9,opus", "video/webm", "video/mp4"].find((m) => MediaRecorder.isTypeSupported?.(m));
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
    rec.onstop = finish;
    rec.start(500);
    recRef.current = rec;
    startedAt.current = Date.now();
    setSecs(0);
    timer.current = setInterval(() => setSecs(Math.round((Date.now() - startedAt.current) / 1000)), 500);
    const sr = makeRecognizer();
    if (sr) {
      sr.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalText.current += r[0].transcript + " ";
          else interim += r[0].transcript;
        }
        setLive((finalText.current + interim).trim());
      };
      sr.onerror = () => {};
      try {
        sr.start();
      } catch {
        /* ignore */
      }
      srRef.current = sr;
    }
    setMode("recording");
  }

  function stop() {
    srRef.current?.stop();
    recRef.current?.stop();
    if (timer.current) clearInterval(timer.current);
  }

  async function finish() {
    setMode("processing");
    const duration = (Date.now() - startedAt.current) / 1000;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    const blob = new Blob(chunks.current, { type: recRef.current?.mimeType || "video/webm" });
    const url = URL.createObjectURL(blob);
    await new Promise((r) => setTimeout(r, 400));
    try {
      const { frames } = await extractFrames(url, duration);
      onDone({ frames, transcript: finalText.current.trim() || live, duration, url });
    } catch {
      onDone({ frames: [], transcript: finalText.current.trim(), duration, url });
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setMode("processing");
    const url = URL.createObjectURL(file);
    try {
      const { frames, duration } = await extractFrames(url);
      onDone({ frames, transcript: "", duration, url });
    } catch {
      setError("Das Video konnte nicht gelesen werden. Versuch ein anderes Format (MP4 oder WebM).");
      setMode("idle");
    }
  }

  if (disabled) return <p className="mut xs">Aufnahme abgeschlossen.</p>;

  return (
    <div className="stack">
      <div className="vid">
        {mode === "live" || mode === "recording" ? (
          <video ref={videoRef} muted playsInline />
        ) : (
          <svg viewBox="0 0 268 200" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" aria-hidden>
            <circle cx="134" cy="84" r="30" fill="#c99a7c" />
            <path d="M102 78c0-22 14-32 32-32s32 10 32 32c-8-10-18-12-32-12s-24 2-32 12z" fill="#3a2a22" />
            <path d="M62 200c4-50 32-72 72-72s68 22 72 72z" fill="#e8e3dc" />
          </svg>
        )}
        {mode === "recording" && (
          <span className="rec-badge">
            <i /> {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}
          </span>
        )}
        {mode === "recording" && live && <span className="live-tx">… {live.slice(-110)}</span>}
        {mode === "idle" && <span className="live-tx">Sprich zu einer Person hinter der Kamera. 2 bis 3 Minuten reichen.</span>}
        {mode === "processing" && <span className="live-tx">Standbilder werden ausgewählt …</span>}
      </div>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        {mode === "idle" && (
          <>
            <Button className="flex-1" onClick={openCamera}>
              <Icon name="cam" size={15} /> Kamera starten
            </Button>
            <Button asChild variant="secondary" className="flex-1">
              <label>
                <Icon name="upload" size={15} /> Clip hochladen
                <input type="file" accept="video/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
            </Button>
          </>
        )}
        {mode === "live" && (
          <Button className="flex-1" onClick={start}>
            Aufnahme starten
          </Button>
        )}
        {mode === "recording" && (
          <Button variant="destructive" className="flex-1" onClick={stop}>
            Aufnahme beenden
          </Button>
        )}
      </div>
      {mode === "idle" && (
        <Button variant="link" size="sm" className="self-center text-muted-foreground underline" onClick={() => onDone({ frames: [], transcript: "", duration: 0, demo: true })}>
          Ohne Kamera: Beispiel-Analyse zeigen
        </Button>
      )}
      {error && <p className="error xs">{error}</p>}
    </div>
  );
}
