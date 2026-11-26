"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  CheckCircle2,
  ChevronsUpDown,
  Compass,
  Download,
  EllipsisVertical,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Lock,
  PanelLeft,
  Plus,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/shadcn/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/shadcn/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { cn } from "@/lib/utils";
import {
  HR,
  ORG_GAPS,
  PAST_SHARED,
  PFLICHT_COLS,
  PFLICHT_ROWS,
  TEAM_GAPS,
  TEAM_ROWS,
  TOPICS,
  TRAININGS,
  WACHE,
  WEEK_LABELS,
  WEEKLY_SHARED,
  type Status,
} from "@/lib/dashboardDemo";
import type { SharedEntry } from "@/lib/store";
import type { SharedSuccess } from "@/lib/types";

export type View = "wache" | "hr";

type LiveItem = SharedSuccess & { name: string; role: string; username: string };

const STATUS: Record<Status, { dot: string; cls: string }> = {
  ok: { dot: "bg-chart-2", cls: "border-[#b9dccf] text-[#2f6b58]" },
  warn: { dot: "bg-chart-1", cls: "border-[#ecd9a6] text-[#7a5a0c]" },
  bad: { dot: "bg-chart-4", cls: "border-[#f0c9b8] text-[#8a3414]" },
  info: { dot: "bg-chart-3", cls: "border-[#c9d6ef] text-[#3d5f9e]" },
  muted: { dot: "bg-muted-foreground/50", cls: "border-border text-muted-foreground" },
};

function StatusBadge({ status, children }: { status: Status; children: React.ReactNode }) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 rounded-md px-2 font-semibold", STATUS[status].cls)}>
      <span className={cn("size-1.5 rounded-full", STATUS[status].dot)} />
      {children}
    </Badge>
  );
}

const initialsOf = (n: string) =>
  n
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function ago(iso: string, now: number) {
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60e3));
  if (m < 1) return "gerade eben";
  if (m < 60) return `vor ${m} Min.`;
  const h = Math.round(m / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.round(h / 24);
  return d === 1 ? "gestern" : `vor ${d} Tagen`;
}

const firstName = (n: string) => n.trim().split(/[\s._-]+/)[0]?.toLowerCase() || "";

/** Geteilte Erfolge aus der App, alle 4 Sekunden neu geladen. */
function useLiveShared() {
  const [items, setItems] = useState<LiveItem[]>([]);
  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/shared", { cache: "no-store" });
      const { entries } = (await r.json()) as { entries: SharedEntry[] };
      const all = entries.flatMap((e) => {
        // Demo: Personen aus dem Team (z. B. „Lena“ oder lena.berger) mit vollem Namen und Jobprofil zeigen.
        const row = TEAM_ROWS.find((r) => firstName(r.name) === firstName(e.name) || firstName(r.name) === firstName(e.username));
        return e.items.map((it) => ({ ...it, name: row?.name ?? e.name, role: row?.role ?? e.role, username: e.username }));
      });
      all.sort((a, b) => b.date.localeCompare(a.date));
      setItems(all);
    } catch {}
  }, []);
  useEffect(() => {
    void load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);
  return items;
}

