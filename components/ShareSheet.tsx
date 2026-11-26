"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/shadcn/button";
import { Icon } from "./ui";
import { BottomSheet } from "./ziele";
import { initials } from "./views";
import type { ShareDraft } from "@/lib/share";
import type { SharedSuccess } from "@/lib/types";

/**
 * „Erfolg teilen?“: Die Person entscheidet selbst, was die Führungskraft sieht.
 * Nur der Erfolg, die gewählten Bezüge und die eigene Notiz gehen ins Unternehmenssystem, nie Inhalte aus dem Coach.
 */
export function ShareSheet({ draft, onClose, onShare }: { draft: ShareDraft | null; onClose: () => void; onShare: (s: Omit<SharedSuccess, "id" | "date">) => void }) {
  const [withComp, setWithComp] = useState(true);
  const [withTraining, setWithTraining] = useState(true);
  const [note, setNote] = useState("");
  useEffect(() => {
    if (!draft) return;
    setWithComp(true);
    setWithTraining(true);
    setNote("");
  }, [draft]);
  const [name, role] = (draft?.to || "").split(", ");
  return (
    <BottomSheet open={!!draft} onClose={onClose} title="Erfolg teilen">
      {draft && (
        <>
          <div>
            <b className="sh-t" style={{ fontSize: 19 }}>
              Erfolg teilen?
            </b>
            <span className="mut" style={{ display: "block", marginTop: 4 }}>
              Du entscheidest, was {name.split(" ")[0] || "deine Führungskraft"} sieht. Es landet in deinem Entwicklungsplan beim DRK.
            </span>
          </div>
          <div className="share-to">
            <span className="share-av">{initials(name)}</span>
            <span>
              <b>{name}</b>
              <small className="mut">{role || "Führungskraft"}</small>
            </span>
          </div>
          <div className="share-list">
            <small className="share-lbl">Wird geteilt</small>
            <label className="share-ck">
              <input type="checkbox" checked disabled />
              <span>{draft.title}</span>
            </label>
            {draft.competence && (
              <label className="share-ck">
                <input type="checkbox" checked={withComp} onChange={(e) => setWithComp(e.target.checked)} />
                <span>Bezug zu {draft.competence} im Entwicklungsplan</span>
              </label>
            )}
            {draft.training && (
              <label className="share-ck">
                <input type="checkbox" checked={withTraining} onChange={(e) => setWithTraining(e.target.checked)} />
                <span>Interesse an {draft.training}</span>
              </label>
            )}
            <label className="share-note">
              <small className="mut">Deine Notiz (optional)</small>
              <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Was hat dir geholfen, was wünschst du dir?" />
            </label>
          </div>
          <div className="share-priv">
            <Icon name="lock" size={15} />
            <span>
              <b>Bleibt privat:</b> Gespräche mit dem Coach, Reflexionen und Einsatznachbereitung.
            </span>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <Button
              className="h-11 flex-1 rounded-full"
              onClick={() =>
                onShare({
                  title: draft.title,
                  to: draft.to,
                  competence: withComp ? draft.competence : undefined,
                  soll: withComp ? draft.soll : undefined,
                  training: withTraining ? draft.training : undefined,
                  note: note.trim() || undefined,
                })
              }
            >
              <Icon name="share" size={15} />
              Teilen
            </Button>
            <Button variant="outline" className="h-11 flex-1 rounded-full" onClick={onClose}>
              Nur für mich
            </Button>
          </div>
        </>
      )}
    </BottomSheet>
  );
}
