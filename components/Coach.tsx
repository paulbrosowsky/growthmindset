"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Panel from "./Panel";
import VideoRecorder, { type VideoResult } from "./VideoRecorder";
import { FeedbackCard, LoopCard, OptionsCard, PeerCard, PeerSelectCard, RecsCard, RichText, SlidesCard, SummaryCard } from "./Cards";
import { fallback, type PrepOut, type SynthOut, type VideoOut } from "@/lib/fallbacks";
import { BADGES, COMPANY, findSkill, levelOf, skillProgress } from "@/lib/knowledge";
import { fmtClock, parseWhen, sleep, uid } from "@/lib/clientUtil";
import type { AppState, Experience, LevelChange, Msg, PeerFeedback, Profile, Source } from "@/lib/types";

type Toast = { id: string; text: string; kind: "xp" | "level" | "badge" | "info" };

const PRESENT_RE = /präsentier|präsentation|vortrag|pitch|presentation/i;

export default function Coach({ initial, live, onLogout }: { initial: AppState; live: boolean; onLogout: () => void }) {
  const [S, setS] = useState<AppState>(initial);
  const sRef = useRef<AppState>(initial);
  const [typing, setTyping] = useState(false);
  const [chips, setChips] = useState<string[]>([]);
  const [placeholder, setPlaceholder] = useState("Schreib Kompass eine Nachricht …");
  const [input, setInput] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [area, setArea] = useState("komm");
  const [view, setView] = useState<"chat" | "path">("chat");
  const [notif, setNotif] = useState(false);
  const [, setTick] = useState(0);
  const [busy, setBusy] = useState(false);

  const pending = useRef<((v: string) => void) | null>(null);
  const cardWaiters = useRef<Record<string, (v: unknown) => void>>({});
  const busyRef = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(false);
  const logRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<HTMLDetailsElement>(null);

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

  const toast = (text: string, kind: Toast["kind"] = "info") => {
    const id = uid();
    setToasts((t) => [...t, { id, text, kind }].slice(-3));
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  };

  const push = (m: Omit<Msg, "id">) => {
    const id = uid();
    update((s) => {
      s.messages.push({ ...m, id });
    });
    return id;
  };

  const say = async (text: string, wait = 650) => {
    setTyping(true);
    await sleep(wait);
    setTyping(false);
    push({ from: "bot", kind: "text", text });
  };

  const note = (text: string) => push({ from: "bot", kind: "note", text });

  const ask = (c: string[], ph?: string) => {
    setChips(c);
    setPlaceholder(ph || "Antwort schreiben oder oben antippen …");
    return new Promise<string>((res) => {
      pending.current = res;
    });
  };

  const waitCard = <T,>(id: string) =>
    new Promise<T>((res) => {
      cardWaiters.current[id] = res as (v: unknown) => void;
    });

  const resolveCard = (id: string, value: unknown) => {
    update((s) => {
      const m = s.messages.find((x) => x.id === id);
      if (m) m.data = { ...(m.data || {}), done: true };
    });
    const w = cardWaiters.current[id];
    delete cardWaiters.current[id];
    w?.(value);
  };

  async function ai<T>(task: string, payload: unknown, fb: T): Promise<T> {
    setTyping(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ task, payload, state: { ...sRef.current, messages: [] } }),
      });
      if (!res.ok) return fb;
      const json = await res.json();
      return (json.result as T) ?? fb;
    } catch {
      return fb;
    } finally {
      setTyping(false);
    }
  }

  const addXP = (n: number, reason: string, journal?: Omit<Experience, "id" | "date" | "xp">) => {
    const before = levelOf(sRef.current.xp);
    update((s) => {
      s.xp += n;
      if (journal) s.journal.unshift({ ...journal, id: uid(), date: now().toISOString(), xp: n });
    });
    toast(`+${n} XP · ${reason}`, "xp");
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
    const ph = sRef.current.phase;
    if (ph === "ready") setChips(["Hey, ich muss morgen präsentieren", "Was soll ich diese Woche lernen?"]);
    else if (ph === "waiting") setChips(["Zeitsprung: nach der Präsentation (Demo)"]);
    else if (ph === "done") setChips(["Was soll ich als Nächstes üben?", "Ich muss wieder präsentieren"]);
    else setChips([]);
    setPlaceholder("Schreib Kompass eine Nachricht …");
  }

  async function onboarding() {
    update((s) => {
      s.phase = "onboarding";
      s.messages = [];
    });
    const guess = sRef.current.username.split(/[._-]/)[0];
    const nameChip = guess.charAt(0).toUpperCase() + guess.slice(1);
    await say(
      `Hallo! Ich bin **Kompass**, dein persönlicher Lernbegleiter bei ${COMPANY.short}. Ich helfe dir, direkt im Arbeitsalltag zu lernen: mit dem, was bei dir gerade ansteht, in kleinen Schritten.`,
      400,
    );
    await say("Lass uns kurz kennenlernen, das dauert etwa zwei Minuten. Wie darf ich dich nennen?");
    const name = (await ask([nameChip], "Dein Vorname")).split(/[ ,]/)[0] || nameChip;
    await say(`Schön, dich kennenzulernen, ${name}! In welcher Rolle und in welchem Bereich arbeitest du?`);
    const role = await ask(["Produktmanagerin, Wärmepumpen-Software", "Entwickler im Steuerungsteam", "Teamleiterin im Kundenservice"], "Rolle und Bereich");
    await say("Wie lange bist du schon bei uns?");
    const tenure = await ask(["Seit 8 Monaten", "2 bis 5 Jahre", "Über 5 Jahre"]);
    await say("Was beschäftigt dich gerade? Wo hakt es manchmal?");
    const challenge = await ask(["Vor großen Runden zu präsentieren macht mich nervös", "Mir fehlt die Zeit zum Lernen", "Ich will fachlich tiefer einsteigen"]);
    await say("Danke für deine Offenheit. Und wo möchtest du in zwei Jahren stehen?");
    const goal = await ask(["Ein eigenes Produktteam leiten", "Fachexpertin bzw. Fachexperte werden", "Weiß ich noch nicht genau"]);
    await say("Noch drei kurze Fragen zu Erfahrung, Interessen und wie du am liebsten lernst. Oder sollen wir direkt starten?");
    const more = await ask(["Weiter", "Direkt starten"]);
    let experience = "3 Jahre Projektmanagement in einer Agentur";
    let interests = "Datenanalyse, Nachhaltigkeit, UX";
    let preference = "Videos und Praxis";
    if (!/direkt/i.test(more)) {
      await say("Was hast du vorher gemacht?");
      experience = await ask(["3 Jahre Projektmanagement in einer Agentur", "Studium, das ist mein erster Job"]);
      await say("Welche Themen interessieren dich besonders?");
      interests = await ask(["Datenanalyse, Nachhaltigkeit, UX", "Technik und Software", "Führung und Teamarbeit"]);
      await say("Wie lernst du am liebsten?");
      preference = await ask(["Videos und Praxis", "Lesen", "Workshops in der Gruppe", "Ein Mix aus allem"]);
    }
    const profile: Profile = { name, role, tenure, experience, interests, challenge, preference, goal };
    update((s) => {
      s.profile = profile;
    });
    await say("Danke! Ich gleiche dein Profil jetzt mit dem Kompetenzmodell und den Soll-Profilen deiner Rolle ab …", 300);
    const w = await ai("welcome", {}, fallback.welcome(profile));
    update((s) => {
      s.summary = w.summary;
      s.focus = w.focus.filter((id) => findSkill(s.areas, id)).slice(0, 3);
      if (!s.focus.includes("praes")) s.focus.unshift("praes");
      s.firstStep = w.firstStep;
      s.phase = "ready";
    });
    const focus = sRef.current.focus
      .map((id) => findSkill(sRef.current.areas, id))
      .filter(Boolean)
      .map((sk) => ({ name: sk!.name, pct: skillProgress(sk!) }));
    push({ from: "bot", kind: "summary", data: { name, focus } });
    await say(w.summary, 300);
    addXP(50, "Onboarding abgeschlossen", { kind: "Start", title: "Onboarding mit Kompass abgeschlossen" });
    award("start");
    setHighlight("praes");
    await say(
      `Deinen Lernpfad findest du unter **Lernreise**: Jeder Planet ist ein Kompetenzbereich, die Monde sind deine Skills. Erster Schritt diese Woche: ${w.firstStep}\n\nSag mir einfach, wenn bei dir etwas ansteht, zum Beispiel eine Präsentation, ein schwieriges Gespräch oder ein neues Thema.`,
    );
  }

  async function presentFlow() {
    const name = sRef.current.profile?.name || "";
    const pct = praesPct();
    setHighlight("praes");
    setArea("komm");
    await say(
      `Super, ich sehe, du hast beim Präsentieren schon gute Fortschritte gemacht: **${pct} %** deines Meilensteins sind geschafft, Struktur und Folien sitzen. Möchtest du dich für deine Präsentation vorbereiten?`,
    );
    const yes = await ask(["Ja, gerne!", "Nein, heute nicht"]);
    if (/nein|nicht/i.test(yes)) {
      await say(`Alles klar, ${name}. Ich drück dir die Daumen! Wenn du magst, erzähl mir hinterher, wie es lief.`);
      return;
    }
    await say("Worum geht es in deiner Präsentation, und wer hört zu?");
    const topic = await ask(["Quartalsupdate zur neuen Wärmepumpen-App vor der Bereichsleitung, ca. 15 Minuten"], "Thema und Publikum");
    update((s) => {
      s.presentation = { topic };
    });
    const prep = await ai<PrepOut>("prep", { topic }, fallback.prep(topic, pct));
    await say(prep.text, 200);
    const optId = push({ from: "bot", kind: "options", data: { options: prep.options } });
    const choice = await ask(prep.options.map((o, i) => `${i + 1} · ${o.title}`));
    update((s) => {
      const m = s.messages.find((x) => x.id === optId);
      if (m) m.data = { ...m.data, done: true };
    });
    let idx = 2;
    if (/^\s*1/.test(choice) || (/video/i.test(choice) && !/eigen|aufnehm|selbst/i.test(choice))) idx = 0;
    else if (/^\s*2/.test(choice) || /les/i.test(choice)) idx = 1;

    let practice = idx === 2;
    if (!practice) {
      const opt = prep.options[idx];
      update((s) => {
        const sk = findSkill(s.areas, "praes");
        sk?.recs.unshift({ id: uid(), type: idx === 0 ? "Extern" : "Ressource", title: opt.title, meta: opt.detail, fresh: true });
      });
      addXP(15, "Lerninhalt ausgewählt", { kind: "Lernen", title: opt.title });
      await say(`Gute Wahl, ich habe dir „${opt.title}“ in den Lernpfad gelegt. Am meisten bringt es aber, einmal laut zu üben. Magst du zusätzlich eine kurze Generalprobe aufnehmen?`);
      practice = !/nein|reicht/i.test(await ask(["Ja, Video aufnehmen", "Nein, das reicht mir"]));
    }

    if (practice) {
      await say("Sehr gut, laut üben mit Aufnahme ist die wirksamste Vorbereitung. Hast du schon Folien, oder soll ich dir ein paar Slides entwerfen?");
      const sl = await ask(["Slides vorbereiten", "Ich habe schon Folien"]);
      if (!/habe schon|schon folien/i.test(sl)) {
        const deck = await ai("slides", { topic }, fallback.slides(topic));
        push({ from: "bot", kind: "slides", data: { slides: deck.slides } });
        update((s) => {
          if (s.presentation) s.presentation.slides = deck.slides;
        });
        addXP(20, "Folienentwurf erstellt");
        await say("Hier ist dein Entwurf mit Sprechernotizen. Die Notizen trainieren genau die Punkte, an denen du noch arbeitest.", 300);
      }
      await say("Jetzt kommt die Generalprobe: Nimm dich auf, wie du präsentierst. Zwei bis drei Minuten reichen, Einstieg und Schluss sind am wichtigsten.");
      const vidId = push({ from: "bot", kind: "video" });
      setChips([]);
      const vid = await waitCard<VideoResult>(vidId);
      if (vid.url) push({ from: "me", kind: "video", data: { url: vid.url, secs: Math.round(vid.duration) } });
      else if (vid.demo) push({ from: "me", kind: "text", text: "Ich habe gerade keine Kamera, zeig mir eine Beispiel-Analyse." });
      await say("Danke! Ich schaue mir deine Aufnahme an …", 300);
      let analysis: VideoOut;
      if (vid.demo || (!vid.frames.length && !vid.transcript)) {
        setTyping(true);
        await sleep(1800);
        setTyping(false);
        analysis = fallback.video();
      } else {
        analysis = await ai("video", { topic, frames: vid.frames, transcript: vid.transcript, duration: vid.duration }, fallback.video());
      }
      push({ from: "bot", kind: "feedback", data: { ...analysis, frames: vid.frames.length } });
      const before = praesPct();
      applyLevels(analysis.levelChanges, ["Übung"]);
      const after = praesPct();
      update((s) => {
        if (s.presentation) s.presentation.practiced = true;
        if (analysis.improve[0]) s.memory.unshift(`Generalprobe: ${analysis.improve[0]}`);
      });
      addXP(80, "Generalprobe mit Videoanalyse", { kind: "Üben", title: "Generalprobe per Video", detail: analysis.tip });
      award("generalprobe");
      note(`Präsentieren ${before} % → ${after} %`);
      await say("Diese Übung habe ich in deinem Lernpfad vermerkt.", 300);
    }

    await say("Wann genau ist deine Präsentation?");
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
    await say(`Notiert: **${label}**. Ich melde mich danach bei dir und frage, wie es gelaufen ist. Viel Erfolg, du bist gut vorbereitet!`);
  }

  async function followUp() {
    setNotif(false);
    const s0 = sRef.current;
    const name = s0.profile?.name || "";
    const topic = s0.presentation?.topic || "deine Präsentation";
    const short = topic.length > 70 ? topic.slice(0, 67) + "…" : topic;
    await say(`Hey ${name}! Heute war deine Präsentation „${short}“. **Wie ist sie gelaufen?**`, 300);
    const how = await ask(["Ziemlich gut!", "Gemischt", "Eher schwierig"]);
    const r = await ai("react", { answer: how }, fallback.react(how));
    await say(r.text, 100);
    const good = await ask(["Der Einstieg mit der Kundenstory kam super an"], "Was hat gut geklappt?");
    await say("Und was würdest du beim nächsten Mal anders machen?");
    const bad = await ask(["Bei den Rückfragen der Bereichsleitung war ich unsicher"], "Was würdest du anders machen?");
    const ref = await ai("reflect", { how, good, bad }, fallback.reflect());
    await say(ref.text, 100);
    addXP(60, "Präsentation gehalten und reflektiert", { kind: "Anwenden", title: `Präsentation gehalten: ${short}`, detail: `Gut: ${good} · Anders: ${bad}` });

    await say("Möchtest du auch die Meinung deiner Kollegen einholen? Ihre Kompass-Assistenten fragen kurz nach und bringen mir das Feedback. Diese drei waren dabei:");
    setChips([]);
    const selId = push({ from: "bot", kind: "peerSelect" });
    const names = await waitCard<string[] | null>(selId);
    let feedback: PeerFeedback[] = [];
    if (names && names.length) {
      push({ from: "me", kind: "text", text: `Ja, bitte frag ${names.map((n) => n.split(" ")[0]).join(", ")}.` });
      addXP(40, "Feedback angefragt", { kind: "Feedback", title: `Feedback angefragt bei ${names.length} Kolleg:innen` });
      await say(`Anfragen sind raus. Ich sage Bescheid, sobald Antworten da sind …`, 300);
      const out = await ai("peers", { names, topic, how, good, bad }, fallback.peers(names));
      feedback = out.feedback;
      for (const f of feedback) {
        await sleep(1100);
        push({ from: "bot", kind: "peer", data: f });
        update((s) => {
          s.feedbackReceived = [...s.feedbackReceived.filter((x) => x.name !== f.name), f];
          s.teamChallenge += 1;
        });
        addXP(30, `Feedback von ${f.name.split(" ")[0]}`);
      }
      award("feedback");
    } else {
      push({ from: "me", kind: "text", text: "Nein, danke." });
      await say("Alles klar, dann nehmen wir deine eigene Einschätzung.", 300);
    }

    await say("Ich führe jetzt alles zusammen und aktualisiere deinen Lernpfad …", 300);
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
    note(`Präsentieren ${before} % → ${after} %`);
    push({ from: "bot", kind: "recs", data: { recs: syn.recommendations } });
    push({ from: "bot", kind: "loop" });
    addXP(50, "Learning Loop geschlossen", { kind: "Reflexion", title: "Learning Loop geschlossen, Lernpfad erweitert" });
    award("loop");
    setHighlight("praes");
    setArea("komm");
    await say("Die neuen Vorschläge sind in deinem Lernpfad markiert. Und was ich gelernt habe, merke ich mir für unsere nächsten Gespräche.");
  }

  async function freeChat(text: string) {
    const ph = sRef.current.phase;
    if (/zeitsprung/i.test(text)) return timeJump();
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
    if (sRef.current.phase !== "waiting" || !p?.at) {
      void say("Gerade steht kein Termin an, zu dem ich nachfragen könnte.", 200);
      return Promise.resolve();
    }
    const target = new Date(p.at).getTime() + 3 * 3600e3;
    update((s) => {
      s.timeOffsetMs = target - Date.now();
    });
    toast(`Zeitsprung: ${fmtClock(new Date(target))}`, "info");
    return Promise.resolve();
  }

  function checkDue() {
    const s = sRef.current;
    if (s.phase !== "waiting" || !s.presentation?.at || s.presentation.followedUp) return;
    if (now().getTime() < new Date(s.presentation.at).getTime() + 30 * 60e3) return;
    setNotif(true);
    setTimeout(() => {
      if (!busyRef.current && sRef.current.phase === "waiting") void runFlow(followUp);
    }, 2200);
  }

  // ---------- input ----------
  function submit(text: string) {
    const t = text.trim();
    if (!t) return;
    setInput("");
    push({ from: "me", kind: "text", text: t });
    setChips([]);
    const p = pending.current;
    if (p) {
      pending.current = null;
      p(t);
      return;
    }
    if (!busyRef.current) void runFlow(() => freeChat(t));
  }

  // ---------- lifecycle ----------
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const ph = sRef.current.phase;
    // Interactive cards from an earlier session cannot be resumed.
    update((s) => {
      for (const m of s.messages) if (["video", "peerSelect", "options"].includes(m.kind) && m.from === "bot") m.data = { ...(m.data || {}), done: true };
    });
    if (ph === "new" || ph === "onboarding") void runFlow(onboarding);
    else {
      setIdleChips();
      if (ph !== "waiting") note(`Willkommen zurück, ${sRef.current.profile?.name || ""}!`);
      checkDue();
    }
    const iv = setInterval(() => {
      setTick((t) => t + 1);
      if (!busyRef.current) checkDue();
    }, 30000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (S.phase === "waiting") checkDue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [S.timeOffsetMs]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [S.messages.length, typing, chips]);

  async function resetAll() {
    if (!window.confirm("Profil zurücksetzen und Demo neu starten?")) return;
    await fetch(`/api/state?u=${encodeURIComponent(S.username)}`, { method: "DELETE" }).catch(() => {});
    window.location.reload();
  }

  // ---------- render ----------
  const renderMsg = (m: Msg) => {
    const d = m.data || {};
    switch (m.kind) {
      case "note":
        return <div className="note-pill">{m.text}</div>;
      case "options":
        return <OptionsCard options={d.options} onPick={!d.done ? (l) => submit(l) : undefined} />;
      case "slides":
        return <SlidesCard slides={d.slides} />;
      case "feedback":
        return <FeedbackCard good={d.good} improve={d.improve} tip={d.tip} frames={d.frames} />;
      case "peerSelect":
        return <PeerSelectCard done={d.done} onSend={(names) => resolveCard(m.id, names)} />;
      case "peer":
        return <PeerCard f={d} />;
      case "recs":
        return <RecsCard recs={d.recs} />;
      case "loop":
        return <LoopCard />;
      case "summary":
        return <SummaryCard name={d.name} focus={d.focus} />;
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

  const cardKinds = ["options", "slides", "feedback", "peerSelect", "peer", "recs", "loop", "summary", "video"];

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <svg viewBox="0 0 32 32" aria-hidden>
            <circle cx="16" cy="16" r="14" />
            <path d="M16 6 L20 16 L16 26 L12 16 Z" />
          </svg>
          <span>
            <strong>Kompass</strong>
            <small>{COMPANY.short} Lern-Coach</small>
          </span>
        </div>
        <div className="viewswitch">
          <button className={view === "chat" ? "on" : ""} onClick={() => setView("chat")}>
            Chat
          </button>
          <button className={view === "path" ? "on" : ""} onClick={() => setView("path")}>
            Lernreise
          </button>
        </div>
        <div className="topright">
          <span className="clock" title="Demo-Uhrzeit">
            {fmtClock(now())}
          </span>
          <span className={`ai ${live ? "live" : ""}`} title={live ? "Antworten kommen live von Claude" : "Kein API-Key: geskriptete Antworten"}>
            {live ? "KI live" : "Skript-Modus"}
          </span>
          <details className="demo" ref={demoRef}>
            <summary>Demo</summary>
            <div onClick={() => demoRef.current?.removeAttribute("open")}>
              <button disabled={S.phase !== "waiting" || busy} onClick={() => void timeJump()}>
                Zeitsprung nach der Präsentation
              </button>
              <button onClick={resetAll}>Profil zurücksetzen</button>
              <button onClick={onLogout}>Abmelden ({S.username})</button>
            </div>
          </details>
        </div>
      </header>

      <main className={`main view-${view}`}>
        <section className="chat">
          {notif && (
            <button className="notif" onClick={() => !busyRef.current && void runFlow(followUp)}>
              <svg viewBox="0 0 24 24" aria-hidden>
                <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0" />
              </svg>
              <span>
                <strong>Kompass</strong> Wie ist deine Präsentation gelaufen?
              </span>
            </button>
          )}
          <div className="log" ref={logRef}>
            {S.messages.map((m) => (
              <div key={m.id} className={`msg ${m.from} ${m.kind === "note" ? "isnote" : ""} ${cardKinds.includes(m.kind) ? "iscard" : ""}`}>
                {renderMsg(m)}
              </div>
            ))}
            {typing && (
              <div className="msg bot typing" aria-label="Kompass schreibt">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>
          <div className="composer">
            {chips.length > 0 && (
              <div className="chips">
                {chips.map((c) => (
                  <button key={c} className="chip" onClick={() => submit(c)}>
                    {c}
                  </button>
                ))}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(input);
              }}
            >
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={placeholder} aria-label="Nachricht" />
              <button className="send" type="submit" aria-label="Senden" disabled={!input.trim()}>
                <svg viewBox="0 0 24 24" aria-hidden>
                  <path d="M4 12l16-8-6 16-2-6z" />
                </svg>
              </button>
            </form>
          </div>
        </section>
        <Panel state={S} highlight={highlight} area={area} setArea={setArea} />
      </main>

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
