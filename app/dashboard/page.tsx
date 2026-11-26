import type { Metadata } from "next";
import Dashboard, { type View } from "@/components/dashboard/Dashboard";

export const metadata: Metadata = {
  title: "LENA · Unternehmenssicht",
  description: "Personalentwicklung im DRK-Kreisverband Musterstadt: Teamübersicht und Strategiesicht",
};

/** Unternehmenssicht für die Demo: /dashboard (Wachenleitung) oder /dashboard?view=hr (Personalabteilung). */
export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  return <Dashboard initialView={(view === "hr" ? "hr" : "wache") as View} />;
}
