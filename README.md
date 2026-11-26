# Kompass: persönlicher KI-Lern-Coach

Hackathon-Prototyp zur Challenge „Growth Mindset: lebenslanges Lernen im Arbeitsalltag“ (AOK Neckar-Fils).

Kompass begleitet Mitarbeitende beim Lernen im Arbeitsalltag nach 70/20/10: Onboarding im Chat, persönliche Lernreise (Kompetenzbereiche als Planeten), XP, Level, Abzeichen und Team-Challenge, und ein vollständiger Learning Loop am Beispiel „Präsentieren“: vorbereiten, Slides erstellen, Generalprobe per Video mit KI-Analyse, Termin merken, aktiv nachfragen, reflektieren, Feedback der Kollegen einholen, Lernpfad erweitern.

## Starten

```bash
npm install
cp .env.example .env.local   # ANTHROPIC_API_KEY eintragen
npm run dev                  # http://localhost:3000
```

Ohne `ANTHROPIC_API_KEY` läuft die App im **Skript-Modus** mit vorbereiteten Antworten. So funktioniert die Demo auch ohne Netz oder Key.

## Konfiguration

| Variable | Zweck |
| --- | --- |
| `ANTHROPIC_API_KEY` | Claude API Key, schaltet die Live-KI ein |
| `CLAUDE_MODEL` | Optional, Standard `claude-opus-5-5` |
| `OPENAI_API_KEY` | OpenAI API Key für das Sprachgespräch (Realtime API). Bleibt auf dem Server, der Browser bekommt nur ein kurzlebiges Token |
| `OPENAI_REALTIME_MODEL`, `OPENAI_REALTIME_VOICE` | Optional, Standard `gpt-realtime` und Stimme `marin` |
| `DATABASE_URL` | Optional, Postgres (z. B. Vercel Postgres oder Neon). Ohne: JSON-Dateien in `.data/` |

## Deployment auf Vercel

1. Repo in Vercel importieren (Framework wird als Next.js erkannt).
2. Unter Settings, Environment Variables `ANTHROPIC_API_KEY` eintragen, für das Sprachgespräch zusätzlich `OPENAI_API_KEY`.
3. Unter Storage eine Postgres-Datenbank (Neon) anlegen und verbinden. Vercel setzt `DATABASE_URL` bzw. `POSTGRES_URL` automatisch. Die Tabelle legt die App selbst an.
4. Deployen. Kamera und Mikrofon funktionieren nur über HTTPS, das ist bei Vercel automatisch der Fall.

Ohne Datenbank speichert Vercel Profile nur kurzlebig in `/tmp`. Für die Demo mit vielen Handys daher Postgres verbinden.

## Demo-Ablauf

1. Username wählen (kein Passwort), kurzes Onboarding im Chat.
2. Demo-Persona: Login `max.mueller`, Rolle „Notfallsanitäter“, dann die vorgeschlagenen Antworten antippen. Unter Ziele: Lernziel Fallvorstellung, Stellenprofil mit Lücken (Patientenversorgung, Belastbarkeit) und Fortbildungsvorschlag, Pflichtschulung P03 abgelaufen.
3. „Hey, ich muss morgen bei der Fallbesprechung einen Einsatz vorstellen“ → drei Vorschläge → Option 3 → „Slides vorbereiten“.
4. Generalprobe aufnehmen (Kamera, Upload oder Beispiel-Analyse) → Feedback, Fortschritt steigt.
5. Termin nennen, z. B. „Morgen um 10:00“.
6. Demo-Steuerung öffnen (Logo im Coach lange drücken oder Rechtsklick, am Rechner auch Shift + Alt + D) → **Zeitsprung**: Auf der Reise-Seite erscheint die Nachfrage von Kompass.
7. Reflexion, Kollegen-Feedback anfragen (simuliert), Lernpfad wird erweitert, Level-Up.

In der Demo-Steuerung gibt es außerdem KI-Modus Live/Skript, einen QR-Code für die Jury und **Profil zurücksetzen**.

## Aufbau

- `lib/knowledge.ts`: Unternehmenskontext DRK-Kreisverband Musterstadt e. V. (fiktiv, Quelle `docs/DRK_Personalentwicklung_Demodaten.md`): Kompetenzmodell mit Stufen 1 bis 4, 9 Jobprofile mit Soll-Stufen, Fortbildungen F01 bis F15, Pflichtschulungen P01 bis P05, Demo-Persona Max Müller. Geht als JSON in den System-Prompt (`knowledgeJSON`).
- `lib/saa.ts`, `lib/saaServer.ts`: SAA und BPR 2025 (ÄLRD, Stand Juli 2025) als fachliche Grundlage für den Rettungsdienst. Das Verzeichnis geht in den Kontext, passende Seiten werden je Chat oder Folienentwurf als Auszug mitgeschickt, Challenges verweisen per `refs` darauf. Volltext in `docs/`, neu erzeugen mit `python3 scripts/build-saa.py`.
- `lib/claude.ts`: Claude-Aufrufe mit Structured Outputs, Prompt Caching und serverseitigem Fallback
- `app/api/ai/route.ts`: die KI-Aufgaben (Begrüßung, Vorschläge, Slides, Videoanalyse, Reflexion, Kollegen-Feedback, Lernpfad-Update, freier Chat)
- `lib/realtime.ts`, `app/api/realtime/route.ts`, `lib/voiceClient.ts`: Sprachgespräch über die OpenAI Realtime API
- `lib/fallbacks.ts`: Skript-Antworten, wenn die KI nicht verfügbar ist
- `components/Coach.tsx`: Handy-App mit Navigation (Coach, Reise, Team, Erfolge) und Demo-Ablauf
- `components/views.tsx`: Reise mit Kompetenzbereichen, Team, Erfolge, Demo-Steuerung; `components/Cards.tsx`: Karten im Chat
- UI: Tailwind CSS 4 mit [shadcn/ui](https://ui.shadcn.com) (`components/shadcn/`), Theme „Graphit & Gelb“ in `app/globals.css`; Animationen mit [Motion](https://motion.dev)

Sprachgespräch: Bei leerem Eingabefeld startet der Senden-Knopf (Mikrofon) ein Gespräch mit Kompass über die OpenAI Realtime API (WebRTC, `lib/voiceClient.ts`). `/api/realtime` erzeugt ein kurzlebiges Client-Secret mit demselben Coach-Prompt wie der Text-Chat (`lib/realtime.ts`). Im Kennenlernen speichert die Stimme die 8 Themen per Werkzeug, die Profil-Karte und der Lernpfad entstehen wie im Text über Claude; im Chat landen gesetzte Ziele im Lernpfad und fachliche Fragen werden in den SAA und BPR nachgeschlagen. Gesprochenes erscheint als Text im Chat, Getipptes geht während des Gesprächs an Kompass. Stoppen führt das Kennenlernen schriftlich fort.

Videoanalyse: Claude verarbeitet Bilder und Text, aber kein Video oder Audio direkt. Der Browser zieht deshalb 5 Standbilder aus der Aufnahme und schreibt die Sprache per Spracherkennung mit (Chrome, Edge, Safari). Nur Standbilder und Text gehen an den Server.
