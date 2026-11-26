import { NextResponse } from "next/server";
import { listShared } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Unternehmenssicht: nur Erfolge, die Mitarbeitende selbst freigegeben haben. */
export async function GET() {
  try {
    return NextResponse.json({ entries: await listShared() });
  } catch {
    return NextResponse.json({ entries: [] });
  }
}
