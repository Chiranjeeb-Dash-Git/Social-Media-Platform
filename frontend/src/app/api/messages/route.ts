import { NextResponse } from "next/server";
import dataStore from "@/lib/dataStore";

export const dynamic = "force-dynamic";

const getActor = async (req: Request) => {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  const user = token ? await dataStore.auth.getUserFromToken(token) : null;
  return user ?? dataStore.auth.getOrCreateGuestUser();
};

export async function GET(req: Request) {
  try {
    const user = await getActor(req);
    const url = new URL(req.url);
    const cid = url.searchParams.get("conversationId");

    if (cid) {
      const msgs = await dataStore.messenger.getMessages(cid);
      return NextResponse.json(msgs, { status: 200 });
    }

    const convs = await dataStore.messenger.getConversations(user.id);
    return NextResponse.json(convs, { status: 200 });
  } catch (error) {
    console.error("Error fetching messenger data:", error);
    return NextResponse.json({ error: "Could not fetch messenger data" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getActor(req);
    const body = await req.json();
    const { action, conversationId, content, mediaUrl, voiceNoteUrl, participantIds, isGroup, name } = body;

    if (action === "create_conversation") {
      const conv = await dataStore.messenger.createConversation({
        isGroup,
        name,
        participantIds: Array.from(new Set([user.id, ...(participantIds || [])]))
      });
      return NextResponse.json(conv, { status: 201 });
    }

    if (action === "send_message") {
      if (!conversationId || (!content && !mediaUrl && !voiceNoteUrl)) {
        return NextResponse.json({ error: "Conversation ID and message content required" }, { status: 400 });
      }
      const msg = await dataStore.messenger.sendMessage({
        conversationId,
        senderId: user.id,
        content,
        mediaUrl,
        voiceNoteUrl
      });
      return NextResponse.json(msg, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error performing messenger action:", error);
    return NextResponse.json({ error: "Could not perform messenger action" }, { status: 500 });
  }
}
