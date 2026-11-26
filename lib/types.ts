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

export type Profile = {
  name: string;
  role: string;
  tenure: string;
  experience: string;
  interests: string;
  challenge: string;
  preference: string;
  goal: string;
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
