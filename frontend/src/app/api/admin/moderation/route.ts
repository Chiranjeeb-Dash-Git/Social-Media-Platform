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
    // In our prototype, any logged in user can view moderation board to test it, or we check role
    const reports = await dataStore.report.findMany();
    return NextResponse.json(reports, { status: 200 });
  } catch (error) {
    console.error("Error fetching moderation reports:", error);
    return NextResponse.json({ error: "Could not fetch moderation reports" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getActor(req);
    const { id, status, action, targetType, targetId } = await req.json();

    if (id && status) {
      await dataStore.report.updateStatus(id, status);
    }

    if (action === "delete_content") {
      if (targetType === "POST") {
        await dataStore.post.delete({ where: { id: targetId } });
      } else if (targetType === "COMMENT") {
        await dataStore.comment.delete({ where: { id: targetId } });
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating moderation action:", error);
    return NextResponse.json({ error: "Could not perform moderation action" }, { status: 500 });
  }
}