export default function Dashboard({ initialView }: { initialView: View }) {
  const [view, setView] = useState<View>(initialView);
  const [now, setNow] = useState(() => Date.now());
  const live = useLiveShared();

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30e3);
    return () => clearInterval(t);
  }, []);

  const switchTo = useCallback((v: View) => {
    setView(v);
    window.history.replaceState(null, "", v === "hr" ? "/dashboard?view=hr" : "/dashboard");
  }, []);

  // Demo: Tasten 1 und 2 schalten die Ansicht um.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /input|textarea/i.test(e.target.tagName)) return;
      if (e.key === "1") switchTo("wache");
      if (e.key === "2") switchTo("hr");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [switchTo]);

  const user = view === "wache" ? WACHE.lead : HR;

  return (
    <div className="flex min-h-dvh flex-wrap bg-background text-sm text-foreground">
      <aside aria-label="Seitenleiste" className="flex min-w-0 flex-[1_1_240px] flex-col gap-5 p-3 md:sticky md:top-0 md:h-dvh">
        <button className="flex min-h-12 items-center gap-2.5 rounded-xl p-2 text-left hover:bg-muted">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="size-[18px]" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <b className="text-sm">LENA</b>
            <span className="truncate text-xs text-muted-foreground">DRK-KV Musterstadt</span>
          </span>
          <ChevronsUpDown className="size-4 text-muted-foreground" />
        </button>

        <div className="hidden flex-col gap-5 md:flex">
        {view === "wache" ? (
          <>
            <NavGroup
              label={WACHE.name}
              items={[
                { icon: LayoutDashboard, label: "Übersicht", active: true },
                { icon: Users, label: "Team" },
                { icon: Target, label: "Entwicklungspläne" },
                { icon: ShieldCheck, label: "Pflichtschulungen", count: 2 },
                { icon: GraduationCap, label: "Fortbildungen" },
              ]}
            />
            <NavGroup
              label="Kreisverband"
              items={[
                { icon: FileText, label: "Kompetenzmodell" },
                { icon: Briefcase, label: "Jobprofile" },
              ]}
            />
          </>
        ) : (
          <>
            <NavGroup
              label="Personalentwicklung"
              items={[
                { icon: LayoutDashboard, label: "Überblick", active: true },
                { icon: FileText, label: "Kompetenzmodell" },
                { icon: Briefcase, label: "Jobprofile" },
                { icon: GraduationCap, label: "Fortbildungsplanung" },
                { icon: ShieldCheck, label: "Pflichtschulungen" },
              ]}
            />
            <NavGroup
              label="Standorte"
              items={PFLICHT_ROWS.map((r, i) => ({ dot: ["bg-chart-2", "bg-chart-3", "bg-chart-1", "bg-chart-4"][i], label: r.site }))}
            />
          </>
        )}
        </div>

        <div className="flex flex-col gap-2 md:mt-auto">
          <Button variant="secondary" asChild className="h-10 justify-start rounded-xl px-3 text-[13px] font-semibold">
            <a href="/">
              <ArrowLeft /> Zur App von Lena
            </a>
          </Button>
          <button className="flex min-h-12 items-center gap-2.5 rounded-xl p-2 text-left hover:bg-muted">
            <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg text-xs font-bold", view === "wache" ? "bg-chart-3 text-white" : "bg-chart-2 text-foreground")}>
              {user.initials}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <b className="text-sm">{user.name}</b>
              <span className="text-xs text-muted-foreground">{user.role}</span>
            </span>
            <EllipsisVertical className="size-4 text-muted-foreground" />
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-[999_1_640px] p-2 md:pl-0">
        <div className="flex min-h-full flex-col rounded-2xl border bg-card shadow-sm">
          <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3 md:px-6">
            <Button variant="ghost" size="icon" aria-label="Seitenleiste umschalten" className="rounded-lg hover:bg-muted">
              <PanelLeft />
            </Button>
            <span className="h-4 w-px bg-border" />
            <h1 className="text-[15px] font-semibold">{view === "wache" ? WACHE.name : "Personalentwicklung im Kreisverband"}</h1>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Tabs value={view} onValueChange={(v) => switchTo(v as View)}>
                <TabsList aria-label="Ansicht für die Demo">
                  <TabsTrigger value="wache">Wachenleitung</TabsTrigger>
                  <TabsTrigger value="hr">Personalabteilung</TabsTrigger>
                </TabsList>
              </Tabs>
              {view === "wache" ? (
                <Button className="h-9 rounded-lg px-3 text-[13px] shadow-none">
                  <Plus /> Maßnahme anlegen
                </Button>
              ) : (
                <Button variant="outline" className="h-9 rounded-lg px-3 text-[13px]">
                  <Download /> Bericht
                </Button>
              )}
            </div>
          </header>

          <AnimatePresence mode="wait" initial={false}>
            <motion.main
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              className="flex flex-col gap-6 p-4 md:p-6"
            >
              {view === "wache" ? <WacheView live={live} now={now} /> : <HRView live={live} />}
            </motion.main>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

type NavItem = { icon?: LucideIcon; dot?: string; label: string; active?: boolean; count?: number };

function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
  return (
    <nav aria-label={label} className="flex flex-col gap-0.5">
      <span className="px-2 pb-1.5 text-xs font-medium text-muted-foreground">{label}</span>
      {items.map((it) => (
        <a
          key={it.label}
          href="#"
          onClick={(e) => e.preventDefault()}
          aria-current={it.active ? "page" : undefined}
          className={cn("flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-foreground/80 hover:bg-muted", it.active && "bg-[#e7e7e2] font-semibold text-foreground")}
        >
          {it.icon ? <it.icon className="size-4" /> : <span className={cn("size-2 rounded-full", it.dot)} />}
          {it.label}
          {it.count ? <span className="ml-auto rounded-md bg-[#fbe3d9] px-1.5 text-xs font-bold text-[#8a3414]">{it.count}</span> : null}
        </a>
      ))}
    </nav>
  );
}

