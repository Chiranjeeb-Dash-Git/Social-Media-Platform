import { NextResponse } from "next/server";
import dataStore from "@/lib/dataStore";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";

    if (!q.trim()) {
      return NextResponse.json({ users: [], posts: [], communities: [], pages: [], marketplace: [] }, { status: 200 });
    }

    const results = await dataStore.search.query(q.trim());
    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error("Error searching platform:", error);
    return NextResponse.json({ error: "Could not perform search" }, { status: 500 });
  }
}
