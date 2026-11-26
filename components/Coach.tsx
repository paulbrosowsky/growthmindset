"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import type { VideoResult } from "./VideoRecorder";
import Rehearsal, { type RehearsalState } from "./Rehearsal";
import { LinkCard, OptionsCard, PeerAskCard, ProfileSummaryCard, RichText, SlidesCard, SummaryCard } from "./Cards";
import { AreaView, DemoSheet, KompetenzenView, SkillUpdateView, TeamView } from "./views";
import { GoalsView, PathView, ProfileView, goalPath } from "./ziele";
import { Icon } from "./ui";
import { ShareSheet } from "./ShareSheet";
import { Button } from "@/components/shadcn/button";
import { Input } from "@/components/shadcn/input";
import { Progress } from "@/components/shadcn/progress";
import { fallback, type ChatOut, type ProfileOut, type PrepOut, type SynthOut, type VideoOut } from "@/lib/fallbacks";
import { addToPath, BADGES, demoPath as demoGoalPath, goalPathKey, profilePath, CHALLENGE_XP, COMPANY, findSkill, initialState, levelOf, MANDATORY, MAX_LEVEL, MANDATORY_DONE_DEFAULT, skillProgress, SOPS, TEAM, type Challenge } from "@/lib/knowledge";
import { fmtClock, parseWhen, sleep, uid } from "@/lib/clientUtil";
import { OB_QUESTIONS } from "@/lib/onboarding";
import { VoiceSession, type VoiceStatus } from "@/lib/voiceClient";
import { shareDraft, type ShareDraft } from "@/lib/share";
import type { AppState, Experience, SharedSuccess, GoalPathState, PathChallenge, LevelChange, Msg, PeerFeedback, Profile, Rec, Slide, Source } from "@/lib/types";

type Toast = { id: string; text: string };
type Tab = "coach" | "ziele" | "team";
type Reise = { view: "home" | "kompetenzen" | "area" | "update" | "pfad" | "profil"; area: string; skill: string; from?: "home" | "kompetenzen" | "profil" };

const PRESENT_RE = /präsentier|präsentation|vortrag|pitch|presentation|fallbesprechung|fallvorstellung|fall vorstellen|einsatz vorstellen/i;
const OB_TOTAL = OB_QUESTIONS.length;
const MAX_FOLLOWUPS = 2;
const WD = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const TOPIC_FULL = "Fallvorstellung Polytrauma, Fallbesprechung der Wache, 15 Minuten";
const PRESENT_CHIP = "Hey, ich muss morgen bei der Fallbesprechung einen Einsatz vorstellen.";
const CHIPS = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } };
const CHIP = { hidden: { opacity: 0, y: 8, scale: 0.95 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 420, damping: 28 } } };

const VOICE_LABEL: Record<VoiceStatus, string> = {
  connecting: "Verbinde Sprachgespräch …",
  listening: "Ich höre zu, sprich einfach",
  hearing: "Ich höre zu …",
  thinking: "Kompass überlegt …",
  speaking: "Kompass spricht …",
};

/** Das Sprachgespräch übernimmt einen laufenden Text-Ablauf (z. B. mitten im Kennenlernen). */
class VoiceTakeover extends Error {}

