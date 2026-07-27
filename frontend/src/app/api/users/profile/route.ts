import { NextResponse } from "next/server";
import dataStore from "@/lib/dataStore";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    return NextResponse.json({ error: "Access token required" }, { status: 401 });
  }

  const user = await dataStore.auth.getUserFromToken(token);

  if (!user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  return NextResponse.json(user, { status: 200 });
}

export async function PATCH(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!token) {
    return NextResponse.json({ error: "Access token required" }, { status: 401 });
  }

  const user = await dataStore.auth.getUserFromToken(token);

  if (!user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const updatedUser = await dataStore.user.updateProfile(user.id, body);
    return NextResponse.json(updatedUser, { status: 200 });
  } catch (err) {
    console.error("Error updating profile:", err);
    return NextResponse.json({ error: "Could not update profile" }, { status: 500 });
  }
}
