import { NextResponse } from "next/server";
import { ensureDefaultSettings } from "./supabase";

export async function withApiHandler<T>(handler: () => Promise<T | Response>, init?: ResponseInit) {
  try {
    await ensureDefaultSettings();
    const result = await handler();
    if (result instanceof Response) return result;
    return NextResponse.json(result, init);
  } catch (error) {
    return NextResponse.json({ message: error instanceof Error ? error.message : "Errore inatteso" }, { status: 400 });
  }
}