export default function Coach({ initial, live, onLogout, onRestart }: { initial: AppState; live: boolean; onLogout: () => void; onRestart: (fresh: AppState) => void }) {
  const [S, setS] = useState<AppState>(initial);
  const sRef = useRef<AppState>(initial);
  const [typing, setTyping] = useState(false);
  const [chips, setChips] = useState<string[]>([]);
  const [multi, setMulti] = useState<{ options: string[]; selected: string[] } | null>(null);
  const [placeholder, setPlaceholder] = useState("Nachricht an Kompass");
  const [input, setInput] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [tab, setTabState] = useState<Tab>("coach");
  const tabRef = useRef<Tab>("coach");
  const [reise, setReise] = useState<Reise>({ view: "home", area: "komm", skill: "praes" });
  const blockSave = useRef(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [reh, setReh] = useState<RehearsalState | null>(null);
  const [obStep, setObStep] = useState(0);
  const [unread, setUnread] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [share, setShare] = useState<ShareDraft | null>(null);
  const [script, setScriptState] = useState(false);
  const scriptRef = useRef(false);
  const [, setTick] = useState(0);
  const [busy, setBusy] = useState(false);
  // Sprachgespräch (OpenAI Realtime): startet über den Senden-Knopf bei leerem Eingabefeld.
  const [voice, setVoice] = useState<{ mode: "onboarding" | "chat"; status: VoiceStatus } | null>(null);
  const voiceRef = useRef<VoiceSession | null>(null);
  const voiceAvail = useRef<boolean | null>(null);
  const takeover = useRef(false);
  const obRef = useRef<{ name: string; answers: Partial<Profile>; card?: ProfileOut }>({ name: "", answers: {} });

  const pending = useRef<((v: string) => void) | null>(null);
  const pendingAbort = useRef<((e: Error) => void) | null>(null);
  const cardWaiters = useRef<Record<string, (v: unknown) => void>>({});
  const rehRecorded = useRef<((v: VideoResult | null) => void) | null>(null);
  const rehBack = useRef<(() => void) | null>(null);
  const busyRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setTab = (t: Tab) => {
    tabRef.current = t;
    setTabState(t);
    if (t === "coach") setUnread(false);
  };

  const setScript = (v: boolean) => {
    scriptRef.current = v;
    setScriptState(v);
    try {
      localStorage.setItem("kompass-script", v ? "1" : "0");
    } catch {}
  };

  // ---------- state helpers ----------
  const save = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (blockSave.current) return;
      const s = sRef.current;
      fetch(`/api/state?u=${encodeURIComponent(s.username)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(s),
      }).catch(() => {});
    }, 500);
  }, []);

  const update = useCallback(
    (mut: (s: AppState) => void) => {
      const next = structuredClone(sRef.current);
      mut(next);
      sRef.current = next;
      setS(next);
      save();
    },
    [save],
  );

  const now = () => new Date(Date.now() + sRef.current.timeOffsetMs);

  const toast = (text: string) => {
    const id = uid();
    setToasts((q) => [...q, { id, text }].slice(-3));
  };
  const headToast = toasts[0]?.id;
  useEffect(() => {
    if (!headToast) return;
    const t = setTimeout(() => setToasts((q) => q.slice(1)), 2200);
    return () => clearTimeout(t);
  }, [headToast]);

  const push = (m: Omit<Msg, "id">) => {
    const id = uid();
    update((s) => {
      s.messages.push({ ...m, id });
    });
    if (m.from === "bot" && tabRef.current !== "coach") setUnread(true);
    return id;
  };

  const patchMsg = (id: string, data: Record<string, unknown>) =>
    update((s) => {
      const m = s.messages.find((x) => x.id === id);
      if (m) m.data = { ...(m.data || {}), ...data };
    });

  const say = async (text: string, wait = 650) => {
    setTyping(true);
    await sleep(wait);
    setTyping(false);
    if (takeover.current) throw new VoiceTakeover();
    push({ from: "bot", kind: "text", text });
  };

  const note = (text: string) => push({ from: "bot", kind: "note", text });

  const ask = (c: string[], ph?: string) => {
    if (takeover.current) throw new VoiceTakeover();
    setChips(c);
    setPlaceholder(ph || "Oder schreib frei …");
    return new Promise<string>((res, rej) => {
      pending.current = res;
      pendingAbort.current = rej;
    });
  };

  const askMulti = (options: string[]) => {
    if (takeover.current) throw new VoiceTakeover();
    setChips([]);
    setMulti({ options, selected: [] });
    setPlaceholder("Oder schreib frei …");
    return new Promise<string>((res, rej) => {
      pending.current = res;
      pendingAbort.current = rej;
    });
  };

  const waitCard = <T,>(id: string) =>
    new Promise<T>((res) => {
      cardWaiters.current[id] = res as (v: unknown) => void;
    });

  const resolveCard = (id: string, value: unknown) => {
    patchMsg(id, { done: true });
    const w = cardWaiters.current[id];
    delete cardWaiters.current[id];
    w?.(value);
  };

  async function ai<T>(task: string, payload: unknown, fb: T, quiet = false): Promise<T> {
    if (!quiet) setTyping(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ task, payload, script: scriptRef.current, state: { ...sRef.current, messages: [] } }),
      });
      if (!res.ok) return fb;
      const json = await res.json();
      return (json.result as T) ?? fb;
    } catch {
      return fb;
    } finally {
      if (!quiet) setTyping(false);
    }
  }

  /** XP stehen im Konzept direkt in den Karten; nur Level-Ups bekommen einen Hinweis. */
  const addXP = (n: number, journal?: Omit<Experience, "id" | "date" | "xp">) => {
    const before = levelOf(sRef.current.xp);
    update((s) => {
      s.xp += n;
      if (journal) s.journal.unshift({ ...journal, id: uid(), date: now().toISOString(), xp: n });
    });
    const after = levelOf(sRef.current.xp);
    if (after > before) setTimeout(() => toast(`Level ${after} erreicht`), 600);
  };

  const award = (id: string) => {
    if (sRef.current.badges.includes(id)) return;
    update((s) => {
      s.badges.push(id);
    });
    if (id !== "start") setTimeout(() => toast(`Badge: ${BADGES[id]?.name}`), 1200);
  };

  const praesPct = () => {
    const sk = findSkill(sRef.current.areas, "praes");
    return sk ? skillProgress(sk) : 0;
  };

  const applyLevels = (changes: LevelChange[], sources: Source[]) => {
    update((s) => {
      const sk = findSkill(s.areas, "praes");
      if (!sk) return;
      for (const c of changes || []) {
        const sub = sk.subs.find((x) => x.id === c.sub);
        if (!sub) continue;
        const lvl = Math.max(sub.level, Math.min(MAX_LEVEL, sub.level + 1, Math.round(c.level)));
        if (lvl > sub.level) {
          sub.level = lvl;
          sub.sources = Array.from(new Set([...(sub.sources || []).filter((x) => x !== "Start"), ...sources]));
        } else if (!sub.sources?.some((x) => sources.includes(x))) {
          sub.sources = Array.from(new Set([...(sub.sources || []).filter((x) => x !== "Start"), ...sources]));
        }
      }
    });
  };

  // ---------- flows ----------
  async function runFlow(fn: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      // Das Sprachgespräch hat den laufenden Text-Ablauf übernommen.
      if (!(err instanceof VoiceTakeover)) throw err;
    } finally {
      busyRef.current = false;
      setBusy(false);
      setIdleChips();
      checkDue();
    }
  }

  function setIdleChips() {
    const s = sRef.current;
    if (s.phase === "ready") setChips([PRESENT_CHIP]);
    else if (s.phase === "waiting") setChips(s.presentation?.practiced ? [] : ["Generalprobe starten"]);
    else if (s.phase === "done") setChips(["Was soll ich als Nächstes üben?"]);
    else setChips([]);
    setPlaceholder("Nachricht an Kompass");
  }

  async function onboarding() {
    // Nach einem beendeten Sprachgespräch geht es schriftlich dort weiter, wo es aufgehört hat.
    const resume = obRef.current.name && Object.keys(obRef.current.answers).length > 1 ? obRef.current : null;
    update((s) => {
      s.phase = "onboarding";
      if (!resume) s.messages = [];
    });
    setObStep(1);
    // Der Name kommt aus dem Login (z. B. „lena.berger“ → „Lena“).
    const guess = sRef.current.username.split(/[._\-\s@0-9]/)[0];
    let name = resume?.name || guess.charAt(0).toUpperCase() + guess.slice(1).toLowerCase();
    if (resume) {
      // kein erneutes Hallo
    } else if (name.length < 2) {
      await say(`Hallo, ich bin **Kompass**, dein Lern-Coach bei ${COMPANY.short}. Wie heißt du?`, 400);
      name = (await ask([], "Dein Vorname")).split(/[ ,]/)[0] || "du";
      await say("Schön, dich kennenzulernen. Lass uns gemeinsam dein Lernziel finden, was du mir erzählst, bleibt bei dir.");
    } else {
      await say(`Hallo ${name}, ich bin **Kompass**, dein Lern-Coach. Lass uns gemeinsam dein Lernziel finden, was du mir erzählst, bleibt bei dir.`, 400);
    }

    const answers: Partial<Profile> = resume?.answers || { name };
    obRef.current = { name, answers };
    const history = () =>
      sRef.current.messages
        .filter((m) => m.kind === "text" && m.text)
        .slice(-16)
        .map((m) => ({ from: m.from, text: m.text }));
    let left = MAX_FOLLOWUPS;
    let lead = resume ? "Gut, dann schriftlich weiter." : "";
    // Vorschläge: Kompass leitet sie aus dem bisherigen Gespräch ab. Die festen Demo-Chips
    // erscheinen nur, solange alle Antworten bisher genau die Demo-Antworten waren.
    let demoPath = !resume;
    let suggested: string[] = [];
    let phrased = "";
    for (let i = 0; i < OB_QUESTIONS.length; i++) {
      const q = OB_QUESTIONS[i];
      if (answers[q.key]) continue;
      const next = OB_QUESTIONS[i + 1];
      const asked = phrased || q.q;
      setObStep(i + 1);
      await say(lead ? `${lead} ${asked}` : asked, lead ? 300 : 650);
      const chips: string[] = q.multi ? q.chips : suggested.length ? suggested.slice(0, 2) : demoPath ? q.chips : [];
      let answer: string = q.multi ? await askMulti(chips) : await ask(chips, q.ph || "Deine Antwort …");
      // Rolle ohne Vorschläge; Demo-Pfad (Notfallsanitäter Max Müller mit Fallvorstellung) nur über den ersten Chip.
      if (q.key === "role") demoPath = /notfallsan|notsan/i.test(answer) && !/azubi|auszubild/i.test(answer);
      else if (!q.multi && answer !== q.chips[0]) demoPath = false;
      const base = { step: i + 1, nextTopic: next?.topic, nextQuestion: next?.q, nextIsChoice: Boolean(next?.multi), name, answersSoFar: answers };
      let r = await ai("onboard", { ...base, question: asked, answer, followUpsLeft: left, history: history() }, fallback.onboard(i + 1, answer, left, false));
      if (r.followUp && left > 0) {
        left--;
        await say(`${r.reaction} ${r.followUp}`.trim(), 200);
        const more = await ask([], "Erzähl gern mehr …");
        answer = `${answer} (${more})`;
        r = await ai(
          "onboard",
          { ...base, question: r.followUp, answer: more, followUpsLeft: 0, isFollowUpAnswer: true, history: history() },
          fallback.onboard(i + 1, more, 0, true),
        );
      }
      answers[q.key] = answer;
      if (takeover.current) throw new VoiceTakeover();
      lead = r.reaction;
      phrased = (r.nextQuestion || "").trim();
      if (phrased && !phrased.endsWith("?")) phrased = "";
      if (next?.key === "time" && phrased && !/letzte/i.test(phrased)) phrased = `Letzte Frage: ${phrased.charAt(0).toLowerCase()}${phrased.slice(1)}`;
      suggested = (r.suggestions || []).filter((x) => x && x.length <= 60);
    }

    // Profil-Karte: erst wenn die Person „Passt“ sagt, ist das Onboarding abgeschlossen.
    setObStep(OB_TOTAL + 1);
    let correction = "";
    let card = fallback.profile(answers);
    for (;;) {
      card = await ai("profile", { answers, correction }, fallback.profile(answers, correction));
      obRef.current.card = card;
      await say(lead ? `${lead} ${card.intro}` : card.intro, 200);
      lead = "";
      push({ from: "bot", kind: "profile", data: { card } });
      await say("Stimmt das so?", 500);
      const c = await ask(["Passt", "Anpassen"], "Oder schreib, was nicht stimmt …");
      if (/^(passt|stimmt|ja)\b/i.test(c.trim())) break;
      if (/^anpassen$/i.test(c.trim())) {
        await say("Was soll ich ändern?");
        correction = await ask([], "z. B. Ziel konkreter fassen …");
      } else correction = c;
      lead = "Danke, ich passe es an.";
    }

    const { w, focus } = await completeOnboarding(name, answers, card, demoPath);
    await say(w.summary, 300);
    push({ from: "bot", kind: "summary", data: { focus } });
    await say(`Dein erster Schritt: **${w.firstStep}**. Wollen wir direkt loslegen, oder schaust du erst in deine Ziele?`);
    const next = await ask(["Loslegen", "Ziele ansehen"]);
    if (/ziele/i.test(next)) {
      openReise("home");
      await say("Schau dich in Ruhe um. Sag mir einfach, wenn etwas ansteht.", 600);
    } else {
      await say("Super. Steht bei dir gerade etwas an, eine Fallbesprechung oder ein Termin?");
    }
  }

  /** Abschluss des Kennenlernens (Text und Sprache): Profil speichern, Lernpfad und Fokus erzeugen. */
  async function completeOnboarding(name: string, answers: Partial<Profile>, card: ProfileOut, demoPath: boolean) {
    const profile: Profile = {
      name,
      role: answers.role || "",
      experience: answers.experience || "",
      likes: answers.likes,
      learn: answers.learn,
      vision: answers.vision,
      goal: card.goal || answers.goal || "",
      preference: answers.preference || "",
      time: answers.time,
      card: { wer: card.wer, was: card.was, wie: card.wie, goal: card.goal },
    };
    update((s) => {
      s.profile = profile;
      s.goalSetAt = now().toISOString();
    });
    setObStep(OB_TOTAL + 2);
    // Lernpfad und Fokus parallel erzeugen; ohne KI gibt es den Demo-Pfad passend zum Ziel.
    // Wer genau die Demo-Antworten gewählt hat (Max Müller), bekommt verlässlich den kuratierten Demo-Pfad.
    const demo = demoGoalPath(profile.card?.goal || profile.goal);
    const [w, gp] = await Promise.all([
      ai("welcome", {}, fallback.welcome(profile)),
      demoPath ? Promise.resolve(demo) : ai<GoalPathState>("path", {}, profilePath(profile), true),
    ]);
    const own = gp?.challenges?.length ? gp : demoPath ? demo : profilePath(profile);
    update((s) => {
      s.goalPath = own;
      s.pathDone = own.source === "demo" ? undefined : [];
    });
    update((s) => {
      s.summary = w.summary;
      s.focus = w.focus.filter((id) => findSkill(s.areas, id)).slice(0, 3);
      if (!s.focus.includes("praes")) s.focus.unshift("praes");
      s.firstStep = w.firstStep;
      s.phase = "ready";
    });
    setObStep(0);
    const areas = sRef.current.areas;
    const focus = sRef.current.focus
      .map((id) => {
        const area = areas.find((a) => a.skills.some((k) => k.id === id));
        const sk = findSkill(areas, id);
        return sk ? { name: sk.name, pct: skillProgress(sk), color: area?.color } : null;
      })
      .filter(Boolean) as { name: string; pct: number; color?: string }[];
    addXP(50, { kind: "Start", title: "Onboarding mit Kompass abgeschlossen" });
    award("start");
    return { w, focus, path: own };
  }

  /** Folien (optional) und Generalprobe als eigener Screen. */
  async function practice(topic: string, withSlides: boolean) {
    if (withSlides) {
      const deck = await ai("slides", { topic }, fallback.slides(topic));
      let slides: Slide[] = deck.slides;
      await say(`Hier ist ein Entwurf mit ${slides.length} Folien für die ${topicShort(topic)}, mit Sprechernotizen.`, 200);
      const slId = push({ from: "bot", kind: "slides", data: { slides } });
      update((s) => {
        if (s.presentation) s.presentation.slides = slides;
      });
      addXP(20);
      const c = await ask(["Übernehmen", "Kürzer", "Folie 3 ändern"]);
      if (/kürzer/i.test(c)) {
        slides = slides.slice(0, 4);
        patchMsg(slId, { slides });
        await say("Gekürzt auf 4 Folien.", 300);
      } else if (/folie 3/i.test(c)) {
        await say("Folie 3 ist jetzt kompakter.", 300);
      }
    }
    await say("Jetzt die Generalprobe. Zwei Minuten reichen.");
    await ask(["Generalprobe starten"]);
    setReh({ phase: "record", step: 0, topic });
    const vid = await new Promise<VideoResult | null>((res) => {
      rehRecorded.current = res;
    });
    if (!vid) {
      setReh(null);
      await say("Kein Problem, wir üben später.", 300);
      return;
    }
    setReh({ phase: "analyzing", step: 0, topic, video: vid });
    const steps = (async () => {
      for (let i = 1; i <= 3; i++) {
        await sleep(1000);
        setReh((r) => (r && r.phase === "analyzing" ? { ...r, step: i } : r));
      }
    })();
    let analysis: VideoOut;
    if (vid.demo || (!vid.frames.length && !vid.transcript)) {
      await sleep(1500);
      analysis = fallback.video();
    } else {
      analysis = await ai("video", { topic, frames: vid.frames, transcript: vid.transcript, duration: vid.duration }, fallback.video(), true);
    }
    await steps;
    const before = praesPct();
    applyLevels(analysis.levelChanges, ["Übung"]);
    const after = praesPct();
    update((s) => {
      if (s.presentation) {
        s.presentation.practiced = true;
        s.presentation.durationSec = Math.round(vid.duration);
      }
      if (analysis.improve[0]) s.memory.unshift(`Generalprobe: ${analysis.improve[0]}`);
    });
    setReh({ phase: "feedback", step: 4, topic, video: vid, analysis, before, after });
    addXP(80, { kind: "Üben", title: "Generalprobe per Video", detail: analysis.tip });
    award("generalprobe");
    await new Promise<void>((res) => {
      rehBack.current = res;
    });
    setReh(null);
    await say(`Generalprobe gespeichert. Kommunikation **${before} % → ${after} %**.`, 300);
  }

  async function askTime() {
    await say("Wann ist dein Termin? Ich melde mich danach.");
    const when = await ask(["Morgen um 10:00", "Morgen um 14:30"], "z. B. morgen um 11 Uhr");
    const { at, label } = parseWhen(when, now());
    update((s) => {
      if (s.presentation) {
        s.presentation.at = at.toISOString();
        s.presentation.atLabel = label;
        s.presentation.followedUp = false;
      }
      s.phase = "waiting";
    });
    await say(`Notiert: **${label}**. Viel Erfolg!`);
  }

  async function presentFlow(text: string) {
    const pct = praesPct();
    let topic = /fallbesprech|fallvorstell|einsatz|polytrauma/i.test(text) ? TOPIC_FULL : "";
    if (!topic) {
      await say(`Gut, dass du dich meldest! Worum geht es?`);
      topic = await ask([TOPIC_FULL], "Thema und Publikum");
    }
    update((s) => {
      s.presentation = { topic, pctBefore: pct };
    });
    const prep = await ai<PrepOut>("prep", { topic }, fallback.prep(topic, pct));
    await say(prep.text, 200);
    const optId = push({ from: "bot", kind: "options", data: { options: prep.options } });
    const choice = await ask(["Slides vorbereiten", "Termin merken"]);
    patchMsg(optId, { done: true });

    if (/termin/i.test(choice)) return askTime();
    if (/slides|folien/i.test(choice)) {
      await practice(topic, true);
      return askTime();
    }
    let idx = 2;
    if (/^\s*1/.test(choice) || (/grundlage/i.test(choice) && !/generalprobe/i.test(choice))) idx = 0;
    else if (/^\s*2/.test(choice) || /leitfaden|vorlage|les/i.test(choice)) idx = 1;

    if (idx < 2) {
      const opt = prep.options[idx];
      update((s) => {
        const sk = findSkill(s.areas, "praes");
        sk?.recs.unshift({ id: uid(), type: idx === 0 ? "Intern" : "Ressource", title: opt.title, meta: opt.detail, fresh: true });
      });
      addXP(15, { kind: "Lernen", title: opt.title });
      await say(`„${opt.title}“ ist für dich vorgemerkt. Noch eine kurze Generalprobe?`);
      const more = await ask(["Ja, mit Slides", "Ja, ohne Slides", "Nein, danke"]);
      if (!/nein/i.test(more)) await practice(topic, /mit slides/i.test(more));
      return askTime();
    }
    await say("Gute Wahl. Hast du schon Folien?");
    const sl = await ask(["Slides vorbereiten", "Ich habe schon Folien"]);
    await practice(topic, !/habe schon/i.test(sl));
    await askTime();
  }

  async function followUp() {
    setUnread(false);
    const s0 = sRef.current;
    const name = s0.profile?.name || "";
    const p = s0.presentation;
    const topic = p?.topic || "deine Fallvorstellung";
    const at = p?.at ? new Date(p.at) : now();
    note(`${WD[now().getDay()]}, ${fmtClock(now())} · nach deinem Termin`);
    await say(`Hallo ${name}! Heute um ${at.getHours()}${at.getMinutes() ? `:${String(at.getMinutes()).padStart(2, "0")}` : ""} Uhr war deine ${topicShort(topic)}. Wie ist es gelaufen?`, 300);
    const how = await ask(["Super", "Ganz gut", "Holprig"]);
    const r = await ai("react", { answer: how }, fallback.react(how));
    await say(r.text, 100);
    const gb = await ask(["Der Einstieg saß. Bei der Rückfrage zur Beckenschlinge war ich hektisch."], "Was lief gut, was war schwierig?");
    const [good, ...badParts] = gb.split(/(?<=\.)\s+/);
    const bad = badParts.join(" ") || gb;
    const ref = await ai("reflect", { how, good, bad }, fallback.reflect());
    const first = TEAM.map((t) => t.name.split(" ")[0]);
    await say(`${ref.text} Soll ich ${first.slice(0, -1).join(", ")} und ${first[first.length - 1]} um kurzes Feedback bitten?`, 200);
    addXP(60, { kind: "Anwenden", title: `Vorgestellt: ${topicShort(topic)}`, detail: `Gut: ${good} · Anders: ${bad}` });
    setChips([]);
    const selId = push({ from: "bot", kind: "peerSelect" });
    push({ from: "bot", kind: "xpline", text: "+60 XP für deine Reflexion" });
    const ok = await waitCard<boolean>(selId);
    let feedback: PeerFeedback[] = [];
    const names = TEAM.map((t) => t.name);
    if (ok) {
      push({ from: "me", kind: "text", text: "Ja, anfragen" });
      addXP(40, { kind: "Feedback", title: `Feedback angefragt bei ${names.length} Kollegen` });
      await say("Anfragen sind raus …", 300);
      const out = await ai("peers", { names, topic, how, good, bad }, fallback.peers(names), true);
      feedback = out.feedback;
      for (const f of feedback) {
        await sleep(700);
        update((s) => {
          s.feedbackReceived = [...s.feedbackReceived.filter((x) => x.name !== f.name), f];
          s.teamChallenge = Math.max(s.teamChallenge + 1, 10 - (feedback.length - 1 - feedback.indexOf(f)));
        });
        addXP(30);
      }
      award("feedback");
      push({ from: "bot", kind: "link", data: { icon: "team", sub: `${feedback.length} von ${TEAM.length}`, title: "Feedback deiner Kollegen ansehen", to: "team" } });
    } else {
      push({ from: "me", kind: "text", text: "Später" });
    }

    const syn = await ai<SynthOut>("synth", { topic, how, good, bad, feedback }, fallback.synth());
    const before = sRef.current.presentation?.pctBefore ?? praesPct();
    applyLevels(syn.levelChanges, feedback.length ? ["Selbst", "Kollegen"] : ["Selbst"]);
    const after = praesPct();
    update((s) => {
      const sk = findSkill(s.areas, "praes");
      if (sk) {
        sk.recs = sk.recs.map((r) => ({ ...r, fresh: false }));
        sk.recs.unshift(...syn.recommendations.map((r) => ({ id: uid(), type: r.type, title: r.title, why: r.why, fresh: true })));
      }
      s.memory = [...syn.memory, ...s.memory].slice(0, 12);
      if (s.presentation) s.presentation.followedUp = true;
      s.phase = "done";
    });
    await say(syn.summary, 200);
    push({ from: "bot", kind: "link", data: { icon: "orb", sub: `Kommunikation ${before} % → ${after} %`, title: "Lernpfad ansehen", to: "update" } });
    addXP(50, { kind: "Reflexion", title: "Learning Loop geschlossen, Lernpfad erweitert" });
    award("loop");
  }

  async function freeChat(text: string) {
    const ph = sRef.current.phase;
    if (/zeitsprung/i.test(text)) return timeJump();
    if (/(lernreise|ziele) ansehen/i.test(text)) return openReise("home");
    if (/generalprobe starten/i.test(text) && sRef.current.presentation) {
      await practice(sRef.current.presentation.topic, false);
      return;
    }
    if ((ph === "ready" || ph === "done") && PRESENT_RE.test(text)) return presentFlow(text);
    const history = sRef.current.messages
      .filter((m) => m.kind === "text" && m.text)
      .slice(-8)
      .map((m) => ({ from: m.from, text: m.text }));
    const out = await ai<ChatOut>("chat", { text, history }, fallback.chat(text));
    await say(out.text, 100);
    if (out.goal?.title) addChatGoal(out.goal);
  }

  /** Demo: Pflichtschulung absolvieren (öffnet sonst das Lernportal bzw. die Terminbuchung). */
  function doMandatory(id: string) {
    const m = MANDATORY.find((x) => x.id === id);
    if (!m) return;
    update((s) => {
      const done = s.mandatoryDone ?? MANDATORY_DONE_DEFAULT;
      if (!done.includes(id)) s.mandatoryDone = [...done, id];
    });
    addXP(30, { kind: "Lernen", title: `Pflichtschulung „${m.title}“ (${m.id}) absolviert` });
    toast(`${m.title} erledigt, +30 XP`);
  }

  /**
   * Profile ohne persönlichen Pfad oder mit einem Demo-Pfad, der nicht zum eigenen Ziel passt
   * (z. B. weil die KI beim Onboarding nicht antwortete): Pfad aus dem Kennenlernen neu erzeugen.
   * Die Demo-Persona (Ziel Fallvorstellung) behält den kuratierten Demo-Pfad.
   */
  async function repairPath() {
    const p = sRef.current.profile;
    const gp = sRef.current.goalPath;
    if (!p || (gp && gp.source !== "demo")) return;
    if (goalPathKey(p.card?.goal || p.goal) === "praes") return;
    const fresh = await ai<GoalPathState>("path", {}, profilePath(p), true);
    const own = fresh?.challenges?.length ? fresh : profilePath(p);
    const chat = (sRef.current.goalPath?.challenges ?? []).filter((c) => c.fromChat);
    update((s) => {
      s.goalPath = { ...own, challenges: [...own.challenges.slice(0, -1), ...chat, ...own.challenges.slice(-1)] };
      s.pathDone = (s.pathDone ?? []).filter((id) => chat.some((c) => c.id === id));
    });
  }

  /** Ziel aus dem Chat als Challenge in den Lernpfad übernehmen. */
  function addChatGoal(g: PathChallenge) {
    const st = sRef.current;
    const path = goalPath(st, new Date(Date.now() + st.timeOffsetMs));
    if (!path) return;
    const base = st.goalPath ?? demoGoalPath(st.profile?.card?.goal || st.profile?.goal);
    const next = addToPath(base, { ...g, fromChat: true }, path.done);
    if (next === base) return;
    update((s) => {
      s.goalPath = next;
      if (!s.pathDone) s.pathDone = path.done;
    });
    push({ from: "bot", kind: "link", data: { icon: "target", sub: "Neu im Lernpfad", title: g.title, to: "pfad" } });
  }

  /** Lernpfad: aktuelle Challenge abhaken. */
  function doChallenge(c: Challenge) {
    const path = goalPath(sRef.current, new Date(Date.now() + sRef.current.timeOffsetMs));
    if (!path) return;
    update((s) => {
      const done = s.pathDone ?? path.done;
      if (!done.includes(c.id)) s.pathDone = [...done, c.id];
    });
    addXP(CHALLENGE_XP[c.kind], { kind: c.kind === "Reflexion" ? "Reflexion" : c.kind === "Lernen" ? "Lernen" : c.kind === "Üben" ? "Üben" : "Anwenden", title: `Challenge „${c.title}“ geschafft` });
    toast(`${c.title} erledigt, +${CHALLENGE_XP[c.kind]} XP`);
    // Größere Erfolge: anbieten, sie mit der Führungskraft zu teilen. Die Person entscheidet.
    const after = goalPath(sRef.current, now());
    if (after && after.cur === -1) setTimeout(() => setShare(shareDraft(sRef.current, `Lernpfad „${after.title}“ abgeschlossen`)), 900);
    else if (c.kind === "Anwenden") setTimeout(() => setShare(shareDraft(sRef.current, `Challenge „${c.title}“ geschafft`)), 900);
  }

  /** Demo: „Erfolg teilen“ direkt zeigen, mit dem aktuellen Lernpfad als Erfolg. */
  function shareDemo() {
    setSheet(false);
    const p = goalPath(sRef.current, now());
    setTimeout(() => setShare(shareDraft(sRef.current, p?.title ? `Lernpfad „${p.title}“ abgeschlossen` : "Erste Challenge geschafft")), 300);
  }

  function shareSuccess(x: Omit<SharedSuccess, "id" | "date">) {
    update((s) => {
      s.shared = [{ ...x, id: uid(), date: now().toISOString() }, ...(s.shared ?? [])];
    });
    setShare(null);
    toast(`Mit ${x.to.split(" ")[0]} geteilt`);
  }

  /** Lernpfad: Challenge mit Kompass im Coach vorbereiten. */
  function prepChallenge(c: Challenge) {
    setTab("coach");
    if (busyRef.current || sRef.current.phase === "onboarding" || sRef.current.phase === "new") return;
    submit(`Hilf mir, die Challenge „${c.title}“ vorzubereiten.`);
  }

  function readSop(id: string) {
    update((s) => {
      const read = s.sopRead ?? SOPS.filter((x) => x.readDefault).map((x) => x.id);
      if (!read.includes(id)) s.sopRead = [...read, id];
    });
    addXP(10, { kind: "Lernen", title: `SOP „${SOPS.find((x) => x.id === id)?.title}“ gelesen` });
    toast("Als gelesen markiert, +10 XP");
  }

  function openReise(view: Reise["view"]) {
    setReise((r) => ({ ...r, view }));
    setTab("ziele");
  }

  function timeJump() {
    const p = sRef.current.presentation;
    setSheet(false);
    if (sRef.current.phase !== "waiting" || !p?.at) {
      toast("Gerade steht kein Termin an.");
      return;
    }
    const target = new Date(p.at).getTime() + 75 * 60e3;
    update((s) => {
      s.timeOffsetMs = target - Date.now();
    });
    openReise("home");
  }

  function isDue(s: AppState) {
    if (s.phase !== "waiting" || !s.presentation?.at || s.presentation.followedUp) return false;
    return Date.now() + s.timeOffsetMs >= new Date(s.presentation.at).getTime() + 30 * 60e3;
  }

  function checkDue() {
    if (voiceRef.current || !isDue(sRef.current)) return;
    if (tabRef.current !== "coach") {
      setUnread(true);
      return;
    }
    setTimeout(() => {
      if (!busyRef.current && isDue(sRef.current) && tabRef.current === "coach") void runFlow(followUp);
    }, 1200);
  }

  function startFollowUp() {
    setTab("coach");
    if (!busyRef.current) void runFlow(followUp);
  }

  function startPractice() {
    setTab("coach");
    const p = sRef.current.presentation;
    if (!p) {
      if (!busyRef.current && sRef.current.phase !== "onboarding") submit(PRESENT_CHIP);
      return;
    }
    if (busyRef.current) return;
    push({ from: "me", kind: "text", text: "Generalprobe starten" });
    void runFlow(async () => {
      await practice(p.topic, false);
    });
  }

  function onRec(r: Rec) {
    if (r.type === "Üben") startPractice();
    else toast("Vorgemerkt");
  }

  // ---------- Sprachgespräch (OpenAI Realtime) ----------
  const textHistory = (n: number) =>
    sRef.current.messages
      .filter((m) => m.kind === "text" && m.text)
      .slice(-n)
      .map((m) => ({ from: m.from, text: m.text as string }));

  async function voicePost<T>(body: Record<string, unknown>): Promise<T | null> {
    try {
      const res = await fetch("/api/realtime", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...body, state: { ...sRef.current, messages: [] } }),
      });
      return res.ok ? ((await res.json()) as T) : null;
    } catch {
      return null;
    }
  }

  async function toggleVoice() {
    if (voiceRef.current) return stopVoice();
    if (scriptRef.current) return toast("Sprachgespräch nur im Live-Modus");
    if (voiceAvail.current === null) {
      voiceAvail.current = await fetch("/api/realtime")
        .then((r) => r.json())
        .then((j) => Boolean(j.available))
        .catch(() => false);
    }
    if (!voiceAvail.current) return toast("Sprachmodus noch nicht eingerichtet (OPENAI_API_KEY fehlt)");
    const ph = sRef.current.phase;
    const onboardingPhase = ph === "new" || ph === "onboarding";
    if (onboardingPhase && obStep > OB_TOTAL + 1) return toast("Einen Moment, dein Lernpfad entsteht gerade");
    if (busyRef.current && !onboardingPhase && !(ph === "ready" && pending.current)) return toast("Schließ erst den aktuellen Schritt ab");
    const mode = onboardingPhase ? "onboarding" : "chat";
    // Laufenden Text-Ablauf beenden: das Sprachgespräch übernimmt ab hier.
    if (busyRef.current) {
      takeover.current = true;
      const abort = pendingAbort.current;
      pending.current = null;
      pendingAbort.current = null;
      abort?.(new VoiceTakeover());
    }
    setChips([]);
    setMulti(null);
    if (onboardingPhase) {
      if (!obRef.current.name) {
        const guess = sRef.current.username.split(/[._\-\s@0-9]/)[0];
        obRef.current = { name: guess.charAt(0).toUpperCase() + guess.slice(1).toLowerCase() || "du", answers: {} };
      }
      obRef.current.answers.name = obRef.current.name;
      update((s) => {
        s.phase = "onboarding";
      });
      setObStep(Math.min(OB_TOTAL, OB_QUESTIONS.filter((q) => obRef.current.answers[q.key]).length + 1));
    }
    const session = new VoiceSession({
      onUserText: (text) => push({ from: "me", kind: "text", text }),
      onBotText: (text) => push({ from: "bot", kind: "text", text }),
      onStatus: (status) => setVoice((v) => (v ? { ...v, status } : v)),
      onTool: voiceTool,
      onEnd: (error) => {
        if (voiceRef.current === session) voiceRef.current = null;
        setVoice(null);
        takeover.current = false;
        if (error) toast(error);
        setIdleChips();
        // Kennenlernen per Text fortsetzen, wo die Sprache aufgehört hat.
        if (sRef.current.phase === "onboarding" && !busyRef.current) {
          void runFlow(onboarding);
        }
      },
    });
    voiceRef.current = session;
    setVoice({ mode, status: "connecting" });
    // Ablauf im Hintergrund wartet ggf. noch auf eine KI-Antwort; neue Text-Abläufe starten erst nach dem Gespräch.
    await session.start(async () => {
      const out = await voicePost<{ token: string; model: string; error?: string }>({
        action: "session",
        mode,
        name: onboardingPhase ? obRef.current.name : sRef.current.profile?.name,
        answers: onboardingPhase ? obRef.current.answers : undefined,
        history: textHistory(12),
      });
      if (!out?.token) throw new Error(out?.error || "Kein Token");
      return out;
    });
  }

  function stopVoice() {
    const v = voiceRef.current;
    voiceRef.current = null;
    v?.stop();
  }

  async function voiceTool(name: string, args: Record<string, unknown>): Promise<string> {
    const ob = obRef.current;
    switch (name) {
      case "antwort_speichern": {
        const key = OB_QUESTIONS.find((q) => q.key === args.thema)?.key;
        if (!key) return "Unbekanntes Thema.";
        ob.answers[key] = String(args.antwort || "").trim();
        const open = OB_QUESTIONS.filter((q) => !ob.answers[q.key]);
        setObStep(Math.min(OB_TOTAL, OB_TOTAL - open.length + 1));
        return open.length ? `Gespeichert. Noch offen: ${open.map((q) => q.key).join(", ")}.` : "Gespeichert. Alle Themen sind beantwortet, ruf jetzt profil_erstellen auf.";
      }
      case "profil_erstellen":
      case "profil_anpassen": {
        const open = OB_QUESTIONS.filter((q) => !ob.answers[q.key]);
        if (open.length) return `Es fehlen noch Antworten zu: ${open.map((q) => q.topic).join("; ")}. Frag danach, bevor du das Profil erstellst.`;
        const correction = name === "profil_anpassen" ? String(args.korrektur || "") : "";
        const card = await ai<ProfileOut>("profile", { answers: ob.answers, correction }, fallback.profile(ob.answers, correction), true);
        ob.card = card;
        setObStep(OB_TOTAL + 1);
        push({ from: "bot", kind: "profile", data: { card } });
        setChips(["Passt", "Anpassen"]);
        return `Die Profil-Karte ist jetzt auf dem Bildschirm. WER: ${card.wer.join(", ")}. WAS: ${card.was.join(", ")}. WIE: ${card.wie.join(", ")}. Lernziel: ${card.goal}. Nenne das Lernziel in einem Satz und frag „Stimmt das so?“`;
      }
      case "profil_bestaetigen": {
        if (!ob.card) return "Es gibt noch keine Profil-Karte. Ruf zuerst profil_erstellen auf.";
        setChips([]);
        const { w, focus, path } = await completeOnboarding(ob.name, ob.answers, ob.card, false);
        push({ from: "bot", kind: "summary", data: { focus } });
        push({ from: "bot", kind: "link", data: { icon: "target", sub: "Dein Lernpfad", title: path.title, to: "pfad" } });
        setVoice((v) => (v ? { ...v, mode: "chat" } : v));
        const next = await voicePost<{ instructions: string; tools: unknown[] }>({ action: "instructions", mode: "chat", history: textHistory(8) });
        if (next) voiceRef.current?.updateSession(next.instructions, next.tools);
        setIdleChips();
        return `Das Kennenlernen ist abgeschlossen, der Lernpfad „${path.title}“ ist erstellt und auf dem Bildschirm verlinkt. Fokus: ${w.summary} Erster Schritt: ${w.firstStep}. Sag das in 2 kurzen Sätzen und frag, ob gerade etwas ansteht, zum Beispiel eine Fallbesprechung oder ein Termin. Ab jetzt bist du im Coaching-Gespräch.`;
      }
      case "ziel_in_lernpfad": {
        const out = await voicePost<{ goal: PathChallenge | null }>({ action: "goal", goal: args });
        if (!out?.goal) return "Das Ziel ließ sich nicht übernehmen. Frag kurz nach, was genau die Person vorhat.";
        addChatGoal(out.goal);
        return `„${out.goal.title}“ steht jetzt im Lernpfad.`;
      }
      case "fachwissen_nachschlagen": {
        const out = await voicePost<{ text: string }>({ action: "saa", query: String(args.thema || "") });
        return out?.text || "Nachschlagen hat nicht geklappt. Verweise auf die SAA und BPR 2025.";
      }
      default:
        return "Unbekanntes Werkzeug.";
    }
  }

  // ---------- input ----------
  function submit(text: string) {
    const t = text.trim();
    if (!t) return;
    setInput("");
    push({ from: "me", kind: "text", text: t });
    setChips([]);
    setMulti(null);
    // Im Sprachgespräch geht Getipptes an Kompass; Abläufe mit eigenen Karten beenden das Gespräch.
    const v = voiceRef.current;
    if (v && !pending.current) {
      const ph = sRef.current.phase;
      const flow = /zeitsprung|(lernreise|ziele) ansehen|generalprobe starten/i.test(t) || ((ph === "ready" || ph === "done") && PRESENT_RE.test(t));
      if (!flow || ph === "onboarding") return v.sendText(t);
      stopVoice();
    }
    const p = pending.current;
    if (p) {
      pending.current = null;
      pendingAbort.current = null;
      p(t);
      return;
    }
    if (!busyRef.current) void runFlow(() => freeChat(t));
  }

  function toggleMulti(o: string) {
    setMulti((m) => (m ? { ...m, selected: m.selected.includes(o) ? m.selected.filter((x) => x !== o) : [...m.selected, o] } : m));
  }

  // ---------- lifecycle ----------
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    try {
      const v = localStorage.getItem("kompass-script") === "1";
      scriptRef.current = v;
      setScriptState(v);
    } catch {}
    const ph = sRef.current.phase;
    // Interaktive Karten aus einer früheren Sitzung lassen sich nicht fortsetzen.
    update((s) => {
      for (const m of s.messages) if (["video", "peerSelect", "options", "analyzing"].includes(m.kind) && m.from === "bot") m.data = { ...(m.data || {}), done: true };
    });
    if (ph === "new" || ph === "onboarding") void runFlow(onboarding);
    else {
      void repairPath();
      setIdleChips();
      if (!isDue(sRef.current)) note(`Willkommen zurück, ${sRef.current.profile?.name || ""}`);
      checkDue();
    }
    const iv = setInterval(() => {
      setTick((t) => t + 1);
      if (!busyRef.current) checkDue();
    }, 30000);
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && e.altKey && (e.key === "D" || e.key === "d" || e.code === "KeyD")) {
        e.preventDefault();
        setSheet((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      voiceRef.current?.stop();
      voiceRef.current = null;
      clearInterval(iv);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === "coach") requestAnimationFrame(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }));
  }, [S.messages.length, typing, chips, multi, tab, reh]);

  useEffect(() => {
    if (tab === "coach" && !busyRef.current) checkDue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  /** Konversation neu starten: Profil zurücksetzen, Username bleibt. */
  async function restart() {
    stopVoice();
    blockSave.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const fresh = initialState(S.username);
    const u = encodeURIComponent(S.username);
    try {
      await fetch(`/api/state?u=${u}`, { method: "DELETE", cache: "no-store" });
      await fetch(`/api/state?u=${u}`, { method: "PUT", cache: "no-store", headers: { "content-type": "application/json" }, body: JSON.stringify(fresh) });
    } catch {}
    // Nicht neu laden: ein Server-Stand von einer anderen Instanz oder ein verspätetes Speichern
    // könnte den alten Verlauf zurückbringen. Die Seite startet direkt mit dem leeren Zustand.
    onRestart(fresh);
  }

  async function resetAll() {
    blockSave.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    await fetch(`/api/state?u=${encodeURIComponent(S.username)}`, { method: "DELETE" }).catch(() => {});
    try {
      localStorage.removeItem("kompass-user");
    } catch {}
    onLogout();
    window.location.reload();
  }

  // Demo-Steuerung: Logo lange drücken oder Rechtsklick, Shift+Alt+D
  const logoProps = {
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      setSheet(true);
    },
    onPointerDown: () => {
      pressTimer.current = setTimeout(() => setSheet(true), 650);
    },
    onPointerUp: () => pressTimer.current && clearTimeout(pressTimer.current),
    onPointerLeave: () => pressTimer.current && clearTimeout(pressTimer.current),
  };

  // ---------- render ----------
  const renderMsg = (m: Msg) => {
    const d = m.data || {};
    switch (m.kind) {
      case "note":
        return <div className="when">{m.text}</div>;
      case "xpline":
        return (
          <div className="row center">
            <span className="xp">{m.text}</span>
          </div>
        );
      case "options":
        return (
          <div className="blk">
            <OptionsCard options={d.options} onPick={!d.done ? (l) => submit(l) : undefined} />
          </div>
        );
      case "slides":
        return (
          <div className="blk">
            <SlidesCard slides={d.slides} />
          </div>
        );
      case "peerSelect":
        return d.done ? null : (
          <div className="blk">
            <PeerAskCard names={TEAM.map((t) => t.name)} onSend={(ok) => resolveCard(m.id, ok)} />
          </div>
        );
      case "link":
        return (
          <div className="blk">
            <LinkCard icon={d.icon} sub={d.sub} title={d.title} onOpen={() => (d.to === "team" ? setTab("team") : openReise(d.to === "pfad" ? "pfad" : "update"))} />
          </div>
        );
      case "profile":
        return (
          <div className="blk">
            <ProfileSummaryCard card={d.card} />
          </div>
        );
      case "summary":
        return (
          <div className="blk">
            <SummaryCard focus={d.focus} />
          </div>
        );
      case "text":
        return (
          <motion.div
            className={`msg ${m.from === "me" ? "me" : "k"}`}
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            style={{ transformOrigin: m.from === "me" ? "100% 100%" : "0% 100%" }}
          >
            <RichText text={m.text || ""} />
          </motion.div>
        );
      default:
        return null; // ältere Kartentypen werden nicht mehr angezeigt
    }
  };

  const onboardingNow = S.phase === "new" || S.phase === "onboarding";
  const due = isDue(S);
  const nowD = new Date(Date.now() + S.timeOffsetMs);
  const showNav = !onboardingNow && tab !== "coach";

  return (
    <MotionConfig reducedMotion="user">
      <div className="stage">
        <div className="app">
          <AnimatePresence mode="popLayout" initial={false}>
            {tab === "coach" && reh && (
              <Screen k={`reh-${reh.phase === "feedback" ? "fb" : "rec"}`}>
                <Rehearsal
                  r={reh}
                  onRecorded={(v) => rehRecorded.current?.(v)}
                  onRetry={() => {}}
                  onBack={() => {
                    if (reh.phase === "feedback") rehBack.current?.();
                    else if (reh.phase === "record") rehRecorded.current?.(null);
                  }}
                />
              </Screen>
            )}
            {tab === "coach" && !reh && (
              <Screen k="coach">
                <section className="coach">
                  {onboardingNow ? (
                    <>
                      <div className="hd">
                        <span className="rb logo" {...logoProps}>
                          <Icon name="logo" />
                        </span>
                        <div className="t">
                          Kennenlernen
                          <small>{obStep > OB_TOTAL + 1 ? "Lernpfad wird erstellt" : obStep > OB_TOTAL ? "Dein Profil" : `Frage ${Math.max(1, obStep || 1)} von ${OB_TOTAL}`}</small>
                        </div>
                      </div>
                      <Progress className="bar thin mx-4 mt-2.5 w-auto" value={(Math.min(OB_TOTAL, Math.max(1, obStep || 1)) / OB_TOTAL) * 100} />
                    </>
                  ) : (
                    <div className="hd">
                      <motion.button whileTap={{ scale: 0.9 }} className="rb" aria-label="Zurück zu deinen Zielen" onClick={() => openReise("home")}>
                        <Icon name="back" />
                      </motion.button>
                      <span className="av logo" style={{ background: "var(--acc)" }} {...logoProps} title="Lange drücken: Demo-Steuerung">
                        <Icon name="logo" />
                      </span>
                      <div className="t">
                        Kompass
                        <small>Dein Coach</small>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        className="rb"
                        aria-label={confirmRestart ? "Wirklich neu starten" : "Konversation neu starten"}
                        style={confirmRestart ? { width: "auto", padding: "0 12px", gap: 6, display: "flex", alignItems: "center", whiteSpace: "nowrap", background: "var(--acc)", color: "#fff", fontSize: 11, fontWeight: 700 } : undefined}
                        onClick={() => {
                          if (!confirmRestart) {
                            setConfirmRestart(true);
                            setTimeout(() => setConfirmRestart(false), 3500);
                          } else void restart();
                        }}
                      >
                        <Icon name="restart" size={16} />
                        {confirmRestart && "Neu starten?"}
                      </motion.button>
                    </div>
                  )}
                  <div className="log" ref={logRef}>
                    {S.messages.map((m) => {
                      const el = renderMsg(m);
                      return el ? <MsgWrap key={m.id}>{el}</MsgWrap> : null;
                    })}
                    <AnimatePresence>
                      {typing && (
                        <motion.div
                          key="typing"
                          className="msg k typing"
                          aria-label="Kompass schreibt"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.12 } }}
                          style={{ transformOrigin: "0% 100%" }}
                        >
                          {[0, 1, 2].map((i) => (
                            <motion.span key={i} className="dot" animate={{ y: [0, -3, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {multi && (
                      <motion.div className="chips" variants={CHIPS} initial="hidden" animate="show">
                        {multi.options.map((o) => {
                          const on = multi.selected.includes(o);
                          return (
                            <motion.div key={o} variants={CHIP} whileTap={{ scale: 0.94 }}>
                              <Button size="chip" variant={on ? "default" : "outline"} className={on ? "shadow-none" : ""} onClick={() => toggleMulti(o)} aria-pressed={on}>
                                {on && <Icon name="check" size={13} />}
                                {o}
                              </Button>
                            </motion.div>
                          );
                        })}
                        <motion.div variants={CHIP} whileTap={{ scale: 0.94 }}>
                          <Button size="chip" variant="accent" disabled={!multi.selected.length} onClick={() => submit(multi.selected.join(", "))}>
                            Weiter
                          </Button>
                        </motion.div>
                      </motion.div>
                    )}
                    {!multi && chips.length > 0 && (
                      <motion.div key={chips.join("|")} className="chips" variants={CHIPS} initial="hidden" animate="show">
                        {chips.map((c) => (
                          <motion.div key={c} variants={CHIP} whileTap={{ scale: 0.94 }}>
                            <Button size="chip" variant="outline" onClick={() => submit(c)}>
                              {c}
                            </Button>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </div>
                  <form
                    className={`inp${voice ? ` voice ${voice.status}` : ""}`}
                    onSubmit={(e) => {
                      e.preventDefault();
                      // Leeres Feld: Sprachgespräch starten bzw. beenden. Mit Text: wie bisher senden.
                      if (input.trim()) submit(input);
                      else void toggleVoice();
                    }}
                  >
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={voice ? VOICE_LABEL[voice.status] : placeholder}
                      aria-label="Nachricht"
                      className="rounded-full bg-transparent px-3 shadow-none focus-visible:ring-0"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      className="send size-[38px] shadow-none"
                      aria-label={input.trim() ? "Senden" : voice ? "Sprachgespräch beenden" : "Sprachgespräch starten"}
                      title={input.trim() ? "Senden" : voice ? "Sprachgespräch beenden" : "Sprechen statt tippen"}
                    >
                      <Icon name={input.trim() ? "send" : voice ? "stop" : "mic"} />
                    </Button>
                  </form>
                </section>
              </Screen>
            )}
            {tab === "ziele" && (
              <Screen k={`ziele-${reise.view}-${reise.area}`} dir={reise.view === "home" ? -1 : 1}>
                {reise.view === "area" ? (
                  <AreaView
                    state={S}
                    areaId={reise.area}
                    skillId={reise.skill}
                    onSkill={(id) => setReise((r) => ({ ...r, skill: id }))}
                    onBack={() => setReise((r) => ({ ...r, view: r.from || "home" }))}
                    onRec={onRec}
                  />
                ) : reise.view === "update" ? (
                  <SkillUpdateView state={S} onBack={() => setReise((r) => ({ ...r, view: "home" }))} />
                ) : reise.view === "pfad" ? (
                  <PathView state={S} now={nowD} onBack={() => setReise((r) => ({ ...r, view: "home" }))} onPrepare={prepChallenge} onDone={doChallenge} />
                ) : reise.view === "profil" ? (
                  <ProfileView
                    state={S}
                    onBack={() => setReise((r) => ({ ...r, view: "home" }))}
                    onOpenAll={() => setReise((r) => ({ ...r, view: "kompetenzen", from: "profil" }))}
                    onSopRead={readSop}
                  />
                ) : reise.view === "kompetenzen" ? (
                  <KompetenzenView
                    state={S}
                    onBack={() => setReise((r) => ({ ...r, view: r.from === "profil" ? "profil" : "home", from: undefined }))}
                    onOpenArea={(id) => {
                      const a = S.areas.find((x) => x.id === id);
                      const sk = a?.skills.find((k) => S.focus.includes(k.id)) ?? a?.skills[0];
                      setReise({ view: "area", area: id, skill: sk?.id || "", from: "kompetenzen" });
                    }}
                  />
                ) : (
                  <GoalsView
                    state={S}
                    now={nowD}
                    followUpDue={due}
                    onFollowUp={startFollowUp}
                    onPractice={startPractice}
                    onMandatory={doMandatory}
                    onOpenPath={() => setReise((r) => ({ ...r, view: "pfad" }))}
                    onOpenProfile={() => setReise((r) => ({ ...r, view: "profil" }))}
                  />
                )}
              </Screen>
            )}
            {tab === "team" && (
              <Screen k="team">
                <TeamView state={S} />
              </Screen>
            )}
          </AnimatePresence>

          {showNav && (
            <nav className="nav">
              {(
                [
                  ["coach", "chat", "Coach"],
                  ["ziele", "target", "Ziele"],
                  ["team", "team", "Team"],
                ] as [Tab, string, string][]
              ).map(([id, icon, label]) => (
                <button
                  key={id}
                  className={tab === id ? "on" : ""}
                  onClick={() => {
                    if (id === "ziele" && tab === "ziele") setReise((r) => ({ ...r, view: "home" }));
                    setTab(id);
                  }}
                  aria-current={tab === id ? "page" : undefined}
                >
                  {tab === id && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                  <Icon name={icon} size={16} />
                  {label}
                  <AnimatePresence>
                    {id === "coach" && unread && <motion.i className="udot" initial={{ scale: 0 }} animate={{ scale: [0, 1.4, 1] }} exit={{ scale: 0 }} />}
                  </AnimatePresence>
                </button>
              ))}
            </nav>
          )}

          <div className="toasts" aria-live="polite">
            <AnimatePresence initial={false}>
              {toasts.slice(0, 1).map((t) => (
                <motion.div
                  key={t.id}
                  className="toast"
                  initial={{ opacity: 0, y: 14, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: [0.9, 1.06, 1] }}
                  exit={{ opacity: 0, y: 8, transition: { duration: 0.18 } }}
                  transition={{ type: "spring", stiffness: 420, damping: 26 }}
                >
                  {t.text}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <aside className="side">
          <b style={{ fontSize: 17 }}>Kompass</b>
          <p className="mut">Dein persönlicher Lern-Coach bei {COMPANY.short}. Gemacht fürs Handy, hier in Handybreite.</p>
          <p className="mut xs">Demo-Steuerung: Logo im Coach lange drücken oder rechts klicken, oder Shift + Alt + D.</p>
          <Button variant="secondary" onClick={() => setSheet(true)}>
            Demo-Steuerung öffnen
          </Button>
          <Button variant="secondary" asChild>
            <a href="/dashboard">Unternehmenssicht öffnen</a>
          </Button>
          <span className="mut xs">
            Angemeldet als <b>{S.username}</b> · {live && !script ? "KI live" : "Skript-Modus"}
          </span>
        </aside>

        <DemoSheet
          open={sheet}
          onClose={() => setSheet(false)}
          canJump={S.phase === "waiting" && !busy && !!S.presentation?.at}
          onJump={() => timeJump()}
          live={live}
          script={script}
          setScript={setScript}
          onReset={resetAll}
          onRestart={restart}
          onShare={shareDemo}
        />
        <ShareSheet draft={share} onClose={() => setShare(null)} onShare={shareSuccess} />
      </div>
    </MotionConfig>
  );
}

function topicShort(t: string) {
  return t.split(/,| vor | der | für /)[0].trim();
}

function MsgWrap({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function Screen({ k, dir = 1, children }: { k: string; dir?: number; children: React.ReactNode }) {
  return (
    <motion.div
      key={k}
      className="screen"
      initial={{ opacity: 0, x: 20 * dir }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 * dir, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
    >
      {children}
    </motion.div>
  );
}
