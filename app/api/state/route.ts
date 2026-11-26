import { NextRequest, NextResponse } from "next/server";
import { cleanUsername, deleteState, loadState, saveState } from "@/lib/store";
import type { AppState } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const u = cleanUsername(req.nextUrl.searchParams.get("u"));
  if (!u) return NextResponse.json({ error: "Ungültiger Username" }, { status: 400 });
  const state = await loadState(u);
  return NextResponse.json({ state });
}

export async function PUT(req: NextRequest) {
  const u = cleanUsername(req.nextUrl.searchParams.get("u"));
  if (!u) return NextResponse.json({ error: "Ungültiger Username" }, { status: 400 });
  const state = (await req.json()) as AppState;
  if (!state || state.username !== u) return NextResponse.json({ error: "Username passt nicht" }, { status: 400 });
  state.messages = (state.messages || []).slice(-120);
  await saveState(u, state);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const u = cleanUsername(req.nextUrl.searchParams.get("u"));
  if (!u) return NextResponse.json({ error: "Ungültiger Username" }, { status: 400 });
  await deleteState(u);
  return NextResponse.json({ ok: true });
}
