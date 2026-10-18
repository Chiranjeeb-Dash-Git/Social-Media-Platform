import { NextResponse } from "next/server";
import dataStore from "@/lib/dataStore";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password || !/^[a-zA-Z0-9_]{3,24}$/.test(username) || password.length < 8) {
      return NextResponse.json(
        { error: "User ID must be 3-24 letters, numbers, or underscores, and password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const result = await dataStore.auth.register(username, password);

    if (!result) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
