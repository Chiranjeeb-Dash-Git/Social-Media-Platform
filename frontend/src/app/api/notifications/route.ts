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
    const notifications = await dataStore.notification.findMany(user.id);
    const unreadCount = notifications.filter(n => !n.isRead).length;
    return NextResponse.json({ notifications, unreadCount }, { status: 200 });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json({ error: "Could not fetch notifications" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getActor(req);
    const body = await req.json();
    const { id, markAll } = body;

    if (markAll) {
      await dataStore.notification.markAllRead(user.id);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (id) {
      await dataStore.notification.markRead(id);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ error: "No target specified" }, { status: 400 });
  } catch (error) {
    console.error("Error marking notifications read:", error);
    return NextResponse.json({ error: "Could not update notifications" }, { status: 500 });
  }
}
