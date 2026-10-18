import { NextResponse } from "next/server";
import dataStore from "@/lib/dataStore";

export async function POST(req: Request) {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) await dataStore.auth.logout(token);
  return NextResponse.json({ success: true });
}
