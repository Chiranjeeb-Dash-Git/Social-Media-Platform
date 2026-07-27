import { NextResponse } from "next/server";
import dataStore from "@/lib/dataStore";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const user = await dataStore.user.getPublicByUsername(username);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  const currentUser = token ? await dataStore.auth.getUserFromToken(token) : null;

  let relationship = null;
  if (currentUser) {
    relationship = await dataStore.relationships.getStatus(currentUser.id, user.id);
  }

  return NextResponse.json({ user, relationship }, { status: 200 });
}
