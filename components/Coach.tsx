"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { Input } from "@/components/shadcn/input";
import { Progress } from "@/components/shadcn/progress";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/shadcn/card";
import VideoRecorder, { type VideoResult } from "./VideoRecorder";
import { FeedbackCard, LoopCard, OptionsCard, PeerAskCard, PeerCard, RichText, SlidesCard, SummaryCard, UpdateCard } from "./Cards";
import { AreaView, DemoSheet, ErfolgeView, Home, TeamView } from "./views";
import { Icon } from "./ui";
import { fallback, type PrepOut, type SynthOut, type VideoOut } from "@/lib/fallbacks";
import { BADGES, COMPANY, findSkill, levelOf, skillProgress } from "@/lib/knowledge";
import { fmtClock, parseWhen, sleep, uid } from "@/lib/clientUtil";
import type { AppState, Experience, LevelChange, Msg, PeerFeedback, Profile, Source } from "@/lib/types";

type Toast = { id: string; text: string; kind: "xp" | "level" | "badge" | "info"; n?: number };
type Tab = "coach" | "reise" | "team" | "erfolge";

const PRESENT_RE = /präsentier|präsentation|vortrag|pitch|presentation/i;
const OB_TOTAL = 7;
const WD = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const CHIPS = { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } };
const CHIP = { hidden: { opacity: 0, y: 8, scale: 0.95 }, show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 420, damping: 28 } } };
const TOPIC_CHIP = "Q4-Roadmap der Wärmepumpen-App vor der Bereichsleitung, 15 Minuten";

