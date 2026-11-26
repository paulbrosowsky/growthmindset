export type Source = "Übung" | "Selbst" | "Kollegen" | "Start";

export type Sub = { id: string; name: string; level: number; sources?: Source[] };

export type RecType = "Intern" | "Ressource" | "Extern" | "Üben";

export type Rec = {
  id: string;
  type: RecType;
  title: string;
  meta?: string;
  why?: string;
  fresh?: boolean;
};

export type ChallengeKind = "Lernen" | "Üben" | "Anwenden" | "Reflexion";

/** Challenge im Lernpfad. refs: Titel aus den SAA und BPR 2025. fromChat: im Chat als Ziel gesetzt. */
export type PathChallenge = { id: string; area: string; title: string; kind: ChallengeKind; min: number; text: string; refs?: string[]; fromChat?: boolean };

/** Persönlicher Lernpfad: nach dem Onboarding erzeugt, im Chat erweitert. */
export type GoalPathState = { title: string; challenges: PathChallenge[]; source: "ai" | "profil" | "demo" };

export type Skill = { id: string; name: string; subs: Sub[]; recs: Rec[] };

export type Area = { id: string; name: string; color: string; skills: Skill[] };

export type ExperienceKind = "Lernen" | "Üben" | "Anwenden" | "Feedback" | "Reflexion" | "Start";

export type Experience = {
  id: string;
  date: string; // ISO
  title: string;
  detail?: string;
  kind: ExperienceKind;
  xp: number;
};

export type ProfileCard = { wer: string[]; was: string[]; wie: string[]; goal: string };

export type Profile = {
  name: string;
  role: string;
  /** Bisherige berufliche Stationen */
  experience: string;
  /** Was macht Spaß, was wird gemieden */
  likes?: string;
  /** Was möchte die Person lernen */
  learn?: string;
  /** Wo in 3 Jahren */
  vision?: string;
  /** Gemeinsam formuliertes Lernziel für die nächsten 4 Wochen */
  goal: string;
  preference: string;
  /** Wann und wo Lernen in den Alltag passt */
  time?: string;
  card?: ProfileCard;
  // Felder aus dem alten Onboarding (ältere gespeicherte Profile)
  tenure?: string;
  interests?: string;
  challenge?: string;
};

export type Slide = { title: string; bullets: string[]; note: string };

export type PeerFeedback = { name: string; stars: number; text: string };

export type Presentation = {
  topic: string;
  slides?: Slide[];
  at?: string; // ISO
  atLabel?: string;
  practiced?: boolean;
  followedUp?: boolean;
  pctBefore?: number;
  durationSec?: number;
};

export type MsgKind =
  | "text"
  | "options"
  | "slides"
  | "feedback"
  | "peer"
  | "peerSelect"
  | "loop"
  | "recs"
  | "summary"
  | "profile"
  | "video"
  | "note"
  | "update"
  | "analyzing"
  | "link"
  | "xpline";

export type Msg = {
  id: string;
  from: "bot" | "me";
  kind: MsgKind;
  text?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
};

export type Phase = "new" | "onboarding" | "ready" | "waiting" | "done";

export type AppState = {
  username: string;
  createdAt: string;
  profile: Profile | null;
  summary?: string;
  firstStep?: string;
  focus: string[];
  areas: Area[];
  xp: number;
  badges: string[];
  /** Erledigte Pflichtfortbildungen (IDs) */
  mandatoryDone?: string[];
  /** Persönlicher Lernpfad (fehlt bei älteren Profilen: dann Demo-Pfad passend zum Ziel) */
  goalPath?: GoalPathState;
  /** Erledigte Challenges im Lernpfad (IDs) */
  pathDone?: string[];
  /** Gelesene SOPs (IDs) */
  sopRead?: string[];
  /** Wann das 4-Wochen-Lernziel vereinbart wurde */
  goalSetAt?: string;
  journal: Experience[];
  memory: string[];
  phase: Phase;
  presentation: Presentation | null;
  timeOffsetMs: number;
  teamChallenge: number;
  feedbackReceived: PeerFeedback[];
  messages: Msg[];
};

export type LevelChange = { sub: string; level: number; reason: string };
