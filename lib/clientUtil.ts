"use client";

export const uid = () => Math.random().toString(36).slice(2, 10);
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const WD = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];

export function fmtClock(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${WD[d.getDay()]}, ${dd}.${mm}. ${hh}:${mi}`;
}

export function fmtDay(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.`;
}

/** Parse answers like "Morgen um 10:00" relative to the (demo) now. */
export function parseWhen(text: string, now: Date): { at: Date; label: string } {
  const t = text.toLowerCase();
  const m = t.match(/(\d{1,2})(?:[:.](\d{2}))?\s*(?:uhr)?/);
  let h = 10;
  let min = 0;
  if (m) {
    h = Math.min(23, parseInt(m[1], 10));
    min = m[2] ? Math.min(59, parseInt(m[2], 10)) : 0;
  }
  let addDays = 1;
  if (t.includes("übermorgen")) addDays = 2;
  else if (t.includes("heute")) addDays = 0;
  else if (t.includes("morgen")) addDays = 1;
  const at = new Date(now);
  at.setDate(at.getDate() + addDays);
  at.setHours(h, min, 0, 0);
  if (at.getTime() < now.getTime()) at.setDate(at.getDate() + 1);
  return { at, label: fmtClock(at) + " Uhr" };
}

/** Pull evenly spaced JPEG frames (base64, no prefix) out of a video URL. */
export async function extractFrames(url: string, knownDuration?: number, count = 5): Promise<{ frames: string[]; duration: number }> {
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  v.src = url;
  await new Promise<void>((res, rej) => {
    v.onloadedmetadata = () => res();
    v.onerror = () => rej(new Error("Video konnte nicht geladen werden"));
    setTimeout(() => res(), 4000);
  });
  let duration = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : knownDuration || 0;
  if (!duration) {
    // MediaRecorder WebM files often report Infinity until we seek far ahead.
    v.currentTime = 1e7;
    await new Promise((r) => {
      v.ondurationchange = r;
      setTimeout(r, 1500);
    });
    duration = Number.isFinite(v.duration) && v.duration > 0 ? v.duration : 10;
  }
  const w = 512;
  const vw = v.videoWidth || 640;
  const vh = v.videoHeight || 360;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = Math.round((w * vh) / vw);
  const ctx = c.getContext("2d");
  const frames: string[] = [];
  for (let i = 0; i < count; i++) {
    const t = Math.min(duration - 0.1, (duration * (i + 0.5)) / count);
    await new Promise<void>((res) => {
      v.onseeked = () => res();
      v.currentTime = Math.max(0, t);
      setTimeout(() => res(), 2000);
    });
    ctx?.drawImage(v, 0, 0, c.width, c.height);
    frames.push(c.toDataURL("image/jpeg", 0.72).split(",")[1] || "");
  }
  return { frames: frames.filter(Boolean), duration };
}