function StatCard({
  label,
  value,
  badge,
  foot,
  sub,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  badge?: React.ReactNode;
  foot: React.ReactNode;
  sub: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <Card className={cn("flex flex-col gap-4 rounded-2xl border px-0 py-5 shadow-xs", highlight && "border-chart-2 bg-[#f4faf7]")}>
      <CardHeader className="px-5">
        <CardDescription className={cn("text-[13px]", highlight && "text-[#2f6b58]")}>{label}</CardDescription>
        <CardTitle className="text-3xl font-bold tabular-nums">{value}</CardTitle>
        {badge && <CardAction>{badge}</CardAction>}
      </CardHeader>
      <CardFooter className="flex-col items-start gap-0.5 px-5 text-[13px]">
        <span className="font-semibold">{foot}</span>
        <span className="text-muted-foreground">{sub}</span>
      </CardFooter>
    </Card>
  );
}

function TrendBadge({ up, children, tone }: { up?: boolean; children: React.ReactNode; tone?: Status }) {
  const Ico = up ? TrendingUp : TrendingDown;
  return (
    <Badge variant="outline" className={cn("rounded-md px-2 font-semibold", tone ? STATUS[tone].cls : "")}>
      <Ico /> {children}
    </Badge>
  );
}

function Bar({ pct, color, h = 8 }: { pct: number; color: string; h?: number }) {
  return (
    <div className="overflow-hidden rounded-full bg-background" style={{ height: h }}>
      <motion.div className="rounded-full" style={{ height: h, background: color }} initial={{ width: 0 }} animate={{ width: `${Math.min(100, pct)}%` }} transition={{ type: "spring", stiffness: 60, damping: 18 }} />
    </div>
  );
}

function Panel({ title, desc, action, children, footer, className }: { title: string; desc?: string; action?: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("flex min-w-0 flex-col gap-5 rounded-2xl border px-0 py-5 shadow-xs", className)}>
      <CardHeader className="px-5">
        <CardTitle className="text-base font-bold">{title}</CardTitle>
        {desc && <CardDescription className="text-[13px]">{desc}</CardDescription>}
        {action && <CardAction>{action}</CardAction>}
      </CardHeader>
      <CardContent className="px-5">{children}</CardContent>
      {footer && <CardFooter className="mt-auto border-t px-5 pt-4 text-[13px]">{footer}</CardFooter>}
    </Card>
  );
}

/* ---------------- Wachenleitung ---------------- */

