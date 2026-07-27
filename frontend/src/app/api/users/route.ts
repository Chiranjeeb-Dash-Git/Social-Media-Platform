import { NextResponse } from "next/server";
import dataStore from "@/lib/dataStore";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = await dataStore.user.findMany();
    return NextResponse.json(users, { status: 200 });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Could not fetch users" }, { status: 500 });
  }
}
