import { goalPathKey, roleFor, TEAM, trainingFor } from "./knowledge";
import type { AppState, SharedSuccess } from "./types";

/** Lernziel → Kompetenz im Jobprofil, auf die ein Erfolg einzahlt. */
const SKILL_FOR_PATH = { praes: "praes", trauma: "patient", resi: "resi" } as const;

export type ShareDraft = Omit<SharedSuccess, "id" | "date" | "note">;

/** Vorschlag für „Erfolg teilen“: Empfänger, Kompetenz und passende Fortbildung aus den Unternehmensdaten. */
export function shareDraft(state: AppState, title: string): ShareDraft {
  const role = roleFor(state.profile?.role);
  const skill = SKILL_FOR_PATH[goalPathKey(state.profile?.card?.goal || state.profile?.goal)];
  const core = role.core.find((c) => c.skill === skill);
  const t = trainingFor(skill, role);
  const lead = TEAM.find((m) => m.role === "Wachenleitung");
  return {
    title,
    competence: core?.name,
    soll: core?.soll,
    training: t ? `${t.id} ${t.title}` : undefined,
    to: lead && /wachenleitung/i.test(role.lead) ? `${lead.name}, ${lead.role}` : role.lead,
  };
}
