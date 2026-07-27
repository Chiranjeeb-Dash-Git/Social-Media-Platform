import { NextResponse } from "next/server";
import dataStore from "@/lib/dataStore";

export const dynamic = "force-dynamic";

const getActor = async (req: Request) => {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  const user = token ? await dataStore.auth.getUserFromToken(token) : null;
  return user ?? dataStore.auth.getOrCreateGuestUser();
};

export async function POST(req: Request) {
  try {
    const user = await getActor(req);
    const { targetType, targetId, reason } = await req.json();

    if (!targetType || !targetId || !reason) {
      return NextResponse.json({ error: "Target and reason required" }, { status: 400 });
    }

    const report = await dataStore.report.create({
      reporterId: user.id,
      targetType,
      targetId,
      reason
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error("Error creating report:", error);
    return NextResponse.json({ error: "Could not submit report" }, { status: 500 });
  }
}
