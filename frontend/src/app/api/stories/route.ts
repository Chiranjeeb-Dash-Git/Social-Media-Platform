import { NextResponse } from "next/server";
import dataStore from "@/lib/dataStore";

export const dynamic = "force-dynamic";

const actor = async (req: Request) => {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  return token ? dataStore.auth.getUserFromToken(token) : null;
};

export async function GET() {
  try { return NextResponse.json(await dataStore.story.findActive()); }
  catch { return NextResponse.json({ error: "Could not load stories" }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const user = await actor(req);
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const body = await req.json();
    const story = await dataStore.story.create({ authorId: user.id, ...body });
    return NextResponse.json(story, { status: 201 });
  } catch (error: any) { return NextResponse.json({ error: error.message || "Could not create story" }, { status: 400 }); }
}

export async function DELETE(req: Request) {
  try {
    const user = await actor(req);
    if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Story ID required" }, { status: 400 });
    return NextResponse.json(await dataStore.story.delete(id, user.id));
  } catch (error: any) { return NextResponse.json({ error: error.message || "Could not delete story" }, { status: 400 }); }
}