export default function Coach({ initial, live, onLogout }: { initial: AppState; live: boolean; onLogout: () => void }) {
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
  const [reise, setReise] = useState<{ view: "home" | "area"; area: string; skill: string }>({ view: "home", area: "komm", skill: "praes" });
  const [obStep, setObStep] = useState(0);
  const [unread, setUnread] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [script, setScriptState] = useState(false);
  const scriptRef = useRef(false);
  const [, setTick] = useState(0);
  const [busy, setBusy] = useState(false);

  const pending = useRef<((v: string) => void) | null>(null);
  const cardWaiters = useRef<Record<string, (v: unknown) => void>>({});
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

  const toast = (text: string, kind: Toast["kind"] = "info", n0?: number) => {
    const id = uid();
    setToasts((q) => {
      // Ein Toast gleichzeitig; XP-Punkte, die noch warten, werden zusammengezählt.
      const last = q[q.length - 1];
      if (kind === "xp" && last && last.kind === "xp" && q.length > 1) {
        const n = (last.n || 0) + (n0 || 0);
        return [...q.slice(0, -1), { ...last, n, text: `+${n} XP` }];
      }
      return [...q, { id, text, kind, n: n0 }].slice(-4);
    });
  };

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
    push({ from: "bot", kind: "text", text });
  };

  const note = (text: string) => push({ from: "bot", kind: "note", text });

  const ask = (c: string[], ph?: string) => {
    setChips(c);
    setPlaceholder(ph || "Oder schreib frei …");
    return new Promise<string>((res) => {
      pending.current = res;
    });
  };

  const askMulti = (options: string[], preset: string[] = []) => {
    setChips([]);
    setMulti({ options, selected: preset });
    setPlaceholder("Oder schreib frei …");
    return new Promise<string>((res) => {
      pending.current = res;
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

  const addXP = (n: number, reason: string, journal?: Omit<Experience, "id" | "date" | "xp">) => {
    const before = levelOf(sRef.current.xp);
    update((s) => {
      s.xp += n;
      if (journal) s.journal.unshift({ ...journal, id: uid(), date: now().toISOString(), xp: n });
    });
    toast(`+${n} XP · ${reason}`, "xp", n);
    const after = levelOf(sRef.current.xp);
    if (after > before) setTimeout(() => toast(`Level ${after} erreicht!`, "level"), 900);
  };

  const award = (id: string) => {
    if (sRef.current.badges.includes(id)) return;
    update((s) => {
      s.badges.push(id);
    });
    setTimeout(() => toast(`Abzeichen: ${BADGES[id]?.name}`, "badge"), 1400);
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
        const lvl = Math.max(sub.level, Math.min(5, sub.level + 1, Math.round(c.level)));
        if (lvl > sub.level) {
          sub.level = lvl;
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
    } finally {
      busyRef.current = false;
      setBusy(false);
      setIdleChips();
      checkDue();
    }
  }

  function setIdleChips() {
    const s = sRef.current;
    const ph = s.phase;
    if (ph === "ready") setChips(["Hey, ich muss morgen präsentieren", "Lernreise ansehen"]);
    else if (ph === "waiting") setChips(s.presentation?.practiced ? ["Lernreise ansehen"] : ["Generalprobe aufnehmen", "Lernreise ansehen"]);
    else if (ph === "done") setChips(["Was soll ich als Nächstes üben?", "Erfolge ansehen"]);
    else setChips([]);
    setPlaceholder("Nachricht an Kompass");
  }

  async function onboarding() {
    update((s) => {
      s.phase = "onboarding";
      s.messages = [];
    });
    setObStep(1);
    const guess = sRef.current.username.split(/[._-]/)[0];
    const nameChip = guess.charAt(0).toUpperCase() + guess.slice(1);
    await say(
      "Hallo! Ich bin **Kompass**, dein Lern-Coach für den Arbeitsalltag.",
      400,
    );
    await say("Zwei Minuten zum Kennenlernen. Wie heißt du?");
    const name = (await ask([nameChip], "Dein Vorname")).split(/[ ,]/)[0] || nameChip;

    setObStep(2);
    await say(`Hallo ${name}! Was ist deine Rolle?`);
    const role = await ask(["Produktmanagerin, Wärmepumpen-App", "Entwickler im Steuerungsteam", "Teamleiterin im Kundenservice"], "Rolle und Bereich");

    setObStep(3);
    await say("Seit wann bist du dabei, und davor?");
    const tenureRaw = await ask(["8 Monate, davor 3 Jahre Agentur", "4 Jahre", "Frisch nach dem Studium"]);
    const [tenure, ...rest] = tenureRaw.split(/,\s*davor\s*/i);
    const experience = rest.length ? `davor ${rest.join(", ")}` : tenureRaw;

    setObStep(4);
    await say("Was fordert dich gerade am meisten heraus?");
    const challenge = await ask(["Vor großen Runden werde ich nervös", "Mir fehlt die Zeit zum Lernen", "Ich will fachlich tiefer einsteigen"]);

    setObStep(5);
    await say("Danke, das lässt sich gut trainieren. Wie lernst du am liebsten?");
    const preference = await askMulti(["Videos", "Praxis", "Lesen", "Austausch", "Workshops"], []);

    setObStep(6);
    await say("Welche Themen interessieren dich?");
    const interests = await ask(["Datenanalyse, Nachhaltigkeit, UX", "Technik und Software", "Führung und Teamarbeit"]);

    setObStep(7);
    await say("Letzte Frage: Wo willst du in zwei Jahren stehen?");
    const goal = await ask(["Ein eigenes Produktteam leiten", "Fachexpertin bzw. Fachexperte werden", "Weiß ich noch nicht genau"]);

    const profile: Profile = { name, role, tenure: tenure.trim(), experience, interests, challenge, preference, goal };
    update((s) => {
      s.profile = profile;
    });
    await say("Danke! Ich baue deinen Lernpfad …", 300);
    const w = await ai("welcome", {}, fallback.welcome(profile));
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
    push({ from: "bot", kind: "summary", data: { name, focus } });
    await say(w.summary, 300);
    addXP(50, "Onboarding abgeschlossen", { kind: "Start", title: "Onboarding mit Kompass abgeschlossen" });
    award("start");
    await say("Sag mir einfach, wenn etwas ansteht.");
  }

  /** Slides (optional), Generalprobe per Video, Analyse, Fortschritt. */
  async function practice(topic: string, withSlides: boolean) {
    if (withSlides) {
      const deck = await ai("slides", { topic }, fallback.slides(topic));
      await say(`Hier ist ein Entwurf mit ${deck.slides.length} Folien und Sprechernotizen.`, 200);
      push({ from: "bot", kind: "slides", data: { slides: deck.slides } });
      update((s) => {
        if (s.presentation) s.presentation.slides = deck.slides;
      });
      addXP(20, "Folienentwurf erstellt");
      await ask(["Übernehmen", "Passt, weiter zur Generalprobe"]);
    }
    await say("Jetzt die Generalprobe. Zwei Minuten reichen.");
    const vidId = push({ from: "bot", kind: "video" });
    setChips([]);
    const vid = await waitCard<VideoResult>(vidId);
    if (vid.url) push({ from: "me", kind: "video", data: { url: vid.url, secs: Math.round(vid.duration) } });
    else if (vid.demo) push({ from: "me", kind: "text", text: "Ich habe gerade keine Kamera, zeig mir eine Beispiel-Analyse." });

    const anId = push({ from: "bot", kind: "analyzing", data: { frames: vid.frames.length, transcript: !!vid.transcript, step: 0 } });
    const steps = (async () => {
      for (let i = 1; i <= 3; i++) {
        await sleep(900);
        patchMsg(anId, { step: i });
      }
    })();
    let analysis: VideoOut;
    if (vid.demo || (!vid.frames.length && !vid.transcript)) {
      await sleep(1200);
      analysis = fallback.video();
    } else {
      analysis = await ai("video", { topic, frames: vid.frames, transcript: vid.transcript, duration: vid.duration }, fallback.video(), true);
    }
    await steps;
    patchMsg(anId, { step: 4, done: true });

    const before = praesPct();
    applyLevels(analysis.levelChanges, ["Übung"]);
    const after = praesPct();
    push({ from: "bot", kind: "feedback", data: { ...analysis, frames: vid.frames.length, before, after } });
    update((s) => {
      if (s.presentation) s.presentation.practiced = true;
      if (analysis.improve[0]) s.memory.unshift(`Generalprobe: ${analysis.improve[0]}`);
    });
    addXP(80, "Generalprobe mit Videoanalyse", { kind: "Üben", title: "Generalprobe per Video", detail: analysis.tip });
    award("generalprobe");
  }

  async function askTime() {
    await say("Wann präsentierst du? Ich melde mich danach.");
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

  async function presentFlow() {
    const pct = praesPct();
    await say(
      `Gut, dass du dich meldest! Du stehst bei **${pct} %**. Worum geht es?`,
    );
    const topic = await ask([TOPIC_CHIP], "Thema und Publikum");
    update((s) => {
      s.presentation = { topic };
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
    if (/^\s*1/.test(choice) || (/video|grundlage/i.test(choice) && !/eigen|aufnehm|selbst|generalprobe/i.test(choice))) idx = 0;
    else if (/^\s*2/.test(choice) || /les|leitfaden|vorlage/i.test(choice)) idx = 1;

    if (idx < 2) {
      const opt = prep.options[idx];
      update((s) => {
        const sk = findSkill(s.areas, "praes");
        sk?.recs.unshift({ id: uid(), type: idx === 0 ? "Intern" : "Ressource", title: opt.title, meta: opt.detail, fresh: true });
      });
      addXP(15, "Lerninhalt ausgewählt", { kind: "Lernen", title: opt.title });
      await say(`„${opt.title}“ liegt in deiner Lernreise. Noch eine kurze Generalprobe?`);
      const more = await ask(["Ja, mit Slides", "Ja, ohne Slides", "Nein, das reicht"]);
      if (!/nein|reicht/i.test(more)) await practice(topic, /mit slides/i.test(more));
      return askTime();
    }
    await say("Gute Wahl. Hast du schon Folien?");
    const sl = await ask(["Slides vorbereiten", "Ich habe schon Folien"]);
    await practice(topic, !/habe schon|schon folien/i.test(sl));
    await askTime();
  }

  async function followUp() {
    setUnread(false);
    const s0 = sRef.current;
    const name = s0.profile?.name || "";
    const p = s0.presentation;
    const topic = p?.topic || "deine Präsentation";
    const short = topic.length > 60 ? topic.slice(0, 57) + "…" : topic;
    if (p?.at) {
      const d = new Date(p.at);
      note(`${WD[d.getDay()]}, ${fmtClock(new Date(d.getTime() + 75 * 60e3))} · nach deinem Termin`);
    }
    await say(`Hey ${name}! **Wie lief deine Präsentation?**`, 300);
    const how = await ask(["Super", "Ganz gut", "Holprig"]);
    const r = await ai("react", { answer: how }, fallback.react(how));
    await say(r.text, 100);
    const good = await ask(["Der Einstieg mit der Kundenstory saß"], "Was hat gut geklappt?");
    await say("Und was machst du nächstes Mal anders?");
    const bad = await ask(["Bei der Rückfrage zum Budget war ich hektisch"], "Was würdest du anders machen?");
    const ref = await ai("reflect", { how, good, bad }, fallback.reflect());
    await say(ref.text, 100);
    addXP(60, "Präsentation reflektiert", { kind: "Anwenden", title: `Präsentation gehalten: ${short}`, detail: `Gut: ${good} · Anders: ${bad}` });

    await say("Soll ich die drei Kollegen um Feedback bitten?");
    setChips([]);
    const selId = push({ from: "bot", kind: "peerSelect" });
    const names = await waitCard<string[] | null>(selId);
    let feedback: PeerFeedback[] = [];
    if (names && names.length) {
      push({ from: "me", kind: "text", text: `Ja, frag ${names.map((n) => n.split(" ")[0]).join(", ")}.` });
      addXP(40, "Feedback angefragt", { kind: "Feedback", title: `Feedback angefragt bei ${names.length} Kollegen` });
      await say("Anfragen sind raus …", 300);
      const out = await ai("peers", { names, topic, how, good, bad }, fallback.peers(names));
      feedback = out.feedback;
      for (const f of feedback) {
        await sleep(1000);
        push({ from: "bot", kind: "peer", data: f });
        update((s) => {
          s.feedbackReceived = [...s.feedbackReceived.filter((x) => x.name !== f.name), f];
          s.teamChallenge += 1;
        });
        addXP(30, `Feedback von ${f.name.split(" ")[0]}`);
      }
      award("feedback");
    } else {
      push({ from: "me", kind: "text", text: "Später." });
      await say("Alles klar.", 300);
    }

    const syn = await ai<SynthOut>("synth", { topic, how, good, bad, feedback }, fallback.synth());
    const before = praesPct();
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
    push({ from: "bot", kind: "update", data: { before, after, learned: syn.memory[0], recs: syn.recommendations } });
    push({ from: "bot", kind: "loop" });
    addXP(50, "Learning Loop geschlossen", { kind: "Reflexion", title: "Learning Loop geschlossen, Lernpfad erweitert" });
    award("loop");
    await say("Loop geschlossen. Ich merke mir das für nächstes Mal.");
  }

  async function freeChat(text: string) {
    const ph = sRef.current.phase;
    if (/zeitsprung/i.test(text)) return timeJump();
    if (/lernreise ansehen/i.test(text)) {
      setReise((r) => ({ ...r, view: "home" }));
      setTab("reise");
      return;
    }
    if (/erfolge ansehen/i.test(text)) {
      setTab("erfolge");
      return;
    }
    if (/generalprobe aufnehmen/i.test(text) && sRef.current.presentation) {
      return practice(sRef.current.presentation.topic, false);
    }
    if ((ph === "ready" || ph === "done") && PRESENT_RE.test(text)) return presentFlow();
    const history = sRef.current.messages
      .filter((m) => m.kind === "text" && m.text)
      .slice(-8)
      .map((m) => ({ from: m.from, text: m.text }));
    const out = await ai("chat", { text, history }, fallback.chat());
    await say(out.text, 100);
  }

  function timeJump() {
    const p = sRef.current.presentation;
    setSheet(false);
    if (sRef.current.phase !== "waiting" || !p?.at) {
      toast("Gerade steht kein Termin an.", "info");
      return Promise.resolve();
    }
    const target = new Date(p.at).getTime() + 75 * 60e3;
    update((s) => {
      s.timeOffsetMs = target - Date.now();
    });
    setReise((r) => ({ ...r, view: "home" }));
    setTab("reise");
    toast(`Zeitsprung: ${fmtClock(new Date(target))}, nach dem Termin`, "info");
    return Promise.resolve();
  }

  function isDue(s: AppState) {
    if (s.phase !== "waiting" || !s.presentation?.at || s.presentation.followedUp) return false;
    return Date.now() + s.timeOffsetMs >= new Date(s.presentation.at).getTime() + 30 * 60e3;
  }

  function checkDue() {
    if (!isDue(sRef.current)) return;
    if (tabRef.current !== "coach") {
      setUnread(true);
      return;
    }
    setTimeout(() => {
      if (!busyRef.current && isDue(sRef.current) && tabRef.current === "coach") void runFlow(followUp);
    }, 1500);
  }

  function startFollowUp() {
    setTab("coach");
    if (!busyRef.current) void runFlow(followUp);
  }

  function startPractice() {
    setTab("coach");
    const p = sRef.current.presentation;
    if (!p || busyRef.current) return;
    push({ from: "me", kind: "text", text: "Generalprobe aufnehmen" });
    void runFlow(() => practice(p.topic, false));
  }

  // ---------- input ----------
  function submit(text: string) {
    const t = text.trim();
    if (!t) return;
    setInput("");
    push({ from: "me", kind: "text", text: t });
    setChips([]);
    setMulti(null);
    const p = pending.current;
    if (p) {
      pending.current = null;
      p(t);
      return;
    }
    if (!busyRef.current) void runFlow(() => freeChat(t));
  }

  function toggleMulti(o: string) {
    setMulti((m) => (m ? { ...m, selected: m.selected.includes(o) ? m.selected.filter((x) => x !== o) : [...m.selected, o] } : m));
  }

  // Toast-Warteschlange: der vorderste verschwindet nach kurzer Zeit.
  const headToast = toasts[0]?.id;
  useEffect(() => {
    if (!headToast) return;
    const t = setTimeout(() => setToasts((q) => q.slice(1)), 1900);
    return () => clearTimeout(t);
  }, [headToast]);

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
      for (const m of s.messages)
        if (["video", "peerSelect", "options", "analyzing"].includes(m.kind) && m.from === "bot") m.data = { ...(m.data || {}), done: true, step: 4 };
    });
    if (ph === "new" || ph === "onboarding") void runFlow(onboarding);
    else {
      setIdleChips();
      if (!isDue(sRef.current)) note(`Willkommen zurück, ${sRef.current.profile?.name || ""}!`);
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
      clearInterval(iv);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab === "coach") requestAnimationFrame(() => logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" }));
  }, [S.messages.length, typing, chips, multi, tab]);

  useEffect(() => {
    if (tab === "coach" && !busyRef.current) checkDue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function resetAll() {
    await fetch(`/api/state?u=${encodeURIComponent(S.username)}`, { method: "DELETE" }).catch(() => {});
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
        return <span className="pill-note">{m.text}</span>;
      case "options":
        return <OptionsCard options={d.options} onPick={!d.done ? (l) => submit(l) : undefined} />;
      case "slides":
        return <SlidesCard slides={d.slides} />;
      case "feedback":
        return <FeedbackCard good={d.good} improve={d.improve} tip={d.tip} frames={d.frames} before={d.before} after={d.after} />;
      case "peerSelect":
        return <PeerAskCard done={d.done} onSend={(names) => resolveCard(m.id, names)} />;
      case "peer":
        return <PeerCard f={d} />;
      case "update":
        return <UpdateCard before={d.before} after={d.after} learned={d.learned} recs={d.recs || []} />;
      case "loop":
        return <LoopCard />;
      case "summary":
        return <SummaryCard name={d.name} focus={d.focus} />;
      case "analyzing":
        return <AnalyzingCard step={d.step || 0} frames={d.frames} transcript={d.transcript} />;
      case "video":
        if (m.from === "me")
          return d.url ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video className="myvideo" src={d.url} controls playsInline onError={(e) => ((e.target as HTMLVideoElement).style.display = "none")} />
          ) : (
            <span>Video aufgenommen</span>
          );
        return <VideoRecorder disabled={d.done} onDone={(r) => resolveCard(m.id, r)} />;
      default:
        return <RichText text={m.text || ""} />;
    }
  };

  const blockKinds = ["options", "slides", "feedback", "peerSelect", "peer", "update", "loop", "summary", "video", "analyzing"];
  const onboardingNow = S.phase === "new" || S.phase === "onboarding";
  const due = isDue(S);
  const nowD = new Date(Date.now() + S.timeOffsetMs);

  return (
    <MotionConfig reducedMotion="user">
    <div className="stage">
      <div className="app">
        <AnimatePresence mode="popLayout" initial={false}>
        {tab === "coach" && (
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
                    <small>
                      Frage {Math.max(1, obStep || 1)} von {OB_TOTAL}
                    </small>
                  </div>
                </div>
                <Progress className="bar thin" value={(Math.max(0, (obStep || 1) - 1) / OB_TOTAL) * 100} />
              </>
            ) : (
              <div className="hd">
                <span className="av logo" style={{ background: "var(--acc)" }} {...logoProps} title="Lange drücken: Demo-Steuerung">
                  <Icon name="logo" />
                </span>
                <div className="t">
                  Kompass
                  <small>Dein Coach · kennt deine Lernreise</small>
                </div>
                {(script || !live) && <Badge variant="accent">Skript</Badge>}
              </div>
            )}
            <div className="log" ref={logRef}>
              {S.messages.map((m) => (
                <motion.div
                  key={m.id}
                  layout="position"
                  initial={{ opacity: 0, y: 12, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  style={{ transformOrigin: m.from === "me" ? "100% 100%" : "0% 100%" }}
                  className={`msg ${m.from} ${m.kind === "note" ? "isnote" : blockKinds.includes(m.kind) && !(m.from === "me" && m.kind === "text") ? "block" : "bubble"}`}
                >
                  {renderMsg(m)}
                </motion.div>
              ))}
              <AnimatePresence>
                {typing && (
                  <motion.div
                    key="typing"
                    className="msg bot bubble typing"
                    aria-label="Kompass schreibt"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.12 } }}
                    style={{ transformOrigin: "0% 100%" }}
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="dot"
                        animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                      />
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
                      <Button size="chip" variant={on ? "default" : "outline"} onClick={() => toggleMulti(o)} aria-pressed={on}>
                        {on && <Icon name="check" size={13} />}
                        {o}
                      </Button>
                      </motion.div>
                    );
                  })}
                  <Button size="chip" variant="accent" disabled={!multi.selected.length} onClick={() => submit(multi.selected.join(", "))}>
                    Weiter <Icon name="send" size={13} />
                  </Button>
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
              className="inp"
              onSubmit={(e) => {
                e.preventDefault();
                submit(input);
              }}
            >
              <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={placeholder} aria-label="Nachricht" className="h-full rounded-full bg-transparent px-3 font-medium shadow-none focus-visible:ring-0" />
              <Button type="submit" size="icon-lg" aria-label="Senden" disabled={!input.trim()}>
                <Icon name="send" />
              </Button>
            </form>
          </section>
          </Screen>
        )}

        {tab === "reise" && (
          <Screen k={`reise-${reise.view}-${reise.area}`} dir={reise.view === "area" ? 1 : -1}>
          {reise.view === "area" ? (
            <AreaView
              state={S}
              areaId={reise.area}
              skillId={reise.skill}
              onSkill={(id) => setReise((r) => ({ ...r, skill: id }))}
              onBack={() => setReise((r) => ({ ...r, view: "home" }))}
            />
          ) : (
            <Home
              state={S}
              now={nowD}
              followUpDue={due}
              onFollowUp={startFollowUp}
              onPractice={startPractice}
              onOpenArea={(id) => {
                const a = S.areas.find((x) => x.id === id);
                setReise({ view: "area", area: id, skill: id === "komm" ? "praes" : a?.skills[0]?.id || "" });
              }}
            />
          )}
          </Screen>
        )}
        {tab === "team" && (
          <Screen k="team">
            <TeamView state={S} />
          </Screen>
        )}
        {tab === "erfolge" && (
          <Screen k="erfolge">
            <ErfolgeView state={S} now={nowD} />
          </Screen>
        )}
        </AnimatePresence>

        {!onboardingNow && (
          <nav className="nav">
            {(
              [
                ["coach", "chat", "Coach"],
                ["reise", "orb", "Reise"],
                ["team", "team", "Team"],
                ["erfolge", "star", "Erfolge"],
              ] as [Tab, string, string][]
            ).map(([id, icon, label]) => (
              <button
                key={id}
                className={tab === id ? "on" : ""}
                onClick={() => {
                  if (id === "reise" && tab === "reise") setReise((r) => ({ ...r, view: "home" }));
                  setTab(id);
                }}
                aria-current={tab === id ? "page" : undefined}
              >
                {tab === id && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                <Icon name={icon} />
                {label}
                <AnimatePresence>
                  {id === "coach" && unread && tab !== "coach" && (
                    <motion.i className="udot" initial={{ scale: 0 }} animate={{ scale: [0, 1.4, 1] }} exit={{ scale: 0 }} />
                  )}
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
                layout
                className={`toast ${t.kind}`}
                initial={{ opacity: 0, y: -16, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: t.kind === "badge" || t.kind === "level" ? [0.9, 1.08, 1] : 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95, transition: { duration: 0.18 } }}
                transition={{ type: "spring", stiffness: 420, damping: 26 }}
              >
                {t.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <DemoSheet
          open={sheet}
          onClose={() => setSheet(false)}
          canJump={S.phase === "waiting" && !busy && !!S.presentation?.at}
          onJump={() => void timeJump()}
          live={live}
          script={script}
          setScript={setScript}
          onReset={resetAll}
          onLogout={onLogout}
        />
      </div>

      <aside className="side">
        <b className="h-md">Kompass</b>
        <p className="mut">Dein persönlicher Lern-Coach bei {COMPANY.short}. Die App ist fürs Handy gemacht, hier siehst du sie in Handybreite.</p>
        <p className="mut xs">Demo-Steuerung: Logo im Coach lange drücken oder rechts klicken, oder Shift + Alt + D.</p>
        <Button variant="secondary" onClick={() => setSheet(true)}>
          Demo-Steuerung öffnen
        </Button>
        <span className="mut xs">
          Angemeldet als <b>{S.username}</b> · {live && !script ? "KI live" : "Skript-Modus"}
        </span>
      </aside>
    </div>
    </MotionConfig>
  );
}

function AnalyzingCard({ step, frames, transcript }: { step: number; frames?: number; transcript?: boolean }) {
  const items = [
    frames ? `${frames} Standbilder ausgewählt` : "Standbilder ausgewählt",
    transcript ? "Sprache transkribiert" : "Sprechweise ausgewertet",
    "Mit deinem Soll-Profil abgeglichen",
  ];
  return (
    <Card>
      <b>{step >= 4 ? "Analyse fertig" : "Ich schaue mir deine Aufnahme an …"}</b>
      <div className="steps">
        {items.map((t, i) => {
          const doneI = step > i;
          const active = step === i;
          return (
            <div key={t} className={`row ${doneI ? "" : "mut"}`}>
              <span className={`ck sm ${doneI ? "a" : ""} ${active ? "pulse" : ""}`}>{doneI ? <Icon name="check" size={12} /> : null}</span>
              <span>{t}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Screen({ k, dir = 1, children }: { k: string; dir?: number; children: React.ReactNode }) {
  return (
    <motion.div
      key={k}
      className="screen"
      initial={{ opacity: 0, x: 24 * dir }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 * dir, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
    >
      {children}
    </motion.div>
  );
}
