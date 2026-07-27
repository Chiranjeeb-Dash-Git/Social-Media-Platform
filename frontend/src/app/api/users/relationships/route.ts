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
    const type = url.searchParams.get("type") || "friends";
    const targetUserId = url.searchParams.get("targetUserId");

    if (targetUserId) {
      const status = await dataStore.relationships.getStatus(user.id, targetUserId);
      return NextResponse.json(status, { status: 200 });
    }

    if (type === "pending") {
      const pending = await dataStore.relationships.getPendingRequests(user.id);
      return NextResponse.json(pending, { status: 200 });
    }

    const friends = await dataStore.relationships.getFriends(user.id);
    return NextResponse.json(friends, { status: 200 });
  } catch (error) {
    console.error("Error fetching relationships:", error);
    return NextResponse.json({ error: "Could not fetch relationships" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getActor(req);
    const body = await req.json();
    const { action, targetId, requestId, status } = body;

    if (action === "request") {
      const res = await dataStore.relationships.sendFriendRequest(user.id, targetId);
      return NextResponse.json(res, { status: 200 });
    }

    if (action === "respond") {
      const res = await dataStore.relationships.respondFriendRequest(requestId, status);
      return NextResponse.json(res, { status: 200 });
    }

    if (action === "unfriend") {
      const res = await dataStore.relationships.unfriend(user.id, targetId);
      return NextResponse.json(res, { status: 200 });
    }

    if (action === "follow") {
      const res = await dataStore.relationships.toggleFollow(user.id, targetId);
      return NextResponse.json(res, { status: 200 });
    }

    if (action === "block") {
      const res = await dataStore.relationships.toggleBlock(user.id, targetId);
      return NextResponse.json(res, { status: 200 });
    }

    if (action === "snooze") {
      const res = await dataStore.relationships.toggleSnooze(user.id, targetId);
      return NextResponse.json(res, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error managing relationship:", error);
    return NextResponse.json({ error: "Could not perform relationship action" }, { status: 500 });
  }
}