function WacheView({ live, now }: { live: LiveItem[]; now: number }) {
  const latest = live[0];
  const fresh = latest && now - new Date(latest.date).getTime() < 30 * 60e3;
  const row = latest ? TEAM_ROWS.find((r) => firstName(r.name) === firstName(latest.name)) : undefined;
  const ist = latest?.competence ? row?.ist[latest.competence] : undefined;
  const sharedBy = (name: string) => live.find((l) => firstName(l.name) === firstName(name));
  const pflichtOpen = TEAM_ROWS.filter((r) => r.pflicht.status === "bad");

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
        <StatCard label="Mitarbeitende" value={WACHE.size} foot="Rettungsdienst" sub="davon 1 Azubi, 1 FSJ" />
        <StatCard
          label="Pflichtschulungen offen"
          value={pflichtOpen.length}
          badge={<StatusBadge status="bad">P03</StatusBadge>}
          foot="Fahrsicherheitstraining"
          sub={pflichtOpen.map((r) => r.name).join(", ")}
        />
        <StatCard label="Maßnahmen aktiv" value={7} badge={<TrendBadge up>+2</TrendBadge>} foot="mehr als im Vorquartal" sub="3 davon über LENA" />
        <StatCard
          label="Neu geteilte Erfolge"
          value={live.length}
          highlight
          badge={fresh ? <Badge className="rounded-md bg-primary px-2 text-primary-foreground">neu</Badge> : undefined}
          foot={latest ? latest.name : "noch keine"}
          sub={latest ? `${ago(latest.date, now)} freigegeben` : "Mitarbeitende entscheiden selbst"}
        />
      </div>

      <div className="flex flex-wrap items-stretch gap-4">
        <Panel
          className={cn("flex-[999_1_520px]", fresh && "border-chart-2 ring-2 ring-chart-2/40")}
          title="Geteilter Erfolg"
          desc={latest ? `Von ${latest.name.split(" ")[0]} freigegeben, landet im Entwicklungsplan` : "Hier erscheinen Erfolge, die dein Team selbst teilt"}
          action={
            <Button variant="ghost" size="icon" aria-label="Weitere Aktionen" className="rounded-lg hover:bg-muted">
              <EllipsisVertical />
            </Button>
          }
          footer={
            <div className="flex w-full flex-wrap items-center gap-2.5">
              <span className="flex flex-[1_1_260px] items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="size-3.5 shrink-0" /> Coach-Gespräche sind nicht sichtbar. Die Ist-Stufe ändert sich nur im Mitarbeitergespräch.
              </span>
              <Button variant="outline" className="h-9 rounded-lg px-3 text-[13px]" disabled={!latest}>
                Fürs Gespräch merken
              </Button>
              <Button className="h-9 rounded-lg px-3 text-[13px] shadow-none" disabled={!latest?.training}>
                {latest?.training ? `${latest.training.split(" ")[0]} genehmigen` : "Fortbildung genehmigen"}
              </Button>
            </div>
          }
        >
          <AnimatePresence mode="wait">
            {latest ? (
              <motion.div key={latest.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col gap-4">
                <div className="flex items-start gap-3.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-chart-1 text-[13px] font-bold">{initialsOf(latest.name)}</span>
                  <div className="flex min-w-0 flex-col gap-1.5">
                    <span className="text-muted-foreground">
                      <b className="text-foreground">{latest.name}</b> · {latest.role || "Mitarbeiter/in"} · {ago(latest.date, now)}
                    </span>
                    <span className="text-xl font-bold tracking-tight">{latest.title}</span>
                    {latest.note && <blockquote className="mt-0.5 rounded-xl bg-background px-3.5 py-3 leading-relaxed text-foreground/80">„{latest.note}“</blockquote>}
                  </div>
                </div>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
                  {latest.competence && (
                    <div className="flex flex-col gap-2 rounded-xl border p-3">
                      <span className="text-xs text-muted-foreground">Kompetenz</span>
                      <b>{latest.competence}</b>
                      {latest.soll ? <Levels ist={ist} soll={latest.soll} /> : null}
                      <span className="text-xs text-muted-foreground">
                        {ist ? `Ist ${ist} · ` : ""}Soll {latest.soll}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col gap-2 rounded-xl border p-3">
                    <span className="text-xs text-muted-foreground">Maßnahme</span>
                    <b>Lernen mit LENA</b>
                    <StatusBadge status="ok">
                      <CheckCircle2 className="size-3" /> Abgeschlossen
                    </StatusBadge>
                  </div>
                  {latest.training && (
                    <div className="flex flex-col gap-2 rounded-xl border p-3">
                      <span className="text-xs text-muted-foreground">Wunsch</span>
                      <b>{latest.training}</b>
                      <span className="text-xs text-muted-foreground">aus dem Fortbildungskatalog</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid place-items-center gap-2 rounded-xl border border-dashed py-10 text-center text-muted-foreground">
                <BookOpen className="size-6" />
                Noch nichts Neues. Sobald jemand in LENA „Teilen“ tippt, erscheint es hier.
              </motion.div>
            )}
          </AnimatePresence>
          <div className="mt-5 flex flex-col">
            <span className="pb-2 text-xs font-medium text-muted-foreground">Früher geteilt</span>
            {[...live.slice(1, 3).map((l) => ({ key: l.id, initials: initialsOf(l.name), name: l.name, title: l.title, when: ago(l.date, now) })), ...PAST_SHARED.map((p) => ({ key: p.title, initials: p.initials, name: p.name, title: p.title, when: p.daysAgo === 1 ? "gestern" : `vor ${p.daysAgo} Tagen` }))]
              .slice(0, 3)
              .map((p) => (
                <div key={p.key} className="flex items-center gap-3 border-t py-2.5">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-bold">{p.initials}</span>
                  <span className="min-w-0 flex-1 truncate">
                    <b>{p.name}</b> <span className="text-muted-foreground">· {p.title}</span>
                  </span>
                  <span className="text-xs whitespace-nowrap text-muted-foreground">{p.when}</span>
                </div>
              ))}
          </div>
        </Panel>

        <Panel
          className="flex-[1_1_320px]"
          title="Kompetenzlücken im Team"
          desc="Unter Soll-Stufe, aus den Jahresbewertungen"
          footer={
            <div className="flex flex-col gap-0.5">
              <b>Empfehlung für Q1</b>
              <span className="text-muted-foreground">F06 als Wachentermin buchen, deckt 4 Personen ab.</span>
            </div>
          }
        >
          <div className="flex flex-col gap-4">
            {TEAM_GAPS.map((g) => (
              <div key={g.name} className="flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <b className="font-semibold">{g.name}</b>
                  <span className="text-muted-foreground tabular-nums">
                    {g.n} / {WACHE.size}
                  </span>
                </div>
                <Bar pct={(g.n / WACHE.size) * 100} color={g.color} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <section aria-labelledby="team" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="team" className="text-base font-bold">
            Team
          </h2>
          <Tabs defaultValue="alle">
            <TabsList>
              <TabsTrigger value="alle">Alle</TabsTrigger>
              <TabsTrigger value="pflicht">
                Pflichtschulung offen <span className="rounded-md bg-[#e4e4df] px-1.5 text-xs">{pflichtOpen.length}</span>
              </TabsTrigger>
              <TabsTrigger value="geteilt">
                Neu geteilt <span className="rounded-md bg-[#e4e4df] px-1.5 text-xs">{live.length}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="overflow-hidden rounded-2xl border">
          <Table className="min-w-[860px]">
            <TableHeader className="bg-background">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Name</TableHead>
                <TableHead>Jobprofil</TableHead>
                <TableHead>Unter Soll</TableHead>
                <TableHead>Pflichtschulungen</TableHead>
                <TableHead>Entwicklungsplan</TableHead>
                <TableHead>
                  <span className="sr-only">Aktionen</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TEAM_ROWS.map((r) => {
                const s = sharedBy(r.name);
                return (
                  <TableRow key={r.name} className={cn(s && "bg-[#f4faf7] hover:bg-[#eef7f3]")}>
                    <TableCell className="pl-4">
                      <span className="flex items-center gap-2.5">
                        <span className="grid size-7 place-items-center rounded-full bg-muted text-[11px] font-bold">{r.initials}</span>
                        <b>{r.name}</b>
                      </span>
                    </TableCell>
                    <TableCell>{r.role}</TableCell>
                    <TableCell className={cn(!r.gaps.length && "text-muted-foreground")}>{r.gaps.join(", ") || "keine"}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.pflicht.status}>{r.pflicht.label}</StatusBadge>
                    </TableCell>
                    <TableCell>
                      {s ? (
                        <StatusBadge status="ok">Erfolg geteilt</StatusBadge>
                      ) : (
                        <StatusBadge status={r.plan.status}>{r.plan.label}</StatusBadge>
                      )}{" "}
                      <span className="text-[13px] text-muted-foreground">· {s ? s.title : r.plan.detail}</span>
                    </TableCell>
                    <TableCell className="pr-3 text-right">
                      <Button variant="ghost" size="icon-sm" aria-label={`Aktionen für ${r.name}`} className="rounded-lg hover:bg-muted">
                        <EllipsisVertical />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted-foreground">
          <span>
            {TEAM_ROWS.length} von {WACHE.size} Mitarbeitenden
          </span>
          <div className="flex gap-2">
            <Button variant="outline" className="h-8 rounded-lg px-3 text-[13px]" disabled>
              Zurück
            </Button>
            <Button variant="outline" className="h-8 rounded-lg px-3 text-[13px]">
              Weiter
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

function Levels({ ist, soll }: { ist?: number; soll: number }) {
  return (
    <div className="flex items-center gap-[3px]" aria-label={`Ist ${ist ?? "unbekannt"}, Soll ${soll}`}>
      {[1, 2, 3, 4].map((l) => (
        <span key={l} className="contents">
          <span className={cn("h-1.5 flex-1 rounded-full", ist && l <= ist ? "bg-chart-4" : "bg-[#e7e7e2]")} />
          {l === soll && <span className="h-3 w-0.5 bg-foreground" />}
        </span>
      ))}
    </div>
  );
}

/* ---------------- Personalabteilung ---------------- */

function HRView({ live }: { live: LiveItem[] }) {
  const weekly = useMemo(() => {
    const w = [...WEEKLY_SHARED];
    w[w.length - 1] += live.length;
    return w;
  }, [live.length]);
  const topics = useMemo(() => {
    const t = TOPICS.map((x) => ({ ...x }));
    for (const l of live) {
      const hit = t.find((x) => x.name === l.competence);
      if (hit) hit.n += 1;
      else if (l.competence) t.push({ name: l.competence, n: 1 });
    }
    return t.sort((a, b) => b.n - a.n).slice(0, 4);
  }, [live]);

  return (
    <>
      <div role="note" className="flex items-start gap-3 rounded-xl border px-4 py-3.5">
        <ShieldCheck className="mt-0.5 size-[18px] shrink-0" />
        <div className="flex flex-col gap-0.5">
          <b>Nur zusammengefasste Werte</b>
          <span className="leading-relaxed text-muted-foreground">
            Keine Namen, Gruppen unter 5 Personen werden ausgeblendet. Inhalte aus dem persönlichen Coach fließen nie ein. Mit dem Betriebsrat abgestimmt.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
        <StatCard label="Pflichtschulungen gültig" value={`${HR.pflichtPct} %`} badge={<TrendBadge tone="bad">−2 %</TrendBadge>} foot="P03 Fahrsicherheit nur 78 %" sub="alle Rettungswachen" />
        <StatCard label="Aktive Entwicklungspläne" value={HR.plans} badge={<TrendBadge up>+12</TrendBadge>} foot="seit Einführung von LENA" sub={`von ${HR.staff} Mitarbeitenden`} />
        <StatCard
          label="Nutzen LENA"
          value={HR.kompass}
          badge={
            <Badge variant="outline" className="rounded-md px-2 font-semibold">
              {Math.round((HR.kompass / HR.staff) * 100)} %
            </Badge>
          }
          foot="freiwillig, seit Juli"
          sub="Ehrenamtliche nicht eingerechnet"
        />
        <StatCard
          label="Geteilte Erfolge im Quartal"
          value={HR.sharedQuarter + live.length}
          highlight
          badge={
            <TrendBadge up tone="ok">
              steigend
            </TrendBadge>
          }
          foot="von Mitarbeitenden freigegeben"
          sub="Inhalte bleiben bei den Teams"
        />
      </div>

      <Panel
        title="Geteilte Erfolge pro Woche"
        desc="Alle Standorte, letztes Quartal"
        action={
          <Tabs defaultValue="q">
            <TabsList className="h-8">
              <TabsTrigger value="q" className="text-[13px]">
                Quartal
              </TabsTrigger>
              <TabsTrigger value="30" className="text-[13px]">
                30 Tage
              </TabsTrigger>
              <TabsTrigger value="7" className="text-[13px]">
                7 Tage
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
      >
        <AreaChart values={weekly} labels={WEEK_LABELS} />
      </Panel>

      <div className="flex flex-wrap items-stretch gap-4">
        <Panel className="flex-[1_1_460px]" title="Häufigste Kompetenzlücken" desc="Anteil unter Soll-Stufe, je Jobprofil">
          <div className="flex flex-col gap-4">
            {ORG_GAPS.map((g) => (
              <div key={g.name} className="flex flex-col gap-1.5">
                <div className="flex justify-between gap-3">
                  <span>
                    <b>{g.name}</b> <span className="text-muted-foreground">· {g.group}</span>
                  </span>
                  <b className="tabular-nums">{g.pct} %</b>
                </div>
                <Bar pct={g.pct} color={g.color} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel
          className="flex-[1_1_380px]"
          title="Woran Mitarbeitende freiwillig arbeiten"
          desc="Themen der geteilten Erfolge"
          footer={
            <div className="flex flex-col gap-0.5">
              <b className="text-[#1f4f40]">Belastbarkeit ist Lücke und Eigeninitiative zugleich</b>
              <span className="text-[#2f6b58]">F06 lohnt sich als Schwerpunkt 2027.</span>
            </div>
          }
        >
          <ol className="flex flex-col">
            {topics.map((t, i) => (
              <motion.li layout key={t.name} className={cn("flex justify-between gap-3 py-2.5", i > 0 && "border-t")}>
                <span>{t.name}</span>
                <b className="tabular-nums">{t.n}</b>
              </motion.li>
            ))}
          </ol>
        </Panel>
      </div>

      <section aria-labelledby="bedarf" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 id="bedarf" className="text-base font-bold">
              Fortbildungsbedarf 2027
            </h2>
            <span className="text-[13px] text-muted-foreground">Bedarf aus Entwicklungsplänen gegen geplante Plätze</span>
          </div>
          <Button className="h-9 rounded-lg px-3 text-[13px] shadow-none">
            <Plus /> Termine planen
          </Button>
        </div>
        <div className="overflow-hidden rounded-2xl border">
          <Table className="min-w-[760px]">
            <TableHeader className="bg-background">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Fortbildung</TableHead>
                <TableHead>Zielgruppe</TableHead>
                <TableHead className="w-[32%]">Bedarf / Plätze</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TRAININGS.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="pl-4">
                    <b>{t.id}</b> {t.title}
                  </TableCell>
                  <TableCell className="text-foreground/80">{t.target}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="flex-1">
                        <Bar pct={(t.need / Math.max(t.need, t.seats)) * 100} color={t.status.status === "bad" ? "var(--chart-4)" : t.status.status === "warn" ? "var(--chart-1)" : "var(--chart-2)"} />
                      </div>
                      <span className="min-w-[52px] text-right tabular-nums">
                        {t.need} / {t.seats}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={t.status.status}>{t.status.label}</StatusBadge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section aria-labelledby="pflicht" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="pflicht" className="text-base font-bold">
            Pflichtschulungen nach Standort
          </h2>
          <span className="text-[13px] text-muted-foreground">Anteil gültig</span>
        </div>
        <div className="overflow-hidden rounded-2xl border">
          <Table className="min-w-[760px]">
            <TableHeader className="bg-background">
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Standort</TableHead>
                {PFLICHT_COLS.map((c) => (
                  <TableHead key={c} className="text-center">
                    {c}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {PFLICHT_ROWS.map((r) => (
                <TableRow key={r.site}>
                  <TableCell className="pl-4 font-semibold">{r.site}</TableCell>
                  {r.vals.map((v, i) => (
                    <TableCell key={i} className="text-center">
                      {v === null ? (
                        <span className="text-muted-foreground">nicht erforderlich</span>
                      ) : v < 90 ? (
                        <Badge variant="outline" className={cn("rounded-md px-2 font-semibold", STATUS.bad.cls)}>
                          {v} %
                        </Badge>
                      ) : (
                        `${v} %`
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </>
  );
}

/** Flächendiagramm im Stil der shadcn-Charts, als SVG ohne Zusatzbibliothek. */
function AreaChart({ values, labels }: { values: number[]; labels: string[] }) {
  const max = Math.max(6, Math.ceil(Math.max(...values) / 2) * 2);
  const W = 1000;
  const H = 220;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * W, H - 6 - (v / max) * (H - 18)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const ticks = [max, (max * 2) / 3, max / 3, 0].map((t) => Math.round(t));
  return (
    <div className="flex gap-3">
      <div aria-hidden className="flex h-[220px] flex-col justify-between text-right text-xs text-muted-foreground">
        {ticks.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <svg role="img" aria-label={`Geteilte Erfolge pro Woche, zuletzt ${values[values.length - 1]}`} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-[220px] w-full">
          <defs>
            <linearGradient id="fillShared" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-2)" stopOpacity="0.45" />
              <stop offset="100%" stopColor="var(--chart-2)" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          {[0, 1, 2].map((i) => (
            <line key={i} x1="0" x2={W} y1={6 + (i * (H - 12)) / 3} y2={6 + (i * (H - 12)) / 3} stroke="var(--border)" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          ))}
          <line x1="0" x2={W} y1={H - 1} y2={H - 1} stroke="var(--border)" vectorEffect="non-scaling-stroke" />
          <motion.path d={`${line} L${W} ${H} L0 ${H} Z`} fill="url(#fillShared)" initial={{ opacity: 0 }} animate={{ opacity: 1, d: `${line} L${W} ${H} L0 ${H} Z` }} transition={{ duration: 0.6 }} />
          <motion.path d={line} fill="none" stroke="#3d8a72" strokeWidth="2" vectorEffect="non-scaling-stroke" initial={{ pathLength: 0 }} animate={{ pathLength: 1, d: line }} transition={{ duration: 0.9 }} />
        </svg>
        <div aria-hidden className="flex justify-between text-xs text-muted-foreground">
          {labels.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
